import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applySpatialTaxonomyMigration,
  normalizeSpatialTaxonomyMigration
} from '../scripts/spatial-taxonomy-migration.mjs';

const polityId = '0eec74a4-a2a4-43f3-b347-54370b94da14';
const taxonomy = Object.freeze({
  macroCodes: new Set(['south-asia', 'africa']),
  subregionParent: new Map([
    ['himalayas', 'south-asia'],
    ['east-africa', 'africa'],
    ['horn-of-africa', 'africa']
  ]),
  legacySubregionParent: new Map([['east-africa-horn', 'africa']])
});

function manifest(overrides = {}) {
  return {
    schema: 'atlas-spatial-taxonomy-migration/v1',
    migration_id: 'test-r4',
    migrations: [
      {
        polity_id: polityId,
        from: { region_code: 'south-asia', subregion_code: null },
        to: { region_code: 'south-asia', subregion_code: 'himalayas' },
        reason: 'Reviewed exact UUID placement.'
      }
    ],
    ...overrides
  };
}

test('applies only an exact reviewed UUID when the expected source mapping matches', () => {
  const result = applySpatialTaxonomyMigration({
    baseline: {
      polity_geography: { [polityId]: 'south-asia' },
      polity_subregions: {}
    },
    manifest: manifest(),
    taxonomy
  });

  assert.equal(result.polity_geography[polityId], 'south-asia');
  assert.equal(result.polity_subregions[polityId], 'himalayas');
  assert.deepEqual(result.migrated_polity_ids, [polityId]);
});

test('refuses a migration when the retained baseline no longer matches the reviewed from mapping', () => {
  assert.throws(
    () => applySpatialTaxonomyMigration({
      baseline: {
        polity_geography: { [polityId]: 'south-asia' },
        polity_subregions: { [polityId]: 'himalayas' }
      },
      manifest: manifest(),
      taxonomy
    }),
    { code: 'SPATIAL_TAXONOMY_MIGRATION_SOURCE_MISMATCH' }
  );
});

test('refuses duplicate UUID entries', () => {
  const first = manifest().migrations[0];
  assert.throws(
    () => normalizeSpatialTaxonomyMigration(manifest({ migrations: [first, { ...first }] }), taxonomy),
    { code: 'DUPLICATE_SPATIAL_TAXONOMY_MIGRATION' }
  );
});

test('refuses name, regex, or other selector fields so migrations remain exact-UUID only', () => {
  for (const forbidden of [
    { polity_name: 'Gorkha Kingdom' },
    { name_regex: 'Gorkha.*' },
    { matcher: { name: 'Gorkha Kingdom' } }
  ]) {
    const entry = { ...manifest().migrations[0], ...forbidden };
    assert.throws(
      () => normalizeSpatialTaxonomyMigration(manifest({ migrations: [entry] }), taxonomy),
      { code: 'UNSUPPORTED_SPATIAL_TAXONOMY_MIGRATION_FIELD' }
    );
  }
});

test('allows a deprecated leaf only on the from side and rejects it as a target', () => {
  const legacyId = '4c8e0efc-e5c8-44d2-8b44-02df8c794aac';
  const valid = manifest({
    migrations: [{
      polity_id: legacyId,
      from: { region_code: 'africa', subregion_code: 'east-africa-horn' },
      to: { region_code: 'africa', subregion_code: 'horn-of-africa' },
      reason: 'Reviewed exact UUID split.'
    }]
  });
  assert.equal(normalizeSpatialTaxonomyMigration(valid, taxonomy).migrations[0].to.subregion_code, 'horn-of-africa');

  const invalid = manifest({
    migrations: [{
      polity_id: legacyId,
      from: { region_code: 'africa', subregion_code: 'horn-of-africa' },
      to: { region_code: 'africa', subregion_code: 'east-africa-horn' },
      reason: 'Deprecated target must be rejected.'
    }]
  });
  assert.throws(
    () => normalizeSpatialTaxonomyMigration(invalid, taxonomy),
    { code: 'UNKNOWN_SPATIAL_SUBREGION' }
  );
});
