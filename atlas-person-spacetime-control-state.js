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

  function setDisabled(button, disabled) {
    if (!button) return;
    button.disabled = Boolean(disabled);
    button.setAttribute("aria-disabled", String(Boolean(disabled)));
  }

  function syncZoomControlState(mount) {
    if (!mount) return false;
    const zoomOut = mount.querySelector("#spacetimeCameraZoomOut");
    const zoomValue = mount.querySelector("#spacetimeCameraZoomValue");
    const zoomIn = mount.querySelector("#spacetimeCameraZoomIn");
    const reset = mount.querySelector("#spacetimeCameraZoomReset");
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

  function bindMount(mount) {
    if (!mount) return;
    if (mount.dataset.atlasSpacetimeZoomBoundState === "1") {
      syncZoomControlState(mount);
      return;
    }
    mount.dataset.atlasSpacetimeZoomBoundState = "1";
    const observer = new MutationObserver(() => syncZoomControlState(mount));
    observer.observe(mount, { childList: true, subtree: true, characterData: true });
    syncZoomControlState(mount);
  }

  let activeMount = null;

  function bindCurrentMount() {
    const mount = document.getElementById(MOUNT_ID);
    if (mount === activeMount) return;
    activeMount = mount || null;
    if (mount) bindMount(mount);
  }

  function install() {
    bindCurrentMount();
    if (typeof MutationObserver !== "function") return;
    const observer = new MutationObserver(bindCurrentMount);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();

  window.ATLAS_PERSON_SPACETIME_CONTROL_STATE = Object.freeze({
    parsePercent,
    horizontalCenterRatio,
    scrollLeftForHorizontalCenter,
    syncZoomControlState
  });
})();
