import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  REVIEWED_BINDING_SHARD_SCHEMA,
  compileSpatialBindings,
  computeSpatialStats,
  loadReviewedBindingShards,
  loadReviewedSpatialCorrections,
  serializeSpatialIndex
} from '../scripts/compile-spatial-bindings.mjs';
import {
  compileSpatialBindingsR4,
  loadTaxonomyMigrationManifests,
  prepareCurrentTaxonomyBaseline
} from '../scripts/compile-spatial-bindings-r4.mjs';

const retainedBaseline = JSON.parse(readFileSync(new URL('../spatial/reviewed-bindings/0000-migrated-baseline.index.json', import.meta.url), 'utf8'));
const canonicalRaw = readFileSync(new URL('../atlas-polity-spatial-index.json', import.meta.url), 'utf8');
const canonical = JSON.parse(canonicalRaw);
const shardsDir = fileURLToPath(new URL('../spatial/reviewed-bindings/shards', import.meta.url));
const correctionsDir = fileURLToPath(new URL('../spatial/reviewed-bindings/corrections', import.meta.url));
const migrationDir = fileURLToPath(new URL('../spatial/taxonomy-migrations', import.meta.url));
const reviewedShards = loadReviewedBindingShards(shardsDir);
const reviewedCorrections = loadReviewedSpatialCorrections(correctionsDir);
const migrationManifests = loadTaxonomyMigrationManifests(migrationDir);
const baseline = prepareCurrentTaxonomyBaseline(retainedBaseline, migrationManifests).baseline;

function shard({ id, reviewedAt = '2026-09-06T00:10:00Z', bindings = [], reviewQueue }) {
  const value = {
    schema: REVIEWED_BINDING_SHARD_SCHEMA,
    shard_id: id,
    baseline: 'test-baseline',
    reviewed_at: reviewedAt,
    bindings
  };
  if (reviewQueue !== undefined) value.review_queue = reviewQueue;
  return { source: `${id}.bindings.json`, value };
}

const IDS = Object.freeze({
  one: '00000000-0000-4000-8000-000000000001',
  two: '00000000-0000-4000-8000-000000000002',
  three: '00000000-0000-4000-8000-000000000003',
  four: '00000000-0000-4000-8000-000000000004'
});

test('canonical runtime index is exactly the deterministic staged r4 compiler output for all reviewed sources', () => {
  const reviewed = compileSpatialBindingsR4({ baseline: retainedBaseline, shards: reviewedShards, manifests: migrationManifests, corrections: reviewedCorrections });
  assert.deepEqual(reviewed.index, canonical);
  assert.equal(serializeSpatialIndex(reviewed.index), canonicalRaw);
  assert.deepEqual(computeSpatialStats(reviewed.index), computeSpatialStats(canonical));
});

test('real reviewed shard directory validates independently', () => {
  const compiled = compileSpatialBindings({ baseline, shards: reviewedShards, corrections: reviewedCorrections });
  assert.ok(compiled.stats.geography_count >= Object.keys(baseline.polity_geography).length);
  assert.ok(compiled.stats.subregion_count >= Object.keys(baseline.polity_subregions ?? {}).length);
  assert.ok(compiled.stats.review_queue_count >= (baseline.review_queue ?? []).length);
});

test('new independent reviewed bindings compile without changing existing UUID semantics', () => {
  const before = computeSpatialStats(baseline);
  const compiled = compileSpatialBindings({
    baseline,
    shards: [shard({
      id: 'worker-a',
      bindings: [
        { polity_id: IDS.one, region_code: 'europe', subregion_code: 'italy' },
        { polity_id: IDS.two, region_code: 'south-asia', subregion_code: null }
      ]
    })]
  });
  assert.equal(compiled.index.polity_geography[IDS.one], 'europe');
  assert.equal(compiled.index.polity_subregions[IDS.one], 'italy');
  assert.equal(compiled.index.polity_geography[IDS.two], 'south-asia');
  assert.equal(compiled.index.polity_subregions[IDS.two], undefined);
  assert.equal(compiled.stats.geography_count, before.geography_count + 2);
  assert.equal(compiled.stats.subregion_count, before.subregion_count + 1);
});

test('reviewed HOLD dispositions compile into the canonical review queue', () => {
  const before = computeSpatialStats(baseline);
  const reason = 'transregional_polity_requires_activity_specific_spatial_review';
  const compiled = compileSpatialBindings({
    baseline,
    shards: [shard({
      id: 'worker-hold',
      reviewQueue: [{ polity_id: IDS.four, reason }]
    })]
  });
  assert.equal(compiled.index.polity_geography[IDS.four], undefined);
  assert.deepEqual(compiled.index.review_queue.find((entry) => entry.polity_id === IDS.four), { polity_id: IDS.four, reason });
  assert.equal(compiled.stats.review_queue_count, before.review_queue_count + 1);
});

test('one polity cannot be both a static binding and a HOLD disposition', () => {
  assert.throws(
    () => compileSpatialBindings({
      baseline,
      shards: [shard({
        id: 'static-and-hold',
        bindings: [{ polity_id: IDS.three, region_code: 'europe', subregion_code: 'italy' }],
        reviewQueue: [{ polity_id: IDS.three, reason: 'requires_review' }]
      })]
    }),
    /DUPLICATE_SPATIAL_DISPOSITION|CONFLICTING_SPATIAL_DISPOSITION/
  );
});

