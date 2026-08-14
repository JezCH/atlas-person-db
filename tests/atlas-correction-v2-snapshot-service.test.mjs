import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  MAX_V2_SNAPSHOT_ACTIVITY_IDS,
  normalizeV2SnapshotActivityIds,
  snapshotDigest,
  createCorrectionV2TargetSnapshot
} = require('../server/atlas-correction-v2-snapshot-service.js');

const A = '15777776-b739-5988-9a04-472b2d6629c7';
const B = 'd22767c7-4e64-5c59-a5d9-60e32d146a4c';

function makeClient({ omit = null } = {}) {
  const calls = [];
  const activities = {
    [A]: {
      id:A,person_id:'e0596736-50b6-53a1-9edc-61a5f108c3c7',polity_id:'3a29a08a-d111-50d5-916f-f5c11b5eabaf',relation_type_id:null,
      role_id:'a33083bd-9e14-5381-ab33-2d75738f262c',period_basis_id:'19bbe662-2a30-5a7e-8073-8d19e1e2299c',activity_start:188,
      activity_start_month:null,activity_start_day:null,activity_start_granularity:null,activity_start_certainty:null,activity_start_calendar:null,
      activity_end:194,activity_end_month:null,activity_end_day:null,activity_end_granularity:null,activity_end_certainty:null,activity_end_calendar:null,
      confidence:'legacy_asserted',chronology_status:'exact_as_recorded',legacy_source_key:'legacy:a',notes:'n1',source_locator:{b:2,a:1},content_hash:'h1'
    },
    [B]: {
      id:B,person_id:'2c770996-e69b-5429-bb78-7dc3b1a503cf',polity_id:'3a29a08a-d111-50d5-916f-f5c11b5eabaf',relation_type_id:null,
      role_id:'a33083bd-9e14-5381-ab33-2d75738f262c',period_basis_id:'19bbe662-2a30-5a7e-8073-8d19e1e2299c',activity_start:188,
      activity_start_month:null,activity_start_day:null,activity_start_granularity:null,activity_start_certainty:null,activity_start_calendar:null,
      activity_end:194,activity_end_month:null,activity_end_day:null,activity_end_granularity:null,activity_end_certainty:null,activity_end_calendar:null,
      confidence:'legacy_asserted',chronology_status:'exact_as_recorded',legacy_source_key:'legacy:b',notes:'n2',source_locator:{x:1},content_hash:'h2'
    }
  };
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql: String(sql), params });
      const q = String(sql);
      if (/^begin isolation level repeatable read read only$/i.test(q)) return { rows: [] };
      if (/current_setting\('transaction_read_only'\)/.test(q)) return { rows: [{ read_only: 'on' }] };
      if (/from atlas_v2\.person_politics_v2/.test(q)) {
        const ids = params[0].filter((id) => id !== omit);
        return { rows: ids.map((id) => activities[id]).filter(Boolean).sort((x,y)=>x.id.localeCompare(y.id)) };
      }
      if (/from atlas_v2\.person_politics_sources/.test(q)) {
        return { rows: [
          { person_politics_id:A, source_id:'00000000-0000-4000-8000-000000000001', source_locator_key:'A locator' },
          { person_politics_id:B, source_id:'00000000-0000-4000-8000-000000000002', source_locator_key:'B locator' }
        ].filter((row)=>params[0].includes(row.person_politics_id)) };
      }
      if (/from atlas_v2\.chronology_claims/.test(q)) return { rows: [{ id:'00000000-0000-4000-8000-000000000003', person_politics_id:A, claim_type:'outer_range', start_year:188, end_year:194 }].filter((row)=>params[0].includes(row.person_politics_id)) };
      if (/from atlas_v2\.relationship_descriptions/.test(q)) return { rows: [{ id:'00000000-0000-4000-8000-000000000004', person_politics_id:B, locale:'en', content:'description' }].filter((row)=>params[0].includes(row.person_politics_id)) };
      if (/^commit$/i.test(q) || /^rollback$/i.test(q)) return { rows: [] };
      throw new Error(`unexpected query: ${q}`);
    }
  };
}

test('v2 snapshot accepts the full 54-Activity frontier in one bounded request', () => {
  assert.equal(MAX_V2_SNAPSHOT_ACTIVITY_IDS, 100);
  const values = Array.from({ length: 54 }, (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12,'0')}`);
  assert.equal(normalizeV2SnapshotActivityIds(values).length, 54);
  assert.throws(() => normalizeV2SnapshotActivityIds(Array.from({ length: 101 }, (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12,'0')}`)), /LIMIT_EXCEEDED/);
});

test('v2 snapshot normalizes, de-duplicates and sorts literal Activity UUIDs', () => {
  assert.deepEqual(normalizeV2SnapshotActivityIds([B.toUpperCase(), A, B]), [A, B].sort());
  assert.throws(() => normalizeV2SnapshotActivityIds([]), /REQUIRED/);
  assert.throws(() => normalizeV2SnapshotActivityIds(['not-a-uuid']), /INVALID/);
});

test('snapshot digest is independent of JSON object key order but not row order/content', () => {
  const left = { a:1, b:{ y:2, x:3 }, rows:[{z:1,a:2}] };
  const right = { rows:[{a:2,z:1}], b:{x:3,y:2}, a:1 };
  assert.equal(snapshotDigest(left), snapshotDigest(right));
  assert.notEqual(snapshotDigest(left), snapshotDigest({ ...right, a:2 }));
});

test('exact v2 snapshot reads Activity semantic fields and all Activity child evidence in one read-only transaction', async () => {
  const client = makeClient();
  const result = await createCorrectionV2TargetSnapshot(client, [B, A]);
  assert.equal(result.schema, 'atlas-correction-v2-target-snapshot/v1');
  assert.deepEqual(result.activity_ids, [A, B].sort());
  assert.equal(result.activities.length, 2);
  assert.equal(result.normalized_activity_source_links.length, 2);
  assert.equal(result.chronology_claims.length, 1);
  assert.equal(result.relationship_descriptions.length, 1);
  assert.match(result.snapshot_digest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(result.read_only, true);
  assert.equal(result.committed, false);
  assert.ok(client.calls.some((call) => /^begin isolation level repeatable read read only$/i.test(call.sql)));
  assert.ok(client.calls.some((call) => /^commit$/i.test(call.sql)));
  assert.equal(client.calls.some((call) => /^rollback$/i.test(call.sql)), false);
  assert.equal(result.activities[0].relation_type_id, null);
  assert.ok(Object.hasOwn(result.activities[0], 'activity_start_granularity'));
  assert.ok(Object.hasOwn(result.activities[0], 'activity_end_calendar'));
});

test('missing Activity fails closed and rolls back without returning a partial snapshot', async () => {
  const client = makeClient({ omit: B });
  await assert.rejects(
    () => createCorrectionV2TargetSnapshot(client, [A, B]),
    (error) => {
      assert.equal(error.message, 'CORRECTION_V2_SNAPSHOT_TARGET_NOT_FOUND');
      assert.deepEqual(error.missing_activity_ids, [B]);
      return true;
    }
  );
  assert.ok(client.calls.some((call) => /^rollback$/i.test(call.sql)));
  assert.equal(client.calls.some((call) => /^commit$/i.test(call.sql)), false);
});
