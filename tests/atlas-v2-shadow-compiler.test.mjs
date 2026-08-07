import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const compiler = require('../atlas-v2-shadow-compiler.js');

const row = {
  person_name: 'Ada Lovelace',
  politic_name: 'United Kingdom',
  activity_start: 1842,
  activity_end: 1852,
  role: 'Mathematician',
  period_basis: 'intellectual_activity',
  notes: null
};

test('create compiles one deterministic non-committing mutation', () => {
  const a = compiler.compile('create', row);
  const b = compiler.compile('create', row);
  assert.deepEqual(a, b);
  assert.equal(a.commit, false);
  assert.equal(a.writes_performed, 0);
  assert.equal(a.mutations.length, 1);
  assert.equal(a.mutations[0].type, 'UPSERT_ACTIVITY');
});

test('update carries legacy record identity but never commits', () => {
  const result = compiler.compile('update', { id: 7, value: row });
  assert.equal(result.commit, false);
  assert.equal(result.writes_performed, 0);
  assert.equal(result.mutations[0].legacy_record_id, 7);
});

test('delete compiles intent only', () => {
  const result = compiler.compile('delete', { id: 9 });
  assert.equal(result.mutations[0].type, 'DELETE_ACTIVITY');
  assert.equal(result.mutations[0].legacy_record_id, 9);
  assert.equal(result.commit, false);
});

test('import compiles one intent per row without DB access', () => {
  const result = compiler.compile('import', [row, { ...row, person_name: 'Grace Hopper', activity_start: 1944, activity_end: 1986 }]);
  assert.equal(result.mutations.length, 2);
  assert.equal(result.writes_performed, 0);
});

test('unsupported operations fail closed', () => {
  const result = compiler.compile('dual-write', row);
  assert.equal(result.commit, false);
  assert.equal(result.writes_performed, 0);
  assert.equal(result.mutations.length, 0);
  assert.deepEqual(result.errors, ['unsupported shadow operation']);
});
