((root, factory) => {
  "use strict";
  const cameraApi = typeof module === "object" && module.exports
    ? require("./atlas-person-spacetime-camera-v2.js")
    : root?.ATLAS_PERSON_SPACETIME_CAMERA_V2;
  const api = factory(cameraApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_CAMERA_CONTROLLER_V2 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, (cameraApi) => {
  "use strict";

  if (!cameraApi) throw new Error("ATLAS_PERSON_SPACETIME_CAMERA_V2 is required");

  const DEFAULT_WHEEL_PAN_PIXELS = 1;
  const DEFAULT_ZOOM_SENSITIVITY = 0.0025;

  function eventPoint(element, event) {
    const rect = element.getBoundingClientRect();
    return Object.freeze({
      x: Number(event.clientX) - rect.left,
      y: Number(event.clientY) - rect.top
    });
  }

  function viewportOf(element) {
    const rect = element.getBoundingClientRect();
    return Object.freeze({ width: rect.width, height: rect.height });
  }

  function wheelZoomFactor(deltaY, sensitivity = DEFAULT_ZOOM_SENSITIVITY) {
    const factor = Math.exp(-Number(deltaY) * sensitivity);
    return Number.isFinite(factor) && factor > 0 ? factor : 1;
  }

  function createCameraController(options) {
    const element = options?.element;
    if (!element || typeof element.addEventListener !== "function") throw new TypeError("element with addEventListener is required");
    const worldBounds = cameraApi.normalizeWorldBounds(options.worldBounds);
    const minZoom = options.minZoom ?? cameraApi.DEFAULT_MIN_ZOOM;
    const maxZoom = options.maxZoom ?? cameraApi.DEFAULT_MAX_ZOOM;
    const zoomOptions = { minZoom, maxZoom };
    let state = cameraApi.createCamera(worldBounds, { ...zoomOptions, ...(options.initialCamera || {}) });
    let drag = null;
    let destroyed = false;

    function notify(reason) {
      if (typeof options.onChange === "function") options.onChange(state, reason);
    }

    function setCamera(next, reason = "set") {
      state = cameraApi.createCamera(worldBounds, { ...zoomOptions, ...(next || {}) });
      notify(reason);
      return state;
    }

    function onWheel(event) {
      if (destroyed) return;
      const viewport = viewportOf(element);
      if (event.ctrlKey || event.metaKey) {
        if (typeof event.preventDefault === "function") event.preventDefault();
        const factor = wheelZoomFactor(event.deltaY, options.zoomSensitivity ?? DEFAULT_ZOOM_SENSITIVITY);
        state = cameraApi.zoomAt(state, worldBounds, viewport, eventPoint(element, event), { uniform: factor }, zoomOptions);
        notify("zoom");
        return;
      }

      const scale = Number(options.wheelPanPixels ?? DEFAULT_WHEEL_PAN_PIXELS);
      if (event.shiftKey) {
        if (typeof event.preventDefault === "function") event.preventDefault();
        state = cameraApi.panByPixels(state, worldBounds, viewport, { x: -Number(event.deltaY) * scale, y: 0 }, zoomOptions);
        notify("pan-space");
      } else if (options.captureVerticalWheel) {
        if (typeof event.preventDefault === "function") event.preventDefault();
        state = cameraApi.panByPixels(state, worldBounds, viewport, { x: 0, y: -Number(event.deltaY) * scale }, zoomOptions);
        notify("pan-time");
      }
    }

    function onPointerDown(event) {
      if (destroyed || event.button !== 0) return;
      drag = { pointerId: event.pointerId, x: Number(event.clientX), y: Number(event.clientY) };
      if (typeof element.setPointerCapture === "function" && event.pointerId != null) element.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event) {
      if (destroyed || !drag || (event.pointerId != null && drag.pointerId != null && event.pointerId !== drag.pointerId)) return;
      const x = Number(event.clientX);
      const y = Number(event.clientY);
      const dx = x - drag.x;
      const dy = y - drag.y;
      drag = { ...drag, x, y };
      if (!dx && !dy) return;
      state = cameraApi.panByPixels(state, worldBounds, viewportOf(element), { x: dx, y: dy }, zoomOptions);
      notify("drag-pan");
    }

    function onPointerUp(event) {
      if (!drag) return;
      if (event.pointerId == null || drag.pointerId == null || event.pointerId === drag.pointerId) drag = null;
    }

    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", onPointerUp);
    element.addEventListener("pointercancel", onPointerUp);

    return Object.freeze({
      getCamera: () => state,
      setCamera,
      fitWorld: () => setCamera(cameraApi.fitWorld(worldBounds), "fit-world"),
      destroy() {
        if (destroyed) return;
        destroyed = true;
        element.removeEventListener("wheel", onWheel);
        element.removeEventListener("pointerdown", onPointerDown);
        element.removeEventListener("pointermove", onPointerMove);
        element.removeEventListener("pointerup", onPointerUp);
        element.removeEventListener("pointercancel", onPointerUp);
        drag = null;
      }
    });
  }

  return Object.freeze({
    DEFAULT_WHEEL_PAN_PIXELS,
    DEFAULT_ZOOM_SENSITIVITY,
    wheelZoomFactor,
    createCameraController
  });
});
