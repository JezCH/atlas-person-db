import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const model = require("../atlas-person-spacetime-model.js");
const compile = require("../atlas-person-spacetime-spatial-compile.js");
const spaceAxis = require("../atlas-person-spacetime-space-axis.js");
const presentation = require("../atlas-person-spacetime-presentation-layout.js");

const here = path.dirname(fileURLToPath(import.meta.url));
const spatialIndex = JSON.parse(readFileSync(path.join(here, "..", "atlas-polity-spatial-index.json"), "utf8"));

function activity(polityId) {
  return {
    id: `activity-${polityId}`,
    polity: { id: polityId },
    start: { year: 100 },
    end: { year: 101 }
  };
}

test("every current macro-only polity is unplaced in the canonical lookup", () => {
  const validation = model.validateSpatialIndex(spatialIndex);
  assert.equal(validation.valid, true, validation.errors?.join(" | "));

  const macroOnly = model.macroOnlyPolityIds(spatialIndex);
  assert.ok(macroOnly.length > 0, "fixture must contain at least one macro-only polity");

  const lookup = model.createSpatialLookup(spatialIndex);
  const byMacroregion = {};
  for (const polityId of macroOnly) {
    const macroregion = spatialIndex.polity_geography[polityId];
    byMacroregion[macroregion] = (byMacroregion[macroregion] || 0) + 1;
    assert.equal(lookup.has(polityId), false, `${polityId} must not be treated as spatially resolved`);
    const placement = model.resolveActivityPlacement(activity(polityId), lookup);
    assert.equal(placement.status, "spatial_unresolved", `${polityId} must stay unresolved`);
    assert.equal(placement.segments.length, 0, `${polityId} must not emit a placement segment`);
  }

  console.log(`macro-only unresolved polities: ${macroOnly.length}`, byMacroregion);
});

test("manual macroregion-only polity records are rejected defensively", () => {
  const lookup = new Map([["macro-only", Object.freeze({
    placement_basis: "polity_geography",
    region_code: "east-asia",
    subregion_code: null
  })]]);
  const placement = model.resolveActivityPlacement(activity("macro-only"), lookup);
  assert.equal(placement.status, "spatial_unresolved");
  assert.equal(placement.reason, "macroregion_only_unresolved");
  assert.deepEqual(placement.segments, []);
});

test("compiler never fabricates coordinates for a macroregion-only segment", () => {
  const compiled = compile.compilePlacementSegment({
    activity_id: "activity-macro-only",
    polity_id: "macro-only",
    region_code: "east-asia",
    subregion_code: null,
    placement_basis: "polity_geography",
    confidence: "reviewed",
    start_year: -200,
    end_year: -190
  });

  assert.equal(compiled.status, "spatial_compile_unresolved");
  assert.equal(compiled.reason, "macroregion_only_unresolved");
  assert.equal(compiled.spatial_precision, "unresolved");
  assert.equal(compiled.x_anchor, null);
  assert.equal(compiled.x_min, null);
  assert.equal(compiled.x_max, null);
  assert.equal(compiled.display_anchor_basis, null);
});

test("presentation layer has no macroregion fallback band", () => {
  const continuum = spaceAxis.createSpatialContinuum();
  assert.equal(presentation.presentationBand({ macroregion_code: "east-asia", subregion_code: null }, continuum), null);
  assert.equal(presentation.presentationBand({ macroregion_code: "europe", subregion_code: null }, continuum), null);

  const leaf = presentation.presentationBand({ macroregion_code: "east-asia", subregion_code: "korean-peninsula" }, continuum);
  assert.equal(leaf?.kind, "subregion");
  assert.equal(leaf?.code, "korean-peninsula");
});
