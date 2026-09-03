import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const spaceAxis = require("../atlas-person-spacetime-space-axis.js");
const index = JSON.parse(readFileSync(new URL("../atlas-polity-spatial-index.json", import.meta.url), "utf8"));

const continuum = spaceAxis.createSpatialContinuum();

const EXPECTED_MACROS = [
  "americas","europe","africa","west-asia","central-asia",
  "south-asia","southeast-asia","east-asia","oceania"
];

const EXPECTED_SPLIT_COUNTS = Object.freeze({
  mesoamerica: 12,
  caribbean: 3,
  "eastern-europe": 5,
  "russia-volga": 7,
  "maghreb-north-africa": 4,
  "nile-valley": 4,
  anatolia: 3,
  caucasus: 3,
  levant: 10,
  mesopotamia: 7,
  "sri-lanka-maldives": 2,
  manchuria: 4
});

const LEGACY_SPLIT_CODES = [
  "mesoamerica-caribbean",
  "eastern-europe-russia",
  "north-africa-nile",
  "anatolia-caucasus",
  "levant-mesopotamia",
  "manchuria-mongolia"
];

const EXPECTED_REMAPS = Object.freeze({
  "86c66d1b-41bc-5e77-8d6a-dd569014a6ad":"mesoamerica",
  "b47d7265-f524-55b5-8c3e-3d7750446bb1":"mesoamerica",
  "678683e3-4a02-46be-9095-d639147b0fc8":"mesoamerica",
  "fdd78dc6-d66b-4c33-ad2f-83cde25c6976":"mesoamerica",
  "4365778e-e2a0-5175-9814-7e1b31843ef6":"mesoamerica",
  "bebeab93-987a-4897-adcd-fdfb7d7142c3":"mesoamerica",
  "a37819ec-8c89-5b3b-8ce4-96b1e06b7eda":"mesoamerica",
  "78c8746f-2fb6-5610-928a-0e89d1f37d90":"mesoamerica",
  "aa2811b8-a509-5db2-82e8-5e133d99ae40":"caribbean",

  "c068d786-ab71-5516-ad51-b682feba155a":"eastern-europe",
  "98ef5bbc-a2a9-4e46-a6e7-1e93df1f48d6":"eastern-europe",
  "debbbbad-6f6e-4d01-b487-08732b672c9b":"eastern-europe",
  "996cd5f9-8163-428f-89d8-3371b312732e":"russia-volga",
  "554f9015-a8fe-4002-b95e-1718f2f59f0f":"russia-volga",
  "dd07fc4c-b3ac-59ac-bdf2-9cc190893327":"russia-volga",
  "09528a4d-4b32-5ca5-8a10-fbe9687679df":"russia-volga",
  "c7ddf754-0faa-576f-af97-9d322cf64f01":"russia-volga",
  "8e0c3472-867d-5165-89c2-cb7866f6a5ed":"russia-volga",

  "b67c7d6e-7175-5fbe-ad0e-e4cb482dfee4":"maghreb-north-africa",
  "4d16c8d9-adb4-5bee-985f-6e90d267d7e0":"maghreb-north-africa",
  "fa19774c-ba5a-5a0a-a12b-788b99a056aa":"maghreb-north-africa",
  "1186dd7c-a02f-54dd-8d95-893c51b07dfc":"maghreb-north-africa",
  "8c25246a-3d73-4df9-8e4a-b0c5ca97c241":"nile-valley",
  "0eeef96d-4a94-57cd-85d2-7b146a3ab0b5":"nile-valley",
  "0200ceec-534a-5604-88a8-e0520a3259a0":"nile-valley",
  "4131d480-e71d-59ab-a2b6-45f045547a89":"nile-valley",

  "fc8fc733-d72c-4e87-a202-2732d4e0c8fa":"anatolia",
  "e796a0f9-7072-5d00-ba32-b0968399ee05":"anatolia",
  "e39222dc-bebe-422f-8b75-97db9709cee7":"caucasus",
  "c9c97b0b-671b-555c-bf76-8dff5dcdcb05":"caucasus",

  "7602fafc-b1f5-44af-9b4c-1c51d9daab13":"levant",
  "89509d8c-67a9-54aa-bf30-a3c49b150ac1":"levant",
  "eed04674-84c0-4ea8-aff7-aebf421a1fc4":"levant",
  "19b5dcfa-d258-478d-9860-061f5735cfda":"levant",
  "3cd56ff3-5af4-45cd-8afe-f85c09a241de":"levant",
  "b3780a65-7ba2-4fd5-af05-272d6f01660b":"levant",
  "7db938c5-9385-4c17-86b8-f289514cc221":"levant",
  "0b3a09b0-de70-471a-8d41-c24fa2ef0ca3":"levant",
  "92543cd1-48a3-43ea-82a7-51a816fc6e52":"levant",

  "3f39d4f6-eda9-544a-9cbb-32fc30213eab":"mesopotamia",
  "4385995b-990c-4f28-a577-5068878a463a":"mesopotamia",
  "ce6698d3-9229-5555-8041-7d70e2f8d896":"mesopotamia",
  "f15861e6-3769-5d40-87b8-be24fc1df20e":"mesopotamia",
  "3268029f-b2b9-52b3-9988-5e98bed20b3e":"mesopotamia",
  "33f8157e-e7c9-4cdb-bea6-9514fa5a57b8":"mesopotamia",

  "81abc0e7-367d-48db-853c-2bdd5f76fa04":"sri-lanka-maldives",
  "c4089cc9-41b3-4879-9db0-c8776c59c87d":"sri-lanka-maldives",

  "c49578ef-3430-453b-b36e-884376031431":"manchuria",
  "f0450e38-c5d8-579b-92ec-1e08434355b6":"manchuria",
  "c7414968-29fc-5749-bfda-bf4dab331dd8":"manchuria"
});

