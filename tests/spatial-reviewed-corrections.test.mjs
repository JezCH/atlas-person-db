import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compileSpatialBindings,
  loadReviewedBindingShards,
  loadReviewedSpatialCorrections
} from '../scripts/compile-spatial-bindings.mjs';
import {
  compileSpatialBindingsR4,
  loadTaxonomyMigrationManifests
} from '../scripts/compile-spatial-bindings-r4.mjs';

const baseline = JSON.parse(fs.readFileSync('spatial/reviewed-bindings/0000-migrated-baseline.index.json', 'utf8'));
const shards = loadReviewedBindingShards('spatial/reviewed-bindings/shards');
const corrections = loadReviewedSpatialCorrections('spatial/reviewed-bindings/corrections');
const migrations = loadTaxonomyMigrationManifests('spatial/taxonomy-migrations');

const AZAD_HIND = '5fce7b7e-7e6c-5f91-96b6-ebcd925b0a90';
const RASHIDUN = 'a1697cdb-1085-545c-850e-1bbc25cdb61b';
const MOBILE_REVIEW = Object.freeze([
  '01cd1acd-9321-4d25-bc30-4cbd561bcbd5',
  '502f18c3-41fc-4cb8-84cc-67f7e0454a9d',
  '70aedae1-9544-4e8a-bfd8-6feda3e142c7',
  'a81055d7-ed0d-45a6-90c6-738e1a9ba94d',
  'bcb090c2-7906-4c3e-91cf-99b02646764e'
]);
const STALE_ORPHANS = Object.freeze([
  '46534f7e-9247-5644-b5ad-9525c3d4f5d6',
  '524642ff-33fb-52f3-8623-e4a877b1997a',
  '53943675-7711-5053-9f2e-f149f727aa54'
]);
const ALL_TARGETS = Object.freeze([AZAD_HIND, RASHIDUN, ...MOBILE_REVIEW, ...STALE_ORPHANS]);

function recordFor(index, polityId) {
  return (index.place_function_records || []).find((record) => record.polity_id === polityId);
}

test('post-r4 reviewed correction closes every remaining macro-only mapping without false static precision', () => {
  const compiled = compileSpatialBindingsR4({ baseline, shards, manifests: migrations, corrections });
  const index = compiled.index;

  const macroOnly = Object.keys(index.polity_geography || {})
    .filter((polityId) => !index.polity_subregions?.[polityId])
    .sort();
  assert.deepEqual(macroOnly, []);

  for (const polityId of ALL_TARGETS) {
    assert.equal(index.polity_geography?.[polityId], undefined, `${polityId} must not retain a macro-only static binding`);
    assert.equal(index.polity_subregions?.[polityId], undefined, `${polityId} must not retain a static leaf`);
  }

  assert.deepEqual(recordFor(index, AZAD_HIND)?.functions.map((fn) => ({
    start_year: fn.start_year,
    end_year: fn.end_year,
    place_name: fn.place_name,
    region_code: fn.region_code,
    function_type: fn.function_type
  })), [
    { start_year: 1943, end_year: 1943, place_name: 'Singapore', region_code: 'southeast-asia', function_type: 'political_center' },
    { start_year: 1944, end_year: 1945, place_name: 'Rangoon', region_code: 'southeast-asia', function_type: 'political_center' }
  ]);

  assert.deepEqual(recordFor(index, RASHIDUN)?.functions.map((fn) => ({
    start_year: fn.start_year,
    end_year: fn.end_year,
    place_name: fn.place_name,
    region_code: fn.region_code,
    function_type: fn.function_type
  })), [
    { start_year: 632, end_year: 656, place_name: 'Medina', region_code: 'west-asia', function_type: 'capital' },
    { start_year: 656, end_year: 661, place_name: 'Kufa', region_code: 'west-asia', function_type: 'capital' }
  ]);

  const reviewIds = new Set((index.review_queue || []).map((entry) => entry.polity_id));
  for (const polityId of MOBILE_REVIEW) assert.equal(reviewIds.has(polityId), true, polityId);
  for (const polityId of STALE_ORPHANS) assert.equal(reviewIds.has(polityId), false, polityId);

  const placeFunctionIds = new Set((index.place_function_records || []).map((record) => record.polity_id));
  for (const polityId of STALE_ORPHANS) assert.equal(placeFunctionIds.has(polityId), false, polityId);
});

test('reviewed correction overlay fails closed when an expected source mapping drifts', () => {
  const fake = [{
    source: 'drift.corrections.json',
    value: {
      schema: 'atlas-reviewed-spatial-corrections/v1',
      correction_id: 'drift-check',
      baseline: 'test',
      reviewed_at: '2026-09-18T05:35:00Z',
      changes: [{
        polity_id: AZAD_HIND,
        expected: { region_code: 'europe', subregion_code: null },
        disposition: 'review_queue',
        reason: 'synthetic drift guard'
      }]
    }
  }];
  assert.throws(
    () => compileSpatialBindings({ baseline, corrections: fake }),
    { code: 'SPATIAL_CORRECTION_SOURCE_MISMATCH' }
  );
});
