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
  ['0d7a50f2-e6ea-4a02-aedc-67c9b1bd9bb3', 'western-siberia'],
  ['0eec74a4-a2a4-43f3-b347-54370b94da14', 'himalayas'],
  ['29a81993-13e5-4bca-bf9b-d7421913dcd2', 'western-siberia'],
  ['5ee9928c-e6f4-4107-b078-1ae908db9beb', 'tibetan-plateau'],
  ['73539591-8035-4f03-ab39-796ebea9276b', 'tibetan-plateau'],
  ['7518462f-9769-413f-a245-cc3825b45d17', 'himalayas'],
  ['8382a731-65c6-4479-8fb1-553141313e2b', 'western-siberia'],
  ['84e6365e-cd43-42cd-874e-3c517cd8243a', 'western-siberia'],
  ['8ed716e1-44b9-4cdd-8efd-ee19a4b63f40', 'western-siberia'],
  ['95fc9762-58e2-4045-aba4-d555ca0ebd66', 'tibetan-plateau'],
  ['9639b3f0-9b94-42d3-98b9-273c7a601def', 'tibetan-plateau'],
  ['e3ca4f3c-3504-4830-b141-f4cdd0157763', 'himalayas'],
  ['f67af5a4-a2f5-492d-9220-92fe401bc167', 'western-siberia']
]);

test('r4 reviewed migration manifest matches the retained baseline exactly and compiles with reviewed shards', () => {
  const retainedBaseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const migrations = loadTaxonomyMigrationManifests(migrationDir);
  const migrated = applyTaxonomyMigrationManifests(retainedBaseline, migrations);

  assert.equal(migrated.migrated_polity_ids.length, expected.size);
  assert.deepEqual(new Set(migrated.migrated_polity_ids), new Set(expected.keys()));
  for (const [polityId, subregion] of expected) {
    assert.equal(migrated.baseline.polity_subregions[polityId], subregion, polityId);
  }

  const compiled = compileSpatialBindings({
    baseline: migrated.baseline,
    shards: loadReviewedBindingShards(shardDir)
  });
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
