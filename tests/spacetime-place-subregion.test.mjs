import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const spatialCompile = require("../atlas-person-spacetime-spatial-compile.js");
const registryApi = require("../atlas-place-spatial-registry.js");
const spaceAxis = require("../atlas-person-spacetime-space-axis.js");
const model = require("../atlas-person-spacetime-model.js");
const registry = JSON.parse(readFileSync(new URL("../atlas-place-spatial-registry.json", import.meta.url), "utf8"));
const spatialIndex = JSON.parse(readFileSync(new URL("../atlas-polity-spatial-index.json", import.meta.url), "utf8"));
const continuum = spaceAxis.createSpatialContinuum();
const placeById = registryApi.createPlaceLookup(registry);

function sourceSegment(binding, overrides = {}) {
  const place = placeById.get(binding.place_id);
  return {
    activity_id: `activity-${binding.place_id}`,
    polity_id: binding.polity_id,
    region_code: place.macroregion_code,
    placement_basis: "polity_place_function",
    place_function_type: binding.function_type,
    place_name: binding.place_name,
    place_id: null,
    confidence: "well_established",
    source_refs: [...binding.source_refs],
    start_year: 1,
    end_year: 2,
    ...overrides
  };
}

function spatialIndexFunctionForBinding(binding) {
  const record = spatialIndex.place_function_records.find((item) => item.polity_id === binding.polity_id);
  assert.ok(record, `${binding.place_id}: polity ${binding.polity_id} must exist in atlas-polity-spatial-index.json`);
  const signature = registryApi.bindingSignature(binding);
  const matches = record.functions.filter((fn) => registryApi.bindingSignature({
    polity_id: record.polity_id,
    function_type: fn.function_type,
    place_name: fn.place_name,
    source_refs: fn.source_refs
  }) === signature);
  assert.equal(matches.length, 1, `${binding.place_id}: reviewed binding must match exactly one spatial-index function`);
  return matches[0];
}

test("all reviewed C2 bindings compile to Place precision while retaining their reviewed subregion presentation anchor", () => {
  for (const binding of registry.bindings) {
    const place = placeById.get(binding.place_id);
    const compiled = spatialCompile.compilePlacementSegment(sourceSegment(binding), continuum);
    const subregion = continuum.bandForCode(place.subregion_code);

    assert.equal(compiled.status, "placed", binding.place_id);
    assert.equal(compiled.place_id, binding.place_id, binding.place_id);
    assert.equal(compiled.macroregion_code, place.macroregion_code, binding.place_id);
    assert.equal(compiled.subregion_code, place.subregion_code, binding.place_id);
    assert.equal(compiled.spatial_precision, "place", binding.place_id);
    assert.equal(compiled.display_anchor_basis, "reviewed_place_point", binding.place_id);
    assert.equal(compiled.x_anchor, subregion.center_space, binding.place_id);
    assert.equal(compiled.x_min, subregion.center_space, binding.place_id);
    assert.equal(compiled.x_max, subregion.center_space, binding.place_id);
  }
});

test("canonical reviewed bindings are exact facts that exist in the real spatial index", () => {
  for (const binding of registry.bindings) spatialIndexFunctionForBinding(binding);
});

test("reviewed bindings activate through the real spatial-index resolver, not only synthetic compiler inputs", () => {
  const lookup = model.createSpatialLookup(spatialIndex);

  for (const binding of registry.bindings) {
    const placeId = binding.place_id;
    const fn = spatialIndexFunctionForBinding(binding);
    const startYear = Number(fn.start_year);
    assert.ok(Number.isInteger(startYear), `${placeId}: reviewed function requires a finite start year for integration coverage`);
    const endYear = startYear === -1 ? 1 : startYear + 1;
    if (fn.end_year != null) assert.ok(endYear <= Number(fn.end_year), `${placeId}: integration interval must remain inside reviewed function`);

    const resolved = model.resolveActivityPlacement({
      id: `activity-integration-${placeId}`,
      polity: { id: binding.polity_id },
      start: { year: startYear },
      end: { year: endYear }
    }, lookup);
    assert.equal(resolved.status, "placed", placeId);

    const compiled = spatialCompile.compileActivityPlacement(resolved, continuum);
    assert.equal(compiled.status, "placed", placeId);
    assert.equal(compiled.segments.length, 1, placeId);
    assert.equal(compiled.segments[0].place_id, placeId, placeId);
    assert.equal(compiled.segments[0].spatial_precision, "place", placeId);
    assert.equal(compiled.segments[0].subregion_code, placeById.get(placeId).subregion_code, placeId);
    assert.equal(compiled.segments[0].x_min, compiled.segments[0].x_anchor, placeId);
    assert.equal(compiled.segments[0].x_max, compiled.segments[0].x_anchor, placeId);
    assert.equal(compiled.segments[0].active_place_functions.length, 1, placeId);
    assert.equal(compiled.segments[0].display_place_points.length, 1, placeId);
    assert.equal(compiled.segments[0].display_place_points[0].place_id, placeId, placeId);
  }
});

