import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createAuthoringApplyHandler, requireApplyPayload, requireDeployment } = require('../server/atlas-authoring-apply-handler.js');
const { verifyTrustClaims, verifyTemporalClaims } = require('../server/atlas-github-oidc.js');

const SHA = 'a'.repeat(40);
const ENV = {
  VERCEL_ENV: 'production',
  VERCEL_GIT_COMMIT_REF: 'main',
  VERCEL_GIT_COMMIT_SHA: SHA,
  VERCEL_GIT_REPO_OWNER: 'JezCH',
  VERCEL_GIT_REPO_SLUG: 'atlas-person-db',
  SUPABASE_DB_URL: 'postgresql://example.invalid/db'
};

function responseCapture() {
  const state = { headers: {} };
  return {
    state,
    setHeader(name, value) { state.headers[name] = value; },
    end(value) { state.body = JSON.parse(value); },
    set statusCode(value) { state.statusCode = value; },
    get statusCode() { return state.statusCode; }
  };
}

function approvedManifest() {
  return {
    schema: 'atlas-authoring-manifest/v1',
    review_status: 'approved',
    request_id: 'person:test:v1',
    person: { canonical_name_en: 'Test', display_name_ko: '테스트' },
    activity: { politic_name: 'Test Polity', activity_start: 1, activity_end: 2, period_basis: 'reign' }
  };
}

test('apply payload accepts only one reviewed-request path shape and exact commit SHA', () => {
  const payload = requireApplyPayload({ deployment_sha: SHA, manifest_path: 'authoring/requests/test.json', manifest: approvedManifest() });
  assert.equal(payload.deploymentSha, SHA);
  assert.throws(() => requireApplyPayload({ deployment_sha: SHA, manifest_path: '../test.json', manifest: approvedManifest() }), /AUTHORING_MANIFEST_PATH_NOT_ALLOWED/);
  assert.throws(() => requireApplyPayload({ deployment_sha: 'main', manifest_path: 'authoring/requests/test.json', manifest: approvedManifest() }), /AUTHORING_APPLY_SHA_REQUIRED/);
});

test('deployment gate is production-main and exact deployed SHA', () => {
  assert.equal(requireDeployment(ENV, SHA), SHA);
  assert.throws(() => requireDeployment({ ...ENV, VERCEL_ENV: 'preview' }, SHA), /AUTHORING_APPLY_NOT_PRODUCTION/);
  assert.throws(() => requireDeployment({ ...ENV, VERCEL_GIT_COMMIT_REF: 'feature' }, SHA), /AUTHORING_APPLY_NOT_MAIN/);
  assert.throws(() => requireDeployment(ENV, 'b'.repeat(40)), /DEPLOYMENT_SHA_MISMATCH/);
});

test('OIDC claim policy pins GitHub repository, immutable repository id, workflow, environment and SHA', () => {
  const claims = {
    iss: 'https://token.actions.githubusercontent.com',
    aud: 'atlas-person-db-authoring',
    repository: 'JezCH/atlas-person-db',
    repository_id: '1319427399',
    ref: 'refs/heads/main',
    workflow_ref: 'JezCH/atlas-person-db/.github/workflows/atlas-authoring-apply.yml@refs/heads/main',
    environment: 'production',
    event_name: 'push',
    sha: SHA
  };
  assert.doesNotThrow(() => verifyTrustClaims(claims, SHA));
  assert.throws(() => verifyTrustClaims({ ...claims, repository_id: '1' }, SHA), /REPOSITORY_ID_MISMATCH/);
  assert.throws(() => verifyTrustClaims({ ...claims, workflow_ref: 'other' }, SHA), /WORKFLOW_MISMATCH/);
  assert.throws(() => verifyTrustClaims({ ...claims, sha: 'b'.repeat(40) }, SHA), /SHA_MISMATCH/);
});

test('OIDC temporal policy rejects expired and not-yet-active tokens', () => {
  assert.doesNotThrow(() => verifyTemporalClaims({ exp: 1100, nbf: 900, iat: 900 }, 1000));
  assert.throws(() => verifyTemporalClaims({ exp: 900 }, 1000), /EXPIRED/);
  assert.throws(() => verifyTemporalClaims({ exp: 1200, nbf: 1100 }, 1000), /NOT_ACTIVE/);
});

test('handler rejects deployment skew before OIDC or database access', async () => {
  let oidcCalls = 0;
  let dbCalls = 0;
  const handler = createAuthoringApplyHandler({
    env: ENV,
    verifyOidc: async () => { oidcCalls += 1; },
    createClient: async () => { dbCalls += 1; throw new Error('should not connect'); }
  });
  const res = responseCapture();
  await handler({ method: 'POST', headers: { authorization: 'Bearer token' }, body: { deployment_sha: 'b'.repeat(40), manifest_path: 'authoring/requests/test.json', manifest: approvedManifest() } }, res);
  assert.equal(res.state.statusCode, 409);
  assert.equal(res.state.body.code, 'DEPLOYMENT_SHA_MISMATCH');
  assert.equal(oidcCalls, 0);
  assert.equal(dbCalls, 0);
});

test('handler requires OIDC before opening the database', async () => {
  let dbCalls = 0;
  const handler = createAuthoringApplyHandler({
    env: ENV,
    verifyOidc: async () => { throw new Error('GITHUB_OIDC_SIGNATURE_INVALID'); },
    createClient: async () => { dbCalls += 1; throw new Error('should not connect'); }
  });
  const res = responseCapture();
  await handler({ method: 'POST', headers: { authorization: 'Bearer token' }, body: { deployment_sha: SHA, manifest_path: 'authoring/requests/test.json', manifest: approvedManifest() } }, res);
  assert.equal(res.state.statusCode, 403);
  assert.equal(res.state.body.code, 'GITHUB_OIDC_SIGNATURE_INVALID');
  assert.equal(dbCalls, 0);
});
