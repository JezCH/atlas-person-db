((root, factory) => {
  "use strict";
  const modelApi = typeof module === "object" && module.exports
    ? require("./atlas-person-spacetime-model.js")
    : root?.ATLAS_PERSON_SPACETIME_MODEL;
  const api = factory(modelApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_TIME_PROJECTION = api;
})(typeof globalThis !== "undefined" ? globalThis : this, (modelApi) => {
  "use strict";

  if (!modelApi) throw new Error("ATLAS_PERSON_SPACETIME_MODEL is required");

  const DEFAULT_BLEND_START_ZOOM = 1.25;
  const DEFAULT_BLEND_FULL_ZOOM = 4;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function smoothstep01(value) {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function semanticBlendWeight(semanticZoom = 1, options = {}) {
    const zoom = Number.isFinite(Number(semanticZoom)) && Number(semanticZoom) > 0 ? Number(semanticZoom) : 1;
    const start = Number.isFinite(Number(options.blendStartZoom)) && Number(options.blendStartZoom) > 0
      ? Number(options.blendStartZoom)
      : DEFAULT_BLEND_START_ZOOM;
    const full = Number.isFinite(Number(options.blendFullZoom)) && Number(options.blendFullZoom) > start
      ? Number(options.blendFullZoom)
      : DEFAULT_BLEND_FULL_ZOOM;
    if (zoom <= start) return 0;
    if (zoom >= full) return 1;
    const t = (Math.log(zoom) - Math.log(start)) / (Math.log(full) - Math.log(start));
    return smoothstep01(t);
  }

  function createSemanticTimeProjection(startYear, endYear, height = 2800, softeningYears = 180, semanticZoom = 1, options = {}) {
    const base = modelApi.createSpacetimeTimeProjection(startYear, endYear, height, softeningYears);
    const startOrdinal = base.start_ordinal;
    const endOrdinal = base.end_ordinal;
    const span = endOrdinal - startOrdinal;
    const weight = semanticBlendWeight(semanticZoom, options);

    function linearY(ordinal) {
      const clamped = Math.min(endOrdinal, Math.max(startOrdinal, Number(ordinal)));
      return base.height * ((clamped - startOrdinal) / span);
    }

    function worldToScreenY(ordinal) {
      if (!Number.isFinite(Number(ordinal))) return null;
      if (weight <= 0) return base.worldToScreenY(ordinal);
      if (weight >= 1) return linearY(ordinal);
      const logY = base.worldToScreenY(ordinal);
      const straightY = linearY(ordinal);
      return logY * (1 - weight) + straightY * weight;
    }

    function screenToWorldOrdinal(screenY) {
      if (!Number.isFinite(Number(screenY))) return null;
      const target = Math.min(base.height, Math.max(0, Number(screenY)));
      if (weight <= 0) return base.screenToWorldOrdinal(target);
      if (weight >= 1) return startOrdinal + (target / base.height) * span;

      let low = startOrdinal;
      let high = endOrdinal;
      for (let i = 0; i < 64; i += 1) {
        const mid = (low + high) / 2;
        if (worldToScreenY(mid) < target) low = mid;
        else high = mid;
      }
      return (low + high) / 2;
    }

    function yForOrdinal(ordinal) {
      return worldToScreenY(ordinal);
    }

    function yForYear(year) {
      const ordinal = modelApi.historicalYearToOrdinal(year);
      return ordinal == null ? null : worldToScreenY(ordinal);
    }

    function historicalYearForScreenY(screenY) {
      const ordinal = screenToWorldOrdinal(screenY);
      return ordinal == null ? null : modelApi.ordinalToHistoricalYear(Math.round(ordinal));
    }

    return Object.freeze({
      projection_version: "spacetime-semantic-time-projection/v1",
      mode: weight <= 0 ? "log_age" : weight >= 1 ? "linear_time" : "semantic_blend",
      start_year: startYear,
      end_year: endYear,
      start_ordinal: startOrdinal,
      end_ordinal: endOrdinal,
      height: base.height,
      softening_years: base.softening_years,
      semantic_zoom: Number(semanticZoom) || 1,
      semantic_blend_weight: weight,
      worldToScreenY,
      screenToWorldOrdinal,
      historicalYearForScreenY,
      yForOrdinal,
      yForYear
    });
  }

  return Object.freeze({
    DEFAULT_BLEND_START_ZOOM,
    DEFAULT_BLEND_FULL_ZOOM,
    semanticBlendWeight,
    createSemanticTimeProjection
  });
});