import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const model = require("../atlas-person-spacetime-model.js");
const compile = require("../atlas-person-spacetime-spatial-compile.js");
const index = JSON.parse(readFileSync(new URL("../atlas-polity-spatial-index.json", import.meta.url), "utf8"));

const EXPECTED = new Map([
  ["19fc5c65-cf80-4409-a0de-86195f46b102", ["01f4ce7b-aaa3-473a-a6fd-9c95c4a85ff7", 1064, 1092, "west-asia", "iranian-plateau", "Isfahan"]],
  ["bdd5ba3f-52c5-4461-9476-099918187856", ["01f4ce7b-aaa3-473a-a6fd-9c95c4a85ff7", 1074, 1079, "west-asia", "iranian-plateau", "Isfahan"]],
  ["54208459-1778-4a94-bf37-84d4d5c242b8", ["01f4ce7b-aaa3-473a-a6fd-9c95c4a85ff7", 1091, 1095, "west-asia", "mesopotamia", "Baghdad"]],
  ["c350d83a-ab5e-4c12-a48a-3157fb76509d", ["6539c314-ec29-42e0-a0c2-90991fb9ffd8", 1405, 1447, "south-asia", "northwest-south-asia", "Herat"]],
  ["747c2472-b051-4412-8f7b-51f551a1ec17", ["68c83ef6-0023-5af9-a6e8-26ccf5b8e116", 1692, 1711, "west-asia", "arabia", "Rustaq"]]
]);

function activity(activityId, polityId, startYear, endYear) {
  return {
    id: activityId,
    polity: polityId ? { id: polityId } : null,
    start: { year: startYear },
    end: { year: endYear }
  };
}

test("canonical period-gap Activity overrides are exact reviewed UUID/interval facts", () => {
  const validation = model.validateSpatialIndex(index);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(index.activity_spatial_overrides.length, 5);
  assert.deepEqual(new Set(index.activity_spatial_overrides.map((row) => row.activity_id)), new Set(EXPECTED.keys()));

  for (const row of index.activity_spatial_overrides) {
    const expected = EXPECTED.get(row.activity_id);
    assert.ok(expected, row.activity_id);
    assert.deepEqual(
      [row.expected_polity_id, row.expected_start_year, row.expected_end_year, row.region_code, row.subregion_code, row.location_label],
      expected
    );
    assert.ok(row.reason);
    assert.ok(Array.isArray(row.source_refs) && row.source_refs.length > 0);
  }
});

test("all five former place-function period gaps resolve through exact Activity overrides", () => {
  const lookup = model.createSpatialLookup(index);
  for (const [activityId, [polityId, startYear, endYear, regionCode, subregionCode, locationLabel]] of EXPECTED) {
    const resolved = model.resolveActivityPlacement(activity(activityId, polityId, startYear, endYear), lookup);
    assert.equal(resolved.status, "placed", activityId);
    assert.equal(resolved.segments.length, 1, activityId);
    const segment = resolved.segments[0];
    assert.equal(segment.placement_basis, "activity_override", activityId);
    assert.equal(segment.region_code, regionCode, activityId);
    assert.equal(segment.subregion_code, subregionCode, activityId);
    assert.equal(segment.location_label, locationLabel, activityId);
    assert.ok(segment.source_refs.length > 0, activityId);

    const compiled = compile.compileActivityPlacement(resolved);
    assert.equal(compiled.status, "placed", activityId);
    assert.equal(compiled.segments[0].spatial_precision, "subregion", activityId);
    assert.equal(compiled.segments[0].display_anchor_basis, "reviewed_activity_subregion", activityId);
    assert.equal(compiled.segments[0].subregion_code, subregionCode, activityId);
  }
});

test("Activity overrides fail closed if the canonical polity or interval drifts", () => {
  const lookup = model.createSpatialLookup(index);
  const [activityId, [polityId, startYear, endYear]] = EXPECTED.entries().next().value;

  const polityDrift = model.resolveActivityPlacement(activity(activityId, "00000000-0000-4000-8000-000000000001", startYear, endYear), lookup);
  assert.equal(polityDrift.status, "spatial_unresolved");
  assert.equal(polityDrift.reason, "activity_override_polity_mismatch");

  const intervalDrift = model.resolveActivityPlacement(activity(activityId, polityId, startYear, endYear - 1), lookup);
  assert.equal(intervalDrift.status, "spatial_unresolved");
  assert.equal(intervalDrift.reason, "activity_override_interval_mismatch");
});

test("invalid Activity override leaf-parent combinations are rejected", () => {
  const broken = structuredClone(index);
  broken.activity_spatial_overrides[0].subregion_code = "japan";
  const validation = model.validateSpatialIndex(broken);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /not a child of macroregion west-asia/);
});
