import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const plan = JSON.parse(fs.readFileSync(new URL("../corrections/plans/christian-x-denmark-note-20260817.v1.json", import.meta.url), "utf8"));

const op = plan.operations[0];

test("Christian X Denmark correction rewrites only reviewed note context", () => {
  assert.equal(plan.schema, "atlas-stage2-correction-v2-execution-plan/v1");
  assert.equal(plan.release_order, 543);
  assert.equal(plan.execution_rules.semantic_identity_change_forbidden, true);
  assert.equal(plan.operations.length, 1);
  assert.equal(op.type, "rewrite_activity");
  assert.equal(op.activity_id, "c8b783cb-e235-427a-b217-470f0f5fafb2");
  assert.equal(op.after.activity_id, op.activity_id);
  assert.equal(op.after.person_id, op.baseline_before.person_id);
  assert.equal(op.after.polity_id, op.baseline_before.polity_id);
  assert.equal(op.after.role_id, op.baseline_before.role_id);
  assert.equal(op.after.period_basis_id, op.baseline_before.period_basis_id);
  assert.equal(op.after.activity_start, op.baseline_before.activity_start);
  assert.equal(op.after.activity_end, op.baseline_before.activity_end);
  assert.equal(op.after.notes_policy, "REPLACE_WITH_REVIEWED_NOTES");
  assert.match(op.after.reviewed_notes, /separate Iceland Activity/);
  assert.doesNotMatch(op.after.reviewed_notes, /does not add a second overlapping Iceland Activity/);
  assert.deepEqual(op.after.add_source_links, []);
});
