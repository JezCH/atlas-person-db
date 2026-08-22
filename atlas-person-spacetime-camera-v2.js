((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_CAMERA_V2 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const DEFAULT_MIN_ZOOM = 1;
  const DEFAULT_MAX_ZOOM = 256;
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

  function normalizeWorldBounds(bounds) {
    const minTime = finite(bounds?.minTime, "world.minTime");
    const maxTime = finite(bounds?.maxTime, "world.maxTime");
    const minSpace = finite(bounds?.minSpace ?? 0, "world.minSpace");
    const maxSpace = finite(bounds?.maxSpace ?? 1, "world.maxSpace");
    if (!(maxTime > minTime)) throw new RangeError("world.maxTime must be greater than world.minTime");
    if (!(maxSpace > minSpace)) throw new RangeError("world.maxSpace must be greater than world.minSpace");
    return Object.freeze({ minTime, maxTime, minSpace, maxSpace });
  }

  function normalizeViewport(viewport) {
    return Object.freeze({
      width: positive(viewport?.width, "viewport.width"),
      height: positive(viewport?.height, "viewport.height")
    });
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeZoom(value, options = {}) {
    const minZoom = positive(options.minZoom ?? DEFAULT_MIN_ZOOM, "minZoom");
    const maxZoom = positive(options.maxZoom ?? DEFAULT_MAX_ZOOM, "maxZoom");
    if (maxZoom < minZoom) throw new RangeError("maxZoom must be >= minZoom");
    return clamp(positive(value, "zoom"), minZoom, maxZoom);
  }

  function visibleSpan(totalSpan, zoom) {
    return totalSpan / zoom;
  }

  function clampCenter(center, min, max, span) {
    const half = span / 2;
    if (span >= (max - min) - EPSILON) return (min + max) / 2;
    return clamp(center, min + half, max - half);
  }

  function createCamera(worldBounds, options = {}) {
    const world = normalizeWorldBounds(worldBounds);
    const zoomTime = normalizeZoom(options.zoomTime ?? 1, options);
    const zoomSpace = normalizeZoom(options.zoomSpace ?? 1, options);
    const timeSpan = visibleSpan(world.maxTime - world.minTime, zoomTime);
    const spaceSpan = visibleSpan(world.maxSpace - world.minSpace, zoomSpace);
    const centerTime = clampCenter(
      finite(options.centerTime ?? (world.minTime + world.maxTime) / 2, "camera.centerTime"),
      world.minTime,
      world.maxTime,
      timeSpan
    );
    const centerSpace = clampCenter(
      finite(options.centerSpace ?? (world.minSpace + world.maxSpace) / 2, "camera.centerSpace"),
      world.minSpace,
      world.maxSpace,
      spaceSpan
    );
    return Object.freeze({ centerTime, centerSpace, zoomTime, zoomSpace });
  }

  function fitWorld(worldBounds) {
    return createCamera(worldBounds);
  }

  function visibleWorld(cameraInput, worldBounds) {
    const world = normalizeWorldBounds(worldBounds);
    const camera = createCamera(world, cameraInput);
    const timeSpan = visibleSpan(world.maxTime - world.minTime, camera.zoomTime);
    const spaceSpan = visibleSpan(world.maxSpace - world.minSpace, camera.zoomSpace);
    return Object.freeze({
      minTime: camera.centerTime - timeSpan / 2,
      maxTime: camera.centerTime + timeSpan / 2,
      minSpace: camera.centerSpace - spaceSpan / 2,
      maxSpace: camera.centerSpace + spaceSpan / 2
    });
  }

  function project(point, cameraInput, worldBounds, viewportInput) {
    const viewport = normalizeViewport(viewportInput);
    const visible = visibleWorld(cameraInput, worldBounds);
    const time = finite(point?.time, "point.time");
    const space = finite(point?.space, "point.space");
    return Object.freeze({
      x: ((space - visible.minSpace) / (visible.maxSpace - visible.minSpace)) * viewport.width,
      y: ((time - visible.minTime) / (visible.maxTime - visible.minTime)) * viewport.height
    });
  }

  function unproject(screenPoint, cameraInput, worldBounds, viewportInput) {
    const viewport = normalizeViewport(viewportInput);
    const visible = visibleWorld(cameraInput, worldBounds);
    const x = finite(screenPoint?.x, "screenPoint.x");
    const y = finite(screenPoint?.y, "screenPoint.y");
    return Object.freeze({
      space: visible.minSpace + (x / viewport.width) * (visible.maxSpace - visible.minSpace),
      time: visible.minTime + (y / viewport.height) * (visible.maxTime - visible.minTime)
    });
  }

  function zoomAt(cameraInput, worldBounds, viewportInput, screenPoint, factors = {}, options = {}) {
    const world = normalizeWorldBounds(worldBounds);
    const viewport = normalizeViewport(viewportInput);
    const camera = createCamera(world, { ...options, ...cameraInput });
    const anchor = unproject(screenPoint, camera, world, viewport);
    const factorTime = positive(factors.time ?? factors.uniform ?? 1, "zoom factor time");
    const factorSpace = positive(factors.space ?? factors.uniform ?? 1, "zoom factor space");
    const zoomTime = normalizeZoom(camera.zoomTime * factorTime, options);
    const zoomSpace = normalizeZoom(camera.zoomSpace * factorSpace, options);
    const timeSpan = visibleSpan(world.maxTime - world.minTime, zoomTime);
    const spaceSpan = visibleSpan(world.maxSpace - world.minSpace, zoomSpace);
    const xRatio = finite(screenPoint?.x, "screenPoint.x") / viewport.width - 0.5;
    const yRatio = finite(screenPoint?.y, "screenPoint.y") / viewport.height - 0.5;
    const centerTime = clampCenter(anchor.time - yRatio * timeSpan, world.minTime, world.maxTime, timeSpan);
    const centerSpace = clampCenter(anchor.space - xRatio * spaceSpan, world.minSpace, world.maxSpace, spaceSpan);
    return Object.freeze({ centerTime, centerSpace, zoomTime, zoomSpace });
  }

  function panByPixels(cameraInput, worldBounds, viewportInput, delta, options = {}) {
    const world = normalizeWorldBounds(worldBounds);
    const viewport = normalizeViewport(viewportInput);
    const camera = createCamera(world, { ...options, ...cameraInput });
    const visible = visibleWorld(camera, world);
    const dx = finite(delta?.x ?? 0, "delta.x");
    const dy = finite(delta?.y ?? 0, "delta.y");
    const spaceSpan = visible.maxSpace - visible.minSpace;
    const timeSpan = visible.maxTime - visible.minTime;
    const centerSpace = clampCenter(
      camera.centerSpace - (dx / viewport.width) * spaceSpan,
      world.minSpace,
      world.maxSpace,
      spaceSpan
    );
    const centerTime = clampCenter(
      camera.centerTime - (dy / viewport.height) * timeSpan,
      world.minTime,
      world.maxTime,
      timeSpan
    );
    return Object.freeze({ ...camera, centerTime, centerSpace });
  }

  return Object.freeze({
    DEFAULT_MIN_ZOOM,
    DEFAULT_MAX_ZOOM,
    normalizeWorldBounds,
    normalizeViewport,
    createCamera,
    fitWorld,
    visibleWorld,
    project,
    unproject,
    zoomAt,
    panByPixels
  });
});
