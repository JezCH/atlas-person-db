((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_LABEL_ENGINE = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";
  const DEFAULT_LABEL_HEIGHT = 19;
  const DEFAULT_MIN_LABEL_WIDTH = 38;
  const DEFAULT_MAX_LABEL_WIDTH = 156;
  const DEFAULT_CHAR_WIDTH = 6.8;
  const DEFAULT_HORIZONTAL_GAP = 2;
  const DEFAULT_ANCHOR_GAP = 4;
  const DEFAULT_SEARCH_STEP = 4;
  const DEFAULT_MAX_HORIZONTAL_SHIFT = 320;
  const DEFAULT_CONNECTOR_THRESHOLD = 10;
  const EPSILON = 1e-9;
  function finite(value, label) { const n = Number(value); if (!Number.isFinite(n)) throw new TypeError(`${label} must be finite`); return n; }
  function positive(value, label) { const n = finite(value, label); if (n <= 0) throw new RangeError(`${label} must be > 0`); return n; }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function estimateWidth(label, options = {}) {
    const explicit = Number(label?.width);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    const charWidth = positive(options.charWidth ?? DEFAULT_CHAR_WIDTH, "charWidth");
    const minimum = positive(options.minLabelWidth ?? DEFAULT_MIN_LABEL_WIDTH, "minLabelWidth");
    const maximum = positive(options.maxLabelWidth ?? DEFAULT_MAX_LABEL_WIDTH, "maxLabelWidth");
    if (maximum < minimum) throw new RangeError("maxLabelWidth must be >= minLabelWidth");
    return clamp(12 + [...String(label?.text ?? "")].length * charWidth, minimum, maximum);
  }
  function normalizeLabel(label, options = {}) {
    const width = estimateWidth(label, options);
    const height = Number.isFinite(Number(label?.height)) && Number(label.height) > 0 ? Number(label.height) : positive(options.labelHeight ?? DEFAULT_LABEL_HEIGHT, "labelHeight");
    return Object.freeze({ ...label, person_id: String(label?.person_id ?? label?.track_id ?? ""), track_id: String(label?.track_id ?? label?.person_id ?? ""), text: String(label?.text ?? ""), anchor_x: finite(label?.anchor_x, "label.anchor_x"), anchor_y: finite(label?.anchor_y, "label.anchor_y"), width, height, forced: Boolean(label?.forced) });
  }
  function rectFor(label, left) { const top = label.anchor_y - label.height / 2; return Object.freeze({ left, right: left + label.width, top, bottom: top + label.height, width: label.width, height: label.height }); }
  function rectanglesOverlap(a, b, gap = 0) {
    const safeGap = Math.max(0, Number(gap) || 0);
    return !(a.right + safeGap <= b.left + EPSILON || b.right + safeGap <= a.left + EPSILON || a.bottom + safeGap <= b.top + EPSILON || b.bottom + safeGap <= a.top + EPSILON);
  }
  function candidateLeftPositions(label, viewportWidth, options = {}) {
    const maxLeft = Math.max(0, viewportWidth - label.width);
    const anchorGap = Math.max(0, Number(options.anchorGap ?? DEFAULT_ANCHOR_GAP) || 0);
    const step = positive(options.searchStep ?? DEFAULT_SEARCH_STEP, "searchStep");
    const maxShift = label.forced ? viewportWidth + label.width : positive(options.maxHorizontalShift ?? DEFAULT_MAX_HORIZONTAL_SHIFT, "maxHorizontalShift");
    const preferredLeft = label.anchor_x + anchorGap;
    const preferredCenter = preferredLeft + label.width / 2;
    const values = new Set();
    const add = (left) => {
      const bounded = clamp(left, 0, maxLeft);
      const center = bounded + label.width / 2;
      if (Math.abs(center - label.anchor_x) <= maxShift + label.width / 2 + EPSILON) values.add(Number(bounded.toFixed(6)));
    };
    add(preferredLeft); add(label.anchor_x - anchorGap - label.width);
    for (let left = 0; left <= maxLeft + EPSILON; left += step) add(left);
    add(maxLeft);
    return [...values].sort((a, b) => {
      const preferredDistance = Math.abs(a + label.width / 2 - preferredCenter) - Math.abs(b + label.width / 2 - preferredCenter);
      if (Math.abs(preferredDistance) > EPSILON) return preferredDistance;
      return Math.abs(a + label.width / 2 - label.anchor_x) - Math.abs(b + label.width / 2 - label.anchor_x) || a - b;
    });
  }
  function connectorFor(label, rect, options = {}) {
    const threshold = Math.max(0, Number(options.connectorThreshold ?? DEFAULT_CONNECTOR_THRESHOLD) || 0);
    let endX = label.anchor_x;
    if (label.anchor_x < rect.left) endX = rect.left; else if (label.anchor_x > rect.right) endX = rect.right;
    const distance = Math.abs(endX - label.anchor_x);
    if (distance <= threshold + EPSILON) return null;
    return Object.freeze({ x1: label.anchor_x, y1: label.anchor_y, x2: endX, y2: label.anchor_y, length: distance });
  }
  function baseLabelOrder(a, b) {
    return a.forced !== b.forced ? (a.forced ? -1 : 1) : a.anchor_y - b.anchor_y || a.anchor_x - b.anchor_x || a.person_id.localeCompare(b.person_id);
  }
  function verticalCollisionCount(label, labels, gap) {
    const top = label.anchor_y - label.height / 2;
    const bottom = label.anchor_y + label.height / 2;
    let count = 0;
    for (const other of labels) {
      if (other === label) continue;
      const otherTop = other.anchor_y - other.height / 2;
      const otherBottom = other.anchor_y + other.height / 2;
      if (bottom + gap <= otherTop + EPSILON || otherBottom + gap <= top + EPSILON) continue;
      count += 1;
    }
    return count;
  }
  function packOrderedLabels(order, viewport, options, gap, candidateMap) {
    const placed = [], deferred = [];
    for (const label of order) {
      const preferredTop = label.anchor_y - label.height / 2;
      if (preferredTop < -EPSILON || preferredTop + label.height > viewport.height + EPSILON || label.width > viewport.width + EPSILON) {
        deferred.push(Object.freeze({ ...label, reason: "viewport_capacity" }));
        continue;
      }
      let accepted = null;
      for (const left of candidateMap.get(label) || []) {
        const rect = rectFor(label, left);
        if (placed.some((item) => rectanglesOverlap(rect, item.rect, gap))) continue;
        accepted = Object.freeze({ ...label, label_x: left, label_y: label.anchor_y, rect, horizontal_shift: left + label.width / 2 - label.anchor_x, connector: connectorFor(label, rect, options) });
        break;
      }
      if (accepted) placed.push(accepted);
      else deferred.push(Object.freeze({ ...label, reason: "collision_capacity" }));
    }
    return { placed, deferred };
  }
  function candidateQuality(result) {
    return Object.freeze({
      forced_placed: result.placed.reduce((count, item) => count + (item.forced ? 1 : 0), 0),
      placed: result.placed.length,
      total_shift: result.placed.reduce((sum, item) => sum + Math.abs(Number(item.horizontal_shift) || 0), 0)
    });
  }
  function betterPacking(current, candidate) {
    const left = candidateQuality(current);
    const right = candidateQuality(candidate);
    if (right.forced_placed !== left.forced_placed) return right.forced_placed > left.forced_placed ? candidate : current;
    if (right.placed !== left.placed) return right.placed > left.placed ? candidate : current;
    if (right.total_shift + EPSILON < left.total_shift) return candidate;
    return current;
  }
  function freezePacking(result, viewport) {
    return Object.freeze({ placed: Object.freeze(result.placed), deferred: Object.freeze(result.deferred), viewport });
  }
  function packLabels(labels, viewportInput, options = {}) {
    const viewport = Object.freeze({ width: positive(viewportInput?.width, "viewport.width"), height: positive(viewportInput?.height, "viewport.height") });
    const gap = Math.max(0, Number(options.gap ?? DEFAULT_HORIZONTAL_GAP) || 0);
    const normalized = (Array.isArray(labels) ? labels : []).map((label) => normalizeLabel(label, options));
    const candidateMap = new Map(normalized.map((label) => [label, candidateLeftPositions(label, viewport.width, options)]));
    const baselineOrder = normalized.slice().sort(baseLabelOrder);
    let best = packOrderedLabels(baselineOrder, viewport, options, gap, candidateMap);
    if (!best.deferred.length || normalized.length < 3) return freezePacking(best, viewport);

    const collisionCounts = new Map(normalized.map((label) => [label, verticalCollisionCount(label, normalized, gap)]));
    const widthFirst = normalized.slice().sort((a, b) =>
      a.forced !== b.forced ? (a.forced ? -1 : 1)
        : b.width - a.width || collisionCounts.get(b) - collisionCounts.get(a) || baseLabelOrder(a, b)
    );
    const constrainedFirst = normalized.slice().sort((a, b) =>
      a.forced !== b.forced ? (a.forced ? -1 : 1)
        : collisionCounts.get(b) - collisionCounts.get(a) || b.width - a.width || baseLabelOrder(a, b)
    );

    best = betterPacking(best, packOrderedLabels(widthFirst, viewport, options, gap, candidateMap));
    best = betterPacking(best, packOrderedLabels(constrainedFirst, viewport, options, gap, candidateMap));
    return freezePacking(best, viewport);
  }
  return Object.freeze({ DEFAULT_LABEL_HEIGHT, DEFAULT_MIN_LABEL_WIDTH, DEFAULT_MAX_LABEL_WIDTH, DEFAULT_HORIZONTAL_GAP, DEFAULT_MAX_HORIZONTAL_SHIFT, estimateWidth, normalizeLabel, rectFor, rectanglesOverlap, candidateLeftPositions, connectorFor, packLabels });
});