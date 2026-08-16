import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const plan = JSON.parse(fs.readFileSync(new URL("../corrections/plans/activity-integrity-cleanup-20260816.v2.json", import.meta.url), "utf8"));

const NORTHERN_YUAN_ID = "986380c3-cc31-50d5-bb0d-6cae5fae0660";
const TSARDOM_OF_RUSSIA_ID = "8e0c3472-867d-5165-89c2-cb7866f6a5ed";
const NONEXISTENT_DRAFT_IDS = new Set([
  "1160e7db-73ef-5d3a-bd04-483c3094fd03",
  "21ee0e6b-8c7f-5d9d-82f2-140f28a44dec"
]);

function byCase(caseId) {
  return plan.operations.find((operation) => operation.case_id === caseId);
}

test("Activity integrity v2 cleanup keeps the reviewed 10 retire plus 3 rewrite scope", () => {
  assert.equal(plan.schema, "atlas-stage2-correction-v2-execution-plan/v1");
  assert.equal(plan.execution_rules.production_executable, false);
  assert.equal(plan.execution_rules.production_mutation_authorized, false);
  assert.equal(plan.operations.filter((operation) => operation.type === "retire_activity").length, 10);
  assert.equal(plan.operations.filter((operation) => operation.type === "rewrite_activity").length, 3);
  assert.equal(plan.result.retired_activity_count, 10);
  assert.equal(plan.result.rewritten_activity_count, 3);
});

test("Northern Yuan rewrites bind the existing canonical Polity UUID", () => {
  assert.equal(byCase("activity_integrity_huizong_northern_yuan").after.polity_id, NORTHERN_YUAN_ID);
  assert.equal(byCase("activity_integrity_koke_temur_northern_yuan").after.polity_id, NORTHERN_YUAN_ID);
});

test("Peter I pre-1721 rewrite binds the existing Tsardom of Russia Polity UUID", () => {
  assert.equal(byCase("activity_integrity_peter_tsardom").after.polity_id, TSARDOM_OF_RUSSIA_ID);
});

test("failed draft-only Polity UUIDs cannot re-enter the executable cleanup plan", () => {
  for (const operation of plan.operations) {
    if (operation.type !== "rewrite_activity") continue;
    assert.equal(NONEXISTENT_DRAFT_IDS.has(operation.after.polity_id), false, operation.case_id);
  }
});
