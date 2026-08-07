import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const planner = require('../atlas-v2-command-planner.js');
const writerContract = require('../atlas-v2-writer-contract.js');
const { createIsolatedExecutor } = require('../atlas-v2-isolated-executor.js');

function makeTransactionFactory({ failAt, replay } = {}) {
  const calls = [];
  const ids = { person: 'p1', polity: 'g1', role: 'r1', basis: 'b1', relationship: 'rel1' };
  const transactionFactory = async (fn) => {
    calls.push(['BEGIN']);
    const tx = {
      async findReplay(requestId) { calls.push(['findReplay', requestId]); return replay || null; },
      async resolvePersonExact(lookup) { calls.push(['resolvePersonExact', lookup]); if (failAt === 'person') throw new Error('person fail'); return ids.person; },
      async resolvePolityExact(lookup) { calls.push(['resolvePolityExact', lookup]); if (failAt === 'polity') throw new Error('polity fail'); return ids.polity; },
      async resolveRoleExact(lookup) { calls.push(['resolveRoleExact', lookup]); if (failAt === 'role') throw new Error('role fail'); return ids.role; },
      async resolvePeriodBasisExact(lookup) { calls.push(['resolvePeriodBasisExact', lookup]); if (failAt === 'basis') throw new Error('basis fail'); return ids.basis; },
      async upsertPersonPoliticsV2(payload) { calls.push(['upsertPersonPoliticsV2', payload]); if (failAt === 'upsert') throw new Error('upsert fail'); return ids.relationship; },
      async resolveRelationshipByLegacyLineage(lookup) { calls.push(['resolveRelationshipByLegacyLineage', lookup]); return ids.relationship; },
      async retireOrDeletePersonPoliticsV2(payload) { calls.push(['retireOrDeletePersonPoliticsV2', payload]); if (failAt === 'delete') throw new Error('delete fail'); },
      async recordRequest(payload) { calls.push(['recordRequest', payload]); }
    };
    try {
      const result = await fn(tx);
      calls.push(['COMMIT']);
      return result;
    } catch (error) {
      calls.push(['ROLLBACK']);
      throw error;
    }
  };
  return { transactionFactory, calls };
}

const row = {
  person_name: 'Ada Lovelace',
  politic_name: 'United Kingdom',
  activity_start: 1842,
  activity_end: 1852,
  role: 'Mathematician',
  period_basis: 'intellectual_activity',
  notes: null
};

test('isolated writer commits a create plan atomically', async () => {
  const { transactionFactory, calls } = makeTransactionFactory();
  const executor = createIsolatedExecutor({ transactionFactory });
  const writer = writerContract.createWriter({ executor, state: 'isolated' });
  const result = await writer.execute(planner.plan('create', row), { request_id: 'req-1' });
  assert.equal(result.committed, true);
  assert.equal(result.transaction, true);
  assert.deepEqual(result.normalized_relationship_ids, ['rel1']);
  assert.equal(calls.at(-1)[0], 'COMMIT');
});

test('isolated writer rolls back entire transaction on command failure', async () => {
  const { transactionFactory, calls } = makeTransactionFactory({ failAt: 'upsert' });
  const executor = createIsolatedExecutor({ transactionFactory });
  const writer = writerContract.createWriter({ executor, state: 'isolated' });
  const result = await writer.execute(planner.plan('create', row), { request_id: 'req-2' });
  assert.equal(result.committed, false);
  assert.equal(result.transaction, true);
  assert.equal(result.transaction_failure, 'upsert fail');
  assert.equal(calls.at(-1)[0], 'ROLLBACK');
});

test('blocked plans do not open a transaction', async () => {
  const { transactionFactory, calls } = makeTransactionFactory();
  const executor = createIsolatedExecutor({ transactionFactory });
  const writer = writerContract.createWriter({ executor, state: 'isolated' });
  const result = await writer.execute(planner.plan('create', { ...row, person_name: '' }), { request_id: 'req-3' });
  assert.equal(result.committed, false);
  assert.equal(result.attempted, false);
  assert.equal(calls.length, 0);
});

test('idempotency replay returns prior relationship ids without mutation commands', async () => {
  const { transactionFactory, calls } = makeTransactionFactory({ replay: { normalized_relationship_ids: ['rel-old'] } });
  const executor = createIsolatedExecutor({ transactionFactory });
  const writer = writerContract.createWriter({ executor, state: 'isolated' });
  const result = await writer.execute(planner.plan('create', row), { request_id: 'req-replay' });
  assert.equal(result.committed, true);
  assert.equal(result.idempotency.replay, true);
  assert.deepEqual(result.normalized_relationship_ids, ['rel-old']);
  assert.equal(calls.some(([name]) => name === 'upsertPersonPoliticsV2'), false);
});

test('delete resolves lineage before retirement', async () => {
  const { transactionFactory, calls } = makeTransactionFactory();
  const executor = createIsolatedExecutor({ transactionFactory });
  const writer = writerContract.createWriter({ executor, state: 'isolated' });
  const result = await writer.execute(planner.plan('delete', { id: 42 }), { request_id: 'req-del' });
  assert.equal(result.committed, true);
  const resolveIndex = calls.findIndex(([name]) => name === 'resolveRelationshipByLegacyLineage');
  const deleteIndex = calls.findIndex(([name]) => name === 'retireOrDeletePersonPoliticsV2');
  assert.ok(resolveIndex >= 0 && deleteIndex > resolveIndex);
});
