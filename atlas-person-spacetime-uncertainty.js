((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_UNCERTAINTY = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  function number(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function clamp01(value) {
    return Math.min(1, Math.max(0, Number(value) || 0));
  }

  function uniquePlaceAnchors(segment) {
    const seen = new Set();
    const rows = [];
    for (const point of Array.isArray(segment?.display_place_points) ? segment.display_place_points : []) {
      const anchor = number(point?.x_anchor);
      if (anchor == null) continue;
      const key = `${point?.place_id || ""}\u0000${anchor}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(Object.freeze({
        place_id: point?.place_id || null,
        place_name: point?.place_name || null,
        x_anchor: clamp01(anchor)
      }));
    }
    rows.sort((a,b)=>a.x_anchor-b.x_anchor || String(a.place_name||"").localeCompare(String(b.place_name||"")));
    return Object.freeze(rows);
  }

  function kind(segment) {
    const anchors = uniquePlaceAnchors(segment);
    if (anchors.length > 1) return "multi-place";
    const precision = String(segment?.spatial_precision || "unresolved");
    const xMin = number(segment?.x_min);
    const xMax = number(segment?.x_max);
    const xAnchor = number(segment?.x_anchor);
    if (precision === "unresolved" || (xMin == null && xMax == null && xAnchor == null)) return "unresolved";
    if (precision === "place") return "point";
    if ((precision === "subregion" || precision === "macroregion") && xMin != null && xMax != null && xMax > xMin) return "range";
    return xAnchor == null ? "unresolved" : "point";
  }

  function geometry(segment, contentWidth) {
    const width = Math.max(1, Number(contentWidth) || 1);
    const type = kind(segment);
    const xAnchor = number(segment?.x_anchor);
    const xMin = number(segment?.x_min);
    const xMax = number(segment?.x_max);
    const placeAnchors = uniquePlaceAnchors(segment).map((row)=>Object.freeze({
      ...row,
      x: row.x_anchor * width
    }));

    if (type === "range") {
      const left = clamp01(Math.min(xMin, xMax)) * width;
      const right = clamp01(Math.max(xMin, xMax)) * width;
      return Object.freeze({
        kind:type,
        precision:String(segment?.spatial_precision || "unresolved"),
        left,
        right,
        width:Math.max(1,right-left),
        anchor_x:xAnchor == null ? null : clamp01(xAnchor)*width,
        place_anchors:Object.freeze(placeAnchors)
      });
    }

    if (type === "multi-place") {
      const xs = placeAnchors.map((row)=>row.x);
      const left = Math.min(...xs);
      const right = Math.max(...xs);
      return Object.freeze({
        kind:type,
        precision:"place",
        left,
        right,
        width:Math.max(1,right-left),
        anchor_x:xAnchor == null ? null : clamp01(xAnchor)*width,
        place_anchors:Object.freeze(placeAnchors)
      });
    }

    return Object.freeze({
      kind:type,
      precision:String(segment?.spatial_precision || "unresolved"),
      left:xAnchor == null ? null : clamp01(xAnchor)*width,
      right:xAnchor == null ? null : clamp01(xAnchor)*width,
      width:0,
      anchor_x:xAnchor == null ? null : clamp01(xAnchor)*width,
      place_anchors:Object.freeze(placeAnchors)
    });
  }

  function visible(segment, activityOpacity, selected=false) {
    const type = kind(segment);
    if (type !== "range" && type !== "multi-place") return false;
    return Boolean(selected) || Number(activityOpacity) >= 0.12;
  }

  function precisionClass(segment) {
    const type = kind(segment);
    if (type === "multi-place") return "is-multi-place";
    const precision = String(segment?.spatial_precision || "unresolved");
    if (precision === "macroregion") return "is-macroregion";
    if (precision === "subregion") return "is-subregion";
    if (precision === "place") return "is-place";
    return "is-unresolved";
  }

  return Object.freeze({ uniquePlaceAnchors, kind, geometry, visible, precisionClass });
});
