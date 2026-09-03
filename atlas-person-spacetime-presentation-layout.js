((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_PRESENTATION_LAYOUT = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const DEFAULT_BAND_PADDING = 2;
  const DEFAULT_RAIL_LABEL_GAP = 3;
  const DEFAULT_RAIL_CORRIDOR_RATIO = 0.22;
  const DEFAULT_RAIL_CORRIDOR_MIN_WIDTH = 12;
  const DEFAULT_RAIL_CORRIDOR_MAX_WIDTH = 30;
  const DEFAULT_MIN_LABEL_ZONE_WIDTH = 24;
  const DEFAULT_RAIL_LANE_SPACING = 4;

  function text(value) { return value == null ? "" : String(value).trim(); }
  function finite(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

  function segmentKey(segment) {
    return text(segment?.stable_id)
      || [text(segment?.activity_id), Number(segment?.segment_index) || 0, Number(segment?.start_ordinal), Number(segment?.end_ordinal)].join(":");
  }

  function presentationBand(segment, continuum) {
    if (!segment || !continuum?.bandForCode) return null;
    const subregion = text(segment.subregion_code);
    if (subregion) {
      const band = continuum.bandForCode(subregion);
      if (band?.kind === "subregion") return band;
    }
    const macroregion = text(segment.macroregion_code);
    if (macroregion) {
      const band = continuum.bandForCode(macroregion);
      if (band?.kind === "macroregion") return band;
    }
    return null;
  }

  function laneAssignments(tracks, continuum) {
    const groups = new Map();
    for (const track of Array.isArray(tracks) ? tracks : []) {
      for (const segment of Array.isArray(track?.primary_segments) ? track.primary_segments : []) {
        const band = presentationBand(segment, continuum);
        if (!band) continue;
        const key = segmentKey(segment);
        if (!key) continue;
        if (!groups.has(band.code)) groups.set(band.code, []);
        groups.get(band.code).push({
          key,
          start: Number(segment.start_ordinal),
          end: Number(segment.end_ordinal)
        });
      }
    }

    const assignment = new Map();
    const laneCounts = new Map();
    for (const [bandCode, items] of groups) {
      items.sort((a, b) => a.start - b.start || a.end - b.end || a.key.localeCompare(b.key));
      const laneEnds = [];
      for (const item of items) {
        let lane = laneEnds.findIndex((end) => end < item.start);
        if (lane < 0) lane = laneEnds.length;
        laneEnds[lane] = item.end;
        assignment.set(item.key, lane);
      }
      laneCounts.set(bandCode, Math.max(1, laneEnds.length));
    }
    return Object.freeze({ assignment, laneCounts });
  }

  function bandPixels(band, contentWidth) {
    const width = Number(contentWidth);
    if (!band || !Number.isFinite(width) || width <= 0) return null;
    const left = Number(band.min_space) * width;
    const right = Number(band.max_space) * width;
    return Object.freeze({ left, right, width: Math.max(0, right - left), center: Number(band.center_space) * width });
  }

  function corridorForBand(band, contentWidth, laneCount = 1, options = {}) {
    const pixels = bandPixels(band, contentWidth);
    if (!pixels) return null;
    const padding = Math.max(0, Number(options.bandPadding ?? DEFAULT_BAND_PADDING) || 0);
    const gap = Math.max(0, Number(options.railLabelGap ?? DEFAULT_RAIL_LABEL_GAP) || 0);
    const minLabelWidth = Math.max(12, Number(options.minLabelZoneWidth ?? DEFAULT_MIN_LABEL_ZONE_WIDTH) || DEFAULT_MIN_LABEL_ZONE_WIDTH);
    const minCorridor = Math.max(4, Number(options.minRailCorridorWidth ?? DEFAULT_RAIL_CORRIDOR_MIN_WIDTH) || DEFAULT_RAIL_CORRIDOR_MIN_WIDTH);
    const maxCorridor = Math.max(minCorridor, Number(options.maxRailCorridorWidth ?? DEFAULT_RAIL_CORRIDOR_MAX_WIDTH) || DEFAULT_RAIL_CORRIDOR_MAX_WIDTH);
    const ratio = clamp(Number(options.railCorridorRatio ?? DEFAULT_RAIL_CORRIDOR_RATIO) || DEFAULT_RAIL_CORRIDOR_RATIO, 0.05, 0.45);
    const laneSpacing = Math.max(2, Number(options.railLaneSpacing ?? DEFAULT_RAIL_LANE_SPACING) || DEFAULT_RAIL_LANE_SPACING);
    const usable = Math.max(0, pixels.width - padding * 2);
    const maximumAllowed = Math.max(4, usable - gap - Math.min(minLabelWidth, Math.max(12, usable * 0.55)));
    const laneDemand = 4 + Math.max(1, Number(laneCount) || 1) * laneSpacing;
    const desired = Math.max(minCorridor, pixels.width * ratio, Math.min(maxCorridor, laneDemand));
    const corridorWidth = Math.min(maxCorridor, maximumAllowed, desired);
    const corridorLeft = pixels.left + padding;
    const corridorRight = corridorLeft + Math.max(4, corridorWidth);
    const labelLeft = Math.min(pixels.right - padding, corridorRight + gap);
    const labelRight = Math.max(labelLeft, pixels.right - padding);
    return Object.freeze({
      band_left: pixels.left,
      band_right: pixels.right,
      band_width: pixels.width,
      corridor_left: corridorLeft,
      corridor_right: corridorRight,
      corridor_width: Math.max(4, corridorRight - corridorLeft),
      label_left: labelLeft,
      label_right: labelRight,
      label_width: Math.max(0, labelRight - labelLeft)
    });
  }

  function railXForLane(corridor, laneIndex, laneCount) {
    if (!corridor) return null;
    const count = Math.max(1, Number(laneCount) || 1);
    const lane = clamp(Number(laneIndex) || 0, 0, count - 1);
    if (count === 1) return corridor.corridor_left + corridor.corridor_width / 2;
    const inset = Math.min(2, corridor.corridor_width * 0.12);
    const span = Math.max(0, corridor.corridor_width - inset * 2);
    return corridor.corridor_left + inset + (lane / (count - 1)) * span;
  }

  function placeLabelZone(band, contentWidth, historicalX, options = {}) {
    const pixels = bandPixels(band, contentWidth);
    if (!pixels) return null;
    const padding = Math.max(0, Number(options.bandPadding ?? DEFAULT_BAND_PADDING) || 0);
    const gap = Math.max(0, Number(options.railLabelGap ?? DEFAULT_RAIL_LABEL_GAP) || 0);
    const rail = clamp(Number(historicalX), pixels.left + padding, pixels.right - padding);
    const right = { left: Math.min(pixels.right - padding, rail + gap), right: pixels.right - padding };
    right.width = Math.max(0, right.right - right.left);
    const left = { left: pixels.left + padding, right: Math.max(pixels.left + padding, rail - gap) };
    left.width = Math.max(0, left.right - left.left);
    const chosen = right.width >= left.width ? { ...right, side: "right" } : { ...left, side: "left" };
    return Object.freeze({ ...chosen, band_left: pixels.left, band_right: pixels.right, band_width: pixels.width, rail_x: rail });
  }

  function compileTrackPresentation(tracks, continuum, contentWidth, options = {}) {
    const width = Number(contentWidth);
    if (!Number.isFinite(width) || width <= 0) throw new RangeError("contentWidth must be > 0");
    const lanes = laneAssignments(tracks, continuum);
    const geometry = new Map();

    for (const track of Array.isArray(tracks) ? tracks : []) {
      for (const segment of Array.isArray(track?.primary_segments) ? track.primary_segments : []) {
        const key = segmentKey(segment);
        const band = presentationBand(segment, continuum);
        if (!key || !band || !Number.isFinite(Number(segment.x_anchor))) continue;
        const historicalX = Number(segment.x_anchor) * width;
        const lane = lanes.assignment.get(key) ?? 0;
        const laneCount = lanes.laneCounts.get(band.code) ?? 1;
        const exactPlace = text(segment.spatial_precision) === "place";

        if (exactPlace) {
          const zone = placeLabelZone(band, width, historicalX, options);
          if (!zone) continue;
          geometry.set(key, Object.freeze({
            segment_key: key,
            band_code: band.code,
            band_kind: band.kind,
            historical_x: historicalX,
            rail_x: zone.rail_x,
            rail_basis: "historical_place_anchor",
            lane_index: null,
            lane_count: null,
            label_side: zone.side,
            label_left: zone.left,
            label_right: zone.right,
            label_width: zone.width,
            band_left: zone.band_left,
            band_right: zone.band_right,
            band_width: zone.band_width
          }));
          continue;
        }

        const corridor = corridorForBand(band, width, laneCount, options);
        if (!corridor) continue;
        geometry.set(key, Object.freeze({
          segment_key: key,
          band_code: band.code,
          band_kind: band.kind,
          historical_x: historicalX,
          rail_x: railXForLane(corridor, lane, laneCount),
          rail_basis: "presentation_corridor",
          lane_index: lane,
          lane_count: laneCount,
          label_side: "right",
          label_left: corridor.label_left,
          label_right: corridor.label_right,
          label_width: corridor.label_width,
          band_left: corridor.band_left,
          band_right: corridor.band_right,
          band_width: corridor.band_width,
          corridor_left: corridor.corridor_left,
          corridor_right: corridor.corridor_right,
          corridor_width: corridor.corridor_width
        }));
      }
    }

    return Object.freeze({ content_width: width, geometry });
  }

  function geometryForSegment(layout, segment) {
    return layout?.geometry?.get?.(segmentKey(segment)) || null;
  }

  function applyTrackPresentation(item, layout) {
    if (!item) return null;
    const geometry = geometryForSegment(layout, item.representative);
    if (!geometry) return Object.freeze({ ...item, historical_x: item.x, presentation_band_code: item.macroregion_code || null });
    return Object.freeze({
      ...item,
      historical_x: item.x,
      x: geometry.rail_x,
      presentation_band_code: geometry.band_code,
      presentation_band_left: geometry.band_left,
      presentation_band_right: geometry.band_right,
      presentation_band_width: geometry.band_width,
      presentation_rail_basis: geometry.rail_basis,
      label_zone_left: geometry.label_left,
      label_zone_right: geometry.label_right,
      label_zone_width: geometry.label_width,
      label_side: geometry.label_side
    });
  }

  function activityBox(layout, segment, naturalWidth, options = {}) {
    const geometry = geometryForSegment(layout, segment);
    if (!geometry) return null;
    const maximum = Math.max(16, Number(options.maxWidth ?? 150) || 150);
    const minimum = Math.max(12, Number(options.minWidth ?? 28) || 28);
    const zoneWidth = Math.max(0, geometry.label_width);
    if (!(zoneWidth > 0)) return null;
    const wanted = Math.max(minimum, Number(naturalWidth) || minimum);
    const width = Math.min(maximum, zoneWidth, wanted);
    const left = geometry.label_side === "left"
      ? geometry.label_right - width
      : geometry.label_left;
    return Object.freeze({ left, width, side: geometry.label_side, rail_x: geometry.rail_x, band_code: geometry.band_code });
  }

  return Object.freeze({
    DEFAULT_BAND_PADDING,
    DEFAULT_RAIL_LABEL_GAP,
    DEFAULT_RAIL_CORRIDOR_RATIO,
    DEFAULT_RAIL_CORRIDOR_MIN_WIDTH,
    DEFAULT_RAIL_CORRIDOR_MAX_WIDTH,
    DEFAULT_MIN_LABEL_ZONE_WIDTH,
    DEFAULT_RAIL_LANE_SPACING,
    segmentKey,
    presentationBand,
    laneAssignments,
    bandPixels,
    corridorForBand,
    railXForLane,
    placeLabelZone,
    compileTrackPresentation,
    geometryForSegment,
    applyTrackPresentation,
    activityBox
  });
});
