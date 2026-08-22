((root, factory) => {
  "use strict";
  const modelApi = typeof module === "object" && module.exports
    ? require("./atlas-person-spacetime-model.js")
    : root?.ATLAS_PERSON_SPACETIME_MODEL;
  const spaceAxisApi = typeof module === "object" && module.exports
    ? require("./atlas-person-spacetime-space-axis-v2.js")
    : root?.ATLAS_PERSON_SPACETIME_SPACE_AXIS_V2;
  const api = factory(modelApi, spaceAxisApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_SPATIAL_COMPILE_V2 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, (modelApi, spaceAxisApi) => {
  "use strict";

  if (!modelApi) throw new Error("ATLAS_PERSON_SPACETIME_MODEL is required");
  if (!spaceAxisApi) throw new Error("ATLAS_PERSON_SPACETIME_SPACE_AXIS_V2 is required");

  const PLACE_DISPLAY_INDEX_SCHEMA = "atlas-spacetime-place-display-index/v1";
  const ALLOWED_CONFIDENCE = new Set(["well_established", "likely", "speculative", "disputed", "unknown", "reviewed"]);
  const EPSILON = 1e-9;

  function text(value) {
    return value == null ? "" : String(value).trim();
  }

  function finiteOrNull(value) {
    if (value == null || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function validatePlaceDisplayIndex(index, continuum = spaceAxisApi.createSpatialContinuum()) {
    const errors = [];
    if (!index || typeof index !== "object" || Array.isArray(index)) {
      return Object.freeze({ valid: false, errors: Object.freeze(["place display index must be an object"]) });
    }
    if (index.schema !== PLACE_DISPLAY_INDEX_SCHEMA) errors.push(`schema must be ${PLACE_DISPLAY_INDEX_SCHEMA}`);
    if (!index.places || typeof index.places !== "object" || Array.isArray(index.places)) errors.push("places must be an object");

    for (const [rawPlaceId, record] of Object.entries(index.places || {})) {
      const placeId = text(rawPlaceId);
      if (!placeId) errors.push("places contains an empty place_id");
      const subregionCode = text(record?.subregion_code);
      const subregion = continuum.bandForCode(subregionCode);
      if (!subregion || subregion.kind !== "subregion") errors.push(`place ${placeId || "(empty)"}: invalid subregion_code ${subregionCode || "(empty)"}`);
      const confidence = text(record?.confidence);
      if (!ALLOWED_CONFIDENCE.has(confidence)) errors.push(`place ${placeId || "(empty)"}: invalid confidence ${confidence || "(empty)"}`);
      const sourceRefs = Array.isArray(record?.source_refs) ? record.source_refs.map(text).filter(Boolean) : [];
      if (!sourceRefs.length) errors.push(`place ${placeId || "(empty)"}: source_refs must contain reviewed evidence`);
      if (record?.space_anchor != null) {
        const anchor = finiteOrNull(record.space_anchor);
        if (anchor == null) errors.push(`place ${placeId || "(empty)"}: space_anchor must be finite when present`);
        else if (subregion && (anchor < subregion.min_space - EPSILON || anchor > subregion.max_space + EPSILON)) {
          errors.push(`place ${placeId || "(empty)"}: space_anchor must stay inside subregion ${subregionCode}`);
        }
      }
    }

    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
  }

  function createPlaceDisplayLookup(index, continuum = spaceAxisApi.createSpatialContinuum()) {
    const validation = validatePlaceDisplayIndex(index, continuum);
    if (!validation.valid) {
      const error = new Error(`INVALID_PLACE_DISPLAY_INDEX: ${validation.errors.join(" | ")}`);
      error.code = "INVALID_PLACE_DISPLAY_INDEX";
      error.details = validation.errors;
      throw error;
    }
    const lookup = new Map();
    for (const [rawPlaceId, record] of Object.entries(index.places || {})) {
      const placeId = text(rawPlaceId);
      const subregion = continuum.bandForCode(text(record.subregion_code));
      lookup.set(placeId, Object.freeze({
        place_id: placeId,
        subregion_code: subregion.code,
        macroregion_code: subregion.parent_code,
        space_anchor: finiteOrNull(record.space_anchor),
        confidence: text(record.confidence),
        source_refs: Object.freeze(record.source_refs.map(text).filter(Boolean))
      }));
    }
    return lookup;
  }

  function baseCompiledSegment(segment, macro) {
    return {
      activity_id: text(segment?.activity_id),
      polity_id: text(segment?.polity_id),
      region_code: text(segment?.region_code),
      macroregion_code: macro?.code || null,
      location_label: text(segment?.location_label),
      place_function_type: text(segment?.place_function_type) || null,
      place_name: text(segment?.place_name) || null,
      place_id: text(segment?.place_id) || null,
      start_year: segment?.start_year ?? null,
      end_year: segment?.end_year ?? null,
      historical_placement_basis: text(segment?.placement_basis),
      historical_confidence: text(segment?.confidence),
      historical_source_refs: Object.freeze(Array.isArray(segment?.source_refs) ? segment.source_refs.map(text).filter(Boolean) : [])
    };
  }

  function compilePlacementSegment(segment, continuum, placeLookup) {
    if (!continuum?.bandForCode) throw new TypeError("spatial continuum is required");
    const macroCode = text(segment?.region_code);
    const macro = continuum.bandForCode(macroCode);
    if (!macro || macro.kind !== "macroregion") {
      return Object.freeze({
        ...baseCompiledSegment(segment, null),
        status: "spatial_compile_unresolved",
        reason: "invalid_macroregion",
        x_anchor: null,
        x_min: null,
        x_max: null,
        spatial_precision: "unresolved",
        display_anchor_basis: null
      });
    }

    const base = baseCompiledSegment(segment, macro);
    const placeId = base.place_id;
    const placeRecord = placeId && placeLookup instanceof Map ? placeLookup.get(placeId) : null;

    if (placeRecord) {
      const subregion = continuum.bandForCode(placeRecord.subregion_code);
      if (!subregion || subregion.kind !== "subregion" || subregion.parent_code !== macro.code) {
        return Object.freeze({
          ...base,
          status: "spatial_compile_unresolved",
          reason: "place_subregion_macroregion_conflict",
          x_anchor: null,
          x_min: macro.min_space,
          x_max: macro.max_space,
          spatial_precision: "unresolved",
          display_anchor_basis: null
        });
      }

      const exactAnchor = placeRecord.space_anchor;
      return Object.freeze({
        ...base,
        status: "placed",
        subregion_code: subregion.code,
        x_anchor: exactAnchor == null ? subregion.center_space : exactAnchor,
        x_min: subregion.min_space,
        x_max: subregion.max_space,
        spatial_precision: exactAnchor == null ? "subregion" : "place",
        display_anchor_basis: exactAnchor == null ? "reviewed_subregion_center" : "reviewed_place_axis_anchor",
        display_confidence: placeRecord.confidence,
        display_source_refs: placeRecord.source_refs
      });
    }

    return Object.freeze({
      ...base,
      status: "placed",
      subregion_code: null,
      x_anchor: macro.center_space,
      x_min: macro.min_space,
      x_max: macro.max_space,
      spatial_precision: "macroregion",
      display_anchor_basis: placeId ? "macroregion_fallback_unmapped_place" : "macroregion_fallback",
      display_confidence: "reviewed",
      display_source_refs: Object.freeze([])
    });
  }

  function compileActivityPlacement(placementResult, continuum, placeLookup) {
    if (!placementResult || placementResult.status !== "placed") {
      return Object.freeze({
        activity_id: text(placementResult?.activity_id),
        polity_id: text(placementResult?.polity_id),
        status: text(placementResult?.status) || "spatial_compile_unresolved",
        reason: text(placementResult?.chronology_reason) || null,
        segments: Object.freeze([])
      });
    }

    const compiled = (placementResult.segments || []).map((segment) => compilePlacementSegment(segment, continuum, placeLookup));
    const unresolved = compiled.find((segment) => segment.status !== "placed");
    return Object.freeze({
      activity_id: text(placementResult.activity_id),
      polity_id: text(placementResult.polity_id),
      status: unresolved ? "spatial_compile_unresolved" : "placed",
      reason: unresolved?.reason || null,
      segments: Object.freeze(compiled)
    });
  }

  function compileActivities(activities, spatialLookup, continuum, placeLookup) {
    if (!Array.isArray(activities)) return Object.freeze([]);
    return Object.freeze(activities.map((activity) => {
      const placement = modelApi.resolveActivityPlacement(activity, spatialLookup);
      return compileActivityPlacement(placement, continuum, placeLookup);
    }));
  }

  return Object.freeze({
    PLACE_DISPLAY_INDEX_SCHEMA,
    validatePlaceDisplayIndex,
    createPlaceDisplayLookup,
    compilePlacementSegment,
    compileActivityPlacement,
    compileActivities
  });
});