test('compiler output is deterministic regardless of shard input order', () => {
  const a = shard({ id: 'worker-a', reviewedAt: '2026-09-06T00:10:00Z', bindings: [{ polity_id: IDS.one, region_code: 'europe', subregion_code: 'italy' }] });
  const b = shard({ id: 'worker-b', reviewedAt: '2026-09-06T00:11:00Z', bindings: [{ polity_id: IDS.two, region_code: 'east-asia', subregion_code: 'japan' }] });
  const left = serializeSpatialIndex(compileSpatialBindings({ baseline, shards: [a, b] }).index);
  const right = serializeSpatialIndex(compileSpatialBindings({ baseline, shards: [b, a] }).index);
  assert.equal(left, right);
});

test('duplicate UUID against the baseline hard fails even when the mapping is identical', () => {
  const [polityId, regionCode] = Object.entries(baseline.polity_geography)[0];
  const subregionCode = baseline.polity_subregions[polityId] ?? null;
  assert.throws(
    () => compileSpatialBindings({ baseline, shards: [shard({ id: 'duplicate-baseline', bindings: [{ polity_id: polityId, region_code: regionCode, subregion_code: subregionCode }] })] }),
    /DUPLICATE_POLITY_BINDING/
  );
});

test('conflicting UUID mappings across shards hard fail', () => {
  const first = shard({ id: 'conflict-a', bindings: [{ polity_id: IDS.one, region_code: 'europe', subregion_code: 'italy' }] });
  const second = shard({ id: 'conflict-b', bindings: [{ polity_id: IDS.one, region_code: 'east-asia', subregion_code: 'japan' }] });
  assert.throws(() => compileSpatialBindings({ baseline, shards: [first, second] }), /CONFLICTING_POLITY_BINDING/);
});

test('duplicate shard IDs hard fail', () => {
  const first = shard({ id: 'same-id', bindings: [{ polity_id: IDS.one, region_code: 'europe', subregion_code: 'italy' }] });
  const second = { ...shard({ id: 'same-id', bindings: [{ polity_id: IDS.two, region_code: 'east-asia', subregion_code: 'japan' }] }), source: 'other.bindings.json' };
  assert.throws(() => compileSpatialBindings({ baseline, shards: [first, second] }), /DUPLICATE_SPATIAL_SHARD_ID/);
});

test('unknown macroregion and subregion leaves hard fail', () => {
  assert.throws(
    () => compileSpatialBindings({ baseline, shards: [shard({ id: 'unknown-macro', bindings: [{ polity_id: IDS.one, region_code: 'atlantis', subregion_code: null }] })] }),
    /UNKNOWN_SPATIAL_MACROREGION/
  );
  assert.throws(
    () => compileSpatialBindings({ baseline, shards: [shard({ id: 'unknown-leaf', bindings: [{ polity_id: IDS.one, region_code: 'europe', subregion_code: 'middle-earth' }] })] }),
    /UNKNOWN_SPATIAL_SUBREGION/
  );
});

test('subregion must belong to the reviewed macroregion', () => {
  assert.throws(
    () => compileSpatialBindings({ baseline, shards: [shard({ id: 'wrong-parent', bindings: [{ polity_id: IDS.three, region_code: 'europe', subregion_code: 'japan' }] })] }),
    /SPATIAL_SUBREGION_PARENT_MISMATCH/
  );
});


test('reviewed shards can add Activity-specific spatial overrides', () => {
  const activityId = '00000000-0000-4000-8000-0000000000a1';
  const compiled = compileSpatialBindings({
    baseline,
    shards: [{
      source: 'activity-override.bindings.json',
      value: {
        schema: REVIEWED_BINDING_SHARD_SCHEMA,
        shard_id: 'activity-override',
        baseline: 'test-baseline',
        reviewed_at: '2026-09-20T08:20:00Z',
        bindings: [],
        activity_overrides: [{
          activity_id: activityId,
          expected_polity_id: IDS.four,
          expected_start_year: -195,
          expected_end_year: -190,
          region_code: 'west-asia',
          subregion_code: 'anatolia',
          location_label: 'Ephesus–Side',
          reason: 'Reviewed Activity-specific placement for a transregional polity',
          source_refs: ['source-b', 'source-a']
        }]
      }
    }]
  });
  const row = compiled.index.activity_spatial_overrides.find((entry) => entry.activity_id === activityId);
  assert.ok(row);
  assert.equal(row.expected_polity_id, IDS.four);
  assert.equal(row.region_code, 'west-asia');
  assert.equal(row.subregion_code, 'anatolia');
  assert.deepEqual(row.source_refs, ['source-a', 'source-b']);
});

test('duplicate Activity overrides fail closed across baseline and reviewed shards', () => {
  const existing = baseline.activity_spatial_overrides[0];
  assert.ok(existing?.activity_id);
  assert.throws(
    () => compileSpatialBindings({
      baseline,
      shards: [{
        source: 'duplicate-activity.bindings.json',
        value: {
          schema: REVIEWED_BINDING_SHARD_SCHEMA,
          shard_id: 'duplicate-activity',
          baseline: 'test-baseline',
          reviewed_at: '2026-09-20T08:21:00Z',
          bindings: [],
          activity_overrides: [{
            activity_id: existing.activity_id,
            expected_polity_id: existing.expected_polity_id,
            expected_start_year: existing.expected_start_year,
            expected_end_year: existing.expected_end_year,
            region_code: existing.region_code,
            subregion_code: existing.subregion_code,
            location_label: existing.location_label,
            reason: 'duplicate test',
            source_refs: ['source']
          }]
        }
      }]
    }),
    /DUPLICATE_SPATIAL_ACTIVITY_OVERRIDE/
  );
});
