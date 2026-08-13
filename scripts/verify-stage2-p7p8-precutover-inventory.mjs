import fs from 'node:fs';
import assert from 'node:assert/strict';

const inventory = JSON.parse(fs.readFileSync('artifacts/stage2-p7p8-precutover-inventory.json', 'utf8'));
const relations = JSON.parse(fs.readFileSync('artifacts/stage2-p7a-reviewed-relation-backfill.json', 'utf8'));

assert.equal(inventory.schema, 'atlas-stage2-p7p8-precutover-inventory/v1');
assert.equal(inventory.status, 'BRANCH_ONLY_CURRENT_RESIDUAL_INVENTORY_NO_PRODUCTION_MUTATION');
assert.equal(inventory.baseline.deployment_sha, 'ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79');
assert.equal(inventory.baseline.baseline_digest, 'sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27');
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
assert.equal(inventory.relation_backfill.existing_reviewed_hint_rows, 88);
assert.equal(inventory.relation_backfill.explicit_reviewed_overlay_rows, 30);
assert.equal(inventory.relation_backfill.reviewed_relation_literalizable_rows, 118);
assert.equal(inventory.relation_backfill.explicit_relation_review_required_rows, 9);
assert.equal(inventory.relation_backfill.review_required.length, 9);
assert.equal(inventory.p8_zero_known_blocker_gate.status, 'NOT_READY');
assert.equal(inventory.p8_zero_known_blocker_gate.known_runtime_semantic_blocker_floor, 9);
assert.equal(inventory.rules.production_mutation_authorized, false);

assert.equal(relations.schema, 'atlas-stage2-p7a-reviewed-relation-backfill/v1');
assert.equal(relations.status, 'BRANCH_ONLY_REVIEWED_RELATION_LITERALIZATION_NO_PRODUCTION_MUTATION');
assert.equal(relations.rows.length, 118);
assert.equal(new Set(relations.rows.map((row) => row.activity_id)).size, 118);
assert.equal(relations.result.residual_relation_dependency_rows, 127);
assert.equal(relations.result.existing_reviewed_hint_rows, 88);
assert.equal(relations.result.explicit_reviewed_overlay_rows, 30);
assert.equal(relations.result.explicit_relation_review_rows_remaining, 9);
assert.equal(relations.result.production_mutation_authorized, false);

const allowedRelationIds = new Set([
  '7ca4de8f-01d4-542c-acc1-a06848c6742c',
  '67a57b37-1853-5f2a-b7ab-e6b2d32b56b6',
  '0fc4827f-8543-52f7-9e9a-3173b0c698a7',
  'f33d2789-2e65-50c1-af3e-91335bcbd3ca',
  '5d2d3af6-6e53-5af1-8423-f76c2263afe4',
  'fcc652d6-8cf5-5348-9375-60b35f6e0b8c'
]);
for (const row of relations.rows) {
  assert.ok(allowedRelationIds.has(row.relation_type_id), `unexpected relation UUID ${row.activity_id}`);
  assert.match(row.activity_id, /^[0-9a-f-]{36}$/);
  assert.equal(typeof row.reviewed_relation_code, 'string');
  assert.notEqual(row.reviewed_relation_code, '');
}

console.log(JSON.stringify({
  marker: 'ATLAS_STAGE2_P7P8_PRECUTOVER_INVENTORY_OK',
  residual_unique_activities: 156,
  relation_rows: 127,
  relation_literalizable: 118,
  relation_review_remaining: 9,
  p8_status: 'NOT_READY',
  production_mutation_authorized: false
}, null, 2));
