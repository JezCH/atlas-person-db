import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createController, resolveState } = require('../atlas-reconciliation-controller.js');

const planner = (input) => ({ marker: 'PLAN', input, commit: false, database_writes: 0 });

test('unknown reconciliation state fails closed to disabled', () => {
  assert.equal(resolveState('anything-else', () => {}), 'disabled');
});

test('disabled state performs no planning and no writes', async () => {
  let planned = 0;
  let committed = 0;
  const controller = createController({
    state: 'disabled',
    planner: () => { planned += 1; },
    legacyExecutor: async () => { committed += 1; }
  });
  const result = await controller.run({ sample: 1 });
  assert.equal(planned, 0);
  assert.equal(committed, 0);
  assert.equal(result.commit, false);
  assert.equal(result.database_writes, 0);
});

test('dry-run plans but never commits', async () => {
  let committed = 0;
  const controller = createController({
    state: 'dry-run',
    planner,
    legacyExecutor: async () => { committed += 1; return { database_writes: 1 }; }
  });
  const result = await controller.run({ sample: 2 });
  assert.equal(result.executed, true);
  assert.equal(result.plan.marker, 'PLAN');
  assert.equal(result.commit, false);
  assert.equal(result.database_writes, 0);
  assert.equal(committed, 0);
});

test('legacy-commit delegates only to injected legacy executor', async () => {
  let calls = 0;
  const controller = createController({
    state: 'legacy-commit',
    planner,
    legacyExecutor: async (plan) => { calls += 1; assert.equal(plan.marker, 'PLAN'); return { database_writes: 3 }; }
  });
  const result = await controller.run({ sample: 3 });
  assert.equal(calls, 1);
  assert.equal(result.commit, true);
  assert.equal(result.database_writes, 3);
  assert.equal(result.v2_committed, false);
});

test('shadow-validate never commits v2', async () => {
  let shadowCalls = 0;
  const controller = createController({
    state: 'shadow-validate',
    planner,
    shadowCompiler: async () => { shadowCalls += 1; return { valid: true }; },
    legacyExecutor: async () => ({ database_writes: 1 })
  });
  const result = await controller.run({ sample: 4 });
  assert.equal(shadowCalls, 1);
  assert.deepEqual(result.shadow_validation, { valid: true });
  assert.equal(result.v2_committed, false);
});
