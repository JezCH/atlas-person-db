import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const serviceSource = fs.readFileSync(new URL('../server/atlas-authoring-manifest-service.js', import.meta.url), 'utf8');
const dispatchSource = fs.readFileSync(new URL('../server/atlas-authoring-manifest-dispatch-service.js', import.meta.url), 'utf8');
const nativeV2Source = fs.readFileSync(new URL('../server/atlas-authoring-manifest-v2-native-service.js', import.meta.url), 'utf8');
const nativeActivitySource = fs.readFileSync(new URL('../server/atlas-stage2-native-activity-service.js', import.meta.url), 'utf8');
const migrationsSource = fs.readFileSync(new URL('../server/atlas-authoring-migrations.js', import.meta.url), 'utf8');
const runnerSource = fs.readFileSync(new URL('../scripts/apply-authoring-manifest.mjs', import.meta.url), 'utf8');
const handlerSource = fs.readFileSync(new URL('../server/atlas-authoring-apply-handler.js', import.meta.url), 'utf8');
const oidcSource = fs.readFileSync(new URL('../server/atlas-github-oidc.js', import.meta.url), 'utf8');
const workflowSource = fs.readFileSync(new URL('../.github/workflows/atlas-authoring-apply.yml', import.meta.url), 'utf8');

test('legacy manifest orchestration remains available only for historical ledger replay', () => {
  assert.match(serviceSource, /begin isolation level serializable/i);
  assert.match(serviceSource, /createPerson\(client, person\)/);
  assert.match(serviceSource, /createV2AuthoritativeTx\(client\)/);
  assert.match(dispatchSource, /AUTHORING_MANIFEST_V1_NEW_WRITE_RETIRED/);
  assert.match(dispatchSource, /existingLedgerKind/);
  assert.match(dispatchSource, /return legacy\.apply\(rawManifest\)/);
});

test('new manifest v2 owns one transaction and binds created identities directly into Stage 2 native Activity UUID fields', () => {
  assert.match(nativeV2Source, /begin isolation level serializable/i);
  assert.match(nativeV2Source, /createPerson\(client, manifest\.person\)/);
  assert.match(nativeV2Source, /createPolity\(client, manifest\.polityIdentity\)/);
  assert.match(nativeV2Source, /createRole\(client, manifest\.roleIdentity\)/);
  assert.match(nativeV2Source, /createStage2NativeActivityTx\(client\)\.create/);
  assert.match(nativeV2Source, /v2-relation-full-temporal/);
  assert.match(nativeV2Source, /AUTHORING_V2_ACTIVITY_NAME_OR_PERSON_ID_BINDING_FORBIDDEN/);
  assert.doesNotMatch(nativeV2Source, /createV2AuthoritativeTx/);
});

test('Stage 2 native Activity writer uses final semantic identity and forbids legacy provenance/name binding', () => {
  assert.match(nativeActivitySource, /relation_type_id/);
  assert.match(nativeActivitySource, /activity_start_month/);
  assert.match(nativeActivitySource, /activity_start_granularity/);
  assert.match(nativeActivitySource, /activity_start_calendar/);
  assert.match(nativeActivitySource, /activity_end_month/);
  assert.match(nativeActivitySource, /activity_end_granularity/);
  assert.match(nativeActivitySource, /legacy_source_key/);
  assert.match(nativeActivitySource, /STAGE2_ACTIVITY_NAME_BINDING_FORBIDDEN/);
  assert.match(nativeActivitySource, /STAGE2_ACTIVITY_LEGACY_SOURCE_KEY_FORBIDDEN/);
  assert.match(nativeActivitySource, /STAGE2_ACTIVITY_SEMANTIC_DUPLICATE/);
});

test('authoring migrations have one ordered registry shared by production and local runners', () => {
  assert.match(migrationsSource, /AUTHORING_MIGRATION_PATHS/);
  assert.match(migrationsSource, /20260811_authoring_manifest_runs\.sql/);
  assert.match(migrationsSource, /20260811_authoring_result_snapshot\.sql/);
  assert.match(migrationsSource, /applyAuthoringMigrations/);
  assert.match(runnerSource, /applyAuthoringMigrations/);
  assert.match(handlerSource, /applyAuthoringMigrations/);
});

