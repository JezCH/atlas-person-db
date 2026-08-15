import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  SYSTEM_STATUS_SCHEMA,
  runtimeIdentity,
  configurationStatus,
  quoteIdentifier,
  exactTableCounts,
  duplicateLifecycle
} = require('../server/atlas-admin-system-status-service.js');
const {
  createAdminSystemStatusHandler
} = require('../server/atlas-admin-system-status-handler.js');
const {
  issueSessionToken,
  sessionCookie
} = require('../server/atlas-session-auth.js');

const serviceSource = fs.readFileSync(new URL('../server/atlas-admin-system-status-service.js', import.meta.url), 'utf8');
const handlerSource = fs.readFileSync(new URL('../server/atlas-admin-system-status-handler.js', import.meta.url), 'utf8');
const NOW = Date.UTC(2026, 7, 15, 2, 10, 0);
const SECRET = 'status-session-secret';
const ENV = Object.freeze({
  SUPABASE_DB_URL: 'postgresql://secret-user:secret-pass@example.invalid/atlas',
  SUPABASE_DB_CA: 'SECRET-CA',
  ATLAS_ADMIN_PASSWORD: 'SECRET-PASSWORD',
  ATLAS_SESSION_SECRET: SECRET,
  ATLAS_MUTATION_TOKEN: 'SECRET-MUTATION',
  VERCEL: '1',
  VERCEL_ENV: 'preview',
  VERCEL_URL: 'atlas-preview.example.invalid',
  VERCEL_GIT_COMMIT_SHA: '0123456789abcdef0123456789abcdef01234567',
  VERCEL_GIT_COMMIT_REF: 'agent/ui-information-completeness',
  VERCEL_REGION: 'icn1'
});

function response() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.body = String(value || ''); }
  };
}

function sessionHeaders(env = ENV) {
  const token = issueSessionToken(env.ATLAS_SESSION_SECRET, { now: NOW, ttlMs: 60_000, nonce: 'status-test' });
  return { cookie: sessionCookie(token, { maxAgeSeconds: 60 }).split(';')[0] };
}

test('runtime identity exposes deploy metadata but no secret configuration values', () => {
  assert.deepEqual(runtimeIdentity(ENV), {
    provider: 'vercel',
    environment: 'preview',
    deployment_url: 'atlas-preview.example.invalid',
    git_commit_sha: '0123456789abcdef0123456789abcdef01234567',
    git_commit_ref: 'agent/ui-information-completeness',
    region: 'icn1'
  });
  assert.deepEqual(runtimeIdentity({}), {
    provider: 'unknown',
    environment: null,
    deployment_url: null,
    git_commit_sha: null,
    git_commit_ref: null,
    region: null
  });
});

test('configuration status exposes presence booleans only', () => {
  const status = configurationStatus(ENV);
  assert.equal(status.database.configured, true);
  assert.equal(status.database.verified_ca_configured, true);
  assert.equal(status.admin_authentication.password_configured, true);
  assert.equal(status.admin_authentication.dedicated_session_secret_configured, true);
  assert.equal(status.admin_authentication.mutation_token_configured, true);
  assert.equal(status.admin_authentication.session_signing_available, true);
  const serialized = JSON.stringify(status);
  for (const secret of [ENV.SUPABASE_DB_URL, ENV.SUPABASE_DB_CA, ENV.ATLAS_ADMIN_PASSWORD, ENV.ATLAS_SESSION_SECRET, ENV.ATLAS_MUTATION_TOKEN]) {
    assert.equal(serialized.includes(secret), false);
  }
});

test('exact table counts use server-discovered identifiers and preserve exact safe integers', async () => {
  assert.equal(quoteIdentifier('persons'), '"persons"');
  assert.equal(quoteIdentifier('odd"name'), '"odd""name"');
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(sql);
      if (/"persons"/.test(sql)) return { rows: [{ count: '151' }] };
      if (/"person_politics_v2"/.test(sql)) return { rows: [{ count: '212' }] };
      throw new Error(`unexpected query ${sql}`);
    }
  };
  const counts = await exactTableCounts(client, ['persons', 'person_politics_v2']);
  assert.deepEqual(counts, { persons: 151, person_politics_v2: 212 });
  assert.equal(calls.length, 2);
  assert.match(calls[0], /^select count\(\*\)::bigint as count from atlas_v2\."persons"$/);
});

test('duplicate lifecycle reports aggregate queue/review/merge/requirement state without loading candidate detail', async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(sql);
      if (/from atlas_v2\.person_duplicate_candidates/.test(sql)) return { rows: [{
        active: 3, stale: 2, open: 1, merge: 1, keep_separate: 0, review: 1,
        detector_versions: ['p10-v2-person-revalidation/v2'], last_candidate_update_at: '2026-08-15T02:00:00Z'
      }] };
      if (/from atlas_v2\.person_duplicate_reviews/.test(sql)) return { rows: [{ total: 9, latest_reviewed_at: '2026-08-15T01:00:00Z' }] };
      if (/from atlas_v2\.person_merge_audits/.test(sql)) return { rows: [{ total: 2, latest_merged_at: '2026-08-15T01:30:00Z' }] };
      if (/from atlas_v2\.person_duplicate_revalidation_requirements/.test(sql)) return { rows: [{ active: 1, retired: 4, requirement_versions: ['p10-revalidation-requirement/v1'] }] };
      throw new Error(`unexpected query ${sql}`);
    }
  };
  const lifecycle = await duplicateLifecycle(client, [
    'person_duplicate_candidates',
    'person_duplicate_reviews',
    'person_merge_audits',
    'person_duplicate_revalidation_requirements'
  ]);
  assert.equal(lifecycle.available, true);
  assert.deepEqual(lifecycle.summary, { active: 3, stale: 2, open: 1, merge: 1, keep_separate: 0, review: 1 });
  assert.deepEqual(lifecycle.detector_versions_observed, ['p10-v2-person-revalidation/v2']);
  assert.equal(lifecycle.reviews.total, 9);
  assert.equal(lifecycle.merge_audits.total, 2);
  assert.equal(lifecycle.revalidation_requirements.active, 1);
  assert.equal(lifecycle.revalidation_requirements.retired, 4);
  assert.equal(calls.some((sql) => /select\s+id,person_low_id|evidence|rationale/i.test(sql)), false);
});

