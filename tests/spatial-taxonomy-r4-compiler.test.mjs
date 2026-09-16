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

const africaExpected = new Map([
  ['4c8e0efc-e5c8-44d2-8b44-02df8c794aac', 'east-africa'],
  ['4d56294b-c22d-4e54-9f55-fc7852765226', 'east-africa'],
  ['88688560-e9bf-4a0c-bb9c-1bfe13b63270', 'east-africa'],
  ['8f2899e1-9a31-4964-a5b1-e1cf8a5e3bf9', 'east-africa'],
  ['aab87366-4825-40ed-b0f9-78e293746c8d', 'east-africa'],
  ['4458776f-6c31-4b93-950e-f2cdd16c852c', 'east-africa'],
  ['b1bf3f84-bc3a-44cb-996b-98f006edba10', 'east-africa'],
  ['0efc70ac-2bb4-4c2c-a765-f6c3a0607d56', 'east-africa'],
  ['96709ba6-218a-4292-b1fa-bebcc6c18c2a', 'east-africa'],
  ['02799dee-d86d-4a11-8cae-0911ea72803b', 'east-africa'],
  ['54dd3191-c2b3-4a84-9ee2-5dd2191715ea', 'east-africa'],
  ['4b532503-a686-452b-ad71-ba776efe17cf', 'east-africa'],
  ['b5c8227b-b391-43f8-9168-ad9a05e62e1d', 'east-africa'],
  ['2e52f532-31c1-41e8-aca6-07c40d2a319a', 'east-africa'],
  ['6c370a25-09c3-5897-8516-9aa664abda91', 'horn-of-africa'],
  ['db21d06f-3505-4f1c-8cdf-e7810330c3be', 'horn-of-africa'],
  ['f2dcb5c8-08cb-4d46-995f-d3a5ca7f1808', 'horn-of-africa'],
  ['4e27e24d-f99f-4c04-bdfa-9f3ce53b6a91', 'horn-of-africa'],
  ['4f2dc07e-84ff-4704-bcc6-ac43114615bb', 'horn-of-africa'],
  ['9b44bca9-5696-4a2e-98eb-9f888e805634', 'horn-of-africa'],
  ['cf32afb7-e889-4ced-a3ee-a85554b0da0a', 'horn-of-africa'],
  ['ea57a5b8-8553-40bb-b530-5eae8ab33801', 'horn-of-africa'],
  ['31062c39-be42-400b-87f5-ee06c8c86ad3', 'horn-of-africa']
]);

function compileR4() {
  const retainedBaseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const currentReviewed = compileSpatialBindings({
    baseline: retainedBaseline,
    shards: loadReviewedBindingShards(shardDir)
  });
  const manifests = loadTaxonomyMigrationManifests(migrationDir);
  const migrated = applyTaxonomyMigrationManifests(currentReviewed.index, manifests);
  return { manifests, migrated };
}

test('all reviewed r4 taxonomy manifests apply exactly and survive recompilation', () => {
  const { manifests, migrated } = compileR4();
  const declared = manifests.flatMap(({ value }) => value.migrations || []);
  const declaredIds = declared.map((item) => item.polity_id).sort();

  assert.equal(migrated.migrated_polity_ids.length, declared.length);
  assert.deepEqual([...migrated.migrated_polity_ids].sort(), declaredIds);

  for (const migration of declared) {
    assert.equal(
      migrated.baseline.polity_subregions[migration.polity_id],
      migration.to.subregion_code,
      migration.polity_id
    );
  }

  const compiled = compileSpatialBindings({ baseline: migrated.baseline, shards: [] });
  for (const migration of declared) {
    assert.equal(compiled.index.polity_subregions[migration.polity_id], migration.to.subregion_code, migration.polity_id);
  }
});

test('final r4 Africa split migrates all 23 retained legacy bindings and emits no legacy subregion', () => {
  const { migrated } = compileR4();
  assert.equal(africaExpected.size, 23);
  for (const [polityId, subregion] of africaExpected) {
    assert.equal(migrated.baseline.polity_subregions[polityId], subregion, polityId);
  }
  assert.equal(Object.values(migrated.baseline.polity_subregions).filter((value) => value === 'east-africa-horn').length, 0);
});

test('r4 canonical hierarchy exposes 9 macroregions and 45 active leaves through the compiler target contract', async () => {
  const axis = await import('../atlas-person-spacetime-space-axis.js');
  const hierarchy = axis.default?.DEFAULT_SPATIAL_HIERARCHY || axis.DEFAULT_SPATIAL_HIERARCHY;
  assert.equal(hierarchy.length, 9);
  assert.equal(hierarchy.reduce((sum, macro) => sum + macro.subregions.length, 0), 45);
});
