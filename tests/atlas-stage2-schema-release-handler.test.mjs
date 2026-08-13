import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  createStage2SchemaReleaseHandler,
  requirePayload,
  requireDeployment,
  assertReleaseEnvelope,
  assertBaselineMatches
} = require('../server/atlas-stage2-schema-release-handler.js');
const { verifyTrustClaims, verifyTemporalClaims } = require('../server/atlas-stage2-schema-release-github-oidc.js');

const SHA = 'a'.repeat(40);
const RELEASE_ID = 'p5_stage2_additive_schema_20260813_v1';
const APPROVAL = `APPLY:${RELEASE_ID}`;
const DIGEST = `sha256:${'b'.repeat(64)}`;
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

function bundle() {
  return {
    release: {
      schema: 'atlas-stage2-p5-additive-schema-release/v1',
      release_id: RELEASE_ID,
      status: 'RELEASE_CANDIDATE_BRANCH_ONLY_NO_PRODUCTION_MUTATION',
      baseline: { baseline_digest: DIGEST },
      prerequisites: {
        effective_prebinding_complete: true,
        effective_activity_count: 54,
        remaining_activity_count: 0
      },
      safety: {
        additive_schema_only: true,
        person_activity_data_mutation: false,
        physical_person_merge: false,
        territory_geometry_mutation: false,
        production_apply_authorized: false
      }
    },
    components: Array.from({ length: 5 }, (_, index) => ({
      id: `component_${index + 1}`,
      git_blob_sha: String(index + 1).repeat(40)
    }))
  };
}

function baseline(digest = DIGEST) {
  return {
    baseline_digest: digest,
    counts: { activities: 338, persons: 302, polities: 212, sources: 20 }
  };
}

function requestBody(overrides = {}) {
  return { deployment_sha: SHA, release_id: RELEASE_ID, approval: APPROVAL, mode: 'preflight', ...overrides };
}

test('payload requires exact release id, explicit typed approval and supported mode', () => {
  const payload = requirePayload(requestBody());
  assert.equal(payload.releaseId, RELEASE_ID);
  assert.equal(payload.approval, APPROVAL);
  assert.throws(() => requirePayload(requestBody({ approval: 'yes' })), /APPROVAL_REQUIRED/);
  assert.throws(() => requirePayload(requestBody({ mode: 'apply_now' })), /MODE_REQUIRED/);
  assert.throws(() => requirePayload(requestBody({ deployment_sha: 'main' })), /SHA_REQUIRED/);
});

test('release envelope cannot self-authorize Production and requires P6 54/54 closure', () => {
  assert.equal(assertReleaseEnvelope(bundle(), RELEASE_ID).release_id, RELEASE_ID);
  const selfAuthorized = bundle();
  selfAuthorized.release.safety.production_apply_authorized = true;
  assert.throws(() => assertReleaseEnvelope(selfAuthorized, RELEASE_ID), /SELF_AUTHORIZATION_FORBIDDEN/);
  const incomplete = bundle();
  incomplete.release.prerequisites.remaining_activity_count = 1;
  assert.throws(() => assertReleaseEnvelope(incomplete, RELEASE_ID), /P6_CLOSURE_REQUIRED/);
});

test('baseline gate pins exact digest and authoritative cardinalities', () => {
  const release = bundle().release;
  assert.equal(assertBaselineMatches(release, baseline()).baseline_digest, DIGEST);
  assert.throws(() => assertBaselineMatches(release, baseline(`sha256:${'c'.repeat(64)}`)), /BASELINE_DIGEST_DRIFT/);
  assert.throws(() => assertBaselineMatches(release, { ...baseline(), counts: { ...baseline().counts, activities: 339 } }), /BASELINE_CARDINALITY_DRIFT/);
});

test('deployment gate is exact Production main repository SHA', () => {
  assert.equal(requireDeployment(ENV, SHA), SHA);
  assert.throws(() => requireDeployment({ ...ENV, VERCEL_ENV: 'preview' }, SHA), /NOT_PRODUCTION/);
  assert.throws(() => requireDeployment({ ...ENV, VERCEL_GIT_COMMIT_REF: 'feature' }, SHA), /NOT_MAIN/);
  assert.throws(() => requireDeployment({ ...ENV, VERCEL_GIT_REPO_SLUG: 'other' }, SHA), /REPOSITORY_MISMATCH/);
  assert.throws(() => requireDeployment(ENV, 'b'.repeat(40)), /DEPLOYMENT_SHA_MISMATCH/);
});

test('dedicated OIDC policy accepts only the Stage 2 schema workflow dispatch on production main', () => {
  const claims = {
    iss: 'https://token.actions.githubusercontent.com',
    aud: 'atlas-person-db-stage2-schema-release',
    repository: 'JezCH/atlas-person-db',
    repository_id: '1319427399',
    ref: 'refs/heads/main',
    workflow_ref: 'JezCH/atlas-person-db/.github/workflows/atlas-stage2-schema-release.yml@refs/heads/main',
    environment: 'production',
    event_name: 'workflow_dispatch',
    sha: SHA
  };
  assert.doesNotThrow(() => verifyTrustClaims(claims, SHA));
  assert.throws(() => verifyTrustClaims({ ...claims, aud: 'atlas-person-db-correction-apply' }, SHA), /AUDIENCE_MISMATCH/);
  assert.throws(() => verifyTrustClaims({ ...claims, workflow_ref: 'JezCH/atlas-person-db/.github/workflows/atlas-correction-apply.yml@refs/heads/main' }, SHA), /WORKFLOW_MISMATCH/);
  assert.throws(() => verifyTrustClaims({ ...claims, event_name: 'push' }, SHA), /EVENT_MISMATCH/);
  assert.throws(() => verifyTrustClaims({ ...claims, sha: 'b'.repeat(40) }, SHA), /SHA_MISMATCH/);
});

