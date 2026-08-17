import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts/build-p9-completeness-repair-plan.mjs');

function incomplete(activity_id, relation_type_id = null) {
  return {
    activity_id,
    person_id: '11111111-1111-4111-8111-111111111111',
    polity_id: '22222222-2222-4222-8222-222222222222',
    relation_type_id,
    role_id: '33333333-3333-4333-8333-333333333333',
    period_basis_id: '44444444-4444-4444-8444-444444444444',
    activity_start: 100,
    activity_start_month: null,
    activity_start_day: null,
    activity_start_granularity: null,
    activity_start_calendar: null,
    activity_start_certainty: null,
    activity_end: 110,
    activity_end_month: null,
    activity_end_day: null,
    activity_end_granularity: null,
    activity_end_calendar: null,
    activity_end_certainty: null
  };
}

function detail(activity_id, { role = 'Emperor', chronology_status = 'exact_as_recorded' } = {}) {
  return {
    activity_id,
    person_name_en: activity_id,
    polity_name_en: 'Test Polity',
    role_source_label: role,
    chronology_status,
    activity_start: 100,
    activity_end: 110
  };
}

test('P9 repair planner preserves P7 compile-time precedence and fails closed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-p9-plan-'));
  const auditPath = path.join(dir, 'audit.json');
  const outPath = path.join(dir, 'plan.json');
  const generic = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const runtimeExcluded = '1446e736-96f8-5401-913f-022cb9b4b7c2';
  const runtimePublished = '17eba513-c00d-59c5-ba29-4a69f9143d9a';
  const temporalOnly = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const unknownChronology = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const existingRelation = '7ca4de8f-01d4-542c-acc1-a06848c6742c';
  const incompleteRows = [
    incomplete(generic),
    incomplete(runtimeExcluded),
    incomplete(runtimePublished),
    incomplete(temporalOnly, existingRelation),
    incomplete(unknownChronology)
  ];
  const audit = {
    marker: 'ATLAS_AUDIT_INVENTORY_V1',
    mode: 'full_stage2_baseline',
    read_only: true,
    committed: false,
    deployment_sha: '0123456789012345678901234567890123456789',
    row_count: 5,
    counts: { activities: 5 },
    semantic_v2_breakdown: { incomplete_rows: incompleteRows },
    rows: [
      detail(generic),
      detail(runtimeExcluded, { role: 'Explorer, traveler and jurist' }),
      detail(runtimePublished, { role: 'Provisional President and revolutionary leader' }),
      detail(temporalOnly, { role: 'King' }),
      detail(unknownChronology, { chronology_status: 'UNMAPPED_STATUS' })
    ]
  };
  fs.writeFileSync(auditPath, JSON.stringify(audit));
  execFileSync(process.execPath, [script, '--audit', auditPath, '--out', outPath], { cwd: root });
  const plan = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  const byId = new Map(plan.rows.map((row) => [row.activity_id, row]));

  assert.equal(byId.get(generic).relation.class, 'CONSERVATIVE_EXACT_ROLE_CARRY_FORWARD');
  assert.equal(byId.get(generic).relation.relation_code, 'rules');
  assert.equal(byId.get(generic).temporal.activity_start_granularity, 'year');
  assert.equal(byId.get(generic).temporal.activity_start_certainty, 'exact');
  assert.equal(byId.get(generic).temporal.activity_start_calendar, 'unspecified_historical');
  assert.equal(byId.get(generic).disposition, 'SEMANTIC_BACKFILL_READY');

  for (const id of [runtimeExcluded, runtimePublished]) {
    assert.equal(byId.get(id).relation.class, 'REVIEWED_AUTHORING_RELATION_EXCEPTION');
    assert.equal(byId.get(id).relation.ready, false);
    assert.equal(byId.get(id).disposition, 'PRECONDITION_REQUIRED');
    assert.equal(byId.get(id).temporal.activity_start_calendar, 'unspecified_historical');
  }

  assert.equal(byId.get(temporalOnly).relation.class, 'ALREADY_PRESENT');
  assert.equal(byId.get(temporalOnly).disposition, 'SEMANTIC_BACKFILL_READY');

  assert.equal(byId.get(unknownChronology).temporal.class, 'CHRONOLOGY_STATUS_UNMAPPED');
  assert.equal(byId.get(unknownChronology).temporal.ready, false);
  assert.equal(byId.get(unknownChronology).disposition, 'PRECONDITION_REQUIRED');
  assert.equal(plan.summary.semantic_v2_incomplete, 5);
  assert.equal(plan.summary.semantic_backfill_ready, 2);
  assert.equal(plan.summary.precondition_required, 3);
  assert.deepEqual(plan.summary.reviewed_authoring_relation_exception_activity_ids.sort(), [runtimeExcluded, runtimePublished].sort());
});
