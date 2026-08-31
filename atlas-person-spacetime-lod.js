((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_LOD = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const MIN_SUPPORTED_ZOOM = 5;
  const DEFAULT_THRESHOLDS = Object.freeze({
    activity_start: 5.6,
    activity_full: 7.2
  });

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function smoothstep(edge0, edge1, value) {
    if (!(edge1 > edge0)) throw new RangeError("smoothstep edge1 must be greater than edge0");
    const t = clamp((Number(value) - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function readableZoom(value) {
    const zoom = Number(value);
    if (!Number.isFinite(zoom)) return MIN_SUPPORTED_ZOOM;
    if (zoom < MIN_SUPPORTED_ZOOM) throw new RangeError(`zoom must be >= ${MIN_SUPPORTED_ZOOM}`);
    return zoom;
  }

  function lodWeights(cameraInput = {}, options = {}) {
    const zoom = readableZoom(cameraInput.zoom ?? MIN_SUPPORTED_ZOOM);
    const thresholds = Object.freeze({ ...DEFAULT_THRESHOLDS, ...(options.thresholds || {}) });
    const activities = smoothstep(thresholds.activity_start, thresholds.activity_full, zoom);
    return Object.freeze({
      labels: 1,
      rails: 1,
      activities: clamp(activities, 0, 1),
      zoom
    });
  }

  function representationStage(weights) {
    if ((weights?.activities || 0) >= 0.5) return "activity";
    return "rail";
  }

  return Object.freeze({
    MIN_SUPPORTED_ZOOM,
    DEFAULT_THRESHOLDS,
    smoothstep,
    lodWeights,
    representationStage
  });
});
