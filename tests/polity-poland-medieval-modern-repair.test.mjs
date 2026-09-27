import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const plan = JSON.parse(fs.readFileSync(new URL("../corrections/plans/polity-poland-medieval-modern-repair-20260927.v1.json", import.meta.url), "utf8"));
const rename = JSON.parse(fs.readFileSync(new URL("../corrections/requests/polity-poland-early-piast-name-20260927.v2.json", import.meta.url), "utf8"));
const spatial = JSON.parse(fs.readFileSync(new URL("../atlas-polity-spatial-index.json", import.meta.url), "utf8"));

const EARLY_POLAND = "c6a9be73-8769-4b74-a066-c29555f508ba";
const SECOND_REPUBLIC = "d196f9f5-059c-411c-af45-af44a53838ff";
const MIESZKO = "240f78bc-c056-4963-a293-efca7fc54304";
const DMOWSKI = "5363d315-3f93-4b1f-a394-81fe5792fbe5";

test("Poland repair preserves Mieszko on the early polity and moves Dmowski to the Second Polish Republic", () => {
  assert.equal(plan.operations.length, 2);
  const mieszko = plan.operations.find((row) => row.activity_id === MIESZKO);
  const dmowski = plan.operations.find((row) => row.activity_id === DMOWSKI);
  assert.equal(mieszko.type, "rewrite_activity");
  assert.equal(mieszko.baseline_before.polity_id, EARLY_POLAND);
  assert.equal(mieszko.after.activity_id, MIESZKO);
  assert.equal(mieszko.after.polity_id, EARLY_POLAND);
  assert.equal(dmowski.type, "rewrite_activity");
  assert.equal(dmowski.baseline_before.polity_id, EARLY_POLAND);
  assert.equal(dmowski.after.activity_id, DMOWSKI);
  assert.equal(dmowski.after.polity_id, SECOND_REPUBLIC);
});

test("Mieszko chronology and provenance are preserved while stale generic-Poland notes are replaced", () => {
  const op = plan.operations.find((row) => row.activity_id === MIESZKO);
  assert.equal(op.baseline_before.source_count, 2);
  assert.equal(op.after.activity_start, 960);
  assert.equal(op.after.activity_start_detail.certainty, "approximate");
  assert.equal(op.after.activity_end, 992);
  assert.equal(op.after.activity_end_detail.certainty, "exact");
  assert.equal(op.after.notes_policy, "REPLACE_WITH_REVIEWED_NOTES");
  assert.match(op.after.reviewed_notes, /Piast state/);
  assert.equal(op.after.source_links_policy, "PRESERVE_ALL_EXISTING_NORMALIZED_SOURCE_LINKS_AND_LOCATORS");
});

test("Dmowski keeps the exact 1923 ministerial boundary and normalized sources", () => {
  const op = plan.operations.find((row) => row.activity_id === DMOWSKI);
  assert.equal(op.baseline_before.source_count, 2);
  assert.deepEqual(
    [op.after.activity_start_detail.year, op.after.activity_start_detail.month, op.after.activity_start_detail.day],
    [1923, 10, 27]
  );
  assert.deepEqual(
    [op.after.activity_end_detail.year, op.after.activity_end_detail.month, op.after.activity_end_detail.day],
    [1923, 12, 14]
  );
  assert.equal(op.after.activity_start_detail.calendar, "gregorian");
  assert.equal(op.after.activity_end_detail.calendar, "gregorian");
  assert.equal(op.after.source_links_policy, "PRESERVE_ALL_EXISTING_NORMALIZED_SOURCE_LINKS_AND_LOCATORS");
});

test("the surviving generic Poland UUID is renamed to a bounded early-Piast descriptive identity", () => {
  assert.ok(plan.release_order < rename.release_order);
  const byLocale = new Map(rename.operations.map((op) => [op.locale, op]));
  assert.deepEqual(
    [byLocale.get("en").expected_name, byLocale.get("en").replacement_name],
    ["Poland", "Early Piast State"]
  );
  assert.deepEqual(
    [byLocale.get("ko").expected_name, byLocale.get("ko").replacement_name],
    ["폴란드", "초기 피아스트 국가"]
  );
  assert.match(rename.evidence.identity_rule, /not asserted as a contemporaneous official state title/);
});

test("Poland repair requires no Spatial mutation because both identities are already Central Europe", () => {
  assert.equal(plan.result.spatial_mutation_required, false);
  assert.equal(spatial.polity_geography[EARLY_POLAND], "europe");
  assert.equal(spatial.polity_subregions[EARLY_POLAND], "central-europe");
  assert.equal(spatial.polity_geography[SECOND_REPUBLIC], "europe");
  assert.equal(spatial.polity_subregions[SECOND_REPUBLIC], "central-europe");
});
