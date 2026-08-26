import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const model = require("../atlas-person-spacetime-model.js");
const timeProjection = require("../atlas-person-spacetime-time-projection.js");
const spaceAxis = require("../atlas-person-spacetime-space-axis.js");
const spatialCompile = require("../atlas-person-spacetime-spatial-compile.js");
const personTracks = require("../atlas-person-spacetime-person-tracks.js");
const politicalPlacement = require("../atlas-person-spacetime-political-placement.js");
const lod = require("../atlas-person-spacetime-lod.js");
const labelEngine = require("../atlas-person-spacetime-label-engine.js");

const viewSource = readFileSync(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../atlas-person-spacetime-view.css", import.meta.url), "utf8");
const ownerSource = readFileSync(new URL("../atlas-domain-surface-owner.js", import.meta.url), "utf8");

function almostEqual(actual, expected, epsilon = 1e-8) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
}

function compiledPlacement(activityId, regionCode, continuum, relationCode, startYear, endYear) {
  const band = continuum.bandForCode(regionCode);
  return {
    activity_id: activityId,
    status: "placed",
    reason: null,
    segments: [{
      activity_id: activityId,
      polity_id: `polity-${activityId}`,
      start_year: startYear,
      end_year: endYear,
      x_anchor: band.center_space,
      x_min: band.min_space,
      x_max: band.max_space,
      macroregion_code: regionCode,
      subregion_code: null,
      spatial_precision: "macroregion",
      display_anchor_basis: "canonical_macroregion",
      historical_placement_basis: "reviewed_region",
      historical_confidence: "reviewed",
      relation_code: relationCode
    }]
  };
}

test("semantic time zoom preserves the existing 100% log projection exactly", () => {
  const base = model.createSpacetimeTimeProjection(-3000, 2026, 4200, 420);
  const semantic = timeProjection.createSemanticTimeProjection(-3000, 2026, 4200, 420, 1);
  assert.equal(timeProjection.semanticBlendWeight(1), 0);
  assert.equal(timeProjection.semanticBlendWeight(1.25), 0);
  assert.equal(timeProjection.semanticBlendWeight(4), 1);
  for (const year of [-2500, -500, -1, 1, 500, 1800, 1919, 2026]) {
    const ordinal = model.historicalYearToOrdinal(year);
    assert.equal(semantic.worldToScreenY(ordinal), base.worldToScreenY(ordinal));
    assert.equal(semantic.yForYear(year), base.yForYear(year));
  }
});

test("semantic time projection approaches linear spacing smoothly and remains reversible across BCE/CE", () => {
  const blended = timeProjection.createSemanticTimeProjection(-3000, 2026, 4200 * 2.2, 420, 2.2);
  assert.ok(blended.semantic_blend_weight > 0 && blended.semantic_blend_weight < 1);
  let previousY = -Infinity;
  for (const year of [-2000, -500, -1, 1, 500, 1500, 2026]) {
    const ordinal = model.historicalYearToOrdinal(year);
    const y = blended.worldToScreenY(ordinal);
    assert.ok(y > previousY);
    almostEqual(blended.screenToWorldOrdinal(y), ordinal, 1e-6);
    previousY = y;
  }

  const linear = timeProjection.createSemanticTimeProjection(-3000, 2026, 4200 * 4, 420, 4);
  const y1800 = linear.yForYear(1800);
  const y1900 = linear.yForYear(1900);
  const y2000 = linear.yForYear(2000);
  almostEqual(y1900 - y1800, y2000 - y1900, 1e-8);
  assert.equal(model.historicalYearToOrdinal(0), null);
  for (let y = 0; y <= linear.height; y += linear.height / 32) assert.notEqual(linear.historicalYearForScreenY(y), 0);
});

