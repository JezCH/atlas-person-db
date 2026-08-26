((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_LOD = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";
  const DEFAULT_THRESHOLDS = Object.freeze({
    density_fade_start: 0.75, density_fade_end: 1.2,
    point_in_start: 0.7, point_in_full: 1.2,
    overview_label_floor: 0.78,
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
    const semanticDetail = Math.max(timeZoom, spaceZoom);
    const density = 1 - smoothstep(t.density_fade_start, t.density_fade_end, semanticDetail);
    const pointIn = smoothstep(t.point_in_start, t.point_in_full, semanticDetail);
    const pointOut = 1 - smoothstep(t.point_out_start, t.point_out_end, timeZoom);
    const semanticLabels = smoothstep(t.label_start, t.label_full, timeZoom);
    const baselineLabels = clamp(Number(t.overview_label_floor) || 0, 0, 1);
    const labels = Math.max(semanticLabels, baselineLabels);
    const rails = smoothstep(t.rail_time_start, t.rail_time_full, timeZoom) * smoothstep(t.rail_space_start, t.rail_space_full, spaceZoom);
    const activities = smoothstep(t.activity_time_start, t.activity_time_full, timeZoom) * smoothstep(t.activity_space_start, t.activity_space_full, spaceZoom);
    return Object.freeze({ density: clamp(density, 0, 1), points: clamp(pointIn * pointOut, 0, 1), labels: clamp(labels, 0, 1), semantic_labels: clamp(semanticLabels, 0, 1), rails: clamp(rails, 0, 1), activities: clamp(activities, 0, 1), time_zoom: timeZoom, space_zoom: spaceZoom, semantic_detail: semanticDetail });
  }
  function representationStage(weights) {
    if ((weights?.activities || 0) >= 0.5) return "activity";
    if ((weights?.rails || 0) >= 0.5) return "rail";
    if ((weights?.density || 0) >= 0.5) return "density";
    if ((weights?.semantic_labels || 0) >= 0.5) return "label";
    if ((weights?.points || 0) >= 0.5) return "point";
    if ((weights?.labels || 0) >= 0.5) return "label";
    if ((weights?.density || 0) > 0) return "density";
    return "point";
  }
  return Object.freeze({ DEFAULT_THRESHOLDS, smoothstep, lodWeights, representationStage });
});