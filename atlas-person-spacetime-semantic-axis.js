((root, factory) => {
  "use strict";
  const modelApi = typeof module === "object" && module.exports ? require("./atlas-person-spacetime-model.js") : root?.ATLAS_PERSON_SPACETIME_MODEL;
  const api = factory(modelApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_SEMANTIC_AXIS = api;
})(typeof globalThis !== "undefined" ? globalThis : this, (modelApi) => {
  "use strict";

  if (!modelApi) throw new Error("ATLAS_PERSON_SPACETIME_MODEL is required");

  const MIN_SUPPORTED_ZOOM = 0.5;
  const PLACE_DETAIL_START_ZOOM = 7.2;
  const PLACE_DETAIL_FULL_ZOOM = 8;

  const TIME_STAGES = Object.freeze([
    Object.freeze({ code: "quarter-century", max_zoom: 6.5, interval_years: 25, min_gap_px: 38, label: "25년" }),
    Object.freeze({ code: "decade", max_zoom: Number.POSITIVE_INFINITY, interval_years: 10, min_gap_px: 34, label: "10년" })
  ]);

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp((Number(value) - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function readableZoom(value) {
    const zoom = Number(value);
    if (!Number.isFinite(zoom)) return MIN_SUPPORTED_ZOOM;
    if (zoom < MIN_SUPPORTED_ZOOM) throw new RangeError(`zoom must be >= ${MIN_SUPPORTED_ZOOM}`);
    return zoom;
  }

  function timeStage(zoomInput) {
    const zoom = readableZoom(zoomInput);
    return TIME_STAGES.find((stage) => zoom <= stage.max_zoom) || TIME_STAGES.at(-1);
  }

  function candidateHistoricalYears(startYear, endYear, intervalYears) {
    if (!Number.isInteger(startYear) || !Number.isInteger(endYear) || startYear === 0 || endYear === 0 || startYear > endYear) return Object.freeze([]);
    const step = Math.max(1, Math.trunc(intervalYears));
    const years = [];

    if (startYear < 0) {
      let year = Math.ceil(startYear / step) * step;
      if (year === 0) year = -step;
      while (year < 0 && year <= endYear) {
        if (year >= startYear) years.push(year);
        year += step;
      }
    }

    if (endYear > 0) {
      let year = Math.max(step, Math.ceil(Math.max(1, startYear) / step) * step);
      if (year === 0) year = step;
      while (year <= endYear) {
        years.push(year);
        year += step;
      }
    }

    return Object.freeze([...new Set(years)].sort((a, b) => modelApi.historicalYearToOrdinal(a) - modelApi.historicalYearToOrdinal(b)));
  }

  function buildTimeAxisPlan(range, projection, zoomInput) {
    const startYear = Number(range?.start_year);
    const endYear = Number(range?.end_year);
    if (!Number.isInteger(startYear) || !Number.isInteger(endYear) || startYear === 0 || endYear === 0 || startYear > endYear) {
      throw new RangeError("time axis requires a valid historical range without year zero");
    }
    if (!projection?.yForYear) throw new TypeError("time axis requires projection.yForYear");

    const zoom = readableZoom(zoomInput);
    const stage = timeStage(zoom);
    const candidates = candidateHistoricalYears(startYear, endYear, stage.interval_years);
    const ticks = [];
    let previousY = Number.NEGATIVE_INFINITY;
    for (const year of candidates) {
      const y = Number(projection.yForYear(year));
      if (!Number.isFinite(y)) continue;
      if (y - previousY < stage.min_gap_px) continue;
      const majorInterval = stage.interval_years * 5;
      ticks.push(Object.freeze({
        year,
        ordinal: modelApi.historicalYearToOrdinal(year),
        y,
        label: modelApi.yearLabel(year),
        major: Math.abs(year) % majorInterval === 0,
        interval_years: stage.interval_years
      }));
      previousY = y;
    }

    const eraOpacity = 1 - 0.58 * smoothstep(MIN_SUPPORTED_ZOOM, 8, zoom);
    return Object.freeze({
      stage: stage.code,
      stage_label: stage.label,
      interval_years: stage.interval_years,
      min_gap_px: stage.min_gap_px,
      ticks: Object.freeze(ticks),
      era_opacity: clamp(eraOpacity, 0.32, 1),
      zoom
    });
  }

  function buildBandGeometry(bands, width) {
    return Object.freeze((bands || []).map((band) => Object.freeze({
      ...band,
      left: band.min_space * width,
      width: (band.max_space - band.min_space) * width,
      center_x: band.center_space * width
    })));
  }

  function buildReviewedPlaceGeometry(bindings, continuum, width) {
    const seen = new Set();
    const rows = [];
    for (const binding of Array.isArray(bindings) ? bindings : []) {
      const placeId = String(binding?.place_id || "").trim();
      const placeName = String(binding?.place_name || "").trim();
      const macroCode = String(binding?.macroregion_code || "").trim();
      const subregionCode = String(binding?.subregion_code || "").trim();
      if (!placeId || !placeName || !macroCode || !subregionCode || seen.has(placeId)) continue;
      const macro = continuum?.bandForCode?.(macroCode);
      const subregion = continuum?.bandForCode?.(subregionCode);
      if (!macro || macro.kind !== "macroregion") continue;
      if (!subregion || subregion.kind !== "subregion" || subregion.parent_code !== macro.code) continue;
      seen.add(placeId);
      rows.push(Object.freeze({
        place_id: placeId,
        place_name: placeName,
        macroregion_code: macro.code,
        subregion_code: subregion.code,
        x_anchor: subregion.center_space,
        x: subregion.center_space * width,
        display_anchor_basis: "reviewed_place_point",
        exact_geographic_coordinate_claimed: false
      }));
    }
    rows.sort((a,b)=>a.x-b.x || a.place_name.localeCompare(b.place_name));
    return Object.freeze(rows);
  }

  // Presentation-only: several reviewed Places can share a subregion's
  // canonical display anchor. Keep every identity in `places`, and render
  // a single legible header marker for the shared anchor.
  function groupReviewedPlaceMarkers(places = []) {
    const grouped = new Map();
    for (const place of Array.isArray(places) ? places : []) {
      const key = String(place.subregion_code || "");
      if (!key) continue;
      if (!grouped.has(key)) grouped.set(key, {
        x:place.x, subregion_code:key, macroregion_code:place.macroregion_code,
        place_ids:[], place_names:[]
      });
      const group = grouped.get(key);
      group.place_ids.push(place.place_id);
      group.place_names.push(place.place_name);
    }
    return Object.freeze([...grouped.values()].map((group) => Object.freeze({
      x:group.x,
      subregion_code:group.subregion_code,
      macroregion_code:group.macroregion_code,
      place_ids:Object.freeze(group.place_ids),
      place_names:Object.freeze(group.place_names),
      place_count:group.place_names.length,
      display_label:group.place_names.length > 1 ? `장소 ${group.place_names.length}곳` : group.place_names[0],
      exact_geographic_coordinate_claimed:false
    })));
  }

  function buildSpaceHeaderPlan(continuum, contentWidth, zoomInput = MIN_SUPPORTED_ZOOM, reviewedPlaceBindings = []) {
    if (!continuum || !Array.isArray(continuum.macroregions) || !Array.isArray(continuum.subregions)) throw new TypeError("space header requires a spatial continuum");
    const width = Number(contentWidth);
    if (!Number.isFinite(width) || width <= 0) throw new RangeError("space header width must be > 0");
    const zoom = readableZoom(zoomInput);
    const placeOpacity = smoothstep(PLACE_DETAIL_START_ZOOM, PLACE_DETAIL_FULL_ZOOM, zoom);
    // Readability LOD only; no normalized historical region geometry changes.
    const subregionReadability = smoothstep(42, 78, width / continuum.subregions.length);
    const macroOnly = subregionReadability <= 0.04;
    const places = buildReviewedPlaceGeometry(reviewedPlaceBindings, continuum, width);
    return Object.freeze({
      stage: macroOnly ? "macroregion" : zoom > PLACE_DETAIL_START_ZOOM ? "place" : "subregion",
      stage_label: macroOnly ? "대권역" : zoom > PLACE_DETAIL_START_ZOOM ? "검토된 장소" : "세부 지역",
      macro_opacity: 1,
      subregion_opacity: subregionReadability * (1 - 0.18 * placeOpacity),
      place_opacity: placeOpacity,
      macroregions: buildBandGeometry(continuum.macroregions, width),
      subregions: buildBandGeometry(continuum.subregions, width),
      places,
      place_groups: groupReviewedPlaceMarkers(places),
      minimum_zoom: MIN_SUPPORTED_ZOOM,
      place_detail_start_zoom: PLACE_DETAIL_START_ZOOM,
      place_detail_full_zoom: PLACE_DETAIL_FULL_ZOOM
    });
  }

  return Object.freeze({
    MIN_SUPPORTED_ZOOM,
    PLACE_DETAIL_START_ZOOM,
    PLACE_DETAIL_FULL_ZOOM,
    TIME_STAGES,
    smoothstep,
    timeStage,
    candidateHistoricalYears,
    buildTimeAxisPlan,
    buildReviewedPlaceGeometry,
    groupReviewedPlaceMarkers,
    buildSpaceHeaderPlan
  });
});