test("pointer-anchored camera zoom preserves the same historical ordinal while semantic projection changes", () => {
  const headerHeight = 44;
  const viewportY = 318;
  const anchorOrdinal = model.historicalYearToOrdinal(1919);
  const oldProjection = timeProjection.createSemanticTimeProjection(-3000, 2026, 4200, 420, 1);
  const newProjection = timeProjection.createSemanticTimeProjection(-3000, 2026, 4200 * 1.35, 420, 1.35);
  const oldScrollTop = headerHeight + oldProjection.worldToScreenY(anchorOrdinal) - viewportY;
  const newScrollTop = headerHeight + newProjection.worldToScreenY(anchorOrdinal) - viewportY;
  almostEqual(oldProjection.screenToWorldOrdinal(oldScrollTop + viewportY - headerHeight), anchorOrdinal, 1e-8);
  almostEqual(newProjection.screenToWorldOrdinal(newScrollTop + viewportY - headerHeight), anchorOrdinal, 1e-6);
  assert.notEqual(oldScrollTop, newScrollTop);
});

test("spatial continuum exposes stable nine macroregion bands independent of data density", () => {
  const continuum = spaceAxis.createSpatialContinuum();
  assert.equal(continuum.macroregions.length, 9);
  assert.equal(continuum.macroregions[0].min_space, 0);
  assert.equal(continuum.macroregions.at(-1).max_space, 1);
  const widths = continuum.macroregions.map((band) => band.max_space - band.min_space);
  for (const width of widths) almostEqual(width, 1 / 9, 1e-12);
  const first = spaceAxis.stableRegionLayout(continuum, 1800);
  const second = spaceAxis.stableRegionLayout(continuum, 1800);
  assert.deepEqual(first, second);
  for (const subregion of continuum.subregions) {
    const parent = continuum.bandForCode(subregion.parent_code);
    assert.ok(subregion.min_space >= parent.min_space);
    assert.ok(subregion.max_space <= parent.max_space);
  }
});

test("spatial compile never invents subregion or precise Place coordinates", () => {
  const continuum = spaceAxis.createSpatialContinuum();
  const europe = continuum.bandForCode("europe");
  const raw = {
    status: "placed",
    activity_id: "activity-1",
    polity_id: "polity-1",
    segments: [{
      activity_id: "activity-1",
      polity_id: "polity-1",
      region_code: "europe",
      location_label: "Paris",
      place_id: "place-paris",
      place_name: "Paris",
      place_function_type: "capital",
      start_year: 1800,
      end_year: 1810,
      placement_basis: "polity_place_function",
      confidence: "reviewed",
      source_refs: ["source-1"]
    }]
  };
  const compiled = spatialCompile.compileActivityPlacement(raw, continuum);
  assert.equal(compiled.status, "placed");
  assert.equal(compiled.segments[0].spatial_precision, "macroregion");
  assert.equal(compiled.segments[0].subregion_code, null);
  assert.equal(compiled.segments[0].display_anchor_basis, "canonical_macroregion");
  assert.equal(compiled.segments[0].x_anchor, europe.center_space);
  assert.equal(compiled.segments[0].place_id, "place-paris");
});

test("Person track owns identity while opposes remains a counterparty and never drives primary placement", () => {
  const continuum = spaceAxis.createSpatialContinuum();
  const person = {
    id: "person-1",
    display_name: "Example Person",
    activity_summaries: [
      { id: "activity-primary", start: { year: 1800 }, end: { year: 1810 }, relation: { code: "affiliated_with" }, polity: { id: "polity-primary", display_name: "Primary Polity" } },
      { id: "activity-opposes", start: { year: 1811 }, end: { year: 1820 }, relation: { code: "opposes" }, polity: { id: "polity-opposed", display_name: "Opposed Polity" } }
    ]
  };
  const compiled = personTracks.compilePersonTracks([person], [
    compiledPlacement("activity-primary", "europe", continuum, "affiliated_with", 1800, 1810),
    compiledPlacement("activity-opposes", "east-asia", continuum, "opposes", 1811, 1820)
  ]);
  const partitioned = politicalPlacement.partitionTracks(compiled);
  assert.equal(partitioned.tracks.length, 1);
  const track = partitioned.tracks[0];
  assert.equal(track.track_id, "person-1");
  assert.equal(track.primary_segments.length, 1);
  assert.equal(track.primary_segments[0].activity_id, "activity-primary");
  assert.equal(track.counterparty_segments.length, 1);
  assert.equal(track.counterparty_segments[0].activity_id, "activity-opposes");
  assert.equal(track.primary_space_extent.min, continuum.bandForCode("europe").min_space);
  assert.equal(politicalPlacement.classifyRelation("opposes"), "counterparty");
});

