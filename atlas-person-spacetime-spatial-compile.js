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

  function normalizedRefs(refs) {
    return Object.freeze(Array.from(new Set((Array.isArray(refs) ? refs : []).map(text).filter(Boolean))).sort());
  }

  function bindingSignature(value) {
    return JSON.stringify([
      text(value?.polity_id),
      text(value?.function_type || value?.place_function_type),
      text(value?.place_name),
      ...normalizedRefs(value?.source_refs || value?.historical_source_refs)
    ]);
  }

  const REVIEWED_PLACE_BINDINGS = Object.freeze([
    Object.freeze({
      place_id: "place-rome", polity_id: "5d9a6186-bbe6-5d1a-ba93-02190ae4c417", function_type: "capital", place_name: "Rome",
      macroregion_code: "europe", subregion_code: "italy",
      source_refs: Object.freeze(["1911 Encyclopaedia Britannica: Constantine (emperors)"])
    }),
    Object.freeze({
      place_id: "place-pella", polity_id: "2f6e890f-1704-5c76-aa94-f18d7f905e06", function_type: "capital", place_name: "Pella",
      macroregion_code: "europe", subregion_code: "balkans",
      source_refs: Object.freeze(["Hellenic Ministry of Culture, Cultural Egnatia: Pella", "Hellenic Ministry of Culture and Sports, Odysseus: Pella"])
    }),
    Object.freeze({
      place_id: "place-ankara", polity_id: "28448862-277d-4738-9fb4-7f51a9e4c03a", function_type: "capital", place_name: "Ankara",
      macroregion_code: "west-asia", subregion_code: "anatolia-caucasus",
      source_refs: Object.freeze(["Atatürk Ansiklopedisi: Ankara’nın Başkent Oluşu"])
    }),
    Object.freeze({
      place_id: "place-rio-de-janeiro", polity_id: "3b8f7efc-40ae-5a33-8956-e9e852fbede4", function_type: "capital", place_name: "Rio de Janeiro",
      macroregion_code: "americas", subregion_code: "south-america",
      source_refs: Object.freeze(["Governo do Brasil: Linha do Tempo da Independência"])
    }),
    Object.freeze({
      place_id: "place-samarkand", polity_id: "6539c314-ec29-42e0-a0c2-90991fb9ffd8", function_type: "capital", place_name: "Samarkand",
      macroregion_code: "central-asia", subregion_code: "western-central-asia",
      source_refs: Object.freeze(["The Metropolitan Museum of Art: The Art of the Timurid Period (ca. 1370–1507)"])
    })
  ]);

  const REVIEWED_BINDING_BY_SIGNATURE = new Map(REVIEWED_PLACE_BINDINGS.map((binding) => [bindingSignature(binding), binding]));

  function reviewedPlaceBindingForFunction(polityId, fn) {
    return REVIEWED_BINDING_BY_SIGNATURE.get(bindingSignature({
      polity_id: polityId,
      function_type: fn?.function_type,
      place_name: fn?.place_name,
      source_refs: fn?.source_refs
    })) || null;
  }

  function reviewedPlaceBindingForSegment(segment) {
    return reviewedPlaceBindingForFunction(segment?.polity_id, {
      function_type: segment?.place_function_type,
      place_name: segment?.place_name,
      source_refs: segment?.source_refs
    });
  }

  function normalizedActivePlaceFunctions(segment) {
    return Object.freeze((Array.isArray(segment?.active_place_functions) ? segment.active_place_functions : []).map((fn) => Object.freeze({
      function_type: text(fn?.function_type) || null,
      place_name: text(fn?.place_name) || null,
      place_id: text(fn?.place_id) || null,
      region_code: text(fn?.region_code) || null,
      confidence: text(fn?.confidence) || null,
      source_refs: normalizedRefs(fn?.source_refs)
    })));
  }

  function compileSubregionRange(continuum, macroregionCode, subregionCode) {
    const macro = continuum?.bandForCode?.(text(macroregionCode));
    const subregion = continuum?.bandForCode?.(text(subregionCode));
    if (!macro || macro.kind !== "macroregion") return null;
    if (!subregion || subregion.kind !== "subregion" || subregion.parent_code !== macro.code) return null;
    return Object.freeze({
      macroregion_code: macro.code,
      subregion_code: subregion.code,
      x_anchor: subregion.center_space,
      x_min: subregion.min_space,
      x_max: subregion.max_space
    });
  }

  function baseCompiledSegment(segment, macro) {
    return {
      activity_id: text(segment?.activity_id), polity_id: text(segment?.polity_id), region_code: text(segment?.region_code),
      macroregion_code: macro?.code || null, subregion_code: text(segment?.subregion_code) || null, location_label: text(segment?.location_label),
      place_function_type: text(segment?.place_function_type) || null, place_name: text(segment?.place_name) || null,
      place_id: text(segment?.place_id) || null, start_year: segment?.start_year ?? null, end_year: segment?.end_year ?? null,
      historical_placement_basis: text(segment?.placement_basis), historical_confidence: text(segment?.confidence),
      historical_source_refs: normalizedRefs(segment?.source_refs),
      active_place_functions: normalizedActivePlaceFunctions(segment)
    };
  }

  function unresolvedSegment(segment, macro, reason) {
    return Object.freeze({
      ...baseCompiledSegment(segment, macro), status: "spatial_compile_unresolved", reason,
      x_anchor: null, x_min: null, x_max: null, spatial_precision: "unresolved", display_anchor_basis: null
    });
  }

  function compiledDisplayPlacePoints(segment, continuum, macro) {
    const points = [];
    for (const fn of normalizedActivePlaceFunctions(segment)) {
      const binding = reviewedPlaceBindingForFunction(segment?.polity_id, fn);
      if (!binding || binding.macroregion_code !== macro?.code) continue;
      const range = compileSubregionRange(continuum, binding.macroregion_code, binding.subregion_code);
      if (!range) continue;
      points.push(Object.freeze({
        place_id: binding.place_id,
        place_name: binding.place_name,
        function_type: binding.function_type,
        macroregion_code: binding.macroregion_code,
        subregion_code: range.subregion_code,
        x_anchor: range.x_anchor,
        display_anchor_basis: "reviewed_place_point",
        display_source_refs: normalizedRefs(binding.source_refs)
      }));
    }
    return Object.freeze(points);
  }

  function compilePlacementSegment(segment, continuum = spaceAxisApi.createSpatialContinuum()) {
    const macroCode = text(segment?.region_code);
    const macro = continuum?.bandForCode?.(macroCode);
    if (!macro || macro.kind !== "macroregion") return unresolvedSegment(segment, null, "invalid_macroregion");

    const binding = reviewedPlaceBindingForSegment(segment);
    if (binding) {
      if (binding.macroregion_code !== macro.code) return unresolvedSegment(segment, macro, "reviewed_place_macroregion_conflict");
      const range = compileSubregionRange(continuum, binding.macroregion_code, binding.subregion_code);
      if (!range) return unresolvedSegment(segment, macro, "reviewed_place_subregion_invalid");
      return Object.freeze({
        ...baseCompiledSegment(segment, macro),
        place_id: binding.place_id,
        subregion_code: range.subregion_code,
        status: "placed", reason: null,
        x_anchor: range.x_anchor, x_min: range.x_anchor, x_max: range.x_anchor,
        spatial_precision: "place", display_anchor_basis: "reviewed_place_point",
        display_confidence: "reviewed",
        display_source_refs: normalizedRefs(binding.source_refs),
        display_place_points: compiledDisplayPlacePoints(segment, continuum, macro)
      });
    }

    const reviewedSubregionCode = text(segment?.subregion_code);
    if (reviewedSubregionCode) {
      const range = compileSubregionRange(continuum, macro.code, reviewedSubregionCode);
      if (!range) return unresolvedSegment(segment, macro, "reviewed_polity_subregion_invalid");
      return Object.freeze({
        ...baseCompiledSegment(segment, macro),
        subregion_code: range.subregion_code,
        status: "placed", reason: null,
        x_anchor: range.x_anchor, x_min: range.x_min, x_max: range.x_max,
        spatial_precision: "subregion", display_anchor_basis: "reviewed_polity_subregion",
        display_confidence: "reviewed",
        display_source_refs: normalizedRefs(segment?.source_refs),
        display_place_points: compiledDisplayPlacePoints(segment, continuum, macro)
      });
    }

    return Object.freeze({
      ...baseCompiledSegment(segment, macro), status: "placed", reason: null,
      x_anchor: macro.center_space, x_min: macro.min_space, x_max: macro.max_space,
      spatial_precision: "macroregion", display_anchor_basis: "canonical_macroregion",
      display_confidence: text(segment?.confidence) || "reviewed",
      display_source_refs: normalizedRefs(segment?.source_refs),
      display_place_points: compiledDisplayPlacePoints(segment, continuum, macro)
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

  return Object.freeze({
    REVIEWED_PLACE_BINDINGS,
    bindingSignature,
    reviewedPlaceBindingForFunction,
    reviewedPlaceBindingForSegment,
    normalizedActivePlaceFunctions,
    compiledDisplayPlacePoints,
    compileSubregionRange,
    compilePlacementSegment,
    compileActivityPlacement,
    compileActivities
  });
});