import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  createAuthoringApplyHandler,
  requireApplyPayload,
  runtimeIdentity,
  requireRuntime,
  TRANSPORT_MARKER,
  TRANSPORT_VERSION
} = require('../server/atlas-authoring-apply-handler.js');
const { verifyTrustClaims, verifyTemporalClaims } = require('../server/atlas-github-oidc.js');

const RUNTIME_SHA = 'a'.repeat(40);
const AUTHORING_SHA = 'b'.repeat(40);
const ENV = {
  VERCEL_ENV: 'production',
  VERCEL_GIT_COMMIT_REF: 'main',
  VERCEL_GIT_COMMIT_SHA: RUNTIME_SHA,
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
    schema: 'atlas-authoring-manifest/v2',
    review_status: 'approved',
    request_id: 'person:test:v2',
    person: { canonical_name_en: 'Test', display_name_ko: '테스트' },
    activity: {}
  };
}

function readyState() {
  return {
    ready: true,
    p5_ready: true,
    core: { tables_ready: true, columns_ready: true },
    p9: { old_index_present: false, new_index_present: true, duplicate_groups: 0 },
    person_merge: { allowed: false, person_merge_lifecycle_version: 'pre-p10-blocked' }
  };
}

test('apply payload separates exact runtime SHA from exact authoring SHA', () => {
  const payload = requireApplyPayload({
    transport_version: TRANSPORT_VERSION,
    runtime_sha: RUNTIME_SHA,
    authoring_sha: AUTHORING_SHA,
    manifest_path: 'authoring/requests/test.json',
    manifest: approvedManifest()
  });
  assert.equal(payload.runtimeSha, RUNTIME_SHA);
  assert.equal(payload.authoringSha, AUTHORING_SHA);
  assert.throws(() => requireApplyPayload({ transport_version: 1, runtime_sha: RUNTIME_SHA, authoring_sha: AUTHORING_SHA, manifest_path: 'authoring/requests/test.json', manifest: approvedManifest() }), /TRANSPORT_VERSION/);
  assert.throws(() => requireApplyPayload({ transport_version: 2, runtime_sha: RUNTIME_SHA, authoring_sha: AUTHORING_SHA, manifest_path: '../test.json', manifest: approvedManifest() }), /MANIFEST_PATH_NOT_ALLOWED/);
  assert.throws(() => requireApplyPayload({ transport_version: 2, runtime_sha: 'main', authoring_sha: AUTHORING_SHA, manifest_path: 'authoring/requests/test.json', manifest: approvedManifest() }), /RUNTIME_SHA_REQUIRED/);
});

test('runtime gate pins deployed Production main independently from authoring commit', () => {
  assert.equal(runtimeIdentity(ENV).runtime_sha, RUNTIME_SHA);
  assert.equal(requireRuntime(ENV, RUNTIME_SHA).runtime_sha, RUNTIME_SHA);
  assert.throws(() => runtimeIdentity({ ...ENV, VERCEL_ENV: 'preview' }), /NOT_PRODUCTION/);
  assert.throws(() => runtimeIdentity({ ...ENV, VERCEL_GIT_COMMIT_REF: 'feature' }), /NOT_MAIN/);
  assert.throws(() => runtimeIdentity({ ...ENV, VERCEL_GIT_REPO_OWNER: '' }), /REPOSITORY_MISMATCH/);
  assert.throws(() => requireRuntime(ENV, AUTHORING_SHA), /RUNTIME_SHA_MISMATCH/);
});

test('OIDC claim policy pins the authoring commit SHA, not the deployed runtime SHA', () => {
  const claims = {
    iss: 'https://token.actions.githubusercontent.com',
    aud: 'atlas-person-db-authoring',
    repository: 'JezCH/atlas-person-db',
    repository_id: '1319427399',
    ref: 'refs/heads/main',
    workflow_ref: 'JezCH/atlas-person-db/.github/workflows/atlas-authoring-apply.yml@refs/heads/main',
    environment: 'production',
    event_name: 'push',
    sha: AUTHORING_SHA
  };
  assert.doesNotThrow(() => verifyTrustClaims(claims, AUTHORING_SHA));
  assert.throws(() => verifyTrustClaims({ ...claims, sha: RUNTIME_SHA }, AUTHORING_SHA), /SHA_MISMATCH/);
  assert.throws(() => verifyTrustClaims({ ...claims, workflow_ref: 'other' }, AUTHORING_SHA), /WORKFLOW_MISMATCH/);
});

test('OIDC temporal policy rejects expired and not-yet-active tokens', () => {
  assert.doesNotThrow(() => verifyTemporalClaims({ exp: 1100, nbf: 900, iat: 900 }, 1000));
  assert.throws(() => verifyTemporalClaims({ exp: 900 }, 1000), /EXPIRED/);
  assert.throws(() => verifyTemporalClaims({ exp: 1200, nbf: 1100 }, 1000), /NOT_ACTIVE/);
});

