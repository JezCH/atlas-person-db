((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_LABEL_ENGINE_V2 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const DEFAULT_LABEL_HEIGHT = 22;
  const DEFAULT_MIN_LABEL_WIDTH = 42;
  const DEFAULT_MAX_LABEL_WIDTH = 180;
  const DEFAULT_CHAR_WIDTH = 7.2;
  const DEFAULT_HORIZONTAL_GAP = 6;
  const DEFAULT_ANCHOR_GAP = 5;
  const DEFAULT_SEARCH_STEP = 6;
  const DEFAULT_MAX_HORIZONTAL_SHIFT = 320;
  const DEFAULT_CONNECTOR_THRESHOLD = 10;
  const EPSILON = 1e-9;

  function finite(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new TypeError(`${label} must be finite`);
    return number;
  }

  function positive(value, label) {
    const number = finite(value, label);
    if (number <= 0) throw new RangeError(`${label} must be > 0`);
    return number;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function estimateWidth(label, options = {}) {
    const explicit = Number(label?.width);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    const text = String(label?.text ?? "");
    const charWidth = positive(options.charWidth ?? DEFAULT_CHAR_WIDTH, "charWidth");
    const minimum = positive(options.minLabelWidth ?? DEFAULT_MIN_LABEL_WIDTH, "minLabelWidth");
    const maximum = positive(options.maxLabelWidth ?? DEFAULT_MAX_LABEL_WIDTH, "maxLabelWidth");
    if (maximum < minimum) throw new RangeError("maxLabelWidth must be >= minLabelWidth");
    return clamp(12 + [...text].length * charWidth, minimum, maximum);
  }

  function normalizeLabel(label, options = {}) {
    const width = estimateWidth(label, options);
    const height = Number.isFinite(Number(label?.height)) && Number(label.height) > 0
      ? Number(label.height)
      : positive(options.labelHeight ?? DEFAULT_LABEL_HEIGHT, "labelHeight");
    const anchorX = finite(label?.anchor_x, "label.anchor_x");
    const anchorY = finite(label?.anchor_y, "label.anchor_y");
    return Object.freeze({
      ...label,
      person_id: String(label?.person_id ?? label?.track_id ?? ""),
      track_id: String(label?.track_id ?? label?.person_id ?? ""),
      text: String(label?.text ?? ""),
      anchor_x: anchorX,
      anchor_y: anchorY,
      width,
      height,
      forced: Boolean(label?.forced)
    });
  }

  function rectFor(label, left) {
    const top = label.anchor_y - label.height / 2;
    return Object.freeze({
      left,
      right: left + label.width,
      top,
      bottom: top + label.height,
      width: label.width,
      height: label.height
    });
  }

  function rectanglesOverlap(a, b, gap = 0) {
    const safeGap = Math.max(0, Number(gap) || 0);
    return !(
      a.right + safeGap <= b.left + EPSILON
      || b.right + safeGap <= a.left + EPSILON
      || a.bottom + safeGap <= b.top + EPSILON
      || b.bottom + safeGap <= a.top + EPSILON
    );
  }

  function candidateLeftPositions(label, viewportWidth, options = {}) {
    const width = label.width;
    const maxLeft = Math.max(0, viewportWidth - width);
    const anchorGap = Math.max(0, Number(options.anchorGap ?? DEFAULT_ANCHOR_GAP) || 0);
    const step = positive(options.searchStep ?? DEFAULT_SEARCH_STEP, "searchStep");
    const maxShift = label.forced
      ? viewportWidth + width
      : positive(options.maxHorizontalShift ?? DEFAULT_MAX_HORIZONTAL_SHIFT, "maxHorizontalShift");
    const preferredLeft = label.anchor_x + anchorGap;
    const preferredCenter = preferredLeft + width / 2;
    const leftSide = label.anchor_x - anchorGap - width;
    const values = new Set();

    function add(left) {
      const bounded = clamp(left, 0, maxLeft);
      const center = bounded + width / 2;
      if (Math.abs(center - label.anchor_x) <= maxShift + width / 2 + EPSILON) values.add(Number(bounded.toFixed(6)));
    }

    add(preferredLeft);
    add(leftSide);
    for (let left = 0; left <= maxLeft + EPSILON; left += step) add(left);
    add(maxLeft);

    return [...values].sort((a, b) => {
      const aCenter = a + width / 2;
      const bCenter = b + width / 2;
      const preferredDistance = Math.abs(aCenter - preferredCenter) - Math.abs(bCenter - preferredCenter);
      if (Math.abs(preferredDistance) > EPSILON) return preferredDistance;
      const anchorDistance = Math.abs(aCenter - label.anchor_x) - Math.abs(bCenter - label.anchor_x);
      if (Math.abs(anchorDistance) > EPSILON) return anchorDistance;
      return a - b;
    });
  }

  function connectorFor(label, rect, options = {}) {
    const threshold = Math.max(0, Number(options.connectorThreshold ?? DEFAULT_CONNECTOR_THRESHOLD) || 0);
    let endX = label.anchor_x;
    if (label.anchor_x < rect.left) endX = rect.left;
    else if (label.anchor_x > rect.right) endX = rect.right;
    const distance = Math.abs(endX - label.anchor_x);
    if (distance <= threshold + EPSILON) return null;
    return Object.freeze({
      x1: label.anchor_x,
      y1: label.anchor_y,
      x2: endX,
      y2: label.anchor_y,
      length: distance
    });
  }

  function packLabels(labels, viewportInput, options = {}) {
    const viewport = Object.freeze({
      width: positive(viewportInput?.width, "viewport.width"),
      height: positive(viewportInput?.height, "viewport.height")
    });
    const gap = Math.max(0, Number(options.gap ?? DEFAULT_HORIZONTAL_GAP) || 0);
    const normalized = (Array.isArray(labels) ? labels : []).map((label) => normalizeLabel(label, options));
    normalized.sort((left, right) => {
      if (left.forced !== right.forced) return left.forced ? -1 : 1;
      return left.anchor_y - right.anchor_y
        || left.anchor_x - right.anchor_x
        || left.person_id.localeCompare(right.person_id)
        || left.track_id.localeCompare(right.track_id);
    });

    const placed = [];
    const deferred = [];
    for (const label of normalized) {
      const preferredTop = label.anchor_y - label.height / 2;
      if (preferredTop < -EPSILON || preferredTop + label.height > viewport.height + EPSILON || label.width > viewport.width + EPSILON) {
        deferred.push(Object.freeze({ ...label, reason: "viewport_capacity" }));
        continue;
      }

      let accepted = null;
      for (const left of candidateLeftPositions(label, viewport.width, options)) {
        const rect = rectFor(label, left);
        if (placed.some((item) => rectanglesOverlap(rect, item.rect, gap))) continue;
        accepted = Object.freeze({
          ...label,
          label_x: left,
          label_y: label.anchor_y,
          rect,
          horizontal_shift: (left + label.width / 2) - label.anchor_x,
          connector: connectorFor(label, rect, options)
        });
        break;
      }

      if (accepted) placed.push(accepted);
      else deferred.push(Object.freeze({ ...label, reason: "collision_capacity" }));
    }

    return Object.freeze({
      placed: Object.freeze(placed),
      deferred: Object.freeze(deferred),
      viewport
    });
  }

  return Object.freeze({
    DEFAULT_LABEL_HEIGHT,
    DEFAULT_MIN_LABEL_WIDTH,
    DEFAULT_MAX_LABEL_WIDTH,
    DEFAULT_HORIZONTAL_GAP,
    DEFAULT_MAX_HORIZONTAL_SHIFT,
    estimateWidth,
    normalizeLabel,
    rectFor,
    rectanglesOverlap,
    candidateLeftPositions,
    connectorFor,
    packLabels
  });
});