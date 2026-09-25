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
  ["87ef772c-a363-4b1a-910b-93c2c90c3106", ["01f4ce7b-aaa3-473a-a6fd-9c95c4a85ff7", 1072, 1092, "west-asia", "iranian-plateau", "Isfahan"]],
  ["ca1b40e3-7854-453c-b34e-c854d8b87f53", ["01f4ce7b-aaa3-473a-a6fd-9c95c4a85ff7", 1040, 1063, "west-asia", "iranian-plateau", "Nishapur / Ray / Isfahan court sequence"]],
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
  ["f61310eb-65e8-58f9-a09d-a5dcbb8ebfc8", ["a1c6b0b4-ca71-420d-8d9f-502dc7914dd7", -195, -190, "west-asia", "anatolia", "Ephesus–Side / western Seleucid service theatre"]],
  ["f5d38634-6cc2-4fdb-8b8c-535ee16c5340", ["08a804bf-81c1-4206-85ed-47b139104915", 1983, 1983, "africa", "east-africa", "Mauritius (Chagos Refugees Group)"]],
  ["daf6e79a-a2e7-4c31-8db7-d7063b563463", ["389a3173-9372-4b87-a8ff-38c2a0ca4bef", 1719, 1722, "africa", "west-africa", "West African Atlantic theatre (representative anchor)"]],
  ["9bdef027-7274-44ec-ad5f-b17f36045a2c", ["f02ae5bc-968c-4f28-a312-4bdc3d353860", 1694, 1696, "south-asia", "northwest-south-asia", "Surat approaches / Arabian Sea (representative anchor)"]]
]);


