import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const space = require("../atlas-person-spacetime-space-axis-v2.js");
const compile = require("../atlas-person-spacetime-spatial-compile-v2.js");

const CONTINUUM = space.createSpatialContinuum();
const EUROPE = CONTINUUM.bandForCode("europe");
const BALKANS = CONTINUUM.bandForCode("balkans");
const BRITAIN = CONTINUUM.bandForCode("britain-ireland");

const INDEX = Object.freeze({
  schema: compile.PLACE_DISPLAY_INDEX_SCHEMA,
  places: Object.freeze({
    "place-pella": Object.freeze({
      subregion_code: "balkans",
      space_anchor: BALKANS.min_space + (BALKANS.max_space - BALKANS.min_space) * 0.42,
      confidence: "well_established",
      source_refs: Object.freeze(["fixture:pella-coordinate"])
    }),
    "place-london": Object.freeze({
      subregion_code: "britain-ireland",
      confidence: "reviewed",
      source_refs: Object.freeze(["fixture:london-subregion"])
    })
  })
});
const LOOKUP = compile.createPlaceDisplayLookup(INDEX, CONTINUUM);

function segment(overrides = {}) {
  return {
    activity_id: "activity-1",
    polity_id: "polity-1",
    region_code: "europe",
    placement_basis: "polity_place_function",
    location_label: "Pella",
    place_function_type: "capital",
    place_name: "Pella",
    place_id: "place-pella",
    confidence: "well_established",
    source_refs: ["fixture:historical-placement"],
    start_year: -336,
    end_year: -323,
    ...overrides
  };
}

test("reviewed place display index requires explicit evidence and an in-band anchor", () => {
  const validation = compile.validatePlaceDisplayIndex(INDEX, CONTINUUM);
  assert.equal(validation.valid, true);

  const invalid = compile.validatePlaceDisplayIndex({
    schema: compile.PLACE_DISPLAY_INDEX_SCHEMA,
    places: {
      bad: {
        subregion_code: "balkans",
        space_anchor: BRITAIN.center_space,
        confidence: "well_established",
        source_refs: []
      }
    }
  }, CONTINUUM);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some((error) => error.includes("source_refs")));
  assert.ok(invalid.errors.some((error) => error.includes("space_anchor")));
});

test("exact reviewed Place anchor compiles to place precision without changing historical fields", () => {
  const source = segment();
  const result = compile.compilePlacementSegment(source, CONTINUUM, LOOKUP);

  assert.equal(result.status, "placed");
  assert.equal(result.macroregion_code, "europe");
  assert.equal(result.subregion_code, "balkans");
  assert.equal(result.spatial_precision, "place");
  assert.equal(result.display_anchor_basis, "reviewed_place_axis_anchor");
  assert.equal(result.x_anchor, INDEX.places["place-pella"].space_anchor);
  assert.equal(result.start_year, source.start_year);
  assert.equal(result.end_year, source.end_year);
  assert.equal(result.historical_placement_basis, source.placement_basis);
  assert.deepEqual(result.historical_source_refs, source.source_refs);
});

test("reviewed subregion without an exact Place anchor remains an explicit range", () => {
  const result = compile.compilePlacementSegment(segment({
    place_id: "place-london",
    place_name: "London",
    location_label: "London"
  }), CONTINUUM, LOOKUP);

  assert.equal(result.status, "placed");
  assert.equal(result.subregion_code, "britain-ireland");
  assert.equal(result.spatial_precision, "subregion");
  assert.equal(result.display_anchor_basis, "reviewed_subregion_center");
  assert.equal(result.x_anchor, BRITAIN.center_space);
  assert.equal(result.x_min, BRITAIN.min_space);
  assert.equal(result.x_max, BRITAIN.max_space);
});

test("unmapped Place falls back honestly to macroregion instead of inventing a subregion", () => {
  const result = compile.compilePlacementSegment(segment({
    place_id: "place-unreviewed",
    place_name: "Unreviewed Place",
    location_label: "Unreviewed Place"
  }), CONTINUUM, LOOKUP);

  assert.equal(result.status, "placed");
  assert.equal(result.spatial_precision, "macroregion");
  assert.equal(result.subregion_code, null);
  assert.equal(result.display_anchor_basis, "macroregion_fallback_unmapped_place");
  assert.equal(result.x_anchor, EUROPE.center_space);
  assert.equal(result.x_min, EUROPE.min_space);
  assert.equal(result.x_max, EUROPE.max_space);
});

test("place name alone is never used as a hidden precision guess", () => {
  const result = compile.compilePlacementSegment(segment({
    place_id: null,
    place_name: "Pella",
    location_label: "Pella"
  }), CONTINUUM, LOOKUP);

  assert.equal(result.spatial_precision, "macroregion");
  assert.equal(result.display_anchor_basis, "macroregion_fallback");
  assert.equal(result.subregion_code, null);
});

test("reviewed Place mapping conflicting with historical macroregion is surfaced as unresolved", () => {
  const result = compile.compilePlacementSegment(segment({ region_code: "west-asia" }), CONTINUUM, LOOKUP);
  assert.equal(result.status, "spatial_compile_unresolved");
  assert.equal(result.reason, "place_subregion_macroregion_conflict");
  assert.equal(result.x_anchor, null);
});

test("activity-level compile preserves split historical segments and marks the whole result unresolved only on conflict", () => {
  const placement = {
    activity_id: "activity-split",
    polity_id: "polity-split",
    status: "placed",
    segments: [
      segment({ activity_id: "activity-split", start_year: -336, end_year: -330 }),
      segment({ activity_id: "activity-split", place_id: "place-london", place_name: "London", location_label: "London", start_year: -329, end_year: -323 })
    ]
  };
  const result = compile.compileActivityPlacement(placement, CONTINUUM, LOOKUP);

  assert.equal(result.status, "placed");
  assert.equal(result.segments.length, 2);
  assert.deepEqual(result.segments.map((item) => [item.start_year, item.end_year]), [[-336, -330], [-329, -323]]);
  assert.deepEqual(result.segments.map((item) => item.spatial_precision), ["place", "subregion"]);

  const conflicting = compile.compileActivityPlacement({
    ...placement,
    segments: [segment(), segment({ region_code: "west-asia" })]
  }, CONTINUUM, LOOKUP);
  assert.equal(conflicting.status, "spatial_compile_unresolved");
  assert.equal(conflicting.reason, "place_subregion_macroregion_conflict");
});

test("pre-existing unresolved historical placement remains unresolved and gains no display coordinate", () => {
  const result = compile.compileActivityPlacement({
    activity_id: "activity-u",
    polity_id: "polity-u",
    status: "spatial_unresolved",
    segments: []
  }, CONTINUUM, LOOKUP);
  assert.equal(result.status, "spatial_unresolved");
  assert.deepEqual(result.segments, []);
});