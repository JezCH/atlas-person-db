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

function correctionsOf(entries = correctionEntries) {
  return entries.flatMap((entry) => entry.value.corrections.map((correction) => ({
    source: entry.source,
    correction
  })));
}

test('reviewed correction manifests contain unique targets and preserve macroregions', () => {
  const seen = new Set();
  for (const { source, correction } of correctionsOf()) {
    assert.ok(!seen.has(correction.polity_id), `${source}: duplicate correction target ${correction.polity_id}`);
    seen.add(correction.polity_id);
    assert.equal(correction.region_code, correction.expected_region_code, `${source}: correction must not cross macroregions`);
    assert.equal(correction.expected_subregion_code, null, `${source}: reviewed precision correction must start macro-only`);
    assert.equal(typeof correction.subregion_code, 'string', `${source}: correction must add a reviewed leaf`);
    assert.ok(correction.subregion_code.length > 0, `${source}: reviewed leaf must be non-empty`);
  }
  assert.ok(seen.size > 0, 'at least one reviewed spatial correction must be present');
});

test('every active correction matches the currently composed before-state regardless of source owner', () => {
  const { index: before } = compileSpatialBindings({ baseline, shards, corrections: [] });
  for (const { source, correction } of correctionsOf()) {
    assert.equal(
      before.polity_geography[correction.polity_id] ?? null,
      correction.expected_region_code,
      `${source}: ${correction.polity_id} expected macro must match composed before-state`
    );
    assert.equal(
      before.polity_subregions?.[correction.polity_id] ?? null,
      correction.expected_subregion_code,
      `${source}: ${correction.polity_id} expected leaf must match composed before-state`
    );
  }
});

test('compiler applies active corrections as overlays without changing macroregions', () => {
  const { index } = compileSpatialBindings({ baseline, shards, corrections: correctionEntries });
  for (const { source, correction } of correctionsOf()) {
    assert.equal(index.polity_geography[correction.polity_id], correction.region_code, `${source}: macro must remain reviewed`);
    assert.equal(index.polity_subregions[correction.polity_id], correction.subregion_code, `${source}: reviewed leaf must be applied`);
  }
});

test('correction path rejects stale before-state independent of historical owner file', () => {
  const { index: before } = compileSpatialBindings({ baseline, shards, corrections: [] });
  const stale = structuredClone(before);
  const firstEntry = correctionEntries[0];
  const first = firstEntry.value.corrections[0];
  stale.polity_subregions ??= {};
  stale.polity_subregions[first.polity_id] = first.subregion_code;

  assert.throws(
    () => compileSpatialBindings({ baseline: stale, shards: [], corrections: correctionEntries }),
    (error) => error?.code === 'SPATIAL_CORRECTION_STALE_BEFORE'
  );
});

test('correction path rejects review dispositions instead of converting them into bindings', () => {
  const { index: before } = compileSpatialBindings({ baseline, shards, corrections: [] });
  const synthetic = structuredClone(before);
  const firstEntry = correctionEntries[0];
  const first = firstEntry.value.corrections[0];

  delete synthetic.polity_geography[first.polity_id];
  delete synthetic.polity_subregions?.[first.polity_id];
  synthetic.review_queue ??= [];
  synthetic.review_queue.push({ polity_id: first.polity_id, reason: 'synthetic review disposition for invariant test' });

  assert.throws(
    () => compileSpatialBindings({ baseline: synthetic, shards: [], corrections: [firstEntry] }),
    (error) => error?.code === 'INVALID_SPATIAL_CORRECTION_OWNER'
  );
});

test('correction path rejects macro crossing at manifest validation', () => {
  const source = correctionEntries[0];
  const badEntry = structuredClone(source);
  badEntry.source = 'bad-crossing.corrections.json';
  badEntry.value.correction_id = 'bad-crossing';
  badEntry.value.corrections = [structuredClone(badEntry.value.corrections[0])];

  const originalMacro = badEntry.value.corrections[0].expected_region_code;
  const alternativeMacro = baseline.regions.map((region) => region.code).find((code) => code !== originalMacro);
  assert.ok(alternativeMacro, 'taxonomy must expose another macroregion for crossing test');
  badEntry.value.corrections[0].region_code = alternativeMacro;

  assert.throws(
    () => compileSpatialBindings({ baseline, shards, corrections: [badEntry] }),
    (error) => error?.code === 'SPATIAL_CORRECTION_MACRO_CROSSING'
  );
});