test("taxonomy r2 has one deterministic adjacency path and 39 equal active leaves", () => {
  assert.equal(spaceAxis.SPATIAL_HIERARCHY_POLICY.taxonomy_revision, "2026-09-03-r2");
  assert.deepEqual(continuum.macroregions.map((band) => band.code), EXPECTED_MACROS);
  assert.deepEqual(index.regions.map((region) => region.code), EXPECTED_MACROS);
  assert.equal(continuum.subregions.length, 39);
  for (const band of continuum.subregions) {
    assert.ok(Math.abs((band.max_space - band.min_space) - 1 / 39) < 1e-12);
  }

  const counts = new Map();
  for (const code of Object.values(index.polity_subregions)) counts.set(code, (counts.get(code) || 0) + 1);
  assert.equal(Object.keys(index.polity_subregions).length, 369);
  for (const leaf of continuum.subregions) {
    assert.ok((counts.get(leaf.code) || 0) > 0, leaf.code + " must remain an active reviewed leaf");
  }
});

test("mixed legacy leaves are fully retired and exact reviewed polity remaps are locked", () => {
  const values = new Set(Object.values(index.polity_subregions));
  for (const code of LEGACY_SPLIT_CODES) assert.equal(values.has(code), false, code + " must be retired");

  for (const [id, expected] of Object.entries(EXPECTED_REMAPS)) {
    assert.equal(index.polity_subregions[id], expected, id);
  }

  const counts = {};
  for (const code of Object.values(index.polity_subregions)) counts[code] = (counts[code] || 0) + 1;
  for (const [code, expected] of Object.entries(EXPECTED_SPLIT_COUNTS)) assert.equal(counts[code], expected, code);
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
  assert.deepEqual(hierarchy["south-asia"], ["northwest-south-asia","north-india-ganges","deccan-south-india","sri-lanka-maldives"]);
  assert.deepEqual(hierarchy["southeast-asia"], ["mainland-southeast-asia","maritime-southeast-asia"]);
  assert.deepEqual(hierarchy["east-asia"], ["china","manchuria","korean-peninsula","japan"]);
  assert.deepEqual(hierarchy.oceania, ["australasia","pacific-islands"]);
});
