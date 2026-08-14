import fs from 'node:fs';
import assert from 'node:assert/strict';

const inventory = JSON.parse(fs.readFileSync('artifacts/stage2-p7p8-precutover-inventory.json', 'utf8'));
const relations = JSON.parse(fs.readFileSync('artifacts/stage2-p7a-reviewed-relation-backfill.json', 'utf8'));
const batch4 = JSON.parse(fs.readFileSync('stage2/integration/p7-explicit-person-relation-decisions-batch4.v1.json', 'utf8'));
const batch8 = JSON.parse(fs.readFileSync('stage2/integration/p7-explicit-person-relation-decisions-batch8.v1.json', 'utf8'));
const multiphase = JSON.parse(fs.readFileSync('stage2/integration/p7-multiphase-person-relation-decisions.v1.json', 'utf8'));
const executionPlan = JSON.parse(fs.readFileSync('stage2/execution/p7-relation-resolution-execution.v1.json', 'utf8'));

const BASELINE_SHA = 'ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
const BASELINE_DIGEST = 'sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const relationIdByCode = new Map([
  ['rules', '7ca4de8f-01d4-542c-acc1-a06848c6742c'],
  ['governs', '67a57b37-1853-5f2a-b7ab-e6b2d32b56b6'],
  ['serves', '0fc4827f-8543-52f7-9e9a-3173b0c698a7'],
  ['active_in', 'f33d2789-2e65-50c1-af3e-91335bcbd3ca'],
  ['opposes', '5d2d3af6-6e53-5af1-8423-f76c2263afe4'],
  ['claims_rule', 'fcc652d6-8cf5-5348-9375-60b35f6e0b8c']
]);
const allowedRelationIds = new Set(relationIdByCode.values());

assert.equal(inventory.schema, 'atlas-stage2-p7p8-precutover-inventory/v1');
assert.equal(inventory.status, 'BRANCH_ONLY_CURRENT_RESIDUAL_INVENTORY_NO_PRODUCTION_MUTATION');
assert.equal(inventory.baseline.deployment_sha, BASELINE_SHA);
assert.equal(inventory.baseline.baseline_digest, BASELINE_DIGEST);
assert.equal(inventory.p6.effective_activity_targets_closed, 54);
assert.equal(inventory.residual_unique_activity_count, 156);
assert.deepEqual(inventory.residual_dependency_counts_after_p6_targets, {
  relation_type: 127,
  chronology_correction: 35,
  governance_context: 9,
  sub_year_precision: 1,
  provenance_backfill: 19,
  entity_model_migration: 10
});
assert.equal(inventory.relation_backfill.residual_rows, 127);
assert.equal(inventory.relation_backfill.existing_reviewed_hint_rows, 86);
assert.equal(inventory.relation_backfill.explicit_reviewed_overlay_rows, 37);
assert.equal(inventory.relation_backfill.reviewed_relation_literalizable_rows, 123);
assert.equal(inventory.relation_backfill.explicit_relation_review_required_rows, 4);
assert.equal(inventory.relation_backfill.review_required.length, 4);
assert.equal(inventory.p8_zero_known_blocker_gate.status, 'NOT_READY');
assert.equal(inventory.p8_zero_known_blocker_gate.known_runtime_semantic_blocker_floor, 4);
assert.equal(inventory.rules.production_mutation_authorized, false);

assert.equal(relations.schema, 'atlas-stage2-p7a-reviewed-relation-backfill/v1');
assert.equal(relations.status, 'BRANCH_ONLY_REVIEWED_RELATION_LITERALIZATION_NO_PRODUCTION_MUTATION');
assert.equal(relations.rows.length, 123);
assert.equal(new Set(relations.rows.map((row) => row.activity_id)).size, 123);
assert.equal(relations.result.residual_relation_dependency_rows, 127);
assert.equal(relations.result.existing_reviewed_hint_rows, 86);
assert.equal(relations.result.explicit_reviewed_overlay_rows, 37);
assert.equal(relations.result.explicit_relation_review_rows_remaining, 4);
assert.equal(relations.result.production_mutation_authorized, false);
for (const row of relations.rows) {
  assert.ok(allowedRelationIds.has(row.relation_type_id), `unexpected relation UUID ${row.activity_id}`);
  assert.match(row.activity_id, /^[0-9a-f-]{36}$/);
  assert.equal(typeof row.reviewed_relation_code, 'string');
  assert.notEqual(row.reviewed_relation_code, '');
}

