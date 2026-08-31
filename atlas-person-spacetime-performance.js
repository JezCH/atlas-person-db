((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_PERFORMANCE = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const DEFAULT_OVERSCAN = Object.freeze({ x: 0.45, y: 0.85 });

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function positive(value, fallback = 1) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function normalizeRect(rect = {}) {
    const left = Number.isFinite(Number(rect.left)) ? Number(rect.left) : 0;
    const top = Number.isFinite(Number(rect.top)) ? Number(rect.top) : 0;
    const width = positive(rect.width);
    const height = positive(rect.height);
    return Object.freeze({ left, top, width, height, right: left + width, bottom: top + height });
  }

  function viewportWorldRect(scrollInput = {}, viewportInput = {}, worldInput = {}, insetInput = {}, overscanInput = DEFAULT_OVERSCAN) {
    const worldWidth = positive(worldInput.width);
    const worldHeight = positive(worldInput.height);
    const viewportWidth = positive(viewportInput.width);
    const viewportHeight = positive(viewportInput.height);
    const leftInset = Math.max(0, Number(insetInput.left) || 0);
    const topInset = Math.max(0, Number(insetInput.top) || 0);
    const visibleWidth = Math.min(worldWidth, Math.max(1, viewportWidth - leftInset));
    const visibleHeight = Math.min(worldHeight, Math.max(1, viewportHeight - topInset));
    const visibleLeft = clamp(Number(scrollInput.left) || 0, 0, Math.max(0, worldWidth - visibleWidth));
    const visibleTop = clamp(Number(scrollInput.top) || 0, 0, Math.max(0, worldHeight - visibleHeight));
    const overscanX = visibleWidth * Math.max(0, Number(overscanInput.x) || 0);
    const overscanY = visibleHeight * Math.max(0, Number(overscanInput.y) || 0);
    const left = Math.max(0, visibleLeft - overscanX);
    const top = Math.max(0, visibleTop - overscanY);
    const right = Math.min(worldWidth, visibleLeft + visibleWidth + overscanX);
    const bottom = Math.min(worldHeight, visibleTop + visibleHeight + overscanY);
    return Object.freeze({
      left,
      top,
      right,
      bottom,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
      visible_left: visibleLeft,
      visible_top: visibleTop,
      visible_width: visibleWidth,
      visible_height: visibleHeight
    });
  }

  function pointInside(item, rectInput, padding = 0) {
    if (!item || !Number.isFinite(Number(item.x)) || !Number.isFinite(Number(item.y))) return false;
    const rect = normalizeRect(rectInput);
    const pad = Math.max(0, Number(padding) || 0);
    const x = Number(item.x);
    const y = Number(item.y);
    return x >= rect.left - pad && x <= rect.right + pad && y >= rect.top - pad && y <= rect.bottom + pad;
  }

  function rectIntersects(aInput, bInput) {
    const a = normalizeRect(aInput);
    const b = normalizeRect(bInput);
    return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
  }

  function cullProjectedItems(items, rectInput, forcedIdsInput = []) {
    const forcedIds = forcedIdsInput instanceof Set ? forcedIdsInput : new Set(forcedIdsInput || []);
    return Object.freeze((items || []).filter((item) => forcedIds.has(item?.person_id) || forcedIds.has(item?.track?.person_id) || pointInside(item, rectInput, 24)));
  }

  function segmentRect(segment, projection, contentWidth) {
    if (!segment || !projection?.yForOrdinal || !Number.isFinite(Number(segment.x_anchor))) return null;
    const y1 = projection.yForOrdinal(segment.start_ordinal);
    const y2 = projection.yForOrdinal(segment.end_ordinal);
    if (!Number.isFinite(y1) || !Number.isFinite(y2)) return null;
    const x = Number(segment.x_anchor) * positive(contentWidth);
    const top = Math.min(y1, y2);
    const bottom = Math.max(y1, y2);
    return Object.freeze({ left: x - 12, right: x + 180, top: top - 12, bottom: bottom + 12, width: 192, height: Math.max(24, bottom - top + 24) });
  }

  function cullTrackSegments(tracks, projection, contentWidth, rectInput, forcedIdsInput = []) {
    const forcedIds = forcedIdsInput instanceof Set ? forcedIdsInput : new Set(forcedIdsInput || []);
    const result = [];
    for (const track of tracks || []) {
      const force = forcedIds.has(track?.person_id) || forcedIds.has(track?.track_id);
      const segments = (track?.primary_segments || []).filter((segment) => {
        if (force) return true;
        const bounds = segmentRect(segment, projection, contentWidth);
        return bounds ? rectIntersects(bounds, rectInput) : false;
      });
      if (!segments.length) continue;
      result.push(Object.freeze({ ...track, primary_segments: Object.freeze(segments.slice()) }));
    }
    return Object.freeze(result);
  }

  return Object.freeze({
    DEFAULT_OVERSCAN,
    clamp,
    viewportWorldRect,
    pointInside,
    rectIntersects,
    cullProjectedItems,
    segmentRect,
    cullTrackSegments
  });
});