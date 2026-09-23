(() => {
  "use strict";

  const BOUND_EPSILON = 0.01;
  const MINIMUM_PERCENT = 50;
  const DEFAULT_PERCENT = 500;
  const MAXIMUM_PERCENT = 1500;

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

  function minimumPercentForMount(mount) {
    const fit = Number(mount?.dataset?.spacetimeMinimumZoomPercent);
    if (!Number.isFinite(fit)) return MINIMUM_PERCENT;
    return Math.min(MAXIMUM_PERCENT, Math.max(MINIMUM_PERCENT, fit));
  }

  function syncZoomControlState(mount) {
    if (!mount) return false;
    const zoomOut = mount.querySelector("#spacetimeCameraZoomOut");
    const zoomValue = mount.querySelector("#spacetimeCameraZoomValue");
    const zoomIn = mount.querySelector("#spacetimeCameraZoomIn");
    const reset = mount.querySelector("#spacetimeCameraZoomReset");
    if (!zoomOut || !zoomValue || !zoomIn || !reset) return false;

    const currentPercent = parsePercent(zoomValue.textContent);
    if (currentPercent == null) return false;

    const atMinimum = currentPercent <= minimumPercentForMount(mount) + BOUND_EPSILON;
    const atMaximum = currentPercent >= MAXIMUM_PERCENT - BOUND_EPSILON;
    const atDefault = Math.abs(currentPercent - DEFAULT_PERCENT) <= BOUND_EPSILON;
    setDisabled(zoomOut, atMinimum);
    setDisabled(zoomIn, atMaximum);
    setDisabled(reset, atDefault);
    return true;
  }

  window.ATLAS_PERSON_SPACETIME_CONTROL_STATE = Object.freeze({
    parsePercent,
    minimumPercentForMount,
    horizontalCenterRatio,
    scrollLeftForHorizontalCenter,
    syncZoomControlState
  });
})();