test("matching place_name alone never upgrades spatial precision", () => {
  const rome = registry.bindings.find((binding) => binding.place_id === "place-rome");
  const compiled = spatialCompile.compilePlacementSegment(sourceSegment(rome, { source_refs: ["unreviewed different source"] }), continuum);
  const europe = continuum.bandForCode("europe");

  assert.equal(compiled.status, "placed");
  assert.equal(compiled.place_id, null);
  assert.equal(compiled.subregion_code, null);
  assert.equal(compiled.spatial_precision, "macroregion");
  assert.equal(compiled.x_anchor, europe.center_space);
  assert.equal(compiled.x_min, europe.min_space);
  assert.equal(compiled.x_max, europe.max_space);
});

test("matching source evidence in another polity never upgrades spatial precision", () => {
  const rome = registry.bindings.find((binding) => binding.place_id === "place-rome");
  const compiled = spatialCompile.compilePlacementSegment(sourceSegment(rome, { polity_id: "polity-example" }), continuum);
  assert.equal(compiled.status, "placed");
  assert.equal(compiled.spatial_precision, "macroregion");
  assert.equal(compiled.subregion_code, null);
});

test("a reviewed exact binding conflicting with the resolved macroregion fails closed", () => {
  const ankara = registry.bindings.find((binding) => binding.place_id === "place-ankara");
  const compiled = spatialCompile.compilePlacementSegment(sourceSegment(ankara, { region_code: "europe" }), continuum);
  assert.equal(compiled.status, "spatial_compile_unresolved");
  assert.equal(compiled.reason, "reviewed_place_macroregion_conflict");
  assert.equal(compiled.spatial_precision, "unresolved");
  assert.equal(compiled.x_anchor, null);
});

test("unreviewed compound Place strings remain at existing macroregion precision", () => {
  const compiled = spatialCompile.compilePlacementSegment({
    activity_id: "activity-compound",
    polity_id: "6d1520e2-0aff-5063-b2b7-95eb86daf372",
    region_code: "west-asia",
    placement_basis: "polity_place_function",
    place_function_type: "capital",
    place_name: "Söğüt–Bursa",
    place_id: null,
    confidence: "well_established",
    source_refs: ["reviewed source outside C2 binding set"],
    start_year: 1299,
    end_year: 1362
  }, continuum);
  assert.equal(compiled.status, "placed");
  assert.equal(compiled.spatial_precision, "macroregion");
  assert.equal(compiled.subregion_code, null);
});

test("runtime reviewed binding table is locked to the canonical registry binding facts", () => {
  const registryFacts = registry.bindings.map((binding) => {
    const place = placeById.get(binding.place_id);
    return {
      signature: registryApi.bindingSignature(binding),
      place_id: binding.place_id,
      macroregion_code: place.macroregion_code,
      subregion_code: place.subregion_code
    };
  }).sort((a, b) => a.signature.localeCompare(b.signature));

  const runtimeFacts = spatialCompile.REVIEWED_PLACE_BINDINGS.map((binding) => ({
    signature: spatialCompile.bindingSignature(binding),
    place_id: binding.place_id,
    macroregion_code: binding.macroregion_code,
    subregion_code: binding.subregion_code
  })).sort((a, b) => a.signature.localeCompare(b.signature));

  assert.deepEqual(runtimeFacts, registryFacts);
});