test('OIDC temporal policy rejects expired and future tokens', () => {
  assert.doesNotThrow(() => verifyTemporalClaims({ exp: 1100, nbf: 900, iat: 900 }, 1000));
  assert.throws(() => verifyTemporalClaims({ exp: 900 }, 1000), /EXPIRED/);
  assert.throws(() => verifyTemporalClaims({ exp: 1200, nbf: 1100 }, 1000), /NOT_ACTIVE/);
});

test('handler rejects SHA skew before OIDC or database access', async () => {
  let oidcCalls = 0;
  let dbCalls = 0;
  const handler = createStage2SchemaReleaseHandler({
    env: ENV,
    readRelease: bundle,
    verifyOidc: async () => { oidcCalls += 1; },
    createClient: async () => { dbCalls += 1; throw new Error('should not connect'); }
  });
  const res = responseCapture();
  await handler({ method: 'POST', headers: { authorization: 'Bearer token' }, body: requestBody({ deployment_sha: 'b'.repeat(40) }) }, res);
  assert.equal(res.state.statusCode, 409);
  assert.equal(res.state.body.code, 'DEPLOYMENT_SHA_MISMATCH');
  assert.equal(oidcCalls, 0);
  assert.equal(dbCalls, 0);
});

test('handler requires the dedicated OIDC before database access', async () => {
  let dbCalls = 0;
  const handler = createStage2SchemaReleaseHandler({
    env: ENV,
    readRelease: bundle,
    verifyOidc: async () => { throw new Error('GITHUB_OIDC_WORKFLOW_MISMATCH'); },
    createClient: async () => { dbCalls += 1; throw new Error('should not connect'); }
  });
  const res = responseCapture();
  await handler({ method: 'POST', headers: { authorization: 'Bearer token' }, body: requestBody() }, res);
  assert.equal(res.state.statusCode, 403);
  assert.equal(res.state.body.code, 'GITHUB_OIDC_WORKFLOW_MISMATCH');
  assert.equal(dbCalls, 0);
});

test('preflight is read-only and proves exact baseline plus ledger state', async () => {
  let applyCalls = 0;
  let ended = 0;
  const handler = createStage2SchemaReleaseHandler({
    env: ENV,
    readRelease: bundle,
    verifyOidc: async () => {},
    createClient: async () => ({ end: async () => { ended += 1; } }),
    queryBaseline: async () => baseline(),
    inspectLedger: async () => ({ applied: [], pending: bundle().components.map((item) => item.id), complete: false }),
    applyRelease: async () => { applyCalls += 1; throw new Error('should not apply'); }
  });
  const res = responseCapture();
  await handler({ method: 'POST', headers: { authorization: 'Bearer token' }, body: requestBody() }, res);
  assert.equal(res.state.statusCode, 200);
  assert.equal(res.state.body.mode, 'preflight');
  assert.equal(res.state.body.read_only, true);
  assert.equal(res.state.body.committed, false);
  assert.equal(res.state.body.baseline_digest, DIGEST);
  assert.equal(res.state.body.ledger.pending.length, 5);
  assert.equal(applyCalls, 0);
  assert.equal(ended, 1);
});

test('apply rechecks baseline, completes exact ledger and preserves Baseline A digest', async () => {
  let baselineCalls = 0;
  let ledgerCalls = 0;
  const handler = createStage2SchemaReleaseHandler({
    env: ENV,
    readRelease: bundle,
    verifyOidc: async () => {},
    createClient: async () => ({ end: async () => {} }),
    queryBaseline: async () => { baselineCalls += 1; return baseline(); },
    inspectLedger: async () => {
      ledgerCalls += 1;
      if (ledgerCalls === 1) return { applied: [], pending: bundle().components.map((item) => item.id), complete: false };
      return { applied: bundle().components.map((item) => item.id), pending: [], complete: true };
    },
    applyRelease: async () => ({ release_id: RELEASE_ID, applied: bundle().components.map((item) => item.id), skipped: [] })
  });
  const res = responseCapture();
  await handler({ method: 'POST', headers: { authorization: 'Bearer token' }, body: requestBody({ mode: 'apply' }) }, res);
  assert.equal(res.state.statusCode, 200);
  assert.equal(res.state.body.mode, 'apply');
  assert.equal(res.state.body.committed, true);
  assert.equal(res.state.body.replay, false);
  assert.equal(res.state.body.applied.length, 5);
  assert.equal(res.state.body.ledger.complete, true);
  assert.equal(res.state.body.baseline_digest_before, DIGEST);
  assert.equal(res.state.body.baseline_digest_after, DIGEST);
  assert.equal(baselineCalls, 2);
});

test('baseline drift blocks schema apply', async () => {
  let applyCalls = 0;
  const handler = createStage2SchemaReleaseHandler({
    env: ENV,
    readRelease: bundle,
    verifyOidc: async () => {},
    createClient: async () => ({ end: async () => {} }),
    queryBaseline: async () => baseline(`sha256:${'c'.repeat(64)}`),
    inspectLedger: async () => ({ applied: [], pending: [], complete: false }),
    applyRelease: async () => { applyCalls += 1; return { applied: [], skipped: [] }; }
  });
  const res = responseCapture();
  await handler({ method: 'POST', headers: { authorization: 'Bearer token' }, body: requestBody({ mode: 'apply' }) }, res);
  assert.equal(res.state.statusCode, 409);
  assert.equal(res.state.body.code, 'STAGE2_SCHEMA_RELEASE_BASELINE_DIGEST_DRIFT');
  assert.equal(applyCalls, 0);
});
