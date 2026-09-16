import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compileSpatialBindings,
  loadReviewedBindingShards
} from '../scripts/compile-spatial-bindings.mjs';
import {
  applyTaxonomyMigrationManifests,
  loadTaxonomyMigrationManifests
} from '../scripts/compile-spatial-bindings-r4.mjs';

const baselinePath = 'spatial/reviewed-bindings/0000-migrated-baseline.index.json';
const shardDir = 'spatial/reviewed-bindings/shards';
const migrationDir = 'spatial/taxonomy-migrations';

const expected = new Map([
  ['031bdca0-d5e8-51e8-9f59-2db5ee51c55f', 'mainland-southeast-asia'],
  ['0d7a50f2-e6ea-4a02-aedc-67c9b1bd9bb3', 'western-siberia'],
  ['0eec74a4-a2a4-43f3-b347-54370b94da14', 'himalayas'],
  ['14113865-1569-521a-bae5-8ae070f4817d', 'china'],
  ['16add357-f450-515d-87d6-fc32835d0e13', 'caribbean'],
  ['18f27d4e-a522-59f3-92c3-09ca5202de0d', 'levant'],
  ['1fa78018-e3af-55c3-8b8e-1bf7ad1c4b08', 'north-america'],
  ['264b069b-994f-4a2c-8af1-7331c631a376', 'eastern-europe'],
  ['29a81993-13e5-4bca-bf9b-d7421913dcd2', 'western-siberia'],
  ['4d4eee6d-389b-4ab6-8bca-fda9314ff796', 'eastern-europe'],
  ['54433b65-1eb1-5c41-b440-6c4de8e18417', 'japan'],
  ['5ee9928c-e6f4-4107-b078-1ae908db9beb', 'tibetan-plateau'],
  ['67ea837b-9ff6-4ade-ba49-00e73cf0b4b3', 'north-america'],
  ['73539591-8035-4f03-ab39-796ebea9276b', 'tibetan-plateau'],
  ['7518462f-9769-413f-a245-cc3825b45d17', 'himalayas'],
  ['769e6a5e-b49b-5fec-9a2b-fa78999763a1', 'australasia'],
  ['80810807-0abb-5255-b40c-1945f4073eb1', 'north-india-ganges'],
  ['8382a731-65c6-4479-8fb1-553141313e2b', 'western-siberia'],
  ['84e6365e-cd43-42cd-874e-3c517cd8243a', 'western-siberia'],
  ['8b335f26-bbc3-48db-9af7-66d29eaa8be5', 'eastern-siberia-far-east'],
  ['8ed716e1-44b9-4cdd-8efd-ee19a4b63f40', 'western-siberia'],
  ['95fc9762-58e2-4045-aba4-d555ca0ebd66', 'tibetan-plateau'],
  ['9639b3f0-9b94-42d3-98b9-273c7a601def', 'tibetan-plateau'],
  ['a127a8aa-6e17-5045-9bd6-de4df7b53390', 'central-africa'],
  ['b82ec632-5365-5f62-8aec-550548d63f83', 'arabia'],
  ['ba7a7e2d-3ba5-5a54-a98f-88294d3429f7', 'western-europe'],
  ['c591bebb-90a3-5a96-90c5-9870ddd7f637', 'north-america'],
  ['cfe1faef-3a82-5b6c-b542-cff2bd667c6c', 'western-europe'],
  ['d16ef45f-9721-4eaf-809f-c2ccdc499fb4', 'manchuria'],
  ['d4c6c00a-5309-48b9-aaaf-80d43ca3700a', 'central-europe'],
  ['d8477ae3-f78a-4053-a1ac-778df48b113b', 'central-europe'],
  ['e07ee32e-e126-5511-9d3d-d29e4444bd9c', 'japan'],
  ['e146e6ef-15f0-4bca-9e5d-b26672c65018', 'eastern-siberia-far-east'],
  ['e1548cb1-f89d-538b-9fb2-bad02ad87f8e', 'japan'],
  ['e3ca4f3c-3504-4830-b141-f4cdd0157763', 'himalayas'],
  ['efc86adb-7fc7-5efe-9c4d-7cd8e224890f', 'northern-europe'],
  ['f67af5a4-a2f5-492d-9220-92fe401bc167', 'western-siberia'],
]);

test('r4 reviewed static migration manifest matches the current reviewed spatial source exactly', () => {
  const retainedBaseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const currentReviewed = compileSpatialBindings({
    baseline: retainedBaseline,
    shards: loadReviewedBindingShards(shardDir)
  });
  const migrations = loadTaxonomyMigrationManifests(migrationDir);
  const migrated = applyTaxonomyMigrationManifests(currentReviewed.index, migrations);

  assert.equal(migrated.migrated_polity_ids.length, expected.size);
  assert.deepEqual(new Set(migrated.migrated_polity_ids), new Set(expected.keys()));
  for (const [polityId, subregion] of expected) {
    assert.equal(migrated.baseline.polity_subregions[polityId], subregion, polityId);
  }

  const compiled = compileSpatialBindings({ baseline: migrated.baseline, shards: [] });
  for (const [polityId, subregion] of expected) {
    assert.equal(compiled.index.polity_subregions[polityId], subregion, polityId);
  }
});

test('r4 canonical hierarchy exposes 9 macroregions and 45 active leaves through the compiler target contract', async () => {
  const axis = await import('../atlas-person-spacetime-space-axis.js');
  const hierarchy = axis.default?.DEFAULT_SPATIAL_HIERARCHY || axis.DEFAULT_SPATIAL_HIERARCHY;
  assert.equal(hierarchy.length, 9);
  assert.equal(hierarchy.reduce((sum, macro) => sum + macro.subregions.length, 0), 45);
});