test('GET exposes read-only Production readiness and deployed runtime SHA', async () => {
  let migrations = 0;
  let ended = 0;
  const client = { end: async () => { ended += 1; } };
  const handler = createAuthoringApplyHandler({
    env: ENV,
    createClient: async () => client,
    applyMigrations: async () => { migrations += 1; },
    inspectReadiness: async (seen) => { assert.equal(seen, client); return readyState(); }
  });
  const res = responseCapture();
  await handler({ method: 'GET', headers: {} }, res);
  assert.equal(res.state.statusCode, 200);
  assert.equal(res.state.body.ok, true);
  assert.equal(res.state.body.marker, TRANSPORT_MARKER);
  assert.equal(res.state.body.transport_version, TRANSPORT_VERSION);
  assert.equal(res.state.body.runtime_sha, RUNTIME_SHA);
  assert.equal(res.state.body.ready, true);
  assert.equal(migrations, 0, 'readiness endpoint must not mutate schema');
  assert.equal(ended, 1);
});

test('handler rejects runtime skew before OIDC or database access', async () => {
  let oidcCalls = 0;
  let dbCalls = 0;
  const handler = createAuthoringApplyHandler({
    env: ENV,
    verifyOidc: async () => { oidcCalls += 1; },
    createClient: async () => { dbCalls += 1; throw new Error('should not connect'); }
  });
  const res = responseCapture();
  await handler({ method: 'POST', headers: { authorization: 'Bearer token' }, body: {
    transport_version: 2,
    runtime_sha: AUTHORING_SHA,
    authoring_sha: AUTHORING_SHA,
    manifest_path: 'authoring/requests/test.json',
    manifest: approvedManifest()
  } }, res);
  assert.equal(res.state.statusCode, 409);
  assert.equal(res.state.body.code, 'AUTHORING_RUNTIME_SHA_MISMATCH');
  assert.equal(oidcCalls, 0);
  assert.equal(dbCalls, 0);
});

test('POST accepts different runtime and authoring SHAs while binding OIDC to authoring SHA', async () => {
  let oidcExpected = null;
  let migrated = 0;
  let capturedTransport = null;
  let ended = 0;
  const client = { end: async () => { ended += 1; } };
  const snapshot = {
    version: 2,
    semantic_version: 'v2-relation-full-temporal',
    entities: {
      person: { id: '11111111-1111-4111-8111-111111111111' },
      polity: { id: '22222222-2222-4222-8222-222222222222' },
      role: { id: null },
      activity: { id: '33333333-3333-4333-8333-333333333333' }
    }
  };
  const handler = createAuthoringApplyHandler({
    env: ENV,
    verifyOidc: async (_token, { expectedSha }) => { oidcExpected = expectedSha; },
    createClient: async () => client,
    applyMigrations: async () => { migrated += 1; },
    inspectReadiness: async () => readyState(),
    createDispatch: () => ({
      apply: async (_manifest, { transport }) => {
        capturedTransport = transport;
        return {
          marker: 'ATLAS_AUTHORING_MANIFEST_V2_STAGE2_NATIVE',
          request_id: 'person:test:v2',
          committed: true,
          replay: false,
          person_id: snapshot.entities.person.id,
          relationship_id: snapshot.entities.activity.id,
          polity_id: snapshot.entities.polity.id,
          result: snapshot
        };
      }
    })
  });
  const res = responseCapture();
  await handler({ method: 'POST', headers: { authorization: 'Bearer token' }, body: {
    transport_version: 2,
    runtime_sha: RUNTIME_SHA,
    authoring_sha: AUTHORING_SHA,
    manifest_path: 'authoring/requests/test.json',
    manifest: approvedManifest()
  } }, res);
  assert.equal(res.state.statusCode, 200);
  assert.equal(oidcExpected, AUTHORING_SHA);
  assert.equal(migrated, 1);
  assert.deepEqual(capturedTransport, {
    version: 2,
    runtime_sha: RUNTIME_SHA,
    authoring_sha: AUTHORING_SHA,
    manifest_path: 'authoring/requests/test.json'
  });
  assert.equal(res.state.body.runtime_sha, RUNTIME_SHA);
  assert.equal(res.state.body.authoring_sha, AUTHORING_SHA);
  assert.equal(res.state.body.transport_marker, TRANSPORT_MARKER);
  assert.equal(ended, 1);
});

test('POST fails closed when P9 authoring readiness is no longer satisfied', async () => {
  let dispatchCalls = 0;
  const client = { end: async () => {} };
  const handler = createAuthoringApplyHandler({
    env: ENV,
    verifyOidc: async () => {},
    createClient: async () => client,
    applyMigrations: async () => {},
    inspectReadiness: async () => ({ ...readyState(), ready: false }),
    createDispatch: () => ({ apply: async () => { dispatchCalls += 1; } })
  });
  const res = responseCapture();
  await handler({ method: 'POST', headers: { authorization: 'Bearer token' }, body: {
    transport_version: 2,
    runtime_sha: RUNTIME_SHA,
    authoring_sha: AUTHORING_SHA,
    manifest_path: 'authoring/requests/test.json',
    manifest: approvedManifest()
  } }, res);
  assert.equal(res.state.statusCode, 409);
  assert.equal(res.state.body.code, 'AUTHORING_PRODUCTION_NOT_READY');
  assert.equal(dispatchCalls, 0);
});
