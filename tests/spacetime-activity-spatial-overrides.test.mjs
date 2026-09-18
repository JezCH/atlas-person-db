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
  ["747c2472-b051-4412-8f7b-51f551a1ec17", ["68c83ef6-0023-5af9-a6e8-26ccf5b8e116", 1692, 1711, "west-asia", "arabia", "Rustaq"]],
  ["b8bd254a-612a-4a21-a625-ddc55ab9b763", ["a81055d7-ed0d-45a6-90c6-738e1a9ba94d", -165, -140, "europe", "eastern-europe", "Pontic steppe (Dnieper–Don)"]],
  ["5060c16c-b79d-42a2-92b0-d3c842fc86b4", ["70aedae1-9544-4e8a-bfd8-6feda3e142c7", 406, 406, "europe", "central-europe", "Rhine frontier (Mainz area)"]],
  ["fc4903bd-ab41-43c9-904d-3a0c0e0126e1", ["857597b9-4554-4eff-9b00-2441c7e09a47", 972, 972, "europe", "eastern-europe", "Dnieper rapids / Khortytsia"]],
  ["4e73f2ee-c6eb-46cc-a0aa-a54dc8e879d0", ["63828485-5db4-429f-a9d5-2523eacc11ee", 1091, 1096, "europe", "eastern-europe", "Pereyaslav–Trubezh steppe frontier"]],
  ["6787936c-046b-4b6e-882f-2f96079c9881", ["63828485-5db4-429f-a9d5-2523eacc11ee", 1171, 1203, "europe", "eastern-europe", "Donets–Dnieper Cuman steppe"]],
  ["fa94fed6-a7db-4dfa-ad96-709f541e30cf", ["25401991-b8df-454f-8fdc-652699c95958", 1618, 1623, "southeast-asia", "maritime-southeast-asia", "Batavia (Jakarta)"]],
  ["397bf9a7-0108-4feb-841b-e1966abf168e", ["25401991-b8df-454f-8fdc-652699c95958", 1627, 1629, "southeast-asia", "maritime-southeast-asia", "Batavia (Jakarta)"]],
  ["7fad023c-4544-4675-ad74-0ff44dd0d67a", ["44a197bb-1b80-484e-9ea2-e29c3f9904fc", 1757, 1757, "south-asia", "north-india-ganges", "Plassey / Bengal"]],
  ["baf5a91d-e054-407d-9ce9-4f8f28f1b68e", ["9e227293-7ab8-5870-b05b-0b8c715738a4", 1785, 1785, "americas", "north-america", "Mission San Gabriel, California"]],
  ["32ad5a54-9dbe-46b4-bfd1-859dab6dca91", ["eb2f8e2e-220b-4754-afe9-25449b1d35ec", 1915, 1915, "west-asia", "levant", "Negev–Sinai Tarabin core"]],
  ["e65edaa4-645a-479f-be81-6414ff2f71ba", ["a602213a-dccb-4a23-96c3-e91dfc300a9f", 1958, 1970, "africa", "nile-valley", "Cairo"]],
  ["f5d38634-6cc2-4fdb-8b8c-535ee16c5340", ["08a804bf-81c1-4206-85ed-47b139104915", 1983, 1983, "africa", "east-africa", "Mauritius (Chagos Refugees Group)"]]
]);

function activity(activityId, polityId, startYear, endYear) {
  return {
    id: activityId,
    polity: polityId ? { id: polityId } : null,
    start: { year: startYear },
    end: { year: endYear }
  };
}

test("canonical Activity overrides are exact reviewed UUID/interval facts", () => {
  const validation = model.validateSpatialIndex(index);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(index.activity_spatial_overrides.length, 17);
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

test("all reviewed single-leaf Activity overrides resolve through exact UUID/interval facts", () => {
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
