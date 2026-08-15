import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const releaseService = require('../server/atlas-p10-production-release-service.js');
const oidc = require('../server/atlas-p10-production-github-oidc.js');
const releaseHandler = require('../server/atlas-p10-production-release-handler.js');

const migration = fs.readFileSync(new URL('../migration/phase-10/p10-person-duplicate-revalidation-requirements.sql', import.meta.url), 'utf8');
const handlerSource = fs.readFileSync(new URL('../server/atlas-p10-production-release-handler.js', import.meta.url), 'utf8');
const workflow = fs.readFileSync(new URL('../.github/workflows/atlas-p10-revalidation-release.yml', import.meta.url), 'utf8');
const vercel = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

const SHA = '1234567890abcdef1234567890abcdef12345678';

function validClaims(overrides = {}) {
  return {
    iss: oidc.ISSUER,
    aud: oidc.EXPECTED_AUDIENCE,
    repository: 'JezCH/atlas-person-db',
    repository_id: '1319427399',
    ref: 'refs/heads/main',
    workflow_ref: oidc.EXPECTED_WORKFLOW_REF,
    environment: 'production',
    event_name: 'workflow_dispatch',
    sha: SHA,
    exp: 2000000000,
    nbf: 1000000000,
    ...overrides
  };
}

test('P10 release modes intentionally exclude duplicate review and physical merge execution', () => {
  assert.deepEqual([...releaseHandler.MODES].sort(), [
    'final_verify',
    'migration_apply',
    'migration_dry_run',
    'preflight',
    'rebuild_candidates'
  ]);
  assert.doesNotMatch(handlerSource, /REVIEW_CANDIDATE|EXECUTE_APPROVED_MERGE|executeApprovedPersonMerge/);
  assert.match(handlerSource, /automatic_review_performed:\s*false/);
  assert.match(handlerSource, /physical_person_merge_executed:\s*false/);
});

test('release envelope and Vercel deployment are fixed to exact Production main SHA', () => {
  const envelope = releaseHandler.requireEnvelope({
    deployment_sha: SHA,
    release_id: releaseHandler.RELEASE_ID,
    approval: `APPLY:${releaseHandler.RELEASE_ID}`,
    mode: 'preflight'
  });
  assert.equal(envelope.deploymentSha, SHA);
  assert.throws(() => releaseHandler.requireEnvelope({ deployment_sha: SHA, release_id: releaseHandler.RELEASE_ID, approval: 'wrong', mode: 'preflight' }), /P10_RELEASE_APPROVAL_REQUIRED/);
  assert.throws(() => releaseHandler.requireEnvelope({ deployment_sha: SHA, release_id: releaseHandler.RELEASE_ID, approval: `APPLY:${releaseHandler.RELEASE_ID}`, mode: 'merge' }), /P10_RELEASE_MODE_INVALID/);

  const env = {
    VERCEL_ENV: 'production',
    VERCEL_GIT_COMMIT_REF: 'main',
    VERCEL_GIT_REPO_OWNER: 'JezCH',
    VERCEL_GIT_REPO_SLUG: 'atlas-person-db',
    VERCEL_GIT_COMMIT_SHA: SHA
  };
  assert.doesNotThrow(() => releaseHandler.requireDeployment(env, SHA));
  assert.throws(() => releaseHandler.requireDeployment({ ...env, VERCEL_ENV: 'preview' }, SHA), /P10_RELEASE_NOT_PRODUCTION_MAIN/);
  assert.throws(() => releaseHandler.requireDeployment({ ...env, VERCEL_GIT_COMMIT_SHA: '0'.repeat(40) }, SHA), /DEPLOYMENT_SHA_MISMATCH/);
});

test('GitHub OIDC claims are bound to exact repository, workflow, production environment and SHA', () => {
  assert.doesNotThrow(() => oidc.verifyClaims(validClaims(), SHA, 1500000000));
  assert.throws(() => oidc.verifyClaims(validClaims({ aud: 'wrong' }), SHA, 1500000000), /P10_RELEASE_OIDC_AUDIENCE_MISMATCH/);
  assert.throws(() => oidc.verifyClaims(validClaims({ workflow_ref: 'wrong' }), SHA, 1500000000), /P10_RELEASE_OIDC_WORKFLOW_MISMATCH/);
  assert.throws(() => oidc.verifyClaims(validClaims({ environment: 'preview' }), SHA, 1500000000), /P10_RELEASE_OIDC_CONTEXT_MISMATCH/);
  assert.throws(() => oidc.verifyClaims(validClaims({ sha: '0'.repeat(40) }), SHA, 1500000000), /P10_RELEASE_OIDC_SHA_MISMATCH/);
});

test('P10 requirement migration replay preserves RETIRED lifecycle progress', () => {
  assert.match(migration, /requirement_state IN \('ACTIVE','RETIRED'\)/);
  assert.match(migration, /ON CONFLICT \(requirement_key\) DO NOTHING/);
  assert.doesNotMatch(migration, /ON CONFLICT[\s\S]*DO UPDATE[\s\S]*requirement_state='ACTIVE'/i);
  assert.match(migration, /must never be reactivated by migration replay/i);
});

test('release service executes the canonical migration body under its own transaction wrapper', () => {
  const body = releaseService.migrationBody('BEGIN;\nselect 1;\nCOMMIT;');
  assert.equal(body, 'select 1;');
  assert.throws(() => releaseService.migrationBody('BEGIN; select 1; COMMIT; select 2; COMMIT;'), /P10_RELEASE_MIGRATION_TRANSACTION_WRAPPER_DRIFT/);
  const canonical = releaseService.loadRequirementMigration();
  assert.match(canonical, /person_duplicate_revalidation_requirements/);
  assert.doesNotMatch(canonical, /^BEGIN;/i);
  assert.doesNotMatch(canonical, /COMMIT;\s*$/i);
});

test('Production workflow uses OIDC and dry-run before apply without DB secrets or merge commands', () => {
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /atlas-person-db-p10-revalidation-release/);
  assert.match(workflow, /call migration_dry_run[\s\S]*call migration_apply[\s\S]*call rebuild_candidates[\s\S]*call final_verify/);
  assert.doesNotMatch(workflow, /SUPABASE_DB_URL|DATABASE_URL/);
  assert.doesNotMatch(workflow, /REVIEW_CANDIDATE|EXECUTE_APPROVED_MERGE|physical merge/i);
  assert.match(workflow, /review_decision_written==false/);
  assert.match(workflow, /physical_person_merge_executed==false/);
});

test('Vercel bundles only the phase-10 SQL needed by the P10 release endpoint', () => {
  assert.equal(vercel.functions['api/atlas-p10-revalidation-release.js']?.includeFiles, 'migration/phase-10/**/*.sql');
});
