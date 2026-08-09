import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createMutationService, deterministicRequestId } = require('../server/atlas-mutation-service.js');

const planner = {
  plan(operation, payload) {
    if (payload?.blocked) return { operation, commit: false, writes_performed: 0, commands: [], blockers: [{ code: 'BLOCKED' }] };
    return { operation, commit: false, writes_performed: 0, commands: [{ type: 'NOOP' }], blockers: [] };
  }
};

function txFactory({ legacyFail = false, v2Fail = false, parityMatch = true } = {}) {
  let rolledBack = false;
  let committed = false;
  const factory = async (work) => {
    try {
      const result = await work({
        async executeLegacy() {
          if (legacyFail) return { committed: false, error: 'legacy failed' };
          return { committed: true, record_ids: [1] };
        },
        async executeV2({ context }) {
          if (v2Fail) return { committed: false, transaction_failure: 'v2 failed' };
          return { committed: true, normalized_relationship_ids: ['v2-1'], request_id: context.request_id };
        }
      });
      committed = true;
      return result;
    } catch (error) {
      rolledBack = true;
      throw error;
    }
  };
  factory.state = () => ({ rolledBack, committed, parityMatch });
  return factory;
}

test('deterministic request ids are stable', () => {
  const payload = { person_name: 'Ada Lovelace' };
  assert.equal(deterministicRequestId('create', payload), deterministicRequestId('create', payload));
});

test('blocked plan performs zero transaction work', async () => {
  let calls = 0;
  const service = createMutationService({
    planner,
    transactionFactory: async () => { calls += 1; }
  });
  const result = await service.mutate({ operation: 'create', payload: { blocked: true } });
  assert.equal(result.committed, false);
  assert.equal(result.validation_failures.length, 1);
  assert.equal(calls, 0);
});

test('successful dual mutation commits as one service result', async () => {
  const factory = txFactory();
  const service = createMutationService({
    planner,
    transactionFactory: factory,
    parityVerifier: async () => ({ checked: true, match: true })
  });
  const result = await service.mutate({ operation: 'create', payload: { a: 1 } });
  assert.equal(result.committed, true);
  assert.equal(result.legacy.committed, true);
  assert.equal(result.v2.committed, true);
  assert.equal(result.parity.match, true);
  assert.deepEqual(factory.state(), { rolledBack: false, committed: true, parityMatch: true });
});

test('v2 failure rolls the combined transaction back', async () => {
  const factory = txFactory({ v2Fail: true });
  const service = createMutationService({ planner, transactionFactory: factory });
  const result = await service.mutate({ operation: 'update', payload: { id: 1, value: { a: 2 } } });
  assert.equal(result.committed, false);
  assert.equal(result.rollback, true);
  assert.match(result.transaction_failure, /v2 failed/);
  assert.equal(factory.state().rolledBack, true);
});

test('parity mismatch rolls the combined transaction back', async () => {
  const factory = txFactory();
  const service = createMutationService({
    planner,
    transactionFactory: factory,
    parityVerifier: async () => ({ checked: true, match: false })
  });
  const result = await service.mutate({ operation: 'delete', payload: { id: 1 } });
  assert.equal(result.committed, false);
  assert.equal(result.rollback, true);
  assert.match(result.transaction_failure, /parity mismatch/);
  assert.equal(factory.state().rolledBack, true);
});
