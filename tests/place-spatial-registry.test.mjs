import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const registryApi = require("../atlas-place-spatial-registry.js");
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

test("canonical registry validates reviewed C2 Place identities and exact bindings", () => {
  const validation = registryApi.validatePlaceRegistry(registry);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(registry.places.length, 5);
  assert.equal(registry.bindings.length, 5);
  assert.equal(registryApi.createPlaceLookup(registry).size, 5);
  assert.equal(registryApi.createReviewedBindingLookup(registry).size, 5);
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

test("reviewed binding requires an existing reviewed Place and exact source evidence", () => {
  const place = reviewedPlace({ coordinate_precision: "unknown", latitude: null, longitude: null });
  const binding = {
    place_id: "place-rome",
    polity_id: "polity-roman-empire",
    function_type: "capital",
    place_name: "Rome",
    source_refs: ["reviewed geographic source"],
    review_status: "reviewed"
  };
  const valid = { schema: registryApi.PLACE_REGISTRY_SCHEMA, places: [place], bindings: [binding] };
  assert.equal(registryApi.validatePlaceRegistry(valid).valid, true);

  const unknownPlace = { schema: registryApi.PLACE_REGISTRY_SCHEMA, places: [place], bindings: [{ ...binding, place_id: "place-missing" }] };
  const validation = registryApi.validatePlaceRegistry(unknownPlace);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /unknown place_id place-missing/);
});

test("binding lookup is exact and does not bind a matching place_name without reviewed source refs", () => {
  const lookup = registryApi.createReviewedBindingLookup(registry);
  const rome = registry.bindings.find((binding) => binding.place_id === "place-rome");
  assert.ok(rome);
  assert.ok(lookup.has(registryApi.bindingSignature(rome)));
  assert.equal(lookup.has(registryApi.bindingSignature({ ...rome, source_refs: ["different source"] })), false);
  assert.equal(lookup.has(registryApi.bindingSignature({ ...rome, polity_id: "polity-example" })), false);
});
