import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const plan = JSON.parse(fs.readFileSync(new URL("../corrections/plans/polity-han-character-repair-zhang-qian-20260925.v1.json", import.meta.url), "utf8"));
const rename = JSON.parse(fs.readFileSync(new URL("../corrections/requests/polity-han-warring-states-name-disambiguation-20260925.v2.json", import.meta.url), "utf8"));
const spatial = JSON.parse(fs.readFileSync(new URL("../atlas-polity-spatial-index.json", import.meta.url), "utf8"));

const HAN = "46740a29-a891-5ff8-9804-0f8aba62e71e";
const WESTERN_HAN = "34fac2d0-ba70-53e6-8e5a-47a9cd6ddfec";
const ZHANG_QIAN_ACTIVITY = "d0f0408c-e9c7-4a00-9b12-3ad2f78cb6ab";

test("Han character repair relinks only Zhang Qian to existing Western Han and preserves Activity identity", () => {
  assert.equal(plan.schema, "atlas-stage2-correction-v2-execution-plan/v1");
  assert.equal(plan.execution_rules.production_executable, false);
  assert.equal(plan.execution_rules.production_mutation_authorized, false);
  assert.equal(plan.operations.length, 1);

  const operation = plan.operations[0];
  assert.equal(operation.type, "rewrite_activity");
  assert.equal(operation.activity_id, ZHANG_QIAN_ACTIVITY);
  assert.equal(operation.baseline_before.polity_id, HAN);
  assert.equal(operation.after.activity_id, ZHANG_QIAN_ACTIVITY);
  assert.equal(operation.after.polity_id, WESTERN_HAN);
  assert.equal(operation.after.notes_policy, "PRESERVE_EXACT_LIVE_NOTES");
  assert.equal(operation.after.source_links_policy, "PRESERVE_ALL_EXISTING_NORMALIZED_SOURCE_LINKS_AND_LOCATORS");
  assert.equal(operation.baseline_before.source_count, 1);
});

test("surviving Warring States Han UUID is disambiguated by preferred names only", () => {
  assert.equal(rename.schema, "atlas-correction-manifest/v2");
  assert.equal(rename.review_status, "approved");
  assert.equal(rename.operations.length, 2);
  assert.ok(rename.operations.every((operation) => operation.type === "replace_polity_preferred_name"));
  assert.ok(rename.operations.every((operation) => operation.polity_id === HAN));

  const byLocale = new Map(rename.operations.map((operation) => [operation.locale, operation]));
  assert.deepEqual(
    [byLocale.get("en").expected_name, byLocale.get("en").replacement_name],
    ["Han", "Han (Warring States)"]
  );
  assert.deepEqual(
    [byLocale.get("ko").expected_name, byLocale.get("ko").replacement_name],
    ["한나라", "한(韓)"]
  );
});

test("Han relink needs no Spatial mutation because both identities already share reviewed China placement", () => {
  assert.equal(spatial.polity_geography[HAN], "east-asia");
  assert.equal(spatial.polity_subregions[HAN], "china");
  assert.equal(spatial.polity_geography[WESTERN_HAN], "east-asia");
  assert.equal(spatial.polity_subregions[WESTERN_HAN], "china");
});
