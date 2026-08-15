import assert from 'node:assert/strict';
import test from 'node:test';
import captureHandlerModule from '../server/atlas-p11-baseline-b-capture-handler.js';
import oidcModule from '../server/atlas-p11-baseline-b-github-oidc.js';
import productionService from '../server/atlas-p11-baseline-b-production-service.js';

const {
  CAPTURE_ID,
  MARKER,
  createP11BaselineBCaptureHandler,
  requireEnvelope,
  requireDeployment
} = captureHandlerModule;
const {
  EXPECTED_AUDIENCE,
  EXPECTED_REPOSITORY,
  EXPECTED_REPOSITORY_ID,
  EXPECTED_REF,
  EXPECTED_WORKFLOW_REF,
  ISSUER,
  verifyTrustClaims
} = oidcModule;
const { inspectProductionBaselineBReadiness } = productionService;

const SHA = 'a'.repeat(40);
const ENV = Object.freeze({
  VERCEL_ENV: 'production',
  VERCEL_GIT_COMMIT_REF: 'main',
  VERCEL_GIT_COMMIT_SHA: SHA,
  VERCEL_GIT_REPO_OWNER: 'JezCH',
  VERCEL_GIT_REPO_SLUG: 'atlas-person-db',
  SUPABASE_DB_URL: 'postgresql://fixture'
});

function request(mode, overrides = {}) {
  return {
    method: 'POST',
    headers: { authorization: 'Bearer fixture-token' },
    body: {
      deployment_sha: SHA,
      capture_id: CAPTURE_ID,
      approval: `CAPTURE:${CAPTURE_ID}`,
      mode,
      ...overrides
    }
  };
}

function responseRecorder() {
  const record = { statusCode: null, headers: {}, body: null };
  return {
    record,
    setHeader(name, value) { record.headers[String(name).toLowerCase()] = value; },
    end(value) { record.body = JSON.parse(String(value)); },
    get statusCode() { return record.statusCode; },
    set statusCode(value) { record.statusCode = value; }
  };
}

test('P11 capture envelope is exact and rejects any undeclared input surface', () => {
  assert.deepEqual(requireEnvelope(request('capture').body), {
    deploymentSha: SHA,
    captureId: CAPTURE_ID,
    mode: 'capture'
  });
  assert.throws(() => requireEnvelope(request('capture', { mutate: true }).body), /P11_CAPTURE_INPUTS_FORBIDDEN:mutate/);
  assert.throws(() => requireEnvelope(request('capture', { approval: 'APPLY:anything' }).body), /P11_CAPTURE_APPROVAL_REQUIRED/);
  assert.throws(() => requireEnvelope(request('write').body), /P11_CAPTURE_MODE_INVALID/);
});

test('P11 capture deployment attestation requires exact Production main repository SHA', () => {
  assert.doesNotThrow(() => requireDeployment(ENV, SHA));
  assert.throws(() => requireDeployment({ ...ENV, VERCEL_ENV: 'preview' }, SHA), /P11_CAPTURE_NOT_PRODUCTION_MAIN/);
  assert.throws(() => requireDeployment({ ...ENV, VERCEL_GIT_COMMIT_REF: 'feature' }, SHA), /P11_CAPTURE_NOT_PRODUCTION_MAIN/);
  assert.throws(() => requireDeployment({ ...ENV, VERCEL_GIT_REPO_SLUG: 'other' }, SHA), /P11_CAPTURE_REPOSITORY_MISMATCH/);
  assert.throws(() => requireDeployment({ ...ENV, VERCEL_GIT_COMMIT_SHA: 'b'.repeat(40) }, SHA), /DEPLOYMENT_SHA_MISMATCH/);
});

