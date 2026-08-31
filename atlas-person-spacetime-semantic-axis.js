((root, factory) => {
  "use strict";
  const modelApi = typeof module === "object" && module.exports ? require("./atlas-person-spacetime-model.js") : root?.ATLAS_PERSON_SPACETIME_MODEL;
  const api = factory(modelApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_SEMANTIC_AXIS = api;
})(typeof globalThis !== "undefined" ? globalThis : this, (modelApi) => {
  "use strict";

  if (!modelApi) throw new Error("ATLAS_PERSON_SPACETIME_MODEL is required");

  const MIN_SUPPORTED_ZOOM = 5;
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

  function buildSpaceHeaderPlan(continuum, contentWidth) {
    if (!continuum || !Array.isArray(continuum.macroregions) || !Array.isArray(continuum.subregions)) throw new TypeError("space header requires a spatial continuum");
    const width = Number(contentWidth);
    if (!Number.isFinite(width) || width <= 0) throw new RangeError("space header width must be > 0");
    return Object.freeze({
      stage: "subregion",
      stage_label: "세부 지역",
      macro_opacity: 0.38,
      subregion_opacity: 1,
      macroregions: buildBandGeometry(continuum.macroregions, width),
      subregions: buildBandGeometry(continuum.subregions, width),
      minimum_zoom: MIN_SUPPORTED_ZOOM
    });
  }

  return Object.freeze({
    MIN_SUPPORTED_ZOOM,
    TIME_STAGES,
    smoothstep,
    timeStage,
    candidateHistoricalYears,
    buildTimeAxisPlan,
    buildSpaceHeaderPlan
  });
});
