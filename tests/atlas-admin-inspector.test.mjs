import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  SUPPORTED_KINDS,
  SQL_BY_KIND,
  PERSON_INSPECT_SQL,
  ACTIVITY_INSPECT_SQL,
  POLITY_INSPECT_SQL,
  ROLE_INSPECT_SQL,
  PERIOD_BASIS_INSPECT_SQL,
  RELATION_TYPE_INSPECT_SQL,
  SOURCE_INSPECT_SQL,
  readAdminObject
} = require('../server/atlas-admin-inspector-service.js');
const {
  INSPECTOR_SCHEMA,
  createAdminInspectorHandler
} = require('../server/atlas-admin-inspector-handler.js');
const {
  issueSessionToken,
  sessionCookie
} = require('../server/atlas-session-auth.js');

const NOW = Date.UTC(2026, 7, 15, 1, 50, 0);
const SECRET = 'test-admin-session-secret';
const PERSON_ID = '00000000-0000-4000-8000-000000000001';
const ACTIVITY_ID = '00000000-0000-4000-8000-000000000101';

function response() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.body = String(value || ''); }
  };
}

function sessionHeaders() {
  const token = issueSessionToken(SECRET, { now: NOW, ttlMs: 60_000, nonce: 'inspector-test' });
  return { cookie: sessionCookie(token, { maxAgeSeconds: 60 }).split(';')[0] };
}

const ENV = Object.freeze({
  SUPABASE_DB_URL: 'postgresql://example.invalid/atlas',
  ATLAS_SESSION_SECRET: SECRET
});

test('Admin inspector supports the bounded core authoritative object set only', () => {
  assert.deepEqual([...SUPPORTED_KINDS], [
    'person',
    'activity',
    'polity',
    'role',
    'period_basis',
    'relation_type',
    'source'
  ]);
  assert.deepEqual(Object.keys(SQL_BY_KIND), [...SUPPORTED_KINDS]);
});

test('Admin inspector SQL is read-only, parameterized, and exposes raw safe identity metadata', () => {
  for (const sql of Object.values(SQL_BY_KIND)) {
    assert.match(sql, /where[\s\S]+\$1::uuid/i);
    assert.doesNotMatch(sql, /\binsert\s+into\b|\bupdate\s+atlas_v2\b|\bdelete\s+from\b|\btruncate\b|\balter\s+table\b/i);
    assert.doesNotMatch(sql, /SUPABASE_DB_URL|ATLAS_SESSION_SECRET|ATLAS_MUTATION_TOKEN|password|bearer token/i);
  }

  for (const field of ['canonical_key', 'person_type', 'historicity', 'source_key', 'sha256', 'bytes']) {
    assert.match(PERSON_INSPECT_SQL, new RegExp(field));
  }
  for (const field of [
    'relation_type_id',
    'role_id',
    'period_basis_id',
    'activity_start_month',
    'activity_start_day',
    'activity_start_granularity',
    'activity_start_certainty',
    'activity_start_calendar',
    'activity_end_month',
    'activity_end_day',
    'activity_end_granularity',
    'activity_end_certainty',
    'activity_end_calendar',
    'confidence',
    'chronology_status',
    'legacy_source_key',
    'source_locator',
    'content_hash',
    'source_locator_key'
  ]) assert.match(ACTIVITY_INSPECT_SQL, new RegExp(field));

  assert.match(POLITY_INSPECT_SQL, /canonical_key/);
  assert.match(POLITY_INSPECT_SQL, /activity_ids/);
  assert.match(ROLE_INSPECT_SQL, /source_label/);
  assert.match(PERIOD_BASIS_INSPECT_SQL, /activity_ids/);
  assert.match(RELATION_TYPE_INSPECT_SQL, /category/);
  assert.match(SOURCE_INSPECT_SQL, /person_ids/);
  assert.match(SOURCE_INSPECT_SQL, /polity_ids/);
  assert.match(SOURCE_INSPECT_SQL, /activity_links/);
});

test('readAdminObject selects a fixed projection by kind and preserves raw database object shape', async () => {
  const row = {
    id: PERSON_ID,
    canonical_key: 'ateas',
    person_type: 'historical',
    historicity: 'historical',
    names: [{ id: '00000000-0000-4000-8000-000000000011', locale: 'en', name: 'Ateas', name_type: 'canonical', is_preferred: true }],
    descriptions: [],
    sources: [{ id: '00000000-0000-4000-8000-000000000021', source_key: 'source:ateas', sha256: null, bytes: null }],
    activities: [{ id: ACTIVITY_ID }]
  };
  const client = {
    async query(sql, params) {
      assert.equal(sql, PERSON_INSPECT_SQL);
      assert.deepEqual(params, [PERSON_ID]);
      return { rowCount: 1, rows: [row] };
    }
  };
  const result = await readAdminObject({ client, kind: 'person', id: PERSON_ID });
  assert.equal(result.kind, 'person');
  assert.equal(result.object.id, PERSON_ID);
  assert.equal(result.object.canonical_key, 'ateas');
  assert.equal(result.object.sources[0].source_key, 'source:ateas');

  await assert.rejects(
    () => readAdminObject({ client, kind: 'future_object', id: PERSON_ID }),
    /ADMIN_INSPECTOR_KIND_UNSUPPORTED/
  );
});