test('P11 OIDC trust is scoped to one manual Production workflow and exact SHA', () => {
  const payload = {
    iss: ISSUER,
    aud: EXPECTED_AUDIENCE,
    repository: EXPECTED_REPOSITORY,
    repository_id: EXPECTED_REPOSITORY_ID,
    ref: EXPECTED_REF,
    workflow_ref: EXPECTED_WORKFLOW_REF,
    environment: 'production',
    event_name: 'workflow_dispatch',
    sha: SHA
  };
  assert.doesNotThrow(() => verifyTrustClaims(payload, SHA));
  assert.throws(() => verifyTrustClaims({ ...payload, event_name: 'push' }, SHA), /P11_CAPTURE_OIDC_CONTEXT_MISMATCH/);
  assert.throws(() => verifyTrustClaims({ ...payload, environment: 'preview' }, SHA), /P11_CAPTURE_OIDC_CONTEXT_MISMATCH/);
  assert.throws(() => verifyTrustClaims({ ...payload, sha: 'b'.repeat(40) }, SHA), /P11_CAPTURE_OIDC_SHA_MISMATCH/);
});

test('P11 readiness handler authenticates before opening DB and returns read-only state', async () => {
  const calls = [];
  const handler = createP11BaselineBCaptureHandler({
    env: ENV,
    verifyOidc: async (token, options) => { calls.push(['oidc', token, options.expectedSha]); },
    createClient: async () => { calls.push(['db']); return { end: async () => calls.push(['end']) }; },
    inspectReadiness: async () => ({ read_only: true, database_write_committed: false, readiness: { ready: true, blockers: [] } })
  });
  const res = responseRecorder();
  await handler(request('readiness'), res);

  assert.equal(res.record.statusCode, 200);
  assert.equal(res.record.body.ok, true);
  assert.equal(res.record.body.marker, MARKER);
  assert.equal(res.record.body.read_only, true);
  assert.equal(res.record.body.database_write_committed, false);
  assert.deepEqual(calls.map((item) => item[0]), ['oidc', 'db', 'end']);
});

test('P11 invalid OIDC fails before any database client is created', async () => {
  let dbOpened = false;
  const handler = createP11BaselineBCaptureHandler({
    env: ENV,
    verifyOidc: async () => { throw new Error('P11_CAPTURE_OIDC_AUDIENCE_MISMATCH'); },
    createClient: async () => { dbOpened = true; return {}; }
  });
  const res = responseRecorder();
  await handler(request('capture'), res);

  assert.equal(res.record.statusCode, 403);
  assert.equal(res.record.body.code, 'P11_CAPTURE_OIDC_AUDIENCE_MISMATCH');
  assert.equal(dbOpened, false);
});

test('P11 capture returns the exact Baseline B document without enabling writes', async () => {
  const baseline = {
    schema: 'atlas-stage2-baseline-b/v1',
    semantic_version: 'v2-relation-full-temporal',
    baseline_digest: `sha256:${'1'.repeat(64)}`,
    readiness: { ready: true, blockers: [] },
    authority: { production_mutation_authorized: false },
    datasets: { persons: [] }
  };
  const handler = createP11BaselineBCaptureHandler({
    env: ENV,
    verifyOidc: async () => ({}),
    createClient: async () => ({ end: async () => {} }),
    captureBaseline: async () => ({ read_only: true, database_write_committed: false, baseline })
  });
  const res = responseRecorder();
  await handler(request('capture'), res);

  assert.equal(res.record.statusCode, 200);
  assert.equal(res.record.body.mode, 'capture');
  assert.deepEqual(res.record.body.result.baseline, baseline);
  assert.equal(res.record.body.result.baseline.authority.production_mutation_authorized, false);
});

test('P11 Production readiness service asks PostgreSQL for a repeatable-read read-only transaction', async () => {
  const calls = [];
  const client = {
    async query(sql) { calls.push(String(sql)); return { rows: [] }; }
  };
  const result = await inspectProductionBaselineBReadiness(client, {
    inspectReadiness: async () => ({ ready: true, blockers: [] })
  });
  assert.deepEqual(calls, [
    'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY',
    'COMMIT'
  ]);
  assert.equal(result.read_only, true);
  assert.equal(result.database_write_committed, false);
  assert.equal(result.readiness.ready, true);
});

test('P11 Production readiness service rolls back a failed read-only inspection', async () => {
  const calls = [];
  const client = {
    async query(sql) { calls.push(String(sql)); return { rows: [] }; }
  };
  await assert.rejects(
    inspectProductionBaselineBReadiness(client, {
      inspectReadiness: async () => { throw new Error('fixture-read-failure'); }
    }),
    /fixture-read-failure/
  );
  assert.deepEqual(calls, [
    'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY',
    'ROLLBACK'
  ]);
});