assert.equal(batch8.schema, 'atlas-stage2-p7-explicit-person-relation-decisions/v1');
assert.equal(batch8.status, 'REVIEWED_BRANCH_ONLY_NO_PRODUCTION_MUTATION');
assert.equal(batch8.baseline.deployment_sha, BASELINE_SHA);
assert.equal(batch8.baseline.baseline_digest, BASELINE_DIGEST);
assert.equal(batch8.rules.later_explicit_user_politic_resolution_overrides_older_audit_hint, true);
assert.equal(batch8.rules.override_requires_explicit_supersedes_stale_relation_hint_flag, true);
assert.equal(batch8.rules.production_mutation_authorized, false);
assert.equal(batch8.decisions.length, 2);
const broadOverrideExpected = new Map([
  ['592aa8f9-4eb4-527c-a72d-a78ee7769daf', 'Pocatello'],
  ['b4a6b048-9465-539a-bc4b-ec50a057b594', 'Sitting Bull']
]);
for (const decision of batch8.decisions) {
  assert.equal(decision.person, broadOverrideExpected.get(decision.activity_id));
  assert.equal(decision.relation_code, 'active_in');
  assert.equal(decision.relation_type_id, relationIdByCode.get('active_in'));
  assert.equal(decision.supersedes_stale_relation_hint, true);
  const output = relations.rows.find((row) => row.activity_id === decision.activity_id);
  assert.ok(output, `broad-politic override missing from relation package ${decision.activity_id}`);
  assert.equal(output.reviewed_relation_code, 'active_in');
  assert.equal(output.relation_type_id, relationIdByCode.get('active_in'));
  assert.equal(output.resolution_mode, 'EXPLICIT_REVIEWED_SUPERSEDING_STALE_HINT');
  assert.equal(output.explicit_decision_batch, batch8.batch_id);
}

assert.equal(batch4.schema, 'atlas-stage2-p7-explicit-person-relation-decisions/v1');
assert.equal(batch4.status, 'REVIEWED_BRANCH_ONLY_NO_PRODUCTION_MUTATION');
assert.equal(batch4.baseline.deployment_sha, BASELINE_SHA);
assert.equal(batch4.baseline.baseline_digest, BASELINE_DIGEST);
assert.equal(batch4.rules.production_mutation_authorized, false);
assert.equal(batch4.decisions.length, 1);
assert.equal(batch4.decisions[0].activity_id, 'c4e44df1-a880-55a5-8607-0c5ebf17cc87');
assert.equal(batch4.decisions[0].person, 'Sun Jian');
assert.equal(batch4.decisions[0].relation_code, 'serves');
assert.equal(batch4.decisions[0].relation_type_id, relationIdByCode.get('serves'));

assert.equal(multiphase.schema, 'atlas-stage2-p7-multiphase-person-relation-decisions/v1');
assert.equal(multiphase.status, 'REVIEWED_BRANCH_ONLY_PHASE_MODEL_NO_PRODUCTION_MUTATION');
assert.equal(multiphase.baseline.deployment_sha, BASELINE_SHA);
assert.equal(multiphase.baseline.baseline_digest, BASELINE_DIGEST);
assert.equal(multiphase.rules.production_mutation_authorized, false);
assert.equal(multiphase.execution_plan, 'stage2/execution/p7-relation-resolution-execution.v1.json');
assert.equal(multiphase.cases.length, 3);
assert.equal(multiphase.result.case_count, 3);
assert.equal(multiphase.result.phase_count, 9);
assert.equal(multiphase.result.unresolved_relation_decision_count, 0);
assert.equal(multiphase.result.literal_fragment_uuid_allocations_complete, true);
assert.equal(multiphase.result.literal_new_activity_uuid_count, 6);
assert.equal(multiphase.result.execution_plan_ready, true);
assert.equal(multiphase.result.production_mutation_authorized, false);

