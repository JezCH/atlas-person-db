((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_LOD = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";
  const DEFAULT_THRESHOLDS = Object.freeze({
    label_start: 1.15, label_full: 1.8,
    point_out_start: 2.8, point_out_end: 4.6,
    rail_time_start: 2.2, rail_time_full: 3.8,
    rail_space_start: 1, rail_space_full: 2,
    activity_time_start: 4.5, activity_time_full: 6.5,
    activity_space_start: 2, activity_space_full: 3
  });
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function smoothstep(edge0, edge1, value) {
    if (!(edge1 > edge0)) throw new RangeError("smoothstep edge1 must be greater than edge0");
    const t = clamp((Number(value) - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function lodWeights(cameraInput = {}, options = {}) {
    const timeZoom = Number.isFinite(Number(cameraInput.timeZoom)) && Number(cameraInput.timeZoom) > 0 ? Number(cameraInput.timeZoom) : 1;
    const spaceZoom = Number.isFinite(Number(cameraInput.spaceZoom)) && Number(cameraInput.spaceZoom) > 0 ? Number(cameraInput.spaceZoom) : 1;
    const t = Object.freeze({ ...DEFAULT_THRESHOLDS, ...(options.thresholds || {}) });
    const labels = smoothstep(t.label_start, t.label_full, timeZoom);
    const points = 1 - smoothstep(t.point_out_start, t.point_out_end, timeZoom);
    const rails = smoothstep(t.rail_time_start, t.rail_time_full, timeZoom) * smoothstep(t.rail_space_start, t.rail_space_full, spaceZoom);
    const activities = smoothstep(t.activity_time_start, t.activity_time_full, timeZoom) * smoothstep(t.activity_space_start, t.activity_space_full, spaceZoom);
    return Object.freeze({ density: 0, points: clamp(points, 0, 1), labels: clamp(labels, 0, 1), rails: clamp(rails, 0, 1), activities: clamp(activities, 0, 1), time_zoom: timeZoom, space_zoom: spaceZoom });
  }
  function representationStage(weights) {
    if ((weights?.activities || 0) >= 0.5) return "activity";
    if ((weights?.rails || 0) >= 0.5) return "rail";
    if ((weights?.labels || 0) >= 0.5) return "label";
    return "point";
  }
  return Object.freeze({ DEFAULT_THRESHOLDS, smoothstep, lodWeights, representationStage });
});