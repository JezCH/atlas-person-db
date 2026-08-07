import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createLegacyReconciliationExecutor } = require('../atlas-legacy-reconciliation-executor.js');

function fakeDb({ failAt = null } = {}) {
  const calls = [];
  function response(op) {
    return async (...args) => {
      calls.push([op, ...args]);
      return failAt === op ? { error: new Error(`failed:${op}`) } : { error: null };
    };
  }
  return {
    calls,
    from(table) {
      calls.push(['from', table]);
      return {
        delete() { return { eq: response('delete-eq') }; },
        update(payload) { calls.push(['update', payload]); return { eq: response('update-eq') }; },
        insert: response('insert')
      };
    }
  };
}

const basePlan = {
  commit: false,
  database_writes: 0,
  proposed_deletes: [{ id: 1 }],
  proposed_duplicate_removals: [{ id: 2 }],
  proposed_updates: [{ id: 3, after: { id: null, person_name: 'Ada', politic_name: 'UK', activity_start: 1842, activity_end: 1852, role: null, period_basis: 'intellectual_activity', notes: null } }],
  proposed_inserts: [{ after: { id: null, person_name: 'Grace', politic_name: 'US', activity_start: 1944, activity_end: 1986, role: null, period_basis: 'intellectual_activity', notes: null } }]
};

test('executor applies only planned legacy mutations', async () => {
  const db = fakeDb();
  const execute = createLegacyReconciliationExecutor({ db });
  const result = await execute(basePlan);
  assert.equal(result.database_writes, 4);
  assert.deepEqual(result.counts, { inserts: 1, updates: 1, deletes: 1, duplicate_removals: 1 });
  assert.equal(db.calls.filter((c) => c[0] === 'from').every((c) => c[1] === 'person_politics'), true);
});

test('executor rejects non-dry-run plans', async () => {
  const db = fakeDb();
  const execute = createLegacyReconciliationExecutor({ db });
  await assert.rejects(() => execute({ ...basePlan, commit: true }), /non-mutating reconciliation plan/);
  assert.equal(db.calls.length, 0);
});

test('executor stops on first database error', async () => {
  const db = fakeDb({ failAt: 'delete-eq' });
  const execute = createLegacyReconciliationExecutor({ db });
  await assert.rejects(() => execute(basePlan), /failed:delete-eq/);
});
