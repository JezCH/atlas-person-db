((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_LABEL_OVERLAP_GUARD = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const DEFAULT_GAP = 2;
  const DEFAULT_STEP = 4;
  const DEFAULT_MAX_SHIFT = 320;
  const EPSILON = 0.5;

  function finite(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function cssNumber(value, fallback = 0) {
    const number = Number.parseFloat(String(value ?? ""));
    return Number.isFinite(number) ? number : fallback;
  }

  function overlap(a, b, gap = DEFAULT_GAP) {
    const safeGap = Math.max(0, finite(gap));
    return !(
      a.left + a.width + safeGap <= b.left + EPSILON ||
      b.left + b.width + safeGap <= a.left + EPSILON ||
      a.top + a.height + safeGap <= b.top + EPSILON ||
      b.top + b.height + safeGap <= a.top + EPSILON
    );
  }

  function candidateLefts(row, band, options = {}) {
    const step = Math.max(1, finite(options.step, DEFAULT_STEP));
    const maxShift = Math.max(0, finite(options.maxShift, DEFAULT_MAX_SHIFT));
    const minLeft = finite(band?.left, 0);
    const bandWidth = Math.max(0, finite(band?.width, options.canvasWidth || 0));
    if (row.width > bandWidth + EPSILON) return [];
    const maxLeft = minLeft + bandWidth - row.width;
    const original = Math.min(maxLeft, Math.max(minLeft, row.left));
    const values = [original];
    for (let distance = step; distance <= maxShift + EPSILON; distance += step) {
      values.push(Math.min(maxLeft, Math.max(minLeft, original + distance)));
      values.push(Math.min(maxLeft, Math.max(minLeft, original - distance)));
    }
    return [...new Set(values.map((value) => Number(value.toFixed(6))))];
  }

  function resolvePositions(rowsInput, bandsInput = {}, options = {}) {
    const rows = (Array.isArray(rowsInput) ? rowsInput : []).map((row, index) => {
      const originalLeft = finite(row?.left);
      return {
        ...row,
        id: String(row?.id ?? index),
        left: originalLeft,
        original_left: originalLeft,
        top: finite(row?.top),
        width: Math.max(0, finite(row?.width)),
        height: Math.max(0, finite(row?.height)),
        priority: finite(row?.priority, 2)
      };
    });
    rows.sort((a, b) => a.priority - b.priority || a.top - b.top || a.left - b.left || a.id.localeCompare(b.id));

    const placed = [];
    const unresolved = [];
    for (const row of rows) {
      const band = bandsInput?.[row.band_code] || { left: 0, width: Math.max(row.left + row.width, finite(options.canvasWidth)) };
      let accepted = null;
      for (const left of candidateLefts(row, band, options)) {
        const candidate = { ...row, left };
        if (placed.some((other) => overlap(candidate, other, options.gap))) continue;
        accepted = candidate;
        break;
      }
      if (!accepted) {
        accepted = { ...row };
        unresolved.push(row.id);
      }
      placed.push(accepted);
    }

    const positions = Object.freeze(Object.fromEntries(placed.map((row) => [row.id, Object.freeze({
      left: row.left,
      top: row.top,
      shifted: Math.abs(row.left - row.original_left) > EPSILON
    })])));
    return Object.freeze({ positions, unresolved: Object.freeze(unresolved) });
  }

  function collectBands(documentObject) {
    const map = {};
    for (const element of documentObject.querySelectorAll(".spacetime-region-head-band[data-spacetime-band]")) {
      const code = String(element.dataset.spacetimeBand || "").trim();
      const left = cssNumber(element.style.left, NaN);
      const width = cssNumber(element.style.width, NaN);
      if (!code || !Number.isFinite(left) || !(width > 0)) continue;
      if (!map[code] || width < map[code].width) map[code] = { left, width };
    }
    return map;
  }

  function updateConnector(element, originalLeft, nextLeft) {
    const connector = element?.previousElementSibling;
    if (!connector?.classList?.contains("spacetime-label-connector")) return;
    const width = cssNumber(element.style.width, element.offsetWidth || 0);
    const connectorLeft = cssNumber(connector.style.left, NaN);
    const connectorWidth = cssNumber(connector.style.width, NaN);
    if (!Number.isFinite(connectorLeft) || !(connectorWidth >= 0)) return;
    const connectorRight = connectorLeft + connectorWidth;
    const originalRight = originalLeft + width;
    const nextRight = nextLeft + width;
    if (connectorRight <= originalLeft + 1) {
      connector.style.width = `${Math.max(0, nextLeft - connectorLeft)}px`;
    } else if (connectorLeft >= originalRight - 1) {
      connector.style.left = `${nextRight}px`;
      connector.style.width = `${Math.max(0, connectorRight - nextRight)}px`;
    }
  }

  function resolveDocument(documentObject) {
    const canvas = documentObject.querySelector(".spacetime-canvas");
    const labels = [...documentObject.querySelectorAll(".spacetime-track-label[data-spacetime-person]")];
    if (!canvas || labels.length < 2) return Object.freeze({ label_count: labels.length, shifted: 0, unresolved: 0 });
    const canvasWidth = Math.max(finite(canvas.offsetWidth), cssNumber(canvas.style.width));
    const bands = collectBands(documentObject);
    const rows = labels.map((element, index) => ({
      id: String(index),
      left: cssNumber(element.style.left),
      top: cssNumber(element.style.top) - finite(element.offsetHeight, 18) / 2,
      width: cssNumber(element.style.width, element.offsetWidth),
      height: finite(element.offsetHeight, 18),
      band_code: String(element.dataset.spacetimeBand || "").trim(),
      priority: element.classList.contains("is-selected") ? 0 : element.classList.contains("is-meanwhile-active") ? 1 : 2
    }));
    const result = resolvePositions(rows, bands, { canvasWidth });
    let shifted = 0;
    labels.forEach((element, index) => {
      const next = result.positions[String(index)];
      if (!next?.shifted) return;
      const originalLeft = cssNumber(element.style.left);
      updateConnector(element, originalLeft, next.left);
      element.style.left = `${next.left}px`;
      element.dataset.spacetimeOverlapGuard = "shifted";
      shifted += 1;
    });
    return Object.freeze({ label_count: labels.length, shifted, unresolved: result.unresolved.length });
  }

  function installBrowserIntegration(browserRoot) {
    const rootObject = browserRoot || (typeof window !== "undefined" ? window : null);
    const documentObject = rootObject?.document;
    if (!documentObject?.body) return null;
    let frame = 0;
    let disposed = false;
    const schedule = () => {
      if (disposed || frame) return;
      const raf = rootObject.requestAnimationFrame || ((callback) => rootObject.setTimeout(callback, 0));
      frame = raf(() => {
        frame = 0;
        if (!disposed) resolveDocument(documentObject);
      });
    };
    const observer = typeof rootObject.MutationObserver === "function" ? new rootObject.MutationObserver(schedule) : null;
    observer?.observe(documentObject.body, { childList: true, subtree: true });
    rootObject.addEventListener?.("atlas-authority-domain-changed", schedule);
    rootObject.addEventListener?.("resize", schedule);
    schedule();
    return Object.freeze({
      schedule,
      dispose() {
        disposed = true;
        observer?.disconnect();
        rootObject.removeEventListener?.("atlas-authority-domain-changed", schedule);
        rootObject.removeEventListener?.("resize", schedule);
      }
    });
  }

  const api = Object.freeze({ finite, cssNumber, overlap, candidateLefts, resolvePositions, collectBands, resolveDocument, installBrowserIntegration });
  if (typeof window !== "undefined" && window.document?.body) installBrowserIntegration(window);
  return api;
});
