import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const model = require("../atlas-person-spacetime-model.js");
const timeProjection = require("../atlas-person-spacetime-time-projection.js");
const spaceAxis = require("../atlas-person-spacetime-space-axis.js");
const semanticAxis = require("../atlas-person-spacetime-semantic-axis.js");

const RANGE = Object.freeze({ start_year: -3000, end_year: 2026 });

function projectionFor(zoom) {
  return timeProjection.createUniformTimeProjection(RANGE.start_year, RANGE.end_year, 4200 * zoom * 0.76, zoom);
}

test("readable-scale time axis starts at quarter-century detail and advances to decades", () => {
  const minimumProjection = projectionFor(5);
  const detailProjection = projectionFor(8);
  const minimum = semanticAxis.buildTimeAxisPlan(RANGE, minimumProjection, 5);
  const detail = semanticAxis.buildTimeAxisPlan(RANGE, detailProjection, 8);

  assert.equal(minimum.stage, "quarter-century");
  assert.equal(minimum.interval_years, 25);
  assert.equal(detail.stage, "decade");
  assert.equal(detail.interval_years, 10);
  assert.ok(detail.ticks.length >= minimum.ticks.length);

  for (const [plan, projection] of [[minimum, minimumProjection],[detail, detailProjection]]) {
    let previousY = Number.NEGATIVE_INFINITY;
    for (const tick of plan.ticks) {
      assert.notEqual(tick.year, 0);
      assert.equal(tick.ordinal, model.historicalYearToOrdinal(tick.year));
      assert.equal(tick.y, projection.yForYear(tick.year));
      assert.ok(tick.y > previousY);
      previousY = tick.y;
    }
  }
});

test("below-500 time stages no longer exist", () => {
  assert.throws(() => semanticAxis.timeStage(4.99), /zoom must be >= 5/);
  assert.equal(semanticAxis.timeStage(5).code, "quarter-century");
  assert.equal(semanticAxis.timeStage(6.5).code, "quarter-century");
  assert.equal(semanticAxis.timeStage(6.5001).code, "decade");
  const codes = semanticAxis.TIME_STAGES.map((stage) => stage.code);
  for (const retired of ["era","long-century","century","half-century"]) assert.equal(codes.includes(retired), false);
});

test("space header is fixed to reviewed subregion hierarchy at the readable floor", () => {
  const continuum = spaceAxis.createSpatialContinuum();
  const plan = semanticAxis.buildSpaceHeaderPlan(continuum, 3600, 5, []);

  assert.equal(plan.stage, "subregion");
  assert.equal(plan.macroregions.length, 9);
  assert.equal(plan.subregions.length, continuum.subregions.length);
  assert.equal(plan.subregion_opacity, 1);
  assert.equal(plan.minimum_zoom, 5);

  for (const subregion of plan.subregions) {
    const parent = plan.macroregions.find((macro) => macro.code === subregion.parent_code);
    assert.ok(parent);
    assert.ok(subregion.left >= parent.left);
    assert.ok(subregion.left + subregion.width <= parent.left + parent.width + 1e-9);
  }
});

test("spatial hierarchy remains uniform and independent of Person density", () => {
  const continuum = spaceAxis.createSpatialContinuum();
  const macroWidths = continuum.macroregions.map((band) => band.max_space - band.min_space);
  for (const width of macroWidths) assert.ok(Math.abs(width - 1/9) < 1e-12);
});


test("reviewed Place semantic detail appears only at high readable zoom without changing world geometry", () => {
  const continuum = spaceAxis.createSpatialContinuum();
  const bindings = [
    {place_id:"place-rome",place_name:"Rome",macroregion_code:"europe",subregion_code:"italy"},
    {place_id:"place-pella",place_name:"Pella",macroregion_code:"europe",subregion_code:"balkans"},
    {place_id:"bad",place_name:"Bad",macroregion_code:"europe",subregion_code:"south-america"}
  ];
  const floor = semanticAxis.buildSpaceHeaderPlan(continuum, 3600, 5, bindings);
  const detail = semanticAxis.buildSpaceHeaderPlan(continuum, 3600, 8, bindings);

  assert.equal(floor.stage, "subregion");
  assert.equal(floor.place_opacity, 0);
  assert.equal(detail.stage, "place");
  assert.equal(detail.stage_label, "검토 Place");
  assert.equal(detail.place_opacity, 1);
  assert.equal(detail.places.length, 2);
  assert.deepEqual(detail.places.map((place)=>place.place_id), ["place-rome","place-pella"]);
  assert.ok(detail.places.every((place)=>place.display_anchor_basis === "reviewed_place_point"));
  assert.ok(detail.places.every((place)=>place.exact_geographic_coordinate_claimed === false));

  for (const place of detail.places) {
    const subregion = continuum.bandForCode(place.subregion_code);
    assert.equal(place.x_anchor, subregion.center_space);
    assert.equal(place.x, subregion.center_space * 3600);
  }
});

test("Place semantic LOD is driven only by reviewed bindings, never Person density", () => {
  const continuum = spaceAxis.createSpatialContinuum();
  const bindings = [{place_id:"place-rome",place_name:"Rome",macroregion_code:"europe",subregion_code:"italy"}];
  const a = semanticAxis.buildSpaceHeaderPlan(continuum, 3600, 8, bindings);
  const b = semanticAxis.buildSpaceHeaderPlan(continuum, 3600, 8, bindings);
  assert.deepEqual(a.places, b.places);
  assert.equal(a.macroregions.length, 9);
  assert.equal(b.macroregions.length, 9);
});
