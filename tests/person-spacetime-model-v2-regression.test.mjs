import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const model = require("../atlas-person-spacetime-model.js");

function geographyIndex(region = "east-asia") {
  return {
    schema: model.SPATIAL_INDEX_SCHEMA,
    polity_geography: { "polity-a": region },
    place_function_records: [],
    review_queue: []
  };
}

function placeFunctionIndex() {
  return {
    schema: model.SPATIAL_INDEX_SCHEMA,
    polity_geography: {},
    place_function_records: [{
      polity_id: "polity-a",
      functions: [
        { start_year: 100, end_year: 109, function_type: "capital", place_name: "Old Capital", region_code: "west-asia", confidence: "well_established", source_refs: ["source:old"] },
        { start_year: 110, end_year: 130, function_type: "capital", place_name: "New Capital", region_code: "east-asia", confidence: "well_established", source_refs: ["source:new"] }
      ]
    }],
    review_queue: []
  };
}

test("v2 direct geography places an activity without place-function data", () => {
  const lookup = model.createSpatialLookup(geographyIndex("east-asia"));
  const placement = model.resolveActivityPlacement({ id: "activity-a", polity: { id: "polity-a" }, start: { year: 100 }, end: { year: 120 } }, lookup);
  assert.equal(placement.status, "placed");
  assert.equal(placement.segments.length, 1);
  assert.equal(placement.segments[0].region_code, "east-asia");
  assert.equal(placement.segments[0].placement_basis, "polity_geography");
  assert.equal(placement.segments[0].place_name, null);
});

test("v2 missing reviewed spatial record never guesses a placement", () => {
  const lookup = model.createSpatialLookup({ schema: model.SPATIAL_INDEX_SCHEMA, polity_geography: {}, place_function_records: [], review_queue: [] });
  const placement = model.resolveActivityPlacement({ id: "activity-a", polity: { id: "polity-a" }, start: { year: 100 }, end: { year: 120 } }, lookup);
  assert.equal(placement.status, "spatial_unresolved");
  assert.deepEqual(placement.segments, []);
});

test("v2 reviewed capital move splits only visual placement segments", () => {
  const lookup = model.createSpatialLookup(placeFunctionIndex());
  const activity = { id: "activity-a", polity: { id: "polity-a" }, start: { year: 105 }, end: { year: 115 } };
  const placement = model.resolveActivityPlacement(activity, lookup);
  assert.equal(placement.status, "placed");
  assert.deepEqual(placement.segments.map((segment) => [segment.place_function_type, segment.place_name, segment.start_year, segment.end_year, segment.region_code]), [
    ["capital", "Old Capital", 105, 109, "west-asia"],
    ["capital", "New Capital", 110, 115, "east-asia"]
  ]);
  assert.equal(activity.start.year, 105);
  assert.equal(activity.end.year, 115);
});

test("v2 place functions require reviewed source references", () => {
  const invalid = placeFunctionIndex();
  invalid.place_function_records[0].functions[0].source_refs = [];
  const result = model.validateSpatialIndex(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes("source_refs")));
});

test("v2 rejects obsolete capital and authority-center record families", () => {
  const invalid = geographyIndex();
  invalid.capital_records = [];
  invalid.authority_center_records = [];
  const result = model.validateSpatialIndex(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes("capital_records is obsolete")));
  assert.ok(result.errors.some((message) => message.includes("authority_center_records is obsolete")));
});

test("v2 same-region simultaneous place functions compile deterministically", () => {
  const index = {
    schema: model.SPATIAL_INDEX_SCHEMA,
    polity_geography: {},
    place_function_records: [{
      polity_id: "polity-a",
      functions: [
        { start_year: 100, end_year: 110, function_type: "royal_court", place_name: "Court", region_code: "west-asia", confidence: "well_established", source_refs: ["source:court"] },
        { start_year: 100, end_year: 110, function_type: "capital", place_name: "Capital", region_code: "west-asia", confidence: "well_established", source_refs: ["source:capital"] }
      ]
    }],
    review_queue: []
  };
  const placement = model.resolveActivityPlacement({ id: "activity-a", polity: { id: "polity-a" }, start: { year: 100 }, end: { year: 110 } }, model.createSpatialLookup(index));
  assert.equal(placement.status, "placed");
  assert.equal(placement.segments[0].place_function_type, "capital");
  assert.equal(placement.segments[0].place_name, "Capital");
  assert.equal(placement.segments[0].active_place_functions.length, 2);
});

test("v2 conflicting simultaneous place-function regions remain unresolved", () => {
  const index = placeFunctionIndex();
  index.place_function_records[0].functions = [
    { start_year: 100, end_year: 110, function_type: "capital", place_name: "A", region_code: "west-asia", confidence: "well_established", source_refs: ["source:a"] },
    { start_year: 100, end_year: 110, function_type: "royal_court", place_name: "B", region_code: "central-asia", confidence: "well_established", source_refs: ["source:b"] }
  ];
  const placement = model.resolveActivityPlacement({ id: "activity-a", polity: { id: "polity-a" }, start: { year: 100 }, end: { year: 110 } }, model.createSpatialLookup(index));
  assert.equal(placement.status, "place_function_region_conflict");
  assert.deepEqual(placement.segments, []);
});

test("v2 place-function coverage gaps prevent silent partial placement", () => {
  const index = placeFunctionIndex();
  index.place_function_records[0].functions = [
    { start_year: 100, end_year: 104, function_type: "capital", place_name: "A", region_code: "west-asia", confidence: "well_established", source_refs: ["source:a"] },
    { start_year: 106, end_year: 110, function_type: "capital", place_name: "B", region_code: "west-asia", confidence: "well_established", source_refs: ["source:b"] }
  ];
  const placement = model.resolveActivityPlacement({ id: "activity-a", polity: { id: "polity-a" }, start: { year: 100 }, end: { year: 110 } }, model.createSpatialLookup(index));
  assert.equal(placement.status, "place_function_period_gap");
  assert.deepEqual(placement.segments, []);
});