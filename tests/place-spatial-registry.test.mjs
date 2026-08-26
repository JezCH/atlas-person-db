import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const registryApi = require("../atlas-place-spatial-registry.js");
const spaceAxis = require("../atlas-person-spacetime-space-axis.js");
const spatialCompile = require("../atlas-person-spacetime-spatial-compile.js");
const registry = JSON.parse(readFileSync(new URL("../atlas-place-spatial-registry.json", import.meta.url), "utf8"));

function reviewedPlace(overrides = {}) {
  return {
    place_id: "place-rome",
    canonical_name: "Rome",
    historical_names: ["Roma"],
    macroregion_code: "europe",
    subregion_code: "italy",
    coordinate_precision: "reviewed_point",
    review_status: "reviewed",
    latitude: 41.8933,
    longitude: 12.4829,
    spatial_source_refs: ["reviewed geographic source"],
    ...overrides
  };
}

test("empty canonical registry is valid and intentionally does not invent Place bindings", () => {
  const validation = registryApi.validatePlaceRegistry(registry);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.deepEqual(registry.places, []);
  assert.equal(registryApi.createPlaceLookup(registry).size, 0);
});

test("reviewed Place identity can carry reviewed coordinates and a real subregion parent", () => {
  const value = { schema: registryApi.PLACE_REGISTRY_SCHEMA, places: [reviewedPlace()] };
  const validation = registryApi.validatePlaceRegistry(value);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  const place = registryApi.createPlaceLookup(value).get("place-rome");
  assert.equal(place.canonical_name, "Rome");
  assert.equal(place.macroregion_code, "europe");
  assert.equal(place.subregion_code, "italy");
  assert.equal(place.coordinate_precision, "reviewed_point");
});

test("subregion must be an actual child of the declared macroregion", () => {
  const value = { schema: registryApi.PLACE_REGISTRY_SCHEMA, places: [reviewedPlace({ macroregion_code: "east-asia", subregion_code: "italy" })] };
  const validation = registryApi.validatePlaceRegistry(value);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /not a child of macroregion east-asia/);
});

test("unknown Place precision cannot smuggle guessed coordinates into Authoring evidence", () => {
  const value = { schema: registryApi.PLACE_REGISTRY_SCHEMA, places: [reviewedPlace({ coordinate_precision: "unknown", review_status: "provisional" })] };
  const validation = registryApi.validatePlaceRegistry(value);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /unknown coordinate_precision must not carry coordinates/);
});

test("reviewed point precision requires reviewed status, coordinates, and sources", () => {
  const value = {
    schema: registryApi.PLACE_REGISTRY_SCHEMA,
    places: [reviewedPlace({ review_status: "provisional", latitude: null, longitude: null, spatial_source_refs: [] })]
  };
  const validation = registryApi.validatePlaceRegistry(value);
  assert.equal(validation.valid, false);
  const message = validation.errors.join("\n");
  assert.match(message, /requires reviewed latitude and longitude/);
  assert.match(message, /requires review_status reviewed/);
  assert.match(message, /requires spatial_source_refs/);
});

test("historical Place registry rejects runtime display-coordinate fields", () => {
  const value = { schema: registryApi.PLACE_REGISTRY_SCHEMA, places: [reviewedPlace({ world_x: 0.42, display_anchor: 0.42 })] };
  const validation = registryApi.validatePlaceRegistry(value);
  assert.equal(validation.valid, false);
  const message = validation.errors.join("\n");
  assert.match(message, /world_x is presentation\/compile data/);
  assert.match(message, /display_anchor is presentation\/compile data/);
});

test("C1 is evidence infrastructure only: current Production compile remains macroregion precision", () => {
  const continuum = spaceAxis.createSpatialContinuum();
  const segment = spatialCompile.compilePlacementSegment({
    activity_id: "activity-example",
    polity_id: "polity-example",
    region_code: "europe",
    placement_basis: "polity_place_function",
    place_function_type: "capital",
    place_name: "Rome",
    place_id: "place-rome",
    confidence: "well_established",
    source_refs: ["reviewed source"],
    start_year: 100,
    end_year: 110
  }, continuum);
  const europe = continuum.bandForCode("europe");
  assert.equal(segment.place_id, "place-rome");
  assert.equal(segment.spatial_precision, "macroregion");
  assert.equal(segment.subregion_code, null);
  assert.equal(segment.x_anchor, europe.center_space);
  assert.equal(segment.x_min, europe.min_space);
  assert.equal(segment.x_max, europe.max_space);
});
