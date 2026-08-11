import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const serviceSource = fs.readFileSync(new URL('../server/atlas-authoring-manifest-service.js', import.meta.url), 'utf8');
const runnerSource = fs.readFileSync(new URL('../scripts/apply-authoring-manifest.mjs', import.meta.url), 'utf8');
const handlerSource = fs.readFileSync(new URL('../server/atlas-authoring-apply-handler.js', import.meta.url), 'utf8');
const oidcSource = fs.readFileSync(new URL('../server/atlas-github-oidc.js', import.meta.url), 'utf8');
const workflowSource = fs.readFileSync(new URL('../.github/workflows/atlas-authoring-apply.yml', import.meta.url), 'utf8');

test('manifest orchestration owns one serializable transaction and reuses non-owning domain executors', () => {
  assert.match(serviceSource, /begin isolation level serializable/i);
  assert.match(serviceSource, /createPerson\(client, person\)/);
  assert.doesNotMatch(serviceSource, /createIdentityService/);
  assert.match(serviceSource, /createV2AuthoritativeTx\(client\)/);
});

test('local/manual runner remains normalized and path-confined', () => {
  assert.match(runnerSource, /authoring\/requests/);
  assert.match(runnerSource, /AUTHORING_MANIFEST_PATH_NOT_ALLOWED/);
  assert.match(runnerSource, /createAuthoringManifestService/);
  assert.doesNotMatch(runnerSource, /insert into atlas_v2\.persons/i);
});

test('production apply keeps database credentials inside Vercel and binds execution to deployed main SHA', () => {
  assert.match(handlerSource, /SUPABASE_DB_URL/);
  assert.match(handlerSource, /VERCEL_GIT_COMMIT_SHA/);
  assert.match(handlerSource, /VERCEL_ENV/);
  assert.match(handlerSource, /VERCEL_GIT_COMMIT_REF/);
  assert.match(handlerSource, /createAuthoringManifestService/);
  assert.match(handlerSource, /verifyGitHubActionsOidc/);
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

test('GitHub apply workflow uses short-lived OIDC and never receives the database URL', () => {
  assert.match(workflowSource, /branches:\s*\n\s*- main/);
  assert.match(workflowSource, /authoring\/requests\/\*\.json/);
  assert.match(workflowSource, /group: atlas-authoring-production/);
  assert.match(workflowSource, /id-token: write/);
  assert.match(workflowSource, /ACTIONS_ID_TOKEN_REQUEST_URL/);
  assert.match(workflowSource, /atlas-person-db\.vercel\.app\/api\/atlas-authoring-apply/);
  assert.match(workflowSource, /DEPLOYMENT_SHA_MISMATCH/);
  assert.doesNotMatch(workflowSource, /secrets\.SUPABASE_DB_URL|SUPABASE_DB_URL/);
  assert.doesNotMatch(workflowSource, /scripts\/apply-authoring-manifest\.mjs/);
});
