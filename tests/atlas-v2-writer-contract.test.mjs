import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const writerApi = require('../atlas-v2-writer-contract.js');

const approvedPlan = Object.freeze({
  commit: false,
  writes_performed: 0,
  blockers: [],
  commands: [{ type: 'UPSERT_PERSON_POLITICS_V2' }]
});

test('writer defaults to disabled and cannot call executor', async () => {
  let called = false;
  const writer = writerApi.createWriter({ executor: async () => { called = true; return { committed: true }; } });
  const result = await writer.execute(approvedPlan, { request_id: 'req-1' });
  assert.equal(writer.state, 'disabled');
  assert.equal(called, false);
  assert.equal(result.attempted, false);
  assert.equal(result.committed, false);
  assert.equal(result.transaction_failure, 'writer disabled');
});

test('unknown state fails closed to disabled', async () => {
  const writer = writerApi.createWriter({ state: 'dual-write' });
  assert.equal(writer.state, 'disabled');
  const result = await writer.execute(approvedPlan);
  assert.equal(result.committed, false);
});

test('isolated state rejects blocked command plans before executor', async () => {
  let called = false;
  const writer = writerApi.createWriter({
    state: 'isolated',
    executor: async () => { called = true; return { committed: true }; }
  });
  const result = await writer.execute({ ...approvedPlan, blockers: [{ code: 'PERSON_IDENTITY_REQUIRED' }] });
  assert.equal(called, false);
  assert.equal(result.committed, false);
  assert.equal(result.validation_failures.length, 1);
});

test('isolated state delegates only approved plans and preserves structured result', async () => {
  const writer = writerApi.createWriter({
    state: 'isolated',
    executor: async ({ context }) => ({
      committed: true,
      transaction: true,
      normalized_relationship_ids: ['rel-1'],
      replay: context.request_id === 'req-2',
      transaction_failure: null
    })
  });
  const result = await writer.execute(approvedPlan, { request_id: 'req-2', legacy_lineage: 17 });
  assert.equal(result.attempted, true);
  assert.equal(result.committed, true);
  assert.equal(result.transaction, true);
  assert.deepEqual(result.normalized_relationship_ids, ['rel-1']);
  assert.equal(result.legacy_lineage, 17);
  assert.equal(result.idempotency.request_id, 'req-2');
  assert.equal(result.idempotency.replay, true);
});

test('isolated state rejects plans that claim writes or commit', async () => {
  const writer = writerApi.createWriter({ state: 'isolated', executor: async () => ({ committed: true }) });
  const a = await writer.execute({ ...approvedPlan, commit: true });
  const b = await writer.execute({ ...approvedPlan, writes_performed: 1 });
  assert.deepEqual(a.validation_failures, ['unapproved command plan']);
  assert.deepEqual(b.validation_failures, ['unapproved command plan']);
});
