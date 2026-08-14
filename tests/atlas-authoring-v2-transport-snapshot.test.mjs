import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  TRANSPORT_VERSION,
  normalizeTransportContext,
  buildSnapshot
} = require('../server/atlas-authoring-manifest-v2-native-service.js');

const RUNTIME_SHA = 'a'.repeat(40);
const AUTHORING_SHA = 'b'.repeat(40);
const TRANSPORT = {
  version: TRANSPORT_VERSION,
  runtime_sha: RUNTIME_SHA,
  authoring_sha: AUTHORING_SHA,
  manifest_path: 'authoring/requests/example.json'
};

test('native authoring transport context requires two independent exact SHAs', () => {
  assert.deepEqual(normalizeTransportContext(TRANSPORT), TRANSPORT);
  assert.throws(() => normalizeTransportContext({ ...TRANSPORT, runtime_sha: AUTHORING_SHA.slice(1) }), /RUNTIME_SHA_INVALID/);
  assert.throws(() => normalizeTransportContext({ ...TRANSPORT, authoring_sha: 'main' }), /AUTHORING_SHA_INVALID/);
  assert.throws(() => normalizeTransportContext({ ...TRANSPORT, manifest_path: '../example.json' }), /MANIFEST_PATH_INVALID/);
  assert.throws(() => normalizeTransportContext({ ...TRANSPORT, version: 1 }), /TRANSPORT_VERSION_INVALID/);
});

test('new Stage 2-native snapshot preserves original runtime and authoring provenance', () => {
  const snapshot = buildSnapshot({
    personResult: { id: '11111111-1111-4111-8111-111111111111', replay: false },
    polityId: '22222222-2222-4222-8222-222222222222',
    polityDisposition: 'existing_uuid',
    roleId: null,
    roleDisposition: 'none',
    activityResult: {
      id: '33333333-3333-4333-8333-333333333333',
      semantic_key: 'semantic-key',
      semantic_hash: 'c'.repeat(64),
      row: {
        relation_type_id: '44444444-4444-4444-8444-444444444444',
        period_basis_id: '55555555-5555-4555-8555-555555555555',
        activity_start: 100,
        activity_start_month: null,
        activity_start_day: null,
        activity_start_granularity: 'year',
        activity_start_certainty: 'exact',
        activity_start_calendar: 'proleptic_gregorian',
        activity_end: 101,
        activity_end_month: null,
        activity_end_day: null,
        activity_end_granularity: 'year',
        activity_end_certainty: 'exact',
        activity_end_calendar: 'proleptic_gregorian'
      }
    },
    transport: TRANSPORT
  });
  assert.deepEqual(snapshot.transport, TRANSPORT);
  assert.equal(snapshot.version, 2);
  assert.equal(snapshot.semantic_version, 'v2-relation-full-temporal');
});

test('local/rehearsal native snapshots remain valid without Production transport metadata', () => {
  const normalized = normalizeTransportContext(null);
  assert.equal(normalized, null);
  assert.throws(() => normalizeTransportContext(null, { required: true }), /TRANSPORT_REQUIRED/);
});
