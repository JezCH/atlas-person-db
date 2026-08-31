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

  const MIN_SUPPORTED_ZOOM = 5;

  function finite(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new TypeError(`${label} must be finite`);
    return number;
  }

  function validateZoom(value) {
    const zoom = finite(value, "zoom");
    if (zoom < MIN_SUPPORTED_ZOOM) throw new RangeError(`zoom must be >= ${MIN_SUPPORTED_ZOOM}`);
    return zoom;
  }

  function createUniformTimeProjection(startYear, endYear, height = 4200, zoom = MIN_SUPPORTED_ZOOM) {
    const startOrdinal = modelApi.historicalYearToOrdinal(startYear);
    const endOrdinal = modelApi.historicalYearToOrdinal(endYear);
    if (startOrdinal == null || endOrdinal == null || startOrdinal >= endOrdinal) throw new RangeError("time projection requires a valid historical range without year zero");
    const safeHeight = finite(height, "height");
    if (!(safeHeight > 0)) throw new RangeError("height must be > 0");
    const safeZoom = validateZoom(zoom);
    const span = endOrdinal - startOrdinal;

    function worldToScreenY(ordinal) {
      if (!Number.isFinite(Number(ordinal))) return null;
      const clamped = Math.min(endOrdinal, Math.max(startOrdinal, Number(ordinal)));
      return safeHeight * ((clamped - startOrdinal) / span);
    }

    function screenToWorldOrdinal(screenY) {
      if (!Number.isFinite(Number(screenY))) return null;
      const clamped = Math.min(safeHeight, Math.max(0, Number(screenY)));
      return startOrdinal + (clamped / safeHeight) * span;
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
      projection_version: "spacetime-uniform-time-projection/v1",
      mode: "linear_time",
      start_year: startYear,
      end_year: endYear,
      start_ordinal: startOrdinal,
      end_ordinal: endOrdinal,
      height: safeHeight,
      zoom: safeZoom,
      worldToScreenY,
      screenToWorldOrdinal,
      historicalYearForScreenY,
      yForOrdinal,
      yForYear
    });
  }

  return Object.freeze({
    MIN_SUPPORTED_ZOOM,
    createUniformTimeProjection
  });
});
