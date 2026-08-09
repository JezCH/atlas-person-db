import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const planner = require('../atlas-v2-command-planner.js');

const row = {
  person_name: 'Ada Lovelace',
  politic_name: 'United Kingdom',
  activity_start: 1842,
  activity_end: 1852,
  role: 'Mathematician',
  period_basis: 'intellectual_activity',
  notes: null
};

test('create plans exact normalized resolutions and relationship upsert without writes', () => {
  const result = planner.plan('create', row);
  assert.equal(result.commit, false);
  assert.equal(result.writes_performed, 0);
  assert.equal(result.target_schema, 'atlas_v2');
  assert.equal(result.blockers.length, 0);
  assert.deepEqual(result.normalized_payload, row);
  assert.deepEqual(result.commands.map((x) => x.type), [
    'RESOLVE_PERSON_EXACT',
    'RESOLVE_POLITY_EXACT',
    'RESOLVE_ROLE_EXACT',
    'RESOLVE_PERIOD_BASIS_EXACT',
    'UPSERT_PERSON_POLITICS_V2'
  ]);
  assert.equal(result.commands.at(-1).table, 'atlas_v2.person_politics_v2');
});

test('update carries deterministic legacy lineage and normalized value', () => {
  const result = planner.plan('update', { id: 17, value: row });
  assert.equal(result.blockers.length, 0);
  assert.equal(result.commands.at(-1).legacy_record_id, 17);
  assert.equal(result.commands.at(-1).legacy_source_key, planner.activityKey(row));
  assert.deepEqual(result.normalized_payload, {id:17,value:row});
});

test('delete resolves only by lineage/preimage and never fuzzy identity', () => {
  const result = planner.plan('delete', { id: 17 });
  assert.equal(result.blockers.length, 0);
  assert.deepEqual(result.commands.map((x) => x.type), [
    'RESOLVE_RELATIONSHIP_BY_LEGACY_LINEAGE',
    'RETIRE_OR_DELETE_PERSON_POLITICS_V2'
  ]);
  assert.equal(JSON.stringify(result).includes('similar'), false);
});

test('unresolved required identity fails closed with blockers', () => {
  const result = planner.plan('create', { ...row, person_name: '', politic_name: '' });
  assert.deepEqual(result.blockers.map((x) => x.code).sort(), ['PERSON_IDENTITY_REQUIRED', 'POLITY_IDENTITY_REQUIRED']);
  assert.equal(result.commit, false);
});

test('invalid chronology and unsupported period basis fail before transaction', () => {
  const result = planner.plan('create', {...row,activity_start:0,activity_end:1800,period_basis:'guess'});
  assert.deepEqual(result.blockers.map(x=>x.code).sort(), ['ACTIVITY_START_OUT_OF_RANGE','PERIOD_BASIS_UNSUPPORTED']);
});

test('empty role fails closed because current live v2 role_id is not nullable', () => {
  const result = planner.plan('create', {...row,role:null});
  assert.deepEqual(result.blockers.map(x=>x.code), ['ROLE_REQUIRED_BY_CURRENT_V2_SCHEMA']);
  assert.equal(result.commands.find(x=>x.type==='RESOLVE_ROLE_EXACT').lookup.code_or_name,null);
  assert.equal(result.normalized_payload.role,null);
  assert.equal(JSON.stringify(result).includes('unspecified'), false);
});

test('normalization produces one canonical payload for retry identity', () => {
  const result = planner.plan('create', {
    ...row,
    person_name: '  Ada   Lovelace  ',
    politic_name: ' United   Kingdom ',
    role: ' Mathematician ',
    notes: '  reviewed   note  '
  });
  assert.equal(result.blockers.length, 0);
  assert.deepEqual(result.normalized_payload, {
    ...row,
    notes: 'reviewed note'
  });
});

test('import creates isolated normalized row command groups', () => {
  const result = planner.plan('import', [row, { ...row, person_name: 'Grace Hopper', activity_start: 1944, activity_end: 1986 }]);
  assert.equal(result.commands.filter((x) => x.type === 'BEGIN_IMPORT_ROW').length, 2);
  assert.equal(result.commands.filter((x) => x.type === 'UPSERT_PERSON_POLITICS_V2').length, 2);
  assert.equal(result.normalized_payload.length,2);
  assert.equal(result.writes_performed, 0);
});

test('unsupported operation is blocked', () => {
  const result = planner.plan('dual-write', row);
  assert.deepEqual(result.blockers, [{ code: 'UNSUPPORTED_OPERATION', operation: 'dual-write' }]);
  assert.equal(result.commands.length, 0);
  assert.equal(result.commit, false);
});
