import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const camera = require("../atlas-person-spacetime-camera-v2.js");
const time = require("../atlas-person-spacetime-time-scale-v2.js");
const lod = require("../atlas-person-spacetime-lod-v2.js");

const SCALE = time.createSemanticTimeScale(-3000, 2026);
const VIEWPORT = Object.freeze({ width: 1200, height: 800 });

function cameraAt(year, zoomTime, zoomSpace = zoomTime, centerSpace = 0.5) {
  return camera.createCamera(time.TIME_WORLD_BOUNDS, {
    centerTime: SCALE.baseForYear(year),
    centerSpace,
    zoomTime,
    zoomSpace
  });
}

function primarySegment(id, startYear, endYear, x = 0.5) {
  return Object.freeze({
    stable_id: id,
    activity_id: id,
    start_year: startYear,
    end_year: endYear,
    start_ordinal: startYear < 0 ? startYear : startYear - 1,
    end_ordinal: endYear < 0 ? endYear : endYear - 1,
    x_anchor: x,
    x_min: x - 0.01,
    x_max: x + 0.01,
    relation_code: "rules",
    role_code: "ruler",
    role_label: "Ruler",
    polity_id: `polity-${id}`,
    spatial_precision: "subregion"
  });
}

function partitionedTrack(personId, segments) {
  return Object.freeze({
    person_id: personId,
    track_id: personId,
    display_name: `Person ${personId}`,
    primary_spatial_status: "placed",
    primary_segments: Object.freeze(segments)
  });
}

test("world overview resolves to density-first LOD without labels or rails", () => {
  const state = camera.fitWorld(time.TIME_WORLD_BOUNDS);
  const weights = lod.lodWeights(state);
  assert.equal(weights.density, 1);
  assert.equal(weights.points, 0);
  assert.equal(weights.labels, 0);
  assert.equal(weights.rails, 0);
  assert.equal(weights.activities, 0);
});

test("semantic LOD fades through points, labels, rails, then detailed Activity glyphs", () => {
  const point = lod.lodWeights(cameraAt(1900, 2, 2));
  const label = lod.lodWeights(cameraAt(1900, 5, 5));
  const rail = lod.lodWeights(cameraAt(1900, 10, 10));
  const activity = lod.lodWeights(cameraAt(1900, 32, 32));

  assert.ok(point.points > point.labels);
  assert.equal(label.labels, 1);
  assert.equal(label.rails, 0);
  assert.equal(rail.rails, 1);
  assert.equal(activity.activities, 1);
  assert.ok(activity.labels > 0);
});

test("time-only zoom cannot force labels when horizontal space is still world-scale", () => {
  const weights = lod.lodWeights(cameraAt(1900, 32, 1));
  assert.equal(weights.labels, 0);
  assert.equal(weights.rails, 0);
  assert.equal(weights.activities, 0);
});

test("one Person creates one density source, one point, and one label candidate despite multiple primary segments", () => {
  const source = {
    tracks: [partitionedTrack("a", [
      primarySegment("a1", 1880, 1890, 0.49),
      primarySegment("a2", 1900, 1910, 0.51)
    ])]
  };
  const state = cameraAt(1900, 5, 5);
  const plan = lod.buildRenderPlan(source, SCALE, state, VIEWPORT);

  assert.equal(plan.density_sources.length, 1);
  assert.equal(plan.points.length, 1);
  assert.equal(plan.labels.length, 1);
  assert.equal(plan.labels[0].person_id, "a");
  assert.equal(plan.labels[0].text, "Person a");
});

test("rail LOD preserves each visible historical segment instead of collapsing Activity geometry", () => {
  const source = {
    tracks: [partitionedTrack("a", [
      primarySegment("a1", 1880, 1890, 0.49),
      primarySegment("a2", 1900, 1910, 0.51)
    ])]
  };
  const plan = lod.buildRenderPlan(source, SCALE, cameraAt(1900, 12, 12), VIEWPORT);

  assert.equal(plan.rails.length, 2);
  assert.deepEqual(plan.rails.map((item) => item.activity_id).sort(), ["a1", "a2"]);
  assert.ok(plan.rails.every((item) => item.opacity > 0));
});

test("detailed LOD exposes Activity metadata only after sufficient time and space zoom", () => {
  const source = { tracks: [partitionedTrack("a", [primarySegment("a1", 1900, 1910, 0.5)])] };
  const plan = lod.buildRenderPlan(source, SCALE, cameraAt(1905, 32, 32), VIEWPORT);

  assert.equal(plan.activity_glyphs.length, 1);
  assert.equal(plan.activity_glyphs[0].opacity, 1);
  assert.equal(plan.activity_glyphs[0].relation_code, "rules");
  assert.equal(plan.activity_glyphs[0].role_code, "ruler");
});

test("selected or searched Person can force one label at world zoom without enabling every label", () => {
  const source = {
    tracks: [
      partitionedTrack("a", [primarySegment("a1", 1900, 1910, 0.5)]),
      partitionedTrack("b", [primarySegment("b1", 1900, 1910, 0.55)])
    ]
  };
  const state = cameraAt(1900, 1, 1);
  const plan = lod.buildRenderPlan(source, SCALE, state, VIEWPORT, { pinnedPersonIds: ["b"] });

  assert.equal(plan.labels.length, 1);
  assert.equal(plan.labels[0].person_id, "b");
  assert.equal(plan.labels[0].forced, true);
  assert.equal(plan.labels[0].opacity, 1);
});

test("offscreen tracks do not create marks in the render plan", () => {
  const source = { tracks: [partitionedTrack("far", [primarySegment("far1", -1000, -900, 0.5)])] };
  const plan = lod.buildRenderPlan(source, SCALE, cameraAt(1900, 32, 32), VIEWPORT);

  assert.equal(plan.density_sources.length, 0);
  assert.equal(plan.points.length, 0);
  assert.equal(plan.labels.length, 0);
  assert.equal(plan.rails.length, 0);
  assert.equal(plan.activity_glyphs.length, 0);
});

test("render plan carries primary-unresolved and relation-review queues forward", () => {
  const source = {
    tracks: [],
    primary_unresolved: [{ person_id: "u" }],
    relation_review: [{ person_id: "r" }]
  };
  const plan = lod.buildRenderPlan(source, SCALE, camera.fitWorld(time.TIME_WORLD_BOUNDS), VIEWPORT);
  assert.deepEqual(plan.primary_unresolved, source.primary_unresolved);
  assert.deepEqual(plan.relation_review, source.relation_review);
});