test("label engine resolves collisions horizontally or defers without ever changing historical Y", () => {
  const packed = labelEngine.packLabels([
    { person_id: "a", text: "Alpha", anchor_x: 100, anchor_y: 120, width: 72 },
    { person_id: "b", text: "Beta", anchor_x: 104, anchor_y: 120, width: 72 }
  ], { width: 240, height: 300 });
  assert.equal(packed.placed.length, 2);
  for (const label of packed.placed) assert.equal(label.label_y, label.anchor_y);
  assert.equal(labelEngine.rectanglesOverlap(packed.placed[0].rect, packed.placed[1].rect, labelEngine.DEFAULT_HORIZONTAL_GAP), false);

  const constrained = labelEngine.packLabels([
    { person_id: "a", text: "Alpha", anchor_x: 35, anchor_y: 20, width: 60 },
    { person_id: "b", text: "Beta", anchor_x: 35, anchor_y: 20, width: 60 }
  ], { width: 70, height: 40 });
  assert.equal(constrained.placed.length, 1);
  assert.equal(constrained.placed[0].label_y, 20);
  assert.equal(constrained.deferred.length, 1);
  assert.equal(constrained.deferred[0].anchor_y, 20);
});

test("semantic LOD advances point to label to rail to Activity while density stays deferred to P9", () => {
  const point = lod.lodWeights({ timeZoom: 1, spaceZoom: 1 });
  const label = lod.lodWeights({ timeZoom: 1.8, spaceZoom: 1 });
  const rail = lod.lodWeights({ timeZoom: 4, spaceZoom: 3 });
  const activity = lod.lodWeights({ timeZoom: 7, spaceZoom: 3 });
  assert.equal(point.density, 0);
  assert.equal(lod.representationStage(point), "point");
  assert.equal(lod.representationStage(label), "label");
  assert.equal(lod.representationStage(rail), "rail");
  assert.equal(lod.representationStage(activity), "activity");
});

test("current surface is wired to the in-place Person-track pipeline and old vertical packing is gone", () => {
  assert.doesNotThrow(() => new Function(viewSource));
  assert.match(viewSource, /createSemanticTimeProjection\(/);
  assert.match(viewSource, /spaceAxis\.stableRegionLayout\(compiled\.continuum, contentWidth\)/);
  assert.match(viewSource, /politicalPlacement\.partitionTracks\(compiledTracks\)/);
  assert.match(viewSource, /spacetime-person-point/);
  assert.match(viewSource, /spacetime-track-label/);
  assert.doesNotMatch(viewSource, /function buildRegionMeta\(/);
  assert.doesNotMatch(viewSource, /OVERVIEW_CARD_HEIGHT/);
  assert.doesNotMatch(viewSource, /spacetime-person-card/);
  assert.match(cssSource, /\.spacetime-person-point\{/);
  assert.match(cssSource, /\.spacetime-track-label\{/);
  assert.doesNotMatch(cssSource, /\.spacetime-person-card/);
  assert.doesNotMatch(ownerSource, /spacetime-label-packing/);
  assert.equal(existsSync(new URL("../atlas-person-spacetime-label-packing.js", import.meta.url)), false);
});
