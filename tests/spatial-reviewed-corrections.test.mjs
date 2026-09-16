import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  compileSpatialBindings,
  loadReviewedBindingShards,
  loadReviewedCorrectionManifests
} from '../scripts/compile-spatial-bindings.mjs';

const baseline = JSON.parse(fs.readFileSync('spatial/reviewed-bindings/0000-migrated-baseline.index.json', 'utf8'));
const shards = loadReviewedBindingShards('spatial/reviewed-bindings/shards');
const correctionEntries = loadReviewedCorrectionManifests('spatial/reviewed-binding-corrections');
const reviewed = correctionEntries.find((entry) => entry.value.correction_id === 'macro-only-existing-leaf-22-20260915');

assert.ok(reviewed, '22-item reviewed correction manifest must exist');

const EXPECTED = new Map([
  ['80810807-0abb-5255-b40c-1945f4073eb1', ['south-asia', 'north-india-ganges']],
  ['264b069b-994f-4a2c-8af1-7331c631a376', ['europe', 'eastern-europe']],
  ['4d4eee6d-389b-4ab6-8bca-fda9314ff796', ['europe', 'eastern-europe']],
  ['efc86adb-7fc7-5efe-9c4d-7cd8e224890f', ['europe', 'northern-europe']],
  ['ba7a7e2d-3ba5-5a54-a98f-88294d3429f7', ['europe', 'western-europe']],
  ['cfe1faef-3a82-5b6c-b542-cff2bd667c6c', ['europe', 'western-europe']],
  ['d4c6c00a-5309-48b9-aaaf-80d43ca3700a', ['europe', 'central-europe']],
  ['d8477ae3-f78a-4053-a1ac-778df48b113b', ['europe', 'central-europe']],
  ['16add357-f450-515d-87d6-fc32835d0e13', ['americas', 'caribbean']],
  ['1fa78018-e3af-55c3-8b8e-1bf7ad1c4b08', ['americas', 'north-america']],
  ['67ea837b-9ff6-4ade-ba49-00e73cf0b4b3', ['americas', 'north-america']],
  ['c591bebb-90a3-5a96-90c5-9870ddd7f637', ['americas', 'north-america']],
  ['18f27d4e-a522-59f3-92c3-09ca5202de0d', ['west-asia', 'levant']],
  ['b82ec632-5365-5f62-8aec-550548d63f83', ['west-asia', 'arabia']],
  ['a127a8aa-6e17-5045-9bd6-de4df7b53390', ['africa', 'central-africa']],
  ['769e6a5e-b49b-5fec-9a2b-fa78999763a1', ['oceania', 'australasia']],
  ['031bdca0-d5e8-51e8-9f59-2db5ee51c55f', ['southeast-asia', 'mainland-southeast-asia']],
  ['14113865-1569-521a-bae5-8ae070f4817d', ['east-asia', 'china']],
  ['54433b65-1eb1-5c41-b440-6c4de8e18417', ['east-asia', 'japan']],
  ['d16ef45f-9721-4eaf-809f-c2ccdc499fb4', ['east-asia', 'manchuria']],
  ['e07ee32e-e126-5511-9d3d-d29e4444bd9c', ['east-asia', 'japan']],
  ['e1548cb1-f89d-538b-9fb2-bad02ad87f8e', ['east-asia', 'japan']]
]);

test('reviewed correction manifest is exactly the authoritative 22-item scope', () => {
  assert.equal(reviewed.value.corrections.length, 22);
  assert.equal(new Set(reviewed.value.corrections.map((item) => item.polity_id)).size, 22);
  assert.deepEqual(new Set(reviewed.value.corrections.map((item) => item.polity_id)), new Set(EXPECTED.keys()));
  for (const item of reviewed.value.corrections) {
    const [macro, leaf] = EXPECTED.get(item.polity_id);
    assert.equal(item.expected_region_code, macro);
    assert.equal(item.expected_subregion_code, null);
    assert.equal(item.region_code, macro);
    assert.equal(item.subregion_code, leaf);
  }
});

test('all 22 targets are baseline-owned macro-only bindings before correction', () => {
  for (const [polityId, [macro]] of EXPECTED) {
    assert.equal(baseline.polity_geography[polityId], macro, `${polityId} baseline macro`);
    assert.equal(baseline.polity_subregions?.[polityId] ?? null, null, `${polityId} baseline leaf must be null`);
  }
});

test('compiler applies exactly the reviewed leaf precision without changing macroregions', () => {
  const { index } = compileSpatialBindings({ baseline, shards, corrections: correctionEntries });
  for (const [polityId, [macro, leaf]] of EXPECTED) {
    assert.equal(index.polity_geography[polityId], macro, `${polityId} macro must remain unchanged`);
    assert.equal(index.polity_subregions[polityId], leaf, `${polityId} reviewed leaf`);
  }
});

test('correction path rejects stale before-state instead of overwriting precise data', () => {
  const stale = structuredClone(baseline);
  const [polityId, [, leaf]] = EXPECTED.entries().next().value;
  stale.polity_subregions ??= {};
  stale.polity_subregions[polityId] = leaf;
  assert.throws(
    () => compileSpatialBindings({ baseline: stale, shards, corrections: correctionEntries }),
    (error) => error?.code === 'SPATIAL_CORRECTION_STALE_BEFORE'
  );
});

test('correction path rejects macro crossing at manifest validation', () => {
  const badEntry = structuredClone(reviewed);
  badEntry.source = 'bad-crossing.corrections.json';
  badEntry.value.correction_id = 'bad-crossing';
  badEntry.value.corrections = [structuredClone(badEntry.value.corrections[0])];
  badEntry.value.corrections[0].region_code = 'europe';
  assert.throws(
    () => compileSpatialBindings({ baseline, shards, corrections: [badEntry] }),
    (error) => error?.code === 'SPATIAL_CORRECTION_MACRO_CROSSING'
  );
});
