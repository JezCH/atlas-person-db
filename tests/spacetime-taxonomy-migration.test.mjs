import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { compileSpatialBindings, computeSpatialStats } from "../scripts/compile-spatial-bindings.mjs";

const require = createRequire(import.meta.url);
const spaceAxis = require("../atlas-person-spacetime-space-axis.js");
const index = JSON.parse(readFileSync(new URL("../atlas-polity-spatial-index.json", import.meta.url), "utf8"));

const continuum = spaceAxis.createSpatialContinuum();

const EXPECTED_MACROS = [
  "americas","europe","africa","west-asia","central-asia",
  "south-asia","southeast-asia","east-asia","oceania"
];

const RETIRED_SPLIT_CODES = [
  "mesoamerica-caribbean",
  "eastern-europe-russia",
  "north-africa-nile",
  "anatolia-caucasus",
  "levant-mesopotamia",
  "manchuria-mongolia",
  "sri-lanka-maldives"
];

test("taxonomy r4 has one deterministic adjacency path and 45 equal active leaves", () => {
  assert.equal(spaceAxis.SPATIAL_HIERARCHY_POLICY.taxonomy_revision, "2026-09-16-r4");
  assert.deepEqual(continuum.macroregions.map((band) => band.code), EXPECTED_MACROS);
  assert.deepEqual(index.regions.map((region) => region.code), EXPECTED_MACROS);
  assert.equal(continuum.subregions.length, 45);
  for (const band of continuum.subregions) {
    assert.ok(Math.abs((band.max_space - band.min_space) - 1 / 45) < 1e-12);
  }

  const stats = computeSpatialStats(index);
  assert.equal(stats.subregion_count, Object.keys(index.polity_subregions).length);
  for (const leaf of continuum.subregions) {
    const count = stats.subregion_counts[leaf.code] || 0;
    assert.ok(count > 0, leaf.code + " must remain an active reviewed leaf");
  }
});

test("retired r3 leaves and the former east-africa-horn alias are unreachable in canonical runtime taxonomy", () => {
  const values = new Set(Object.values(index.polity_subregions));
  for (const code of RETIRED_SPLIT_CODES) assert.equal(values.has(code), false, code + " must be retired");

  assert.equal(values.has("east-africa-horn"), false, "canonical r4 data must contain no legacy Africa assignment");
  assert.equal(continuum.subregions.some((leaf) => leaf.code === "east-africa-horn"), false, "legacy Africa code must not be an active r4 leaf");
  assert.equal(continuum.bandForCode("east-africa-horn"), null, "legacy Africa code must not resolve through the runtime/display continuum");
  assert.equal(continuum.macroForCode("east-africa-horn"), null, "legacy Africa code must not resolve to a runtime/display macroregion");

  const activeLeaves = new Set(continuum.subregions.map((leaf) => leaf.code));
  for (const [polityId, subregionCode] of Object.entries(index.polity_subregions)) {
    assert.ok(activeLeaves.has(subregionCode), `${polityId}: unknown subregion ${subregionCode}`);
    const leaf = continuum.bandForCode(subregionCode);
    assert.equal(leaf.parent_code, index.polity_geography[polityId], `${polityId}: ${subregionCode} parent mismatch`);
  }
});

test("new reviewed shards cannot author the retired east-africa-horn code", () => {
  const baseline = structuredClone(index);
  const candidate = {
    schema: "atlas-reviewed-spatial-bindings/v1",
    shard_id: "r4-legacy-reject-probe",
    reviewed_at: "2026-09-16T00:00:00Z",
    baseline: "r4 retirement probe",
    bindings: [{
      polity_id: "00000000-0000-4000-8000-000000000001",
      region_code: "africa",
      subregion_code: "east-africa-horn"
    }]
  };
  assert.throws(
    () => compileSpatialBindings({ baseline, shards: [{ source: "probe.bindings.json", value: candidate }] }),
    /UNKNOWN_SPATIAL_SUBREGION/
  );
});

test("map-like adjacency decisions remain explicit inside each refined macroregion", () => {
  const hierarchy = Object.fromEntries(spaceAxis.DEFAULT_SPATIAL_HIERARCHY.map((macro) => [
    macro.code,
    macro.subregions.map((leaf) => leaf.code)
  ]));

  assert.deepEqual(hierarchy.americas, ["south-america","caribbean","mesoamerica","north-america"]);
  assert.deepEqual(hierarchy.europe, ["britain-ireland","northern-europe","russia-volga","eastern-europe","balkans","central-europe","italy","western-europe","iberia"]);
  assert.deepEqual(hierarchy.africa, ["maghreb-north-africa","west-africa","central-africa","southern-africa","east-africa","horn-of-africa","nile-valley"]);
  assert.deepEqual(hierarchy["west-asia"], ["levant","arabia","mesopotamia","anatolia","caucasus","iranian-plateau"]);
  assert.deepEqual(hierarchy["central-asia"], ["western-central-asia","western-siberia","eastern-central-asia-steppe","tibetan-plateau"]);
  assert.deepEqual(hierarchy["south-asia"], ["himalayas","northwest-south-asia","north-india-ganges","deccan-south-india","maldives","sri-lanka"]);
  assert.deepEqual(hierarchy["southeast-asia"], ["maritime-southeast-asia","mainland-southeast-asia"]);
  assert.deepEqual(hierarchy["east-asia"], ["china","manchuria","eastern-siberia-far-east","korean-peninsula","japan"]);
  assert.deepEqual(hierarchy.oceania, ["pacific-islands","australasia"]);
  const flattened = spaceAxis.DEFAULT_SPATIAL_HIERARCHY.flatMap((macro) => macro.subregions.map((leaf) => leaf.code));
  const pair = (left,right) => assert.equal(flattened[flattened.indexOf(left)+1],right);
  pair("north-america","britain-ireland");
  pair("iberia","maghreb-north-africa");
  pair("nile-valley","levant");
  pair("iranian-plateau","western-central-asia");
  pair("tibetan-plateau","himalayas");
  pair("sri-lanka","maritime-southeast-asia");
  pair("mainland-southeast-asia","china");
  pair("japan","pacific-islands");
});