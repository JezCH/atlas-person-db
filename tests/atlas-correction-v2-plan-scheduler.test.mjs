import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  PLAN_SCHEMA,
  partitionCorrectionPlanExecutionWaves,
  scheduleCorrectionPlans
} = require('../server/atlas-correction-v2-plan-scheduler.js');

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';

function plan(operations, extra = {}) {
  return {
    schema: PLAN_SCHEMA,
    batch_id: 'fixture_batch',
    baseline: { deployment_sha: 'x', baseline_digest: 'y' },
    execution_rules: { production_executable: false, production_mutation_authorized: false },
    operations,
    companion_assertions: [{ type: 'assert_polity_relation', assertion_id: C }],
    ...extra
  };
}

test('scheduler keeps a dependency-free reviewed plan as one execution unit', () => {
  const source = plan([
    { type: 'rewrite_activity', case_id: 'a', activity_id: A },
    { type: 'rewrite_activity', case_id: 'b', activity_id: B }
  ]);
  const waves = partitionCorrectionPlanExecutionWaves(source);
  assert.equal(waves.length, 1);
  assert.equal(waves[0].batch_id, source.batch_id);
  assert.equal(waves[0].operations.length, 2);
  assert.equal(waves[0].companion_assertions.length, 1);
});

test('scheduler splits an internal survivor mutation before dependent retire', () => {
  const source = plan([
    { type: 'rewrite_activity', case_id: 'survivor', activity_id: A },
    { type: 'retire_activity', case_id: 'retire', activity_id: B, replacement_activity_ids: [A] }
  ]);
  const waves = partitionCorrectionPlanExecutionWaves(source);
  assert.equal(waves.length, 2);
  assert.deepEqual(waves[0].operations.map((row) => row.case_id), ['survivor']);
  assert.deepEqual(waves[1].operations.map((row) => row.case_id), ['retire']);
  assert.equal(waves[0].companion_assertions.length, 0, 'assertions must not be duplicated across waves');
  assert.equal(waves[1].companion_assertions.length, 1, 'reviewed assertions must be emitted exactly once');
  assert.equal(waves[0].parent_batch_id, 'fixture_batch');
  assert.equal(waves[1].execution_wave.dependency_ordered, true);
});

test('package scheduler verifies cross-unit retire ordering after wave partition', () => {
  const first = plan([{ type: 'rewrite_activity', case_id: 'survivor', activity_id: A }], { batch_id: 'batch_1' });
  const second = plan([{ type: 'retire_activity', case_id: 'retire', activity_id: B, replacement_activity_ids: [A] }], { batch_id: 'batch_2' });
  const scheduled = scheduleCorrectionPlans([first, second]);
  assert.equal(scheduled.reviewed_plan_count, 2);
  assert.equal(scheduled.execution_unit_count, 2);
  assert.equal(scheduled.cross_unit_retire_dependencies.length, 1);
  assert.equal(scheduled.cross_unit_retire_dependencies[0].survivor_batch_id, 'batch_1');
});

test('package scheduler fails closed when a retire appears before its survivor mutation', () => {
  const retire = plan([{ type: 'retire_activity', case_id: 'retire', activity_id: B, replacement_activity_ids: [A] }], { batch_id: 'batch_1' });
  const survivor = plan([{ type: 'rewrite_activity', case_id: 'survivor', activity_id: A }], { batch_id: 'batch_2' });
  assert.throws(() => scheduleCorrectionPlans([retire, survivor]), /CORRECTION_V2_SCHEDULER_PACKAGE_ORDER_INVALID/);
});

test('scheduler rejects duplicate mutation targets and self-dependent retire operations', () => {
  assert.throws(() => partitionCorrectionPlanExecutionWaves(plan([
    { type: 'rewrite_activity', case_id: 'one', activity_id: A },
    { type: 'rewrite_activity', case_id: 'two', activity_id: A }
  ])), /CORRECTION_V2_SCHEDULER_DUPLICATE_MUTATION_TARGET/);

  assert.throws(() => partitionCorrectionPlanExecutionWaves(plan([
    { type: 'retire_activity', case_id: 'self', activity_id: A, replacement_activity_ids: [A] }
  ])), /CORRECTION_V2_SCHEDULER_SELF_DEPENDENCY/);
});
