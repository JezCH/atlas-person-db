import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REVIEWED_EXCEPTION_ID = '1446e736-96f8-5401-913f-022cb9b4b7c2';
const BLOCKER_ID = '11111111-1111-4111-8111-111111111111';
const RULES_ID = '7ca4de8f-01d4-542c-acc1-a06848c6742c';
const PERIOD_ID = '22222222-2222-4222-8222-222222222222';
const PERSON_ID = '33333333-3333-4333-8333-333333333333';
const POLITY_ID = '44444444-4444-4444-8444-444444444444';

function detail(activityId, relationTypeId, temporalComplete) {
  return {
    activity_id: activityId,
    person_id: PERSON_ID,
    polity_id: POLITY_ID,
    role_id: null,
    period_basis_id: PERIOD_ID,
    relation_type_id: relationTypeId,
    activity_start: 100,
    activity_end: 110,
    activity_start_month: null,
    activity_start_day: null,
    activity_start_granularity: temporalComplete ? 'year' : null,
    activity_start_certainty: temporalComplete ? 'exact' : null,
    activity_start_calendar: temporalComplete ? 'unspecified_historical' : null,
    activity_end_month: null,
    activity_end_day: null,
    activity_end_granularity: temporalComplete ? 'year' : null,
    activity_end_certainty: temporalComplete ? 'exact' : null,
    activity_end_calendar: temporalComplete ? 'unspecified_historical' : null,
    confidence: 'reviewed',
    chronology_status: 'exact_as_recorded',
    legacy_source_key: `fixture:${activityId}`,
    source_count: 1
  };
}

test('P11 current-delta builder preserves live reviewed exceptions, mutates blockers only, and scopes batch identity to the audited baseline', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-p11-delta-'));
  const auditPath = path.join(dir, 'audit.json');
  const repairPath = path.join(dir, 'repair.json');
  const outDir = path.join(dir, 'generated');

  const reviewed = detail(REVIEWED_EXCEPTION_ID, null, true);
  const blocker = detail(BLOCKER_ID, RULES_ID, false);
  const audit = {
    marker: 'ATLAS_AUDIT_INVENTORY_V1',
    mode: 'full_stage2_baseline',
    read_only: true,
    committed: false,
    deployment_sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    baseline_digest: 'sha256:fixture',
    row_count: 2,
    counts: { activities: 2 },
    rows: [reviewed, blocker],
    semantic_v2_breakdown: { incomplete_rows: [reviewed, blocker] }
  };
  const repair = {
    schema: 'atlas-stage2-p9-completeness-repair-plan/v1',
    status: 'READ_ONLY_PLANNER_NO_PRODUCTION_MUTATION',
    rows: [
      {
        activity_id: REVIEWED_EXCEPTION_ID,
        disposition: 'PRECONDITION_REQUIRED',
        relation: { class: 'REVIEWED_AUTHORING_RELATION_EXCEPTION', ready: false },
        temporal: { class: 'ALREADY_COMPLETE', ready: true }
      },
      {
        activity_id: BLOCKER_ID,
        disposition: 'SEMANTIC_BACKFILL_READY',
        relation: { class: 'ALREADY_PRESENT', ready: true, relation_type_id: RULES_ID },
        temporal: {
          class: 'LEGACY_YEAR_ONLY_METADATA',
          ready: true,
          activity_start_month: null,
          activity_start_day: null,
          activity_start_granularity: 'year',
          activity_start_certainty: 'exact',
          activity_start_calendar: 'unspecified_historical',
          activity_end_month: null,
          activity_end_day: null,
          activity_end_granularity: 'year',
          activity_end_certainty: 'exact',
          activity_end_calendar: 'unspecified_historical'
        }
      }
    ]
  };

  fs.writeFileSync(auditPath, JSON.stringify(audit));
  fs.writeFileSync(repairPath, JSON.stringify(repair));
  const result = spawnSync(process.execPath, [
    'scripts/build-p11-semantic-v2-backfill-execution.mjs',
    '--audit', auditPath,
    '--repair', repairPath,
    '--out-dir', outDir,
    '--chunk-size', '100'
  ], { cwd: process.cwd(), encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const summary = JSON.parse(fs.readFileSync(path.join(outDir, 'summary.json'), 'utf8'));
  assert.equal(summary.semantic_v2_incomplete_before, 2);
  assert.equal(summary.reviewed_relation_exceptions_live_before, 1);
  assert.deepEqual(summary.reviewed_relation_exception_ids_live_before, [REVIEWED_EXCEPTION_ID]);
  assert.equal(summary.blocking_semantic_v2_incomplete_before, 1);
  assert.equal(summary.operation_count, 1);
  assert.equal(summary.temporal_backfill_rows, 1);
  assert.equal(summary.reviewed_relation_exceptions_expected_after, 1);
  assert.deepEqual(summary.reviewed_relation_exception_ids_expected_after, [REVIEWED_EXCEPTION_ID]);
  assert.equal(summary.plan_count, 1);
  assert.match(summary.execution_scope, /^[0-9a-f]{20}$/);

  const plan = JSON.parse(fs.readFileSync(path.join(outDir, 'p11-semantic-v2-backfill-batch1.json'), 'utf8'));
  assert.equal(plan.operations.length, 1);
  assert.equal(plan.operations[0].activity_id, BLOCKER_ID);
  assert.ok(!plan.operations.some((operation) => operation.activity_id === REVIEWED_EXCEPTION_ID));
  assert.equal(plan.batch_id, `p11_semantic_v2_current_delta_${summary.execution_scope}_batch1_20260906`);
  assert.equal(plan.execution_rules.baseline_scoped_idempotency, true);

  const replayDir = path.join(dir, 'generated-replay');
  const replay = spawnSync(process.execPath, [
    'scripts/build-p11-semantic-v2-backfill-execution.mjs',
    '--audit', auditPath,
    '--repair', repairPath,
    '--out-dir', replayDir,
    '--chunk-size', '100'
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(replay.status, 0, replay.stderr || replay.stdout);
  const replayPlan = JSON.parse(fs.readFileSync(path.join(replayDir, 'p11-semantic-v2-backfill-batch1.json'), 'utf8'));
  assert.equal(replayPlan.batch_id, plan.batch_id);

  const changedBaselineDir = path.join(dir, 'generated-changed-baseline');
  fs.writeFileSync(auditPath, JSON.stringify({ ...audit, baseline_digest: 'sha256:fixture-after-partial-commit' }));
  const changedBaseline = spawnSync(process.execPath, [
    'scripts/build-p11-semantic-v2-backfill-execution.mjs',
    '--audit', auditPath,
    '--repair', repairPath,
    '--out-dir', changedBaselineDir,
    '--chunk-size', '100'
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(changedBaseline.status, 0, changedBaseline.stderr || changedBaseline.stdout);
  const changedBaselinePlan = JSON.parse(fs.readFileSync(path.join(changedBaselineDir, 'p11-semantic-v2-backfill-batch1.json'), 'utf8'));
  assert.notEqual(changedBaselinePlan.batch_id, plan.batch_id);
});