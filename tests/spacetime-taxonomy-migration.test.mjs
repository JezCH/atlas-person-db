import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { computeSpatialStats } from "../scripts/compile-spatial-bindings.mjs";

const require = createRequire(import.meta.url);
const spaceAxis = require("../atlas-person-spacetime-space-axis.js");
const index = JSON.parse(readFileSync(new URL("../atlas-polity-spatial-index.json", import.meta.url), "utf8"));

const continuum = spaceAxis.createSpatialContinuum();

const EXPECTED_MACROS = [
  "americas","europe","africa","west-asia","central-asia",
  "south-asia","southeast-asia","east-asia","oceania"
];

const LEGACY_SPLIT_CODES = [
  "mesoamerica-caribbean",
  "eastern-europe-russia",
  "north-africa-nile",
  "anatolia-caucasus",
  "levant-mesopotamia",
  "manchuria-mongolia",
  "sri-lanka-maldives"
];

test("taxonomy r3 has one deterministic adjacency path and 40 equal active leaves", () => {
  assert.equal(spaceAxis.SPATIAL_HIERARCHY_POLICY.taxonomy_revision, "2026-09-03-r3");
  assert.deepEqual(continuum.macroregions.map((band) => band.code), EXPECTED_MACROS);
  assert.deepEqual(index.regions.map((region) => region.code), EXPECTED_MACROS);
  assert.equal(continuum.subregions.length, 40);
  for (const band of continuum.subregions) {
    assert.ok(Math.abs((band.max_space - band.min_space) - 1 / 40) < 1e-12);
  }

  const stats = computeSpatialStats(index);
  assert.equal(stats.subregion_count, Object.keys(index.polity_subregions).length);
  for (const leaf of continuum.subregions) {
    assert.ok((stats.subregion_counts[leaf.code] || 0) > 0, leaf.code + " must remain an active reviewed leaf");
  }
});

test("mixed legacy leaves remain retired without per-batch numeric split locks", () => {
  const values = new Set(Object.values(index.polity_subregions));
  for (const code of LEGACY_SPLIT_CODES) assert.equal(values.has(code), false, code + " must be retired");

  const knownLeaves = new Set(continuum.subregions.map((leaf) => leaf.code));
  for (const [polityId, subregionCode] of Object.entries(index.polity_subregions)) {
    assert.ok(knownLeaves.has(subregionCode), `${polityId}: unknown subregion ${subregionCode}`);
    const leaf = continuum.bandForCode(subregionCode);
    assert.equal(leaf.parent_code, index.polity_geography[polityId], `${polityId}: ${subregionCode} parent mismatch`);
  }
});

test("map-like adjacency decisions remain explicit inside each refined macroregion", () => {
  const hierarchy = Object.fromEntries(spaceAxis.DEFAULT_SPATIAL_HIERARCHY.map((macro) => [
    macro.code,
    macro.subregions.map((leaf) => leaf.code)
  ]));

  assert.deepEqual(hierarchy.americas, ["north-america","mesoamerica","caribbean","south-america"]);
  assert.deepEqual(hierarchy.europe, ["britain-ireland","iberia","western-europe","italy","central-europe","northern-europe","balkans","eastern-europe","russia-volga"]);
  assert.deepEqual(hierarchy.africa, ["west-africa","maghreb-north-africa","central-africa","southern-africa","east-africa-horn","nile-valley"]);
  assert.deepEqual(hierarchy["west-asia"], ["levant","anatolia","caucasus","mesopotamia","arabia","iranian-plateau"]);
  assert.deepEqual(hierarchy["central-asia"], ["western-central-asia","eastern-central-asia-steppe"]);
  assert.deepEqual(hierarchy["south-asia"], ["northwest-south-asia","north-india-ganges","deccan-south-india","maldives","sri-lanka"]);
  assert.deepEqual(hierarchy["southeast-asia"], ["mainland-southeast-asia","maritime-southeast-asia"]);
  assert.deepEqual(hierarchy["east-asia"], ["china","manchuria","korean-peninsula","japan"]);
  assert.deepEqual(hierarchy.oceania, ["australasia","pacific-islands"]);
});
