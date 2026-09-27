import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const plan = JSON.parse(fs.readFileSync(new URL("../corrections/plans/polity-serbia-medieval-modern-repair-20260927.v1.json", import.meta.url), "utf8"));
const spatial = JSON.parse(fs.readFileSync(new URL("../atlas-polity-spatial-index.json", import.meta.url), "utf8"));

const MODERN_KINGDOM = "63c4d67f-2190-4b71-bde6-69d1cda80a3f";
const MEDIEVAL_SERBIAN_IDENTITY = "9a26d673-abe1-4d66-b691-3afdaf01a586";
const DUSAN_KING_ACTIVITY = "b2a26b8e-a4fc-4e8f-90ea-91756dda2321";

test("Serbia repair preserves Dušan Activity UUID while removing the modern Kingdom UUID from the medieval phase", () => {
  assert.equal(plan.operations.length, 1);
  const op = plan.operations[0];
  assert.equal(op.type, "rewrite_activity");
  assert.equal(op.activity_id, DUSAN_KING_ACTIVITY);
  assert.equal(op.baseline_before.polity_id, MODERN_KINGDOM);
  assert.equal(op.after.activity_id, DUSAN_KING_ACTIVITY);
  assert.equal(op.after.polity_id, MEDIEVAL_SERBIAN_IDENTITY);
  assert.equal(op.after.role_id, "8290e1c0-fbc9-5efb-a65a-ca2c5ed432c3");
  assert.equal(op.after.activity_start, 1331);
  assert.equal(op.after.activity_end, 1346);
  assert.equal(op.after.notes_policy, "REPLACE_WITH_REVIEWED_NOTES");
  assert.equal(op.after.source_links_policy, "PRESERVE_ALL_EXISTING_NORMALIZED_SOURCE_LINKS_AND_LOCATORS");
});

test("the medieval Serbian identity exposes Kingdom of Serbia only as the 1331-1346 temporal state-form designation", () => {
  assert.equal(plan.stage2_assertions.length, 1);
  const assertion = plan.stage2_assertions[0];
  assert.equal(assertion.type, "assert_polity_designation");
  assert.equal(assertion.exact_after.designation.polity_id, MEDIEVAL_SERBIAN_IDENTITY);
  assert.equal(assertion.exact_after.designation.designation_type, "state_form");
  assert.equal(assertion.exact_after.designation.valid_from_year, 1331);
  assert.equal(assertion.exact_after.designation.valid_to_year, 1346);
  const names = new Map(assertion.exact_after.names.map((row) => [row.locale,row.name]));
  assert.equal(names.get("en"), "Kingdom of Serbia");
  assert.equal(names.get("ko"), "세르비아 왕국");
  assert.equal(assertion.exact_after.source_links[0].source_id, "86418066-40d6-4bb6-af9f-c21fe1ac25ef");
});

test("modern Kingdom of Serbia remains a separate survivor and the repair requires no Spatial mutation", () => {
  assert.equal(plan.result.modern_kingdom_polity_id_preserved, MODERN_KINGDOM);
  assert.equal(plan.result.target_existing_polity_id, MEDIEVAL_SERBIAN_IDENTITY);
  assert.equal(spatial.polity_geography[MODERN_KINGDOM], "europe");
  assert.equal(spatial.polity_subregions[MODERN_KINGDOM], "balkans");
  assert.equal(spatial.polity_geography[MEDIEVAL_SERBIAN_IDENTITY], "europe");
  assert.equal(spatial.polity_subregions[MEDIEVAL_SERBIAN_IDENTITY], "balkans");
});
