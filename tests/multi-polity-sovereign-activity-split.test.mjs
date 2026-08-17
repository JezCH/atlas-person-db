import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const plan = JSON.parse(fs.readFileSync(new URL("../corrections/plans/multi-polity-sovereign-split-20260817.v1.json", import.meta.url), "utf8"));
const christianXIceland = JSON.parse(fs.readFileSync(new URL("../authoring/requests/christian-x-iceland-1918-1944.json", import.meta.url), "utf8"));

const DENMARK = "c117fb82-4943-40d6-bc2d-740f0665665a";
const NORWAY = "683037ec-b5e1-4373-986e-c63df8ea75c2";
const SWEDEN = "93613017-b4c4-5f82-8e96-3ce6b2d3a61e";
const KING = "8290e1c0-fbc9-5efb-a65a-ca2c5ed432c3";
const RULES = "7ca4de8f-01d4-542c-acc1-a06848c6742c";

function byCase(caseId) {
  return plan.operations.find((operation) => operation.case_id === caseId);
}

test("multi-polity sovereign correction is a reviewed v2 split plan", () => {
  assert.equal(plan.schema, "atlas-stage2-correction-v2-execution-plan/v1");
  assert.equal(plan.execution_rules.one_activity_one_person_one_polity_scope, true);
  assert.equal(plan.execution_rules.simultaneous_distinct_polity_offices_require_distinct_activities, true);
  assert.equal(plan.execution_rules.true_reviewed_composite_polity_may_remain_single_activity, true);
  assert.equal(plan.operations.length, 2);
  assert.equal(plan.operations.every((operation) => operation.type === "split_activity"), true);
});

test("Christian IV becomes distinct Denmark and Norway rule Activities", () => {
  const operation = byCase("multi_polity_christian_iv_denmark_norway");
  assert.equal(operation.fragments.length, 2);
  const survivor = operation.fragments.find((fragment) => fragment.survivor === true);
  const created = operation.fragments.find((fragment) => fragment.survivor === false);
  assert.equal(survivor.activity_id, operation.activity_id);
  assert.equal(survivor.polity_id, DENMARK);
  assert.equal(created.polity_id, NORWAY);
  assert.equal(survivor.role_id, KING);
  assert.equal(created.role_id, KING);
  assert.equal(survivor.relation_type_id, RULES);
  assert.equal(created.relation_type_id, RULES);
  assert.equal(created.source_copy_policy, "COPY_EXISTING");
});

test("Oscar II becomes Sweden through 1907 plus Norway through 26 October 1905", () => {
  const operation = byCase("multi_polity_oscar_ii_sweden_norway");
  const sweden = operation.fragments.find((fragment) => fragment.survivor === true);
  const norway = operation.fragments.find((fragment) => fragment.survivor === false);
  assert.equal(sweden.polity_id, SWEDEN);
  assert.equal(sweden.activity_start, 1872);
  assert.equal(sweden.activity_end, 1907);
  assert.equal(norway.polity_id, NORWAY);
  assert.equal(norway.activity_end, 1905);
  assert.deepEqual(norway.activity_end_detail, {
    year: 1905,
    month: 10,
    day: 26,
    granularity: "day",
    certainty: "exact",
    calendar: "gregorian"
  });
  assert.equal(norway.source_copy_policy, "COPY_EXISTING");
});

test("Christian X adds a separate Iceland sovereign Activity without polity in Role", () => {
  assert.equal(christianXIceland.review_status, "approved");
  assert.equal(christianXIceland.person.canonical_name_en, "Christian X");
  assert.equal(christianXIceland.polity.canonical_name_en, "Iceland");
  assert.equal(christianXIceland.activity.relation_type, "rules");
  assert.equal(christianXIceland.activity.role, "King");
  assert.equal(christianXIceland.activity.start_year, 1918);
  assert.equal(christianXIceland.activity.end_year, 1944);
  assert.equal(christianXIceland.sources.length, 2);
});