test('system status composes authoritative semantic/readiness services and never fabricates GitHub Actions state', () => {
  assert.match(serviceSource, /inspectAuthoringReadiness/);
  assert.match(serviceSource, /SEMANTIC_KEY_VERSION/);
  assert.match(serviceSource, /DETECTOR_VERSION/);
  assert.match(serviceSource, /REVALIDATION_SEMANTIC_VERSION/);
  assert.match(serviceSource, /personMergeExecutionState/);
  assert.match(serviceSource, /atlas-person-duplicate-revalidation-readiness\.js/);
  assert.match(serviceSource, /github_actions_status_embedded:\s*false/);
  assert.match(serviceSource, /GITHUB_ACTIONS_IS_EXTERNAL_TO_RUNTIME/);
  assert.doesNotMatch(serviceSource, /\binsert\s+into\b|\bupdate\s+atlas_v2\b|\bdelete\s+from\b|\btruncate\b|\balter\s+table\b/i);
  assert.doesNotMatch(handlerSource, /bearerToken|createMutationAuthorizer|createHeaderAuthorizer/);
});

test('Admin system status requires an admin session and rejects bearer-only access before DB connection', async () => {
  let factoryCalls = 0;
  const handler = createAdminSystemStatusHandler({
    env: ENV,
    now: () => NOW,
    clientFactory: async () => {
      factoryCalls += 1;
      throw new Error('must not open database');
    }
  });

  const anonymous = response();
  await handler({ method: 'GET' }, anonymous);
  assert.equal(anonymous.statusCode, 401);
  assert.equal(JSON.parse(anonymous.body).code, 'ADMIN_SESSION_REQUIRED');

  const bearer = response();
  await handler({ method: 'GET', headers: { authorization: 'Bearer SECRET-MUTATION' } }, bearer);
  assert.equal(bearer.statusCode, 401);
  assert.equal(JSON.parse(bearer.body).code, 'ADMIN_SESSION_REQUIRED');
  assert.equal(factoryCalls, 0);
});

test('authenticated Admin system status returns a safe snapshot and always closes the client', async () => {
  let ended = false;
  let inspectArgs = null;
  const snapshot = {
    schema: SYSTEM_STATUS_SCHEMA,
    runtime: { provider: 'unknown', environment: null, deployment_url: null, git_commit_sha: null, git_commit_ref: null, region: null },
    configuration: configurationStatus(ENV),
    database: { reachable: true, server_version: '17.0', atlas_v2_schema_present: true },
    migration: { available: true, value: null },
    semantics: { activity_semantic_key_version: 'atlas-activity-semantic-key/v2' },
    counts: { atlas_v2_table_count: 2, tables: { persons: 151, person_politics_v2: 212 } },
    readiness: { authoring: { available: true, value: { ready: true } }, p10_duplicate_revalidation: { available: false, reason: 'not present' } },
    duplicate_lifecycle: { available: true, value: { available: true, summary: { active: 0 } } },
    verification: { github_actions_status_embedded: false, reason: 'GITHUB_ACTIONS_IS_EXTERNAL_TO_RUNTIME' }
  };
  const handler = createAdminSystemStatusHandler({
    env: ENV,
    now: () => NOW,
    clientFactory: async (databaseUrl) => {
      assert.equal(databaseUrl, ENV.SUPABASE_DB_URL);
      return { async end() { ended = true; } };
    },
    inspectStatus: async (args) => {
      inspectArgs = args;
      return snapshot;
    }
  });

  const res = response();
  await handler({ method: 'GET', headers: sessionHeaders() }, res);
  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(body.ok, true);
  assert.equal(body.schema, SYSTEM_STATUS_SCHEMA);
  assert.equal(body.auth_method, 'session');
  assert.equal(body.counts.tables.persons, 151);
  assert.equal(inspectArgs.env, ENV);
  assert.equal(ended, true);
  const serialized = JSON.stringify(body);
  for (const secret of [ENV.SUPABASE_DB_URL, ENV.SUPABASE_DB_CA, ENV.ATLAS_ADMIN_PASSWORD, ENV.ATLAS_SESSION_SECRET, ENV.ATLAS_MUTATION_TOKEN]) {
    assert.equal(serialized.includes(secret), false);
  }
});

test('Admin system status rejects non-GET and reports missing DB configuration after valid session', async () => {
  const post = response();
  const handler = createAdminSystemStatusHandler({ env: ENV, now: () => NOW });
  await handler({ method: 'POST', headers: sessionHeaders() }, post);
  assert.equal(post.statusCode, 405);
  assert.equal(JSON.parse(post.body).code, 'METHOD_NOT_ALLOWED');

  const env = { ATLAS_SESSION_SECRET: SECRET };
  const missingDb = response();
  await createAdminSystemStatusHandler({ env, now: () => NOW })({ method: 'GET', headers: sessionHeaders(env) }, missingDb);
  assert.equal(missingDb.statusCode, 503);
  assert.equal(JSON.parse(missingDb.body).code, 'DATABASE_NOT_CONFIGURED');
});
