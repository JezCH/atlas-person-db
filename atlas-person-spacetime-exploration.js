((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_EXPLORATION = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function representativeSegment(track) {
    const segments = Array.isArray(track?.primary_segments) ? track.primary_segments.slice() : [];
    if (!segments.length) return null;
    segments.sort((a, b) =>
      (b.end_ordinal - b.start_ordinal) - (a.end_ordinal - a.start_ordinal)
      || a.start_ordinal - b.start_ordinal
      || String(a.stable_id || a.activity_id || "").localeCompare(String(b.stable_id || b.activity_id || ""))
    );
    return segments[0];
  }

  function projectTrack(track, projection, contentWidth) {
    if (!track || !projection?.yForOrdinal) return null;
    const width = Number(contentWidth);
    if (!Number.isFinite(width) || width <= 0) return null;
    const segment = representativeSegment(track);
    if (!segment || !Number.isFinite(segment.x_anchor) || !Number.isFinite(segment.start_ordinal) || !Number.isFinite(segment.end_ordinal)) return null;
    const yStart = Number(projection.yForOrdinal(segment.start_ordinal));
    const yEnd = Number(projection.yForOrdinal(segment.end_ordinal));
    if (!Number.isFinite(yStart) || !Number.isFinite(yEnd)) return null;
    const centerOrdinal = (Number(segment.start_ordinal) + Number(segment.end_ordinal)) / 2;
    return Object.freeze({
      person_id: track.person_id,
      track_id: track.track_id,
      display_name: track.display_name,
      track,
      representative: segment,
      x: segment.x_anchor * width,
      y: (yStart + yEnd) / 2,
      center_ordinal: centerOrdinal,
      macroregion_code: segment.macroregion_code || null
    });
  }

  function orderItems(items) {
    return Object.freeze((items || []).slice().sort((a, b) =>
      Number(a?.y) - Number(b?.y)
      || Number(a?.x) - Number(b?.x)
      || String(a?.display_name || "").localeCompare(String(b?.display_name || ""), "ko")
      || String(a?.person_id || "").localeCompare(String(b?.person_id || ""))
    ));
  }

  function adjacentPersonId(items, currentPersonId, direction = 1) {
    const ordered = orderItems(items);
    if (!ordered.length) return null;
    const delta = Number(direction) < 0 ? -1 : 1;
    const currentIndex = ordered.findIndex((item) => item.person_id === currentPersonId);
    if (currentIndex < 0) return ordered[delta < 0 ? ordered.length - 1 : 0].person_id;
    const nextIndex = (currentIndex + delta + ordered.length) % ordered.length;
    return ordered[nextIndex].person_id;
  }

  function rankSearchItems(items, needle) {
    const query = String(needle || "").trim().toLocaleLowerCase("ko");
    if (!query) return Object.freeze([]);
    return Object.freeze((items || []).slice().sort((a, b) => {
      const aName = String(a?.display_name || "").toLocaleLowerCase("ko");
      const bName = String(b?.display_name || "").toLocaleLowerCase("ko");
      const score = (name) => name === query ? 0 : name.startsWith(query) ? 1 : name.includes(query) ? 2 : 3;
      return score(aName) - score(bName)
        || Number(a?.y) - Number(b?.y)
        || Number(a?.x) - Number(b?.x)
        || aName.localeCompare(bName, "ko");
    }));
  }

  function focusScrollTarget(item, viewportInput = {}, extentInput = {}, options = {}) {
    if (!item || !Number.isFinite(Number(item.x)) || !Number.isFinite(Number(item.y))) return null;
    const viewportWidth = Math.max(1, Number(viewportInput.width) || 1);
    const viewportHeight = Math.max(1, Number(viewportInput.height) || 1);
    const leftInset = Math.max(0, Number(options.leftInset) || 0);
    const topInset = Math.max(0, Number(options.topInset) || 0);
    const usableWidth = Math.max(1, viewportWidth - leftInset);
    const usableHeight = Math.max(1, viewportHeight - topInset);
    const maxLeft = Math.max(0, Number(extentInput.scrollWidth || 0) - viewportWidth);
    const maxTop = Math.max(0, Number(extentInput.scrollHeight || 0) - viewportHeight);
    return Object.freeze({
      left: clamp(Number(item.x) - usableWidth / 2, 0, maxLeft),
      top: clamp(Number(item.y) - usableHeight / 2, 0, maxTop)
    });
  }

  function panTarget(currentInput = {}, viewportInput = {}, extentInput = {}, direction, fraction = 0.22) {
    const viewportWidth = Math.max(1, Number(viewportInput.width) || 1);
    const viewportHeight = Math.max(1, Number(viewportInput.height) || 1);
    const maxLeft = Math.max(0, Number(extentInput.scrollWidth || 0) - viewportWidth);
    const maxTop = Math.max(0, Number(extentInput.scrollHeight || 0) - viewportHeight);
    const stepX = viewportWidth * Math.max(0.05, Number(fraction) || 0.22);
    const stepY = viewportHeight * Math.max(0.05, Number(fraction) || 0.22);
    let left = Number(currentInput.left) || 0;
    let top = Number(currentInput.top) || 0;
    if (direction === "left") left -= stepX;
    else if (direction === "right") left += stepX;
    else if (direction === "up") top -= stepY;
    else if (direction === "down") top += stepY;
    else throw new RangeError(`unknown pan direction: ${direction}`);
    return Object.freeze({ left: clamp(left, 0, maxLeft), top: clamp(top, 0, maxTop) });
  }

  function keyboardCommand(eventLike = {}) {
    if (eventLike.altKey || eventLike.ctrlKey || eventLike.metaKey) return null;
    const key = String(eventLike.key || "");
    if (eventLike.shiftKey && key === "ArrowUp") return "previous-person";
    if (eventLike.shiftKey && key === "ArrowDown") return "next-person";
    if (key === "ArrowLeft") return "pan-left";
    if (key === "ArrowRight") return "pan-right";
    if (key === "ArrowUp") return "pan-up";
    if (key === "ArrowDown") return "pan-down";
    if (key === "PageUp") return "page-up";
    if (key === "PageDown") return "page-down";
    if (key === "f" || key === "F") return "focus-selected";
    if (key === "+" || key === "=") return "zoom-in";
    if (key === "-" || key === "_") return "zoom-out";
    if (key === "Escape") return "clear-selection";
    return null;
  }

  return Object.freeze({
    representativeSegment,
    projectTrack,
    orderItems,
    adjacentPersonId,
    rankSearchItems,
    focusScrollTarget,
    panTarget,
    keyboardCommand
  });
});