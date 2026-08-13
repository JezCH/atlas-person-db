import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { buildStage2P6ExecutionPackage } from '../scripts/build-stage2-p6-execution-package.mjs';

const require = createRequire(import.meta.url);
const { REPOSITORY_NAMESPACE, deterministicActivityId, deterministicAssertionId } = require('../server/atlas-p6-prebinding-execution-compiler.js');

test('P6 deterministic UUID namespace and assignments are stable', () => {
  assert.equal(REPOSITORY_NAMESPACE, '672fd6c6-f921-5ce9-86dc-c90a8796c53a');
  assert.equal(
    deterministicActivityId('p6b10_ma_teng_multiphase_scaffold', 'ma_teng_208_212_eastern_han_central_service'),
    '7fd8007d-18dd-5953-b9fb-2f94b50a384a'
  );
  assert.match(deterministicAssertionId('fixture', 'relation'), /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('P6 compiler covers the exact 54-Activity frontier with no unresolved historical identity blocker', () => {
  const built = buildStage2P6ExecutionPackage();
  assert.equal(built.schema, 'atlas-stage2-p6-execution-package/v1');
  assert.equal(built.coverage.prebinding_batches, 18);
  assert.equal(built.coverage.effective_activity_targets, 54);
  assert.equal(built.coverage.golden_literal_targets, 9);
  assert.equal(built.coverage.remaining_targets, 45);
  assert.equal(built.coverage.reviewed_adapter_cases, 2);
  assert.equal(built.coverage.blockers, 0, JSON.stringify(built.blockers, null, 2));
  assert.equal(new Set(built.classifications.map((row) => row.case_id)).size, 54);
});
