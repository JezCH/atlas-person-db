(() => {
  "use strict";

  const MOUNT_ID = "personSpacetimeMount";
  const BOUND_EPSILON = 0.01;
  const MAXIMUM_PERCENT = 800;

  function parsePercent(value) {
    const match = String(value ?? "").match(/(-?\d+(?:\.\d+)?)\s*%/);
    if (!match) return null;
    const numeric = Number(match[1]);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function clampUnit(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0.5;
    return Math.min(1, Math.max(0, numeric));
  }

  function horizontalCenterRatio(scrollLeft, clientWidth, axisWidth, worldWidth) {
    const world = Number(worldWidth);
    if (!(world > 0)) return null;
    const viewport = Math.max(1, Number(clientWidth) || 0);
    const axis = Math.max(0, Number(axisWidth) || 0);
    const usable = Math.max(1, viewport - axis);
    const left = Math.max(0, Number(scrollLeft) || 0);
    return clampUnit((left + usable / 2) / world);
  }

  function scrollLeftForHorizontalCenter(ratio, clientWidth, axisWidth, worldWidth) {
    const world = Number(worldWidth);
    if (!(world > 0)) return 0;
    const viewport = Math.max(1, Number(clientWidth) || 0);
    const axis = Math.max(0, Number(axisWidth) || 0);
    const usable = Math.max(1, viewport - axis);
    const maxScroll = Math.max(0, world - usable);
    const target = clampUnit(ratio) * world - usable / 2;
    return Math.min(maxScroll, Math.max(0, target));
  }

  function canvasWorldWidth(canvas) {
    if (!canvas) return 0;
    const offsetWidth = Number(canvas.offsetWidth);
    if (offsetWidth > 0) return offsetWidth;
    const styleWidth = Number.parseFloat(canvas.style?.width || "");
    if (styleWidth > 0) return styleWidth;
    const rectWidth = Number(canvas.getBoundingClientRect?.().width);
    return rectWidth > 0 ? rectWidth : 0;
  }

  function horizontalAxisWidth(mount, canvas) {
    const canvasOffset = Number(canvas?.offsetLeft);
    if (canvasOffset > 0) return canvasOffset;
    const stickyWidth = Number(mount?.querySelector?.(".spacetime-sticky-corner")?.offsetWidth);
    return stickyWidth > 0 ? stickyWidth : 0;
  }

  function captureHorizontalCamera(mount) {
    const scroll = mount?.querySelector?.(".spacetime-scroll");
    const canvas = mount?.querySelector?.(".spacetime-canvas");
    if (!scroll || !canvas) return null;
    const worldWidth = canvasWorldWidth(canvas);
    if (!(worldWidth > 0)) return null;
    const axisWidth = horizontalAxisWidth(mount, canvas);
    const ratio = horizontalCenterRatio(scroll.scrollLeft, scroll.clientWidth, axisWidth, worldWidth);
    return ratio == null ? null : { ratio };
  }

  function restoreHorizontalCamera(mount, snapshot) {
    if (!snapshot || snapshot.ratio == null) return false;
    const scroll = mount?.querySelector?.(".spacetime-scroll");
    const canvas = mount?.querySelector?.(".spacetime-canvas");
    if (!scroll || !canvas) return false;
    const worldWidth = canvasWorldWidth(canvas);
    if (!(worldWidth > 0)) return false;
    const axisWidth = horizontalAxisWidth(mount, canvas);
    scroll.scrollLeft = scrollLeftForHorizontalCenter(snapshot.ratio, scroll.clientWidth, axisWidth, worldWidth);
    if (typeof window.Event === "function" && typeof scroll.dispatchEvent === "function") {
      scroll.dispatchEvent(new window.Event("scroll"));
    }
    return true;
  }

  function setDisabled(button, disabled) {
    if (!button) return;
    button.disabled = Boolean(disabled);
    button.setAttribute("aria-disabled", String(Boolean(disabled)));
  }

  function syncZoomControlState(mount) {
    if (!mount) return false;
    const zoomOut = mount.querySelector("#spacetimeTimeZoomOut");
    const zoomValue = mount.querySelector("#spacetimeTimeZoomValue");
    const zoomIn = mount.querySelector("#spacetimeTimeZoomIn");
    const reset = mount.querySelector("#spacetimeTimeZoomReset");
    if (!zoomOut || !zoomValue || !zoomIn || !reset) return false;

    const currentPercent = parsePercent(zoomValue.textContent);
    const minimumPercent = parsePercent(reset.textContent);
    if (currentPercent == null || minimumPercent == null) return false;

    const atMinimum = currentPercent <= minimumPercent + BOUND_EPSILON;
    const atMaximum = currentPercent >= MAXIMUM_PERCENT - BOUND_EPSILON;
    setDisabled(zoomOut, atMinimum);
    setDisabled(zoomIn, atMaximum);
    setDisabled(reset, atMinimum);
    return true;
  }

  function bindHorizontalModeContext(mount) {
    mount.addEventListener("change", (event) => {
      if (event.target?.id !== "spacetimeHorizontalMode") return;
      const snapshot = captureHorizontalCamera(mount);
      if (!snapshot) return;
      Promise.resolve().then(() => restoreHorizontalCamera(mount, snapshot));
    }, true);
  }

  function bindMount(mount) {
    if (!mount) return;
    if (mount.dataset.atlasSpacetimeZoomBoundState === "1") {
      syncZoomControlState(mount);
      return;
    }
    mount.dataset.atlasSpacetimeZoomBoundState = "1";
    bindHorizontalModeContext(mount);
    const observer = new MutationObserver(() => syncZoomControlState(mount));
    observer.observe(mount, { childList: true, subtree: true, characterData: true });
    syncZoomControlState(mount);
  }

  function install() {
    const existing = document.getElementById(MOUNT_ID);
    if (existing) {
      bindMount(existing);
      return;
    }
    if (typeof MutationObserver !== "function") return;
    const observer = new MutationObserver(() => {
      const mount = document.getElementById(MOUNT_ID);
      if (!mount) return;
      observer.disconnect();
      bindMount(mount);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();

  window.ATLAS_PERSON_SPACETIME_CONTROL_STATE = Object.freeze({
    parsePercent,
    horizontalCenterRatio,
    scrollLeftForHorizontalCenter,
    captureHorizontalCamera,
    restoreHorizontalCamera,
    syncZoomControlState
  });
})();