const reviewIds = new Set(inventory.relation_backfill.review_required.map((row) => row.activity_id));
const resolvedIds = new Set([batch4.decisions[0].activity_id, ...multiphase.cases.map((row) => row.activity_id)]);
assert.equal(reviewIds.size, 4);
assert.equal(resolvedIds.size, 4);
assert.deepEqual([...resolvedIds].sort(), [...reviewIds].sort(), 'focused direct + multiphase decisions must exactly close the four relation-review rows');

for (const item of multiphase.cases) {
  assert.equal(item.execution_status, 'LITERAL_EXECUTION_PLAN_READY_BRANCH_ONLY');
  assert.ok(Array.isArray(item.phases) && item.phases.length >= 2, `multiphase case missing phases ${item.activity_id}`);
  let previousEnd = null;
  for (const phase of item.phases) {
    assert.ok(Number.isInteger(phase.start_year) && Number.isInteger(phase.end_year));
    assert.ok(phase.start_year <= phase.end_year, `invalid phase interval ${item.activity_id}`);
    assert.equal(phase.relation_type_id, relationIdByCode.get(phase.relation_code), `relation UUID drift ${item.activity_id}`);
    if (previousEnd != null) assert.ok(phase.start_year > previousEnd, `overlapping phase interval ${item.activity_id}`);
    previousEnd = phase.end_year;
  }
}

assert.equal(executionPlan.schema, 'atlas-stage2-correction-v2-execution-plan/v1');
assert.equal(executionPlan.status, 'LITERAL_OPERANDS_COMPLETE_LIVE_BEFORE_SNAPSHOT_REQUIRED');
assert.equal(executionPlan.baseline.deployment_sha, BASELINE_SHA);
assert.equal(executionPlan.baseline.baseline_digest, BASELINE_DIGEST);
assert.equal(executionPlan.execution_rules.production_executable, false);
assert.equal(executionPlan.execution_rules.production_mutation_authorized, false);
assert.equal(executionPlan.operations.length, 4);
assert.equal(executionPlan.new_activity_uuid_allocations.length, 6);
const executionTargetIds = new Set(executionPlan.operations.map((row) => row.activity_id));
assert.deepEqual([...executionTargetIds].sort(), [...resolvedIds].sort(), 'P7 relation execution plan must cover the exact four closed relation-review Activities');
const literalNewIds = new Set(executionPlan.new_activity_uuid_allocations.map((row) => row.activity_uuid));
assert.equal(literalNewIds.size, 6);
for (const id of literalNewIds) assert.match(id, /^[0-9a-f-]{36}$/);

const resolutionStatus = {
  schema: 'atlas-stage2-p7-relation-resolution-status/v1',
  as_of: '2026-08-14',
  status: 'BRANCH_ONLY_RELATION_DECISIONS_CLOSED_LITERAL_EXECUTION_PLAN_READY',
  baseline: { deployment_sha: BASELINE_SHA, baseline_digest: BASELINE_DIGEST },
  residual_relation_rows: 127,
  direct_literal_backfill: {
    existing_inventory_rows: 123,
    focused_broad_politic_rows: 1,
    stale_hint_supersession_rows: 2,
    total_rows: 124
  },
  multiphase_correction_rows: 3,
  unresolved_relation_decision_rows: 0,
  relation_semantic_decision_gate: 'ZERO_UNDECIDED',
  relation_execution_plan: {
    path: 'stage2/execution/p7-relation-resolution-execution.v1.json',
    existing_activity_targets: 4,
    literal_new_activity_uuids: 6,
    production_executable: false
  },
  relation_execution_gate: 'LITERAL_EXECUTION_PLAN_READY_BRANCH_ONLY',
  production_mutation_authorized: false
};
fs.writeFileSync('artifacts/stage2-p7-relation-resolution-status.json', `${JSON.stringify(resolutionStatus, null, 2)}\n`);

console.log(JSON.stringify({
  marker: 'ATLAS_STAGE2_P7P8_PRECUTOVER_INVENTORY_OK',
  residual_unique_activities: 156,
  relation_rows: 127,
  direct_relation_backfill_rows: 124,
  stale_hint_supersession_rows: 2,
  multiphase_relation_correction_rows: 3,
  unresolved_relation_decisions: 0,
  relation_execution_gate: resolutionStatus.relation_execution_gate,
  p8_status: 'NOT_READY',
  production_mutation_authorized: false
}, null, 2));
