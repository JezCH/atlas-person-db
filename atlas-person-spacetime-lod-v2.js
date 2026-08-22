((root, factory) => {
  "use strict";
  const cameraApi = typeof module === "object" && module.exports
    ? require("./atlas-person-spacetime-camera-v2.js")
    : root?.ATLAS_PERSON_SPACETIME_CAMERA_V2;
  const timeApi = typeof module === "object" && module.exports
    ? require("./atlas-person-spacetime-time-scale-v2.js")
    : root?.ATLAS_PERSON_SPACETIME_TIME_SCALE_V2;
  const api = factory(cameraApi, timeApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_LOD_V2 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, (cameraApi, timeApi) => {
  "use strict";

  if (!cameraApi) throw new Error("ATLAS_PERSON_SPACETIME_CAMERA_V2 is required");
  if (!timeApi) throw new Error("ATLAS_PERSON_SPACETIME_TIME_SCALE_V2 is required");

  const DEFAULT_THRESHOLDS = Object.freeze({
    density_fade_start: 1.2,
    density_fade_end: 2.2,
    point_fade_start: 1.2,
    point_fade_full: 2.2,
    point_fade_out_start: 6,
    point_fade_out_end: 10,
    label_fade_start: 3,
    label_fade_full: 5,
    rail_time_start: 6,
    rail_time_full: 10,
    rail_space_start: 3,
    rail_space_full: 5,
    activity_time_start: 20,
    activity_time_full: 32,
    activity_space_start: 8,
    activity_space_full: 12
  });
  const EPSILON = 1e-9;

  function finite(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new TypeError(`${label} must be finite`);
    return number;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function smoothstep(edge0, edge1, value) {
    if (!(edge1 > edge0)) throw new RangeError("smoothstep edge1 must be greater than edge0");
    const t = clamp((finite(value, "value") - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function thresholds(options = {}) {
    return Object.freeze({ ...DEFAULT_THRESHOLDS, ...(options.thresholds || {}) });
  }

  function lodWeights(cameraInput, options = {}) {
    const camera = cameraApi.createCamera(timeApi.TIME_WORLD_BOUNDS, { ...options, ...(cameraInput || {}) });
    const t = thresholds(options);
    const joint = Math.min(camera.zoomTime, camera.zoomSpace);
    const density = 1 - smoothstep(t.density_fade_start, t.density_fade_end, joint);
    const pointIn = smoothstep(t.point_fade_start, t.point_fade_full, joint);
    const pointOut = 1 - smoothstep(t.point_fade_out_start, t.point_fade_out_end, joint);
    const labels = smoothstep(t.label_fade_start, t.label_fade_full, joint);
    const rails = smoothstep(t.rail_time_start, t.rail_time_full, camera.zoomTime)
      * smoothstep(t.rail_space_start, t.rail_space_full, camera.zoomSpace);
    const activities = smoothstep(t.activity_time_start, t.activity_time_full, camera.zoomTime)
      * smoothstep(t.activity_space_start, t.activity_space_full, camera.zoomSpace);
    return Object.freeze({
      density: clamp(density, 0, 1),
      points: clamp(pointIn * pointOut, 0, 1),
      labels: clamp(labels, 0, 1),
      rails: clamp(rails, 0, 1),
      activities: clamp(activities, 0, 1),
      time_zoom: camera.zoomTime,
      space_zoom: camera.zoomSpace,
      joint_zoom: joint
    });
  }

  function spaceX(space, camera, viewport) {
    return cameraApi.project({ time: camera.centerTime, space }, camera, timeApi.TIME_WORLD_BOUNDS, viewport).x;
  }

  function projectSegment(segment, timeProjection, camera, viewport) {
    const xAnchor = Number(segment?.x_anchor);
    const xMin = Number(segment?.x_min);
    const xMax = Number(segment?.x_max);
    const startOrdinal = Number(segment?.start_ordinal);
    const endOrdinal = Number(segment?.end_ordinal);
    if (![xAnchor, xMin, xMax, startOrdinal, endOrdinal].every(Number.isFinite)) return null;
    const yStart = timeProjection.yForOrdinal(startOrdinal);
    const yEnd = timeProjection.yForOrdinal(endOrdinal);
    const top = Math.min(yStart, yEnd);
    const bottom = Math.max(yStart, yEnd);
    const screenX = spaceX(xAnchor, camera, viewport);
    const screenXMin = spaceX(xMin, camera, viewport);
    const screenXMax = spaceX(xMax, camera, viewport);
    const visible = bottom >= -EPSILON && top <= viewport.height + EPSILON
      && Math.max(screenXMin, screenXMax) >= -EPSILON
      && Math.min(screenXMin, screenXMax) <= viewport.width + EPSILON;
    return Object.freeze({
      segment,
      stable_id: segment.stable_id,
      activity_id: segment.activity_id,
      screen_x: screenX,
      screen_x_min: Math.min(screenXMin, screenXMax),
      screen_x_max: Math.max(screenXMin, screenXMax),
      screen_y_start: yStart,
      screen_y_end: yEnd,
      screen_top: top,
      screen_bottom: bottom,
      screen_mid_y: (yStart + yEnd) / 2,
      visible
    });
  }

  function representativeProjectedSegment(projectedSegments, viewport) {
    const visible = projectedSegments.filter((item) => item?.visible);
    if (!visible.length) return null;
    const centerY = viewport.height / 2;
    return visible.slice().sort((left, right) => {
      const distance = Math.abs(left.screen_mid_y - centerY) - Math.abs(right.screen_mid_y - centerY);
      return distance || String(left.stable_id).localeCompare(String(right.stable_id));
    })[0];
  }

  function normalizePinnedIds(value) {
    if (value instanceof Set) return value;
    if (Array.isArray(value)) return new Set(value.map(String));
    return new Set();
  }

  function buildRenderPlan(partitionedTracks, semanticTimeScale, cameraInput, viewportInput, options = {}) {
    const viewport = cameraApi.normalizeViewport(viewportInput);
    const camera = cameraApi.createCamera(timeApi.TIME_WORLD_BOUNDS, { ...options, ...(cameraInput || {}) });
    const timeProjection = timeApi.createTimeProjection(semanticTimeScale, camera, viewport, options);
    const weights = lodWeights(camera, options);
    const pinned = normalizePinnedIds(options.pinnedPersonIds);
    const tracks = Array.isArray(partitionedTracks?.tracks) ? partitionedTracks.tracks : [];
    const densitySources = [];
    const points = [];
    const labels = [];
    const rails = [];
    const activityGlyphs = [];

    for (const track of tracks) {
      const projectedSegments = (Array.isArray(track?.primary_segments) ? track.primary_segments : [])
        .map((segment) => projectSegment(segment, timeProjection, camera, viewport))
        .filter(Boolean);
      const visibleSegments = projectedSegments.filter((item) => item.visible);
      if (!visibleSegments.length) continue;
      const representative = representativeProjectedSegment(projectedSegments, viewport);
      if (!representative) continue;
      const personId = String(track.person_id || track.track_id || "");
      const forcedLabel = pinned.has(personId);

      densitySources.push(Object.freeze({
        person_id: personId,
        track_id: track.track_id,
        x: representative.screen_x,
        y: representative.screen_mid_y,
        opacity: weights.density
      }));

      points.push(Object.freeze({
        person_id: personId,
        track_id: track.track_id,
        x: representative.screen_x,
        y: representative.screen_mid_y,
        opacity: weights.points,
        source_segment_id: representative.stable_id
      }));

      if (weights.labels > EPSILON || forcedLabel) {
        labels.push(Object.freeze({
          person_id: personId,
          track_id: track.track_id,
          text: track.display_name,
          anchor_x: representative.screen_x,
          anchor_y: representative.screen_mid_y,
          opacity: forcedLabel ? 1 : weights.labels,
          forced: forcedLabel,
          source_segment_id: representative.stable_id
        }));
      }

      if (weights.rails > EPSILON || weights.activities > EPSILON) {
        for (const projected of visibleSegments) {
          rails.push(Object.freeze({
            person_id: personId,
            track_id: track.track_id,
            segment_id: projected.stable_id,
            activity_id: projected.activity_id,
            x: projected.screen_x,
            y_start: projected.screen_y_start,
            y_end: projected.screen_y_end,
            x_min: projected.screen_x_min,
            x_max: projected.screen_x_max,
            opacity: weights.rails,
            relation_code: projected.segment.relation_code,
            spatial_precision: projected.segment.spatial_precision
          }));
          activityGlyphs.push(Object.freeze({
            person_id: personId,
            track_id: track.track_id,
            segment_id: projected.stable_id,
            activity_id: projected.activity_id,
            x: projected.screen_x,
            y_start: projected.screen_y_start,
            y_end: projected.screen_y_end,
            opacity: weights.activities,
            relation_code: projected.segment.relation_code,
            role_code: projected.segment.role_code,
            role_label: projected.segment.role_label,
            polity_id: projected.segment.polity_id,
            spatial_precision: projected.segment.spatial_precision
          }));
        }
      }
    }

    return Object.freeze({
      camera,
      viewport,
      weights,
      density_sources: Object.freeze(densitySources),
      points: Object.freeze(points),
      labels: Object.freeze(labels),
      rails: Object.freeze(rails),
      activity_glyphs: Object.freeze(activityGlyphs),
      primary_unresolved: Object.freeze(Array.isArray(partitionedTracks?.primary_unresolved) ? partitionedTracks.primary_unresolved.slice() : []),
      relation_review: Object.freeze(Array.isArray(partitionedTracks?.relation_review) ? partitionedTracks.relation_review.slice() : [])
    });
  }

  return Object.freeze({
    DEFAULT_THRESHOLDS,
    smoothstep,
    lodWeights,
    projectSegment,
    representativeProjectedSegment,
    buildRenderPlan
  });
});