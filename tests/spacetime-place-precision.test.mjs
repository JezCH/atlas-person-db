import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const model = require("../atlas-person-spacetime-model.js");
const spaceAxis = require("../atlas-person-spacetime-space-axis.js");
const spatialCompile = require("../atlas-person-spacetime-spatial-compile.js");
const spatialIndex = JSON.parse(readFileSync(new URL("../atlas-polity-spatial-index.json", import.meta.url), "utf8"));

test("reviewed Place evidence compiles to point precision without inventing geographic coordinates", () => {
  const continuum = spaceAxis.createSpatialContinuum();
  const raw = {
    status: "placed",
    activity_id: "rome-test",
    polity_id: "5d9a6186-bbe6-5d1a-ba93-02190ae4c417",
    segments: [{
      activity_id: "rome-test",
      polity_id: "5d9a6186-bbe6-5d1a-ba93-02190ae4c417",
      region_code: "europe",
      placement_basis: "polity_place_function",
      location_label: "Rome",
      place_function_type: "capital",
      place_name: "Rome",
      place_id: null,
      active_place_functions: [{
        function_type: "capital",
        place_name: "Rome",
        place_id: null,
        region_code: "europe",
        confidence: "well_established",
        source_refs: ["1911 Encyclopaedia Britannica: Constantine (emperors)"]
      }],
      confidence: "well_established",
      source_refs: ["1911 Encyclopaedia Britannica: Constantine (emperors)"],
      start_year: -27,
      end_year: 329
    }]
  };

  const compiled = spatialCompile.compileActivityPlacement(raw, continuum);
  const segment = compiled.segments[0];

  assert.equal(compiled.status, "placed");
  assert.equal(segment.spatial_precision, "place");
  assert.equal(segment.place_id, "place-rome");
  assert.equal(segment.subregion_code, "italy");
  assert.equal(segment.display_anchor_basis, "reviewed_place_point");
  assert.equal(segment.x_min, segment.x_anchor);
  assert.equal(segment.x_max, segment.x_anchor);
  assert.equal(segment.active_place_functions.length, 1);
  assert.deepEqual(segment.active_place_functions[0].source_refs, ["1911 Encyclopaedia Britannica: Constantine (emperors)"]);
  assert.equal(segment.display_place_points.length, 1);
  assert.equal(segment.display_place_points[0].place_name, "Rome");
  assert.equal(segment.display_place_points[0].x_anchor, segment.x_anchor);
});

test("unreviewed Place names never upgrade spatial precision", () => {
  const continuum = spaceAxis.createSpatialContinuum();
  const raw = {
    status: "placed",
    activity_id: "paris-test",
    polity_id: "unreviewed-polity",
    segments: [{
      activity_id: "paris-test",
      polity_id: "unreviewed-polity",
      region_code: "europe",
      placement_basis: "polity_place_function",
      location_label: "Paris",
      place_function_type: "capital",
      place_name: "Paris",
      place_id: "place-paris",
      active_place_functions: [{
        function_type: "capital",
        place_name: "Paris",
        place_id: "place-paris",
        region_code: "europe",
        confidence: "reviewed",
        source_refs: ["unreviewed-display-source"]
      }],
      confidence: "reviewed",
      source_refs: ["unreviewed-display-source"],
      start_year: 1800,
      end_year: 1810
    }]
  };

  const compiled = spatialCompile.compileActivityPlacement(raw, continuum);
  const segment = compiled.segments[0];
  assert.equal(compiled.status, "spatial_compile_unresolved");
  assert.equal(compiled.reason, "macroregion_only_unresolved");
  assert.equal(segment.status, "spatial_compile_unresolved");
  assert.equal(segment.spatial_precision, "unresolved");
  assert.equal(segment.x_anchor, null);
  assert.equal(segment.x_min, null);
  assert.equal(segment.x_max, null);
});

test("real Roman Empire capital changes compile both reviewed Place segments", () => {
  const lookup = model.createSpatialLookup(spatialIndex);
  const continuum = spaceAxis.createSpatialContinuum();
  const activity = {
    id: "roman-empire-capital-span",
    polity: { id: "5d9a6186-bbe6-5d1a-ba93-02190ae4c417" },
    start: { year: -27 },
    end: { year: 395 },
    relation: { code: "rules" }
  };

  const resolved = model.resolveActivityPlacement(activity, lookup);
  assert.equal(resolved.status, "placed");
  assert.deepEqual(resolved.segments.map((segment) => segment.place_name), ["Rome", "Constantinople"]);
  assert.deepEqual(resolved.segments.map((segment) => [segment.start_year, segment.end_year]), [[-27, 329], [330, 395]]);
  assert.ok(resolved.segments.every((segment) => segment.active_place_functions.length === 1));

  const compiled = spatialCompile.compileActivityPlacement(resolved, continuum);
  assert.equal(compiled.status, "placed");
  assert.equal(compiled.reason, null);
  assert.deepEqual(compiled.segments.map((segment) => segment.place_name), ["Rome", "Constantinople"]);
  assert.deepEqual(compiled.segments.map((segment) => segment.spatial_precision), ["place", "place"]);
  assert.deepEqual(compiled.segments.map((segment) => [segment.start_year, segment.end_year]), [[-27, 329], [330, 395]]);
});