const EXPECTED_COMPLEX = new Map([
  ["55e1fea7-11d4-4717-845a-4cbca5dccd0e", {
    polity_id: "a1c6b0b4-ca71-420d-8d9f-502dc7914dd7", start: -305, end: -281, mode: "multi_anchor",
    segments: [
      [-305, -281, "west-asia", "mesopotamia", "Seleucia on the Tigris"],
      [-300, -281, "west-asia", "levant", "Antioch on the Orontes"]
    ]
  }],
  ["86a61ce2-f235-4930-9795-a6f9db0787fc", {
    polity_id: "a1c6b0b4-ca71-420d-8d9f-502dc7914dd7", start: -222, end: -187, mode: "multi_anchor",
    segments: [
      [-222, -187, "west-asia", "levant", "Antioch"],
      [-222, -187, "west-asia", "mesopotamia", "Seleucia on the Tigris / Babylonia"],
      [-222, -187, "west-asia", "iranian-plateau", "Ecbatana"]
    ]
  }],
  ["3fb5ed9e-7df3-42c1-98d2-33969a7876c4", {
    polity_id: "01cd1acd-9321-4d25-bc30-4cbd561bcbd5", start: 395, end: 410, mode: "timeline_segments",
    segments: [
      [395, 400, "europe", "balkans", "Balkan / eastern imperial sphere"],
      [401, 402, "europe", "italy", "First Italian invasion"],
      [403, 407, "europe", "balkans", "Balkan sphere before permanent western move"],
      [408, 410, "europe", "italy", "Italy / Rome campaign"]
    ]
  }],
  ["c59b8896-b9a0-4fe2-a512-c9b9313eb907", {
    polity_id: "01cd1acd-9321-4d25-bc30-4cbd561bcbd5", start: 410, end: 415, mode: "timeline_segments",
    segments: [
      [410, 411, "europe", "italy", "Italy"],
      [412, 414, "europe", "western-europe", "Gaul / Narbonne–Bordeaux"],
      [415, 415, "europe", "iberia", "Hispania / Barcelona"]
    ]
  }],
  ["42b9e5cc-02f9-49d0-9968-9476a24918e7", {
    polity_id: "8cb0aec8-6228-4db6-88ad-584a21925ee1", start: 474, end: 493, mode: "timeline_segments",
    segments: [
      [474, 487, "europe", "balkans", "Macedonia / Roman Balkans"],
      [488, 493, "europe", "italy", "Italian conquest / Ravenna"]
    ]
  }],
  ["b39b76a1-e17b-46c0-a49d-4ffc91d1948a", {
    polity_id: "502f18c3-41fc-4cb8-84cc-67f7e0454a9d", start: 1154, end: 1189, mode: "multi_anchor",
    segments: [
      [1154, 1189, "europe", "britain-ireland", "England / insular Angevin realm"],
      [1154, 1189, "europe", "western-europe", "Normandy–Anjou / continental Angevin realm"]
    ]
  }],
  ["1446e736-96f8-5401-913f-022cb9b4b7c2", {
    polity_id: "4d16c8d9-adb4-5bee-985f-6e90d267d7e0", start: 1325, end: 1355, mode: "multi_anchor",
    segments: [
          [
                1325,
                1325,
                "africa",
                "maghreb-north-africa",
                "Tangier–Maghreb route to Egypt"
          ],
          [
                1326,
                1326,
                "africa",
                "nile-valley",
                "Cairo / Nile Valley"
          ],
          [
                1326,
                1326,
                "west-asia",
                "levant",
                "Jerusalem–Damascus corridor"
          ],
          [
                1326,
                1326,
                "west-asia",
                "arabia",
                "Medina–Mecca / Hajj"
          ],
          [
                1326,
                1327,
                "west-asia",
                "mesopotamia",
                "Iraq / Baghdad"
          ],
          [
                1326,
                1327,
                "west-asia",
                "iranian-plateau",
                "Persia / Tabriz"
          ],
          [
                1328,
                1330,
                "africa",
                "east-africa",
                "East African coast"
          ],
          [
                1328,
                1330,
                "west-asia",
                "arabia",
                "Red Sea / Arabian Sea / Arabia"
          ],
          [
                1330,
                1331,
                "west-asia",
                "anatolia",
                "Anatolia"
          ],
          [
                1332,
                1333,
                "europe",
                "russia-volga",
                "Golden Horde / Volga–Black Sea steppe"
          ],
          [
                1332,
                1333,
                "central-asia",
                "western-central-asia",
                "Chagatai / Central Asian route"
          ],
          [
                1334,
                1341,
                "south-asia",
                "north-india-ganges",
                "Delhi"
          ],
          [
                1341,
                1344,
                "south-asia",
                "deccan-south-india",
                "Southern India / Malabar"
          ],
          [
                1341,
                1344,
                "south-asia",
                "maldives",
                "Maldive Islands"
          ],
          [
                1341,
                1344,
                "south-asia",
                "sri-lanka",
                "Sri Lanka"
          ],
          [
                1345,
                1346,
                "southeast-asia",
                "maritime-southeast-asia",
                "Sumatra / Strait of Malacca"
          ],
          [
                1345,
                1346,
                "east-asia",
                "china",
                "Yuan China"
          ],
          [
                1346,
                1349,
                "southeast-asia",
                "maritime-southeast-asia",
                "Return route via Sumatra"
          ],
          [
                1346,
                1349,
                "south-asia",
                "deccan-south-india",
                "Return route via India"
          ],
          [
                1346,
                1349,
                "west-asia",
                "arabia",
                "Arabian coast / Mecca on return"
          ],
          [
                1346,
                1349,
                "west-asia",
                "iranian-plateau",
                "Hormuz / Persia on return"
          ],
          [
                1346,
                1349,
                "west-asia",
                "mesopotamia",
                "Baghdad on return"
          ],
          [
                1346,
                1349,
                "west-asia",
                "levant",
                "Damascus–Aleppo–Palestine on return"
          ],
          [
                1346,
                1349,
                "africa",
                "nile-valley",
                "Cairo on return"
          ],
          [
                1346,
                1349,
                "africa",
                "maghreb-north-africa",
                "Return to North Africa / Morocco"
          ],
          [
                1349,
                1350,
                "europe",
                "iberia",
                "al-Andalus"
          ],
          [
                1349,
                1351,
                "africa",
                "maghreb-north-africa",
                "Morocco / Fez"
          ],
          [
                1351,
                1354,
                "africa",
                "west-africa",
                "Sahara–Mali journey"
          ],
          [
                1354,
                1355,
                "africa",
                "maghreb-north-africa",
                "Fez / Rihla"
          ]
    ]
  }]
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
  // Keep legacy single-leaf overrides distinct from the five reviewed complex Activity overrides.
  const simpleRows = index.activity_spatial_overrides.filter((row) => !Array.isArray(row.segments) || row.segments.length === 0);
  assert.equal(simpleRows.length, EXPECTED.size);
  assert.deepEqual(new Set(simpleRows.map((row) => row.activity_id)), new Set(EXPECTED.keys()));

  for (const row of simpleRows) {
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
  assert.match(validation.errors.join("\n"), /subregion japan is not a child of macroregion /);
});


test("six complex Activity overrides preserve reviewed multi-anchor or timeline semantics", () => {
  const validation = model.validateSpatialIndex(index);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  const complexRows = index.activity_spatial_overrides.filter((row) => Array.isArray(row.segments) && row.segments.length > 0);
  assert.equal(complexRows.length, 6);
  assert.deepEqual(new Set(complexRows.map((row) => row.activity_id)), new Set(EXPECTED_COMPLEX.keys()));

  const lookup = model.createSpatialLookup(index);
  for (const row of complexRows) {
    const expected = EXPECTED_COMPLEX.get(row.activity_id);
    assert.ok(expected, row.activity_id);
    assert.equal(row.expected_polity_id, expected.polity_id, row.activity_id);
    assert.equal(row.expected_start_year, expected.start, row.activity_id);
    assert.equal(row.expected_end_year, expected.end, row.activity_id);
    assert.equal(row.override_mode, expected.mode, row.activity_id);
    assert.deepEqual(
      row.segments.map((segment) => [segment.start_year, segment.end_year, segment.region_code, segment.subregion_code, segment.location_label]),
      expected.segments,
      row.activity_id
    );
    assert.ok(row.segments.every((segment) => Array.isArray(segment.source_refs) && segment.source_refs.length > 0), row.activity_id);

    const resolved = model.resolveActivityPlacement(activity(row.activity_id, expected.polity_id, expected.start, expected.end), lookup);
    assert.equal(resolved.status, "placed", row.activity_id);
    assert.equal(resolved.segments.length, expected.segments.length, row.activity_id);
    assert.ok(resolved.segments.every((segment) => segment.placement_basis === "activity_override"), row.activity_id);
    assert.ok(resolved.segments.every((segment) => segment.activity_override_mode === expected.mode), row.activity_id);
    assert.deepEqual(
      resolved.segments.map((segment) => [segment.start_year, segment.end_year, segment.region_code, segment.subregion_code, segment.location_label]),
      expected.segments,
      row.activity_id
    );

    const compiled = compile.compileActivityPlacement(resolved);
    assert.equal(compiled.status, "placed", row.activity_id);
    assert.equal(compiled.segments.length, expected.segments.length, row.activity_id);
    assert.ok(compiled.segments.every((segment) => segment.spatial_precision === "subregion"), row.activity_id);
    assert.ok(compiled.segments.every((segment) => segment.display_anchor_basis === "reviewed_activity_subregion"), row.activity_id);
  }
});

test("timeline-segment overrides fail closed on gaps or overlaps", () => {
  const broken = structuredClone(index);
  const alaric = broken.activity_spatial_overrides.find((row) => row.activity_id === "3fb5ed9e-7df3-42c1-98d2-33969a7876c4");
  alaric.segments[1].start_year = 402;
  const validation = model.validateSpatialIndex(broken);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /timeline_segments must be contiguous and non-overlapping/);
});

test("multi-anchor overrides fail closed when reviewed anchors leave an Activity interval gap", () => {
  const broken = structuredClone(index);
  const seleucus = broken.activity_spatial_overrides.find((row) => row.activity_id === "55e1fea7-11d4-4717-845a-4cbca5dccd0e");
  seleucus.segments[0].start_year = -304;
  const validation = model.validateSpatialIndex(broken);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /multi_anchor segments must cover the full expected Activity interval without gaps/);
});
