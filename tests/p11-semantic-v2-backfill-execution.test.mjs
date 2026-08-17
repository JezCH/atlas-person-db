import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts/build-p11-semantic-v2-backfill-execution.mjs');
const rulesId = '7ca4de8f-01d4-542c-acc1-a06848c6742c';
const exceptionId = '1446e736-96f8-5401-913f-022cb9b4b7c2';
const normalId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const existingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function incomplete(id, relationTypeId = null) {
  return {
    activity_id: id,
    person_id: '11111111-1111-4111-8111-111111111111',
    polity_id: '22222222-2222-4222-8222-222222222222',
    relation_type_id: relationTypeId,
    role_id: '33333333-3333-4333-8333-333333333333',
    period_basis_id: '44444444-4444-4444-8444-444444444444',
    activity_start: 100,
    activity_start_month: null,
    activity_start_day: null,
    activity_start_granularity: null,
    activity_start_certainty: null,
    activity_start_calendar: null,
    activity_end: 110,
    activity_end_month: null,
    activity_end_day: null,
    activity_end_granularity: null,
    activity_end_certainty: null,
    activity_end_calendar: null
  };
}

function detail(id) {
  return {
    activity_id: id,
    person_id: '11111111-1111-4111-8111-111111111111',
    polity_id: '22222222-2222-4222-8222-222222222222',
    role_id: '33333333-3333-4333-8333-333333333333',
    period_basis_id: '44444444-4444-4444-8444-444444444444',
    activity_start: 100,
    activity_end: 110,
    confidence: 'legacy_asserted',
    chronology_status: 'exact_as_recorded',
    legacy_source_key: `fixture:${id}`,
    source_count: 1
  };
}

function temporal() {
  return {
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
  };
}

function writeFixture(dir, { unresolvedNormal = false } = {}) {
  const incompleteRows = [incomplete(normalId), incomplete(exceptionId), incomplete(existingId, rulesId)];
  const audit = {
    marker: 'ATLAS_AUDIT_INVENTORY_V1',
    mode: 'full_stage2_baseline',
    read_only: true,
    committed: false,
    deployment_sha: '0123456789012345678901234567890123456789',
    baseline_digest: `sha256:${'a'.repeat(64)}`,
    row_count: 3,
    counts: { activities: 3 },
    semantic_v2_breakdown: { incomplete_rows: incompleteRows },
    rows: incompleteRows.map((row) => detail(row.activity_id))
  };
  const repair = {
    schema: 'atlas-stage2-p9-completeness-repair-plan/v1',
    status: 'READ_ONLY_PLANNER_NO_PRODUCTION_MUTATION',
    rows: [
      {
        activity_id: normalId,
        disposition: unresolvedNormal ? 'PRECONDITION_REQUIRED' : 'SEMANTIC_BACKFILL_READY',
        relation: unresolvedNormal ? { class: 'UNRESOLVED_RELATION', ready: false } : { class: 'REVIEWED_RELATION', ready: true, relation_code: 'rules', relation_type_id: rulesId },
        temporal: temporal()
      },
      {
        activity_id: exceptionId,
        disposition: 'PRECONDITION_REQUIRED',
        relation: { class: 'REVIEWED_AUTHORING_RELATION_EXCEPTION', ready: false },
        temporal: temporal()
      },
      {
        activity_id: existingId,
        disposition: 'SEMANTIC_BACKFILL_READY',
        relation: { class: 'ALREADY_PRESENT', ready: true, relation_type_id: rulesId },
        temporal: temporal()
      }
    ]
  };
  const auditPath = path.join(dir, 'audit.json');
  const repairPath = path.join(dir, 'repair.json');
  fs.writeFileSync(auditPath, JSON.stringify(audit));
  fs.writeFileSync(repairPath, JSON.stringify(repair));
  return { auditPath, repairPath };
}

test('P11 backfill builder keeps reviewed null relation exceptions, materializes only year metadata, and chunks plans', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-p11-backfill-'));
  const outDir = path.join(dir, 'out');
  const { auditPath, repairPath } = writeFixture(dir);
  execFileSync(process.execPath, [script, '--audit', auditPath, '--repair', repairPath, '--out-dir', outDir, '--chunk-size', '2'], { cwd: root });

  const summary = JSON.parse(fs.readFileSync(path.join(outDir, 'summary.json'), 'utf8'));
  assert.equal(summary.semantic_v2_incomplete_before, 3);
  assert.equal(summary.relation_backfill_rows, 1);
  assert.equal(summary.temporal_backfill_rows, 3);
  assert.equal(summary.reviewed_relation_exceptions_live, 1);
  assert.deepEqual(summary.reviewed_relation_exception_ids_live, [exceptionId]);
  assert.equal(summary.plan_count, 2);
  assert.equal(summary.production_mutation_authorized, false);

  const plans = ['p11-semantic-v2-backfill-batch1.json', 'p11-semantic-v2-backfill-batch2.json']
    .map((name) => JSON.parse(fs.readFileSync(path.join(outDir, name), 'utf8')));
  const operations = plans.flatMap((plan) => {
    assert.ok(plan.operations.length <= 2);
    assert.equal(plan.execution_rules.production_executable, false);
    assert.equal(plan.execution_rules.production_mutation_authorized, false);
    assert.equal(plan.execution_rules.runtime_compile_override_writeback_forbidden, true);
    return plan.operations;
  });
  const byId = new Map(operations.map((operation) => [operation.activity_id, operation]));
  assert.equal(byId.get(normalId).after.relation_type_id, rulesId);
  assert.equal(byId.get(exceptionId).after.relation_type_id, null);
  assert.equal(byId.get(existingId).after.relation_type_id, rulesId);
  for (const operation of operations) {
    assert.equal(operation.after.activity_start_detail.granularity, 'year');
    assert.equal(operation.after.activity_start_detail.calendar, 'unspecified_historical');
    assert.equal(operation.after.activity_start_detail.month, null);
    assert.equal(operation.after.activity_start_detail.day, null);
    assert.equal(operation.after.activity_end_detail.granularity, 'year');
    assert.equal(operation.after.activity_end_detail.calendar, 'unspecified_historical');
    assert.equal(operation.after.activity_start, 100);
    assert.equal(operation.after.activity_end, 110);
  }
});

test('P11 backfill builder fails closed for an unreviewed non-exception relation', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-p11-backfill-block-'));
  const { auditPath, repairPath } = writeFixture(dir, { unresolvedNormal: true });
  assert.throws(() => execFileSync(process.execPath, [script, '--audit', auditPath, '--repair', repairPath, '--out-dir', path.join(dir, 'out')], { cwd: root, stdio: 'pipe' }), /Command failed/);
});