test('readAdminObject returns null for a valid UUID that is absent', async () => {
  const client = {
    async query(sql, params) {
      assert.equal(sql, SOURCE_INSPECT_SQL);
      assert.deepEqual(params, [PERSON_ID]);
      return { rowCount: 0, rows: [] };
    }
  };
  assert.equal(await readAdminObject({ client, kind: 'source', id: PERSON_ID }), null);
});

test('Admin inspector requires an admin session and does not accept bearer-only access', async () => {
  let factoryCalls = 0;
  const handler = createAdminInspectorHandler({
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
  await handler({ method: 'GET', headers: { authorization: 'Bearer any-server-token' } }, bearer);
  assert.equal(bearer.statusCode, 401);
  assert.equal(JSON.parse(bearer.body).code, 'ADMIN_SESSION_REQUIRED');
  assert.equal(factoryCalls, 0);
});

test('authenticated capabilities mode lists supported kinds without opening the database', async () => {
  let factoryCalls = 0;
  const handler = createAdminInspectorHandler({
    env: ENV,
    now: () => NOW,
    clientFactory: async () => {
      factoryCalls += 1;
      throw new Error('capabilities must not need database');
    }
  });
  const res = response();
  await handler({ method: 'GET', headers: sessionHeaders() }, res);
  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(body.ok, true);
  assert.equal(body.schema, INSPECTOR_SCHEMA);
  assert.equal(body.mode, 'capabilities');
  assert.equal(body.auth_method, 'session');
  assert.deepEqual(body.supported_kinds, [...SUPPORTED_KINDS]);
  assert.equal(factoryCalls, 0);
});

test('invalid kind and UUID fail before DB access', async () => {
  let factoryCalls = 0;
  const handler = createAdminInspectorHandler({
    env: ENV,
    now: () => NOW,
    clientFactory: async () => {
      factoryCalls += 1;
      throw new Error('invalid request must not open database');
    }
  });

  const badKind = response();
  await handler({ method: 'GET', headers: sessionHeaders(), query: { kind: 'merge_audit', id: PERSON_ID } }, badKind);
  assert.equal(badKind.statusCode, 400);
  assert.equal(JSON.parse(badKind.body).code, 'INVALID_OBJECT_KIND');

  const badId = response();
  await handler({ method: 'GET', headers: sessionHeaders(), query: { kind: 'person', id: 'not-a-uuid' } }, badId);
  assert.equal(badId.statusCode, 400);
  assert.equal(JSON.parse(badId.body).code, 'INVALID_OBJECT_ID');
  assert.equal(factoryCalls, 0);
});

test('authenticated object mode returns raw inspector object and closes the DB client', async () => {
  let ended = false;
  let readArgs = null;
  const handler = createAdminInspectorHandler({
    env: ENV,
    now: () => NOW,
    clientFactory: async (databaseUrl) => {
      assert.equal(databaseUrl, ENV.SUPABASE_DB_URL);
      return { async end() { ended = true; } };
    },
    readObject: async (args) => {
      readArgs = args;
      return {
        kind: 'activity',
        object: {
          id: ACTIVITY_ID,
          person_id: PERSON_ID,
          relation_type_id: '7ca4de8f-01d4-542c-acc1-a06848c6742c',
          content_hash: 'sha256:test'
        }
      };
    }
  });

  const res = response();
  await handler({
    method: 'GET',
    headers: sessionHeaders(),
    query: { kind: 'activity', id: ACTIVITY_ID }
  }, res);
  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(body.mode, 'object');
  assert.equal(body.auth_method, 'session');
  assert.equal(body.kind, 'activity');
  assert.equal(body.object.id, ACTIVITY_ID);
  assert.equal(body.object.content_hash, 'sha256:test');
  assert.equal(readArgs.kind, 'activity');
  assert.equal(readArgs.id, ACTIVITY_ID);
  assert.equal(ended, true);
});

test('Admin inspector returns 404 for absent object and rejects non-GET', async () => {
  let ended = false;
  const handler = createAdminInspectorHandler({
    env: ENV,
    now: () => NOW,
    clientFactory: async () => ({ async end() { ended = true; } }),
    readObject: async () => null
  });

  const missing = response();
  await handler({ method: 'GET', headers: sessionHeaders(), query: { kind: 'person', id: PERSON_ID } }, missing);
  assert.equal(missing.statusCode, 404);
  assert.equal(JSON.parse(missing.body).code, 'OBJECT_NOT_FOUND');
  assert.equal(ended, true);

  const post = response();
  await handler({ method: 'POST', headers: sessionHeaders() }, post);
  assert.equal(post.statusCode, 405);
  assert.equal(JSON.parse(post.body).code, 'METHOD_NOT_ALLOWED');
});
