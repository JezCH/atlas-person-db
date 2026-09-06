import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  REVIEWED_BINDING_SHARD_SCHEMA,
  compileSpatialBindings,
  computeSpatialStats,
  loadReviewedBindingShards,
  serializeSpatialIndex
} from '../scripts/compile-spatial-bindings.mjs';

const baseline = JSON.parse(readFileSync(new URL('../spatial/reviewed-bindings/0000-migrated-baseline.index.json', import.meta.url), 'utf8'));
const canonicalRaw = readFileSync(new URL('../atlas-polity-spatial-index.json', import.meta.url), 'utf8');
const canonical = JSON.parse(canonicalRaw);
const shardsDir = fileURLToPath(new URL('../spatial/reviewed-bindings/shards', import.meta.url));
const reviewedShards = loadReviewedBindingShards(shardsDir);

function shard({ id, reviewedAt = '2026-09-06T00:10:00Z', bindings }) {
  return {
    source: `${id}.bindings.json`,
    value: {
      schema: REVIEWED_BINDING_SHARD_SCHEMA,
      shard_id: id,
      baseline: 'test-baseline',
      reviewed_at: reviewedAt,
      bindings
    }
  };
}

const IDS = Object.freeze({
  one: '00000000-0000-4000-8000-000000000001',
  two: '00000000-0000-4000-8000-000000000002',
  three: '00000000-0000-4000-8000-000000000003'
});

test('canonical runtime index is exactly the deterministic compiler output for all reviewed sources', () => {
  const compiled = compileSpatialBindings({ baseline, shards: reviewedShards });
  assert.deepEqual(compiled.index, canonical);
  assert.equal(serializeSpatialIndex(compiled.index), canonicalRaw);
  assert.deepEqual(compiled.stats, computeSpatialStats(canonical));
});

test('real reviewed shard directory validates independently', () => {
  const compiled = compileSpatialBindings({ baseline, shards: reviewedShards });
  assert.ok(compiled.stats.geography_count >= Object.keys(baseline.polity_geography).length);
  assert.ok(compiled.stats.subregion_count >= Object.keys(baseline.polity_subregions ?? {}).length);
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
