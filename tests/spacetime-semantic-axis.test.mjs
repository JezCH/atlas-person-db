import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const model = require("../atlas-person-spacetime-model.js");
const timeProjection = require("../atlas-person-spacetime-time-projection.js");
const spaceAxis = require("../atlas-person-spacetime-space-axis.js");
const semanticAxis = require("../atlas-person-spacetime-semantic-axis.js");
const lod = require("../atlas-person-spacetime-lod.js");

const RANGE = Object.freeze({ start_year: -3000, end_year: 2026 });

function projectionFor(zoom) {
  return timeProjection.createSemanticTimeProjection(RANGE.start_year, RANGE.end_year, 4200 * zoom, 420, zoom);
}

test("semantic time axis increases information resolution without changing historical Y", () => {
  const overviewProjection = projectionFor(1);
  const detailProjection = projectionFor(8);
  const overview = semanticAxis.buildTimeAxisPlan(RANGE, overviewProjection, 1);
  const detail = semanticAxis.buildTimeAxisPlan(RANGE, detailProjection, 8);

  assert.equal(overview.stage, "era");
  assert.equal(overview.interval_years, 500);
  assert.equal(detail.stage, "decade");
  assert.equal(detail.interval_years, 10);
  assert.ok(detail.ticks.length > overview.ticks.length);
  assert.ok(detail.era_opacity < overview.era_opacity);

  for (const plan of [overview, detail]) {
    let previousY = Number.NEGATIVE_INFINITY;
    for (const tick of plan.ticks) {
      assert.notEqual(tick.year, 0);
      assert.equal(tick.ordinal, model.historicalYearToOrdinal(tick.year));
      assert.equal(tick.y, (plan === overview ? overviewProjection : detailProjection).yForYear(tick.year));
      assert.ok(tick.y > previousY);
      previousY = tick.y;
    }
  }
});

test("semantic time stages progress from era context to decade detail", () => {
  assert.equal(semanticAxis.timeStage(1).code, "era");
  assert.equal(semanticAxis.timeStage(1.5).code, "long-century");
  assert.equal(semanticAxis.timeStage(2.5).code, "century");
  assert.equal(semanticAxis.timeStage(4).code, "half-century");
  assert.equal(semanticAxis.timeStage(6).code, "quarter-century");
  assert.equal(semanticAxis.timeStage(8).code, "decade");
});

test("space header changes semantic detail while preserving the same stable world geometry", () => {
  const continuum = spaceAxis.createSpatialContinuum();
  const overview = semanticAxis.buildSpaceHeaderPlan(continuum, 1800, 1);
  const detail = semanticAxis.buildSpaceHeaderPlan(continuum, 1800, 3);

  assert.equal(overview.stage, "macroregion");
  assert.equal(overview.macroregions.length, 9);
  assert.equal(overview.subregion_opacity, 0);
  assert.equal(detail.stage, "subregion");
  assert.equal(detail.subregions.length, continuum.subregions.length);
  assert.equal(detail.subregion_opacity, 1);

  assert.deepEqual(
    overview.macroregions.map(({ code, left, width }) => ({ code, left, width })),
    detail.macroregions.map(({ code, left, width }) => ({ code, left, width }))
  );
  for (const subregion of detail.subregions) {
    const parent = detail.macroregions.find((macro) => macro.code === subregion.parent_code);
    assert.ok(parent);
    assert.ok(subregion.left >= parent.left);
    assert.ok(subregion.left + subregion.width <= parent.left + parent.width + 1e-9);
  }
});

test("overview keeps Person names visible while density remains the primary representation stage", () => {
  const overview = lod.lodWeights({ timeZoom: 1, spaceZoom: 1 });
  assert.equal(overview.density, 1);
  assert.equal(overview.points, 0);
  assert.ok(overview.labels >= 0.7);
  assert.equal(lod.representationStage(overview), "density");

  const detail = lod.lodWeights({ timeZoom: 1.8, spaceZoom: 1 });
  assert.equal(detail.density, 0);
  assert.equal(detail.labels, 1);
  assert.equal(lod.representationStage(detail), "label");
});
