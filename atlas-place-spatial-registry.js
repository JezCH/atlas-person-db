((root, factory) => {
  "use strict";
  const spaceAxisApi = typeof module === "object" && module.exports
    ? require("./atlas-person-spacetime-space-axis.js")
    : root?.ATLAS_PERSON_SPACETIME_SPACE_AXIS;
  const api = factory(spaceAxisApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PLACE_SPATIAL_REGISTRY = api;
})(typeof globalThis !== "undefined" ? globalThis : this, (spaceAxisApi) => {
  "use strict";

  if (!spaceAxisApi) throw new Error("ATLAS_PERSON_SPACETIME_SPACE_AXIS is required");

  const PLACE_REGISTRY_SCHEMA = "atlas-place-spatial-registry/v1";
  const COORDINATE_PRECISIONS = new Set(["unknown", "reviewed_point"]);
  const REVIEW_STATUSES = new Set(["provisional", "reviewed"]);
  const PRESENTATION_ONLY_FIELDS = Object.freeze(["world_x", "x_anchor", "x_min", "x_max", "display_anchor", "display_anchor_basis"]);
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  function text(value) {
    return value == null ? "" : String(value).trim();
  }

  function hasOwn(value, key) {
    return Boolean(value && Object.prototype.hasOwnProperty.call(value, key));
  }

  function finiteOrNull(value) {
    if (value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : Number.NaN;
  }

  function normalizedRefs(refs) {
    return Object.freeze(Array.from(new Set((Array.isArray(refs) ? refs : []).map(text).filter(Boolean))).sort());
  }

  function normalizedHistoricalRefs(refs) {
    const unique = new Map();
    for (const raw of Array.isArray(refs) ? refs : []) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const sourceId = text(raw.source_id);
      const locator = text(raw.locator ?? raw.source_locator_key);
      if (!UUID_PATTERN.test(sourceId) || !locator) continue;
      const key = sourceId + "\u0000" + locator;
      if (!unique.has(key)) unique.set(key, Object.freeze({ source_id: sourceId, locator }));
    }
    return Object.freeze([...unique.values()].sort((a, b) => a.source_id.localeCompare(b.source_id) || a.locator.localeCompare(b.locator)));
  }

  function historicalRefKey(ref) {
    return text(ref?.source_id) + "\u0000" + text(ref?.locator ?? ref?.source_locator_key);
  }

  function bindingSignature(value) {
    return JSON.stringify([
      text(value?.place_id),
      text(value?.polity_id),
      text(value?.function_type || value?.place_function_type),
      ...normalizedHistoricalRefs(value?.source_refs || value?.historical_source_refs).map(historicalRefKey)
    ]);
  }

  function validatePlaceRegistry(value, continuum = spaceAxisApi.createSpatialContinuum()) {
    const errors = [];
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return Object.freeze({ valid: false, errors: Object.freeze(["place registry must be an object"]) });
    }
    if (value.schema !== PLACE_REGISTRY_SCHEMA) errors.push(`schema must be ${PLACE_REGISTRY_SCHEMA}`);
    if (!Array.isArray(value.places)) errors.push("places must be an array");
    if (value.bindings != null && !Array.isArray(value.bindings)) errors.push("bindings must be an array when present");

    const ids = new Set();
    const placeById = new Map();
    for (const [index, place] of (Array.isArray(value.places) ? value.places : []).entries()) {
      const prefix = `places[${index}]`;
      const placeId = text(place?.place_id);
      const canonicalName = text(place?.canonical_name);
      const macroCode = text(place?.macroregion_code);
      const subregionCode = text(place?.subregion_code) || null;
      const coordinatePrecision = text(place?.coordinate_precision) || "unknown";
      const reviewStatus = text(place?.review_status) || "provisional";
      const sourceRefs = normalizedRefs(place?.spatial_source_refs);

      if (!placeId) errors.push(`${prefix}: place_id is required`);
      else if (!UUID_PATTERN.test(placeId)) errors.push(`${prefix}: place_id must be a canonical UUID`);
      if (placeId && ids.has(placeId)) errors.push(`${prefix}: duplicate place_id ${placeId}`);
      if (placeId) {
        ids.add(placeId);
        placeById.set(placeId, place);
      }
      if (!canonicalName) errors.push(`${prefix}: canonical_name is required`);

      if (place?.historical_names != null && !Array.isArray(place.historical_names)) {
        errors.push(`${prefix}: historical_names must be an array when present`);
      } else if (Array.isArray(place?.historical_names) && place.historical_names.some((name) => !text(name))) {
        errors.push(`${prefix}: historical_names must not contain empty names`);
      }

      const macro = continuum?.bandForCode?.(macroCode);
      if (!macro || macro.kind !== "macroregion") errors.push(`${prefix}: invalid macroregion_code ${macroCode || "(empty)"}`);

      if (subregionCode) {
        const subregion = continuum?.bandForCode?.(subregionCode);
        if (!subregion || subregion.kind !== "subregion") {
          errors.push(`${prefix}: invalid subregion_code ${subregionCode}`);
        } else if (!macro || subregion.parent_code !== macro.code) {
          errors.push(`${prefix}: subregion ${subregionCode} is not a child of macroregion ${macroCode || "(empty)"}`);
        }
      }

      if (!COORDINATE_PRECISIONS.has(coordinatePrecision)) errors.push(`${prefix}: invalid coordinate_precision ${coordinatePrecision || "(empty)"}`);
      if (!REVIEW_STATUSES.has(reviewStatus)) errors.push(`${prefix}: invalid review_status ${reviewStatus || "(empty)"}`);

      const latitude = finiteOrNull(place?.latitude);
      const longitude = finiteOrNull(place?.longitude);
      const hasLatitude = place?.latitude != null;
      const hasLongitude = place?.longitude != null;
      if (hasLatitude !== hasLongitude) errors.push(`${prefix}: latitude and longitude must be provided together`);
      if (hasLatitude && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) errors.push(`${prefix}: latitude must be between -90 and 90`);
      if (hasLongitude && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) errors.push(`${prefix}: longitude must be between -180 and 180`);

      if (coordinatePrecision === "unknown" && (hasLatitude || hasLongitude)) {
        errors.push(`${prefix}: unknown coordinate_precision must not carry coordinates`);
      }
      if (coordinatePrecision === "reviewed_point") {
        if (!hasLatitude || !hasLongitude || !Number.isFinite(latitude) || !Number.isFinite(longitude)) errors.push(`${prefix}: reviewed_point requires reviewed latitude and longitude`);
        if (reviewStatus !== "reviewed") errors.push(`${prefix}: reviewed_point requires review_status reviewed`);
        if (!sourceRefs.length) errors.push(`${prefix}: reviewed_point requires spatial_source_refs`);
      }

      if (place?.spatial_source_refs != null && !Array.isArray(place.spatial_source_refs)) errors.push(`${prefix}: spatial_source_refs must be an array when present`);

      for (const field of PRESENTATION_ONLY_FIELDS) {
        if (hasOwn(place, field)) errors.push(`${prefix}: ${field} is presentation/compile data and must not be stored in the historical Place registry`);
      }
    }

    const bindingSignatures = new Set();
    for (const [index, binding] of (Array.isArray(value.bindings) ? value.bindings : []).entries()) {
      const prefix = `bindings[${index}]`;
      const placeId = text(binding?.place_id);
      const polityId = text(binding?.polity_id);
      const functionType = text(binding?.function_type);
      const placeName = text(binding?.place_name);
      const sourceRefs = normalizedHistoricalRefs(binding?.source_refs);
      const reviewStatus = text(binding?.review_status) || "provisional";
      const place = placeById.get(placeId);

      if (!placeId) errors.push(`${prefix}: place_id is required`);
      if (!polityId) errors.push(`${prefix}: polity_id is required`);
      else if (!UUID_PATTERN.test(polityId)) errors.push(`${prefix}: polity_id must be a canonical UUID`);
      if (!functionType) errors.push(`${prefix}: function_type is required`);
      if (!placeName) errors.push(`${prefix}: place_name is required`);
      if (!Array.isArray(binding?.source_refs) || !sourceRefs.length) errors.push(`${prefix}: non-empty Source UUID + locator source_refs are required for exact binding`);
      else if (sourceRefs.length !== binding.source_refs.length) errors.push(`${prefix}: every source_ref must contain canonical source_id UUID + locator`);
      if (!REVIEW_STATUSES.has(reviewStatus)) errors.push(`${prefix}: invalid review_status ${reviewStatus || "(empty)"}`);
      if (!place) {
        errors.push(`${prefix}: unknown place_id ${placeId || "(empty)"}`);
      } else {
        if (reviewStatus === "reviewed" && text(place.review_status) !== "reviewed") errors.push(`${prefix}: reviewed binding requires a reviewed Place`);
        if (reviewStatus === "reviewed" && !text(place.subregion_code)) errors.push(`${prefix}: reviewed subregion binding requires Place subregion_code`);
      }

      const signature = bindingSignature(binding);
      if (bindingSignatures.has(signature)) errors.push(`${prefix}: duplicate exact binding signature`);
      bindingSignatures.add(signature);
    }

    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
  }

  function createPlaceLookup(registry, continuum = spaceAxisApi.createSpatialContinuum()) {
    const validation = validatePlaceRegistry(registry, continuum);
    if (!validation.valid) {
      const error = new Error(`INVALID_PLACE_SPATIAL_REGISTRY: ${validation.errors.join(" | ")}`);
      error.code = "INVALID_PLACE_SPATIAL_REGISTRY";
      error.details = validation.errors;
      throw error;
    }
    const lookup = new Map();
    for (const rawPlace of registry.places || []) {
      const place = Object.freeze({
        ...rawPlace,
        place_id: text(rawPlace.place_id),
        canonical_name: text(rawPlace.canonical_name),
        historical_names: Object.freeze(Array.isArray(rawPlace.historical_names) ? rawPlace.historical_names.map(text).filter(Boolean) : []),
        macroregion_code: text(rawPlace.macroregion_code),
        subregion_code: text(rawPlace.subregion_code) || null,
        coordinate_precision: text(rawPlace.coordinate_precision) || "unknown",
        review_status: text(rawPlace.review_status) || "provisional",
        latitude: rawPlace.latitude == null ? null : Number(rawPlace.latitude),
        longitude: rawPlace.longitude == null ? null : Number(rawPlace.longitude),
        spatial_source_refs: normalizedRefs(rawPlace.spatial_source_refs)
      });
      lookup.set(place.place_id, place);
    }
    return lookup;
  }

  function createReviewedBindingLookup(registry, continuum = spaceAxisApi.createSpatialContinuum()) {
    const places = createPlaceLookup(registry, continuum);
    const lookup = new Map();
    for (const rawBinding of registry.bindings || []) {
      if (text(rawBinding.review_status) !== "reviewed") continue;
      const place = places.get(text(rawBinding.place_id));
      if (!place || place.review_status !== "reviewed" || !place.subregion_code) continue;
      lookup.set(bindingSignature(rawBinding), Object.freeze({
        place_id: place.place_id,
        canonical_name: place.canonical_name,
        macroregion_code: place.macroregion_code,
        subregion_code: place.subregion_code,
        source_refs: normalizedHistoricalRefs(rawBinding.source_refs),
        spatial_source_refs: place.spatial_source_refs
      }));
    }
    return lookup;
  }

  return Object.freeze({
    PLACE_REGISTRY_SCHEMA,
    COORDINATE_PRECISIONS,
    REVIEW_STATUSES,
    PRESENTATION_ONLY_FIELDS,
    UUID_PATTERN,
    bindingSignature,
    validatePlaceRegistry,
    createPlaceLookup,
    createReviewedBindingLookup
  });
});