test('local/manual legacy runner remains normalized and path-confined', () => {
  assert.match(runnerSource, /authoring\/requests/);
  assert.match(runnerSource, /AUTHORING_MANIFEST_PATH_NOT_ALLOWED/);
  assert.match(runnerSource, /createAuthoringManifestService/);
  assert.doesNotMatch(runnerSource, /insert into atlas_v2\.persons/i);
});

test('production apply keeps database credentials inside Vercel and routes through the new-write dispatcher at exact deployed main SHA', () => {
  assert.match(handlerSource, /SUPABASE_DB_URL/);
  assert.match(handlerSource, /VERCEL_GIT_COMMIT_SHA/);
  assert.match(handlerSource, /VERCEL_ENV/);
  assert.match(handlerSource, /VERCEL_GIT_COMMIT_REF/);
  assert.match(handlerSource, /createAuthoringManifestDispatchService/);
  assert.match(handlerSource, /verifyGitHubActionsOidc/);
  assert.match(handlerSource, /result: outcome\.result/);
  assert.doesNotMatch(handlerSource, /insert into atlas_v2\.persons/i);
});

test('GitHub OIDC verifier pins repository identity, main workflow, audience, production environment and SHA', () => {
  assert.match(oidcSource, /token\.actions\.githubusercontent\.com/);
  assert.match(oidcSource, /JezCH\/atlas-person-db/);
  assert.match(oidcSource, /1319427399/);
  assert.match(oidcSource, /refs\/heads\/main/);
  assert.match(oidcSource, /atlas-authoring-apply\.yml@refs\/heads\/main/);
  assert.match(oidcSource, /atlas-person-db-authoring/);
  assert.match(oidcSource, /environment !== "production"/);
  assert.match(oidcSource, /payload\?\.sha !== expectedSha/);
  assert.match(oidcSource, /crypto\.verify/);
});

test('GitHub apply workflow accepts only newly changed reviewed Stage 2 native v2 manifests', () => {
  assert.match(workflowSource, /branches:\s*\n\s*- main/);
  assert.match(workflowSource, /authoring\/requests\/\*\.json/);
  assert.match(workflowSource, /atlas-authoring-manifest\/v2/);
  assert.doesNotMatch(workflowSource, /atlas-authoring-manifest\/v1/);
  assert.match(workflowSource, /activity\.relation_type_id/);
  assert.match(workflowSource, /activity\.period_basis_id/);
  assert.match(workflowSource, /activity\.polity_binding\.mode/);
  assert.match(workflowSource, /activity\.role_binding\.mode/);
  assert.match(workflowSource, /Skipping legacy\/non-native authoring manifest/);
  assert.doesNotMatch(workflowSource, /replaying all approved manifests idempotently/i);
  assert.match(workflowSource, /group: atlas-authoring-production/);
  assert.match(workflowSource, /id-token: write/);
  assert.match(workflowSource, /ACTIONS_ID_TOKEN_REQUEST_URL/);
  assert.match(workflowSource, /atlas-person-db\.vercel\.app\/api\/atlas-authoring-apply/);
  assert.match(workflowSource, /DEPLOYMENT_SHA_MISMATCH/);
  assert.doesNotMatch(workflowSource, /secrets\.SUPABASE_DB_URL|SUPABASE_DB_URL/);
  assert.doesNotMatch(workflowSource, /scripts\/apply-authoring-manifest\.mjs/);
});

test('GitHub apply workflow treats Vercel route propagation as transient but fails closed on other responses', () => {
  assert.match(workflowSource, /\[\[ "\$status" == "404" \]\]/);
  assert.match(workflowSource, /Production route for \$\{GITHUB_SHA\} is not live yet/);
  assert.match(workflowSource, /\$status" == "409" && "\$code" == "DEPLOYMENT_SHA_MISMATCH"/);
  assert.match(workflowSource, /for attempt in \$\(seq 1 60\)/);
  assert.match(workflowSource, /sleep 10/);
  assert.match(workflowSource, /Authoring apply failed: HTTP \$\{status\}, code \$\{code\}/);
});
