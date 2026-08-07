import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { planReconciliation } = require('../atlas-reconciliation-planner.js');

const canonical = [
  {
    person_name: 'Ada Lovelace', politic_name: 'United Kingdom',
    activity_start: 1842, activity_end: 1852,
    role: 'Mathematician', period_basis: 'intellectual_activity', notes: null
  },
  {
    person_name: 'Grace Hopper', politic_name: 'United States',
    activity_start: 1944, activity_end: 1986,
    role: 'Computer scientist', period_basis: 'intellectual_activity', notes: null
  }
];

function existing(overrides = {}) {
  return {
    id: 1,
    person_name: 'Ada Lovelace', politic_name: 'United Kingdom',
    activity_start: 1842, activity_end: 1852,
    role: 'Writer', period_basis: 'intellectual_activity', notes: null,
    ...overrides
  };
}

test('planner is deterministic and never commits', () => {
  const input = { existingRows: [existing()], canonicalRows: canonical, snapshotId: 'fixture-1' };
  const first = planReconciliation(input);
  const second = planReconciliation(input);
  assert.deepEqual(first, second);
  assert.equal(first.commit, false);
  assert.equal(first.database_writes, 0);
  assert.match(first.canonical_snapshot.digest, /^fnv1a32:/);
});

test('planner reports update and insert with explicit reason codes', () => {
  const report = planReconciliation({ existingRows: [existing()], canonicalRows: canonical });
  assert.equal(report.proposed_updates.length, 1);
  assert.equal(report.proposed_updates[0].reason_code, 'FIELD_DIFFERENCE');
  assert.equal(report.proposed_updates[0].changes.role.after, 'Mathematician');
  assert.equal(report.proposed_inserts.length, 1);
  assert.equal(report.proposed_inserts[0].reason_code, 'MISSING_FROM_LEGACY');
});

test('managed rows absent from canonical become explicit delete proposals', () => {
  const report = planReconciliation({
    existingRows: [existing({ id: 2, politic_name: 'France' })],
    canonicalRows: canonical
  });
  assert.equal(report.proposed_deletes.length, 1);
  assert.equal(report.proposed_deletes[0].reason_code, 'MANAGED_ROW_ABSENT_FROM_CANONICAL');
  assert.equal(report.total_destructive_proposals, 1);
});

test('exact duplicate produces duplicate-removal proposal only', () => {
  const exact = { ...canonical[0], id: 1 };
  const report = planReconciliation({ existingRows: [exact, { ...exact, id: 2 }], canonicalRows: [canonical[0]] });
  assert.equal(report.proposed_duplicate_removals.length, 1);
  assert.equal(report.proposed_duplicate_removals[0].reason_code, 'EXACT_ACTIVITY_DUPLICATE');
  assert.equal(report.proposed_deletes.length, 0);
});

test('obsolete keys produce explicit delete proposals', () => {
  const row = existing({ role: 'Mathematician' });
  const key = ['Ada Lovelace', 'United Kingdom', 1842, 1852].join('\u0001').toLowerCase();
  const report = planReconciliation({ existingRows: [row], canonicalRows: canonical, obsoleteKeys: [key] });
  assert.equal(report.proposed_deletes[0].reason_code, 'OBSOLETE_KEY');
});

test('invalid canonical records are reported and never inserted', () => {
  const report = planReconciliation({
    existingRows: [],
    canonicalRows: [{ ...canonical[0], activity_end: 1800 }]
  });
  assert.equal(report.validation_failures.length, 1);
  assert.equal(report.validation_failures[0].reason_code, 'INVALID_CANONICAL_RECORD');
  assert.equal(report.proposed_inserts.length, 0);
});

test('similar names do not merge or delete', () => {
  const report = planReconciliation({
    existingRows: [existing({ id: 3, person_name: 'Ada L.', role: 'Mathematician' })],
    canonicalRows: canonical
  });
  assert.equal(report.proposed_duplicate_removals.length, 0);
  assert.equal(report.proposed_deletes.length, 0);
  assert.equal(report.unchanged_row_count, 1);
});
