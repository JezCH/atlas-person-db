((root, factory) => {
  "use strict";
  const modelApi = typeof module === "object" && module.exports ? require("./atlas-person-spacetime-model.js") : root?.ATLAS_PERSON_SPACETIME_MODEL;
  const spaceAxisApi = typeof module === "object" && module.exports ? require("./atlas-person-spacetime-space-axis.js") : root?.ATLAS_PERSON_SPACETIME_SPACE_AXIS;
  const api = factory(modelApi, spaceAxisApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_SPATIAL_COMPILE = api;
})(typeof globalThis !== "undefined" ? globalThis : this, (modelApi, spaceAxisApi) => {
  "use strict";

  if (!modelApi) throw new Error("ATLAS_PERSON_SPACETIME_MODEL is required");
  if (!spaceAxisApi) throw new Error("ATLAS_PERSON_SPACETIME_SPACE_AXIS is required");

  function text(value) { return value == null ? "" : String(value).trim(); }

  function baseCompiledSegment(segment, macro) {
    return {
      activity_id: text(segment?.activity_id), polity_id: text(segment?.polity_id), region_code: text(segment?.region_code),
      macroregion_code: macro?.code || null, subregion_code: null, location_label: text(segment?.location_label),
      place_function_type: text(segment?.place_function_type) || null, place_name: text(segment?.place_name) || null,
      place_id: text(segment?.place_id) || null, start_year: segment?.start_year ?? null, end_year: segment?.end_year ?? null,
      historical_placement_basis: text(segment?.placement_basis), historical_confidence: text(segment?.confidence),
      historical_source_refs: Object.freeze(Array.isArray(segment?.source_refs) ? segment.source_refs.map(text).filter(Boolean) : [])
    };
  }

  function compilePlacementSegment(segment, continuum = spaceAxisApi.createSpatialContinuum()) {
    const macroCode = text(segment?.region_code);
    const macro = continuum?.bandForCode?.(macroCode);
    if (!macro || macro.kind !== "macroregion") {
      return Object.freeze({ ...baseCompiledSegment(segment, null), status: "spatial_compile_unresolved", reason: "invalid_macroregion", x_anchor: null, x_min: null, x_max: null, spatial_precision: "unresolved", display_anchor_basis: null });
    }
    return Object.freeze({
      ...baseCompiledSegment(segment, macro), status: "placed", reason: null,
      x_anchor: macro.center_space, x_min: macro.min_space, x_max: macro.max_space,
      spatial_precision: "macroregion", display_anchor_basis: "canonical_macroregion",
      display_confidence: text(segment?.confidence) || "reviewed",
      display_source_refs: Object.freeze(Array.isArray(segment?.source_refs) ? segment.source_refs.map(text).filter(Boolean) : [])
    });
  }

  function compileActivityPlacement(placementResult, continuum = spaceAxisApi.createSpatialContinuum()) {
    if (!placementResult || placementResult.status !== "placed") {
      return Object.freeze({ activity_id: text(placementResult?.activity_id), polity_id: text(placementResult?.polity_id), status: text(placementResult?.status) || "spatial_compile_unresolved", reason: text(placementResult?.chronology_reason) || text(placementResult?.status) || null, segments: Object.freeze([]) });
    }
    const compiled = (placementResult.segments || []).map((segment) => compilePlacementSegment(segment, continuum));
    const unresolved = compiled.find((segment) => segment.status !== "placed");
    return Object.freeze({ activity_id: text(placementResult.activity_id), polity_id: text(placementResult.polity_id), status: unresolved ? "spatial_compile_unresolved" : "placed", reason: unresolved?.reason || null, segments: Object.freeze(compiled) });
  }

  function compileActivities(activities, spatialLookup, continuum = spaceAxisApi.createSpatialContinuum()) {
    return Object.freeze((Array.isArray(activities) ? activities : []).map((activity) => compileActivityPlacement(modelApi.resolveActivityPlacement(activity, spatialLookup), continuum)));
  }

  return Object.freeze({ compilePlacementSegment, compileActivityPlacement, compileActivities });
});