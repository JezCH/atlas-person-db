import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const model = require("../atlas-person-spacetime-model.js");
const baseline = JSON.parse(readFileSync(new URL("../spacetime-v2-baseline.json", import.meta.url), "utf8"));
const viewSource = readFileSync(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");
const labelPackingSource = readFileSync(new URL("../atlas-person-spacetime-label-packing.js", import.meta.url), "utf8");

test("spacetime v2 baseline is pinned to the exact pre-rewrite main SHA", () => {
  assert.equal(baseline.schema, "atlas-spacetime-v2-baseline/v1");
  assert.equal(baseline.source_main_sha, "7b8b0084d76e347391c9cf71718292e8deafc31a");
});

test("v1 characterization remains explicit until the v2 cutover intentionally replaces it", () => {
  assert.equal(model.REGION_DEFINITIONS.length, 9);
  assert.equal(baseline.current_v1_characterization.macroregion_count, 9);
  assert.match(viewSource, /DEFAULT_TIMELINE_HEIGHT\s*=\s*4200/);
  assert.match(viewSource, /LOG_SOFTENING_YEARS\s*=\s*420/);
  assert.ok(labelPackingSource.includes("packRegionLabels"));
  assert.equal(baseline.current_v1_characterization.legacy_label_packing_enabled, true);
});

test("dense regression windows and global fit window are frozen before the rewrite", () => {
  assert.deepEqual(
    baseline.regression_windows.map(({ id, region_code, start_year, end_year }) => ({ id, region_code, start_year, end_year })),
    [
      { id: "europe-modern-density", region_code: "europe", start_year: 1800, end_year: 1950 },
      { id: "east-asia-long-density", region_code: "east-asia", start_year: 500, end_year: 1900 },
      { id: "world-fit", region_code: "all", start_year: -3000, end_year: 2026 }
    ]
  );
});

test("v2 acceptance invariants forbid the failure modes already observed in v1", () => {
  for (const [key, value] of Object.entries(baseline.v2_invariants)) {
    assert.equal(value, true, `${key} must stay enabled`);
  }
  assert.equal(model.historicalYearToOrdinal(0), null);
  assert.ok(baseline.planned_v1_retirement.includes("atlas-person-spacetime-label-packing.js"));
});
