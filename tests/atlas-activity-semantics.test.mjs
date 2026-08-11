import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const semantics = require('../atlas-activity-semantics.js');

const base = {
  person_name: 'Ada Lovelace',
  politic_name: 'United Kingdom',
  activity_start: 1842,
  activity_end: 1852,
  role: 'Mathematician',
  period_basis: 'intellectual_activity',
  notes: null
};

test('activity semantic key is normalized and uses all six identity dimensions', () => {
  const key = semantics.activityKey(base);
  assert.equal(semantics.activityKey({
    ...base,
    person_name: ' Ada   Lovelace ',
    politic_name: 'United   Kingdom',
    role: ' Mathematician ',
    notes: 'ignored'
  }), key);
  assert.notEqual(semantics.activityKey({...base,person_name:'Grace Hopper'}), key);
  assert.notEqual(semantics.activityKey({...base,politic_name:'United States'}), key);
  assert.notEqual(semantics.activityKey({...base,activity_start:1843}), key);
  assert.notEqual(semantics.activityKey({...base,activity_end:1853}), key);
  assert.notEqual(semantics.activityKey({...base,role:'Programmer'}), key);
  assert.notEqual(semantics.activityKey({...base,period_basis:'general_activity'}), key);
});

test('null and blank role share the explicit null-role semantic identity', () => {
  assert.equal(
    semantics.activityKey({...base,role:null}),
    semantics.activityKey({...base,role:'   '})
  );
});
