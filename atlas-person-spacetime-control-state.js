(() => {
  "use strict";

  const MOUNT_ID = "personSpacetimeMount";
  const BOUND_EPSILON = 0.01;

  function parsePercent(value) {
    const match = String(value ?? "").match(/(-?\d+(?:\.\d+)?)\s*%/);
    if (!match) return null;
    const numeric = Number(match[1]);
    return Number.isFinite(numeric) ? numeric : null;
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
    const reset = mount.querySelector("#spacetimeTimeZoomReset");
    if (!zoomOut || !zoomValue || !reset) return false;

    const currentPercent = parsePercent(zoomValue.textContent);
    const minimumPercent = parsePercent(reset.textContent);
    if (currentPercent == null || minimumPercent == null) return false;

    const atMinimum = currentPercent <= minimumPercent + BOUND_EPSILON;
    setDisabled(zoomOut, atMinimum);
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

  window.ATLAS_PERSON_SPACETIME_CONTROL_STATE = Object.freeze({ parsePercent, syncZoomControlState });
})();
