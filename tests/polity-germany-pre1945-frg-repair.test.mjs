import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const plan = JSON.parse(fs.readFileSync(new URL("../corrections/plans/polity-germany-pre1945-frg-repair-20260927.v1.json", import.meta.url), "utf8"));
const names = JSON.parse(fs.readFileSync(new URL("../corrections/requests/polity-germany-reich-frg-names-20260927.v2.json", import.meta.url), "utf8"));
const spatial = JSON.parse(fs.readFileSync(new URL("../atlas-polity-spatial-index.json", import.meta.url), "utf8"));

const GERMANY = "5dee6535-9839-4c8b-8de5-b7519d41801d";
const WEIMAR = "7594c57e-0b32-49d6-84d0-f65cd46f759e";
const FRG = "2a3df3a5-6f18-42c0-8332-3ccaebdf3508";
const HEISENBERG = "706e4da7-5cce-4cb5-a5ae-3f2d166f7c32";

test("Germany repair relinks Heisenberg 1927 to the existing Weimar Republic", () => {
  assert.equal(plan.operations.length, 6);
  const op = plan.operations.find((row) => row.activity_id === HEISENBERG);
  assert.ok(op);
  assert.equal(op.type, "rewrite_activity");
  assert.equal(op.baseline_before.polity_id, GERMANY);
  assert.equal(op.baseline_before.source_count, 1);
  assert.equal(op.after.activity_id, HEISENBERG);
  assert.equal(op.after.polity_id, WEIMAR);
  assert.equal(op.after.activity_start, 1927);
  assert.equal(op.after.activity_end, 1927);
  assert.equal(op.after.source_links_policy, "PRESERVE_ALL_EXISTING_NORMALIZED_SOURCE_LINKS_AND_LOCATORS");
  assert.match(op.after.reviewed_notes, /Weimar Republic/);
});

test("the five 1933-1945 activities remain on one bounded German Reich survivor", () => {
  const survivors = plan.operations.filter((row) => row.activity_id !== HEISENBERG);
  assert.equal(survivors.length, 5);
  for (const op of survivors) {
    assert.equal(op.baseline_before.polity_id, GERMANY);
    assert.equal(op.after.polity_id, GERMANY);
    assert.equal(op.after.activity_id, op.activity_id);
    assert.equal(op.after.notes_policy, "REPLACE_WITH_REVIEWED_NOTES");
    assert.equal(op.after.source_links_policy, "PRESERVE_ALL_EXISTING_NORMALIZED_SOURCE_LINKS_AND_LOCATORS");
    assert.match(op.after.reviewed_notes, /German Reich \(1933-1945\)/);
  }
});

test("German polity names are bounded and the FRG Korean name is no longer period-specific West Germany", () => {
  assert.ok(plan.release_order < names.release_order);
  const byCase = new Map(names.operations.map((op) => [op.case_id, op]));
  assert.deepEqual(
    [byCase.get("germany-reich-1933-1945-en-preferred-name").expected_name, byCase.get("germany-reich-1933-1945-en-preferred-name").replacement_name],
    ["Germany", "German Reich (1933–1945)"]
  );
  assert.deepEqual(
    [byCase.get("germany-reich-1933-1945-ko-preferred-name").expected_name, byCase.get("germany-reich-1933-1945-ko-preferred-name").replacement_name],
    ["독일", "독일국(1933–1945)"]
  );
  assert.deepEqual(
    [byCase.get("federal-republic-germany-ko-preferred-name").expected_name, byCase.get("federal-republic-germany-ko-preferred-name").replacement_name],
    ["서독", "독일연방공화국"]
  );
});

test("Germany repair requires no Spatial mutation", () => {
  assert.equal(plan.result.spatial_mutation_required, false);
  for (const polityId of [GERMANY, WEIMAR, FRG]) {
    assert.equal(spatial.polity_geography[polityId], "europe");
    assert.equal(spatial.polity_subregions[polityId], "central-europe");
  }
});
