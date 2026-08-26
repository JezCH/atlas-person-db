((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_MINIMAP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function positiveSize(value, fallback = 1) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function normalizedGeometry(worldInput = {}, minimapInput = {}) {
    return Object.freeze({
      world_width: positiveSize(worldInput.width),
      world_height: positiveSize(worldInput.height),
      minimap_width: positiveSize(minimapInput.width),
      minimap_height: positiveSize(minimapInput.height)
    });
  }

  function projectPoint(item, worldInput = {}, minimapInput = {}) {
    if (!item || !Number.isFinite(Number(item.x)) || !Number.isFinite(Number(item.y))) return null;
    const geometry = normalizedGeometry(worldInput, minimapInput);
    const x = clamp(Number(item.x), 0, geometry.world_width);
    const y = clamp(Number(item.y), 0, geometry.world_height);
    return Object.freeze({
      ...item,
      minimap_x: x / geometry.world_width * geometry.minimap_width,
      minimap_y: y / geometry.world_height * geometry.minimap_height
    });
  }

  function projectItems(items, worldInput = {}, minimapInput = {}) {
    return Object.freeze((items || []).map((item) => projectPoint(item, worldInput, minimapInput)).filter(Boolean));
  }

  function viewportRect(scrollInput = {}, viewportInput = {}, worldInput = {}, minimapInput = {}, insetInput = {}) {
    const geometry = normalizedGeometry(worldInput, minimapInput);
    const leftInset = Math.max(0, Number(insetInput.left) || 0);
    const topInset = Math.max(0, Number(insetInput.top) || 0);
    const viewportWidth = positiveSize(viewportInput.width);
    const viewportHeight = positiveSize(viewportInput.height);
    const visibleWorldWidth = Math.min(geometry.world_width, Math.max(1, viewportWidth - leftInset));
    const visibleWorldHeight = Math.min(geometry.world_height, Math.max(1, viewportHeight - topInset));
    const maxWorldLeft = Math.max(0, geometry.world_width - visibleWorldWidth);
    const maxWorldTop = Math.max(0, geometry.world_height - visibleWorldHeight);
    const worldLeft = clamp(Number(scrollInput.left) || 0, 0, maxWorldLeft);
    const worldTop = clamp(Number(scrollInput.top) || 0, 0, maxWorldTop);
    return Object.freeze({
      left: worldLeft / geometry.world_width * geometry.minimap_width,
      top: worldTop / geometry.world_height * geometry.minimap_height,
      width: visibleWorldWidth / geometry.world_width * geometry.minimap_width,
      height: visibleWorldHeight / geometry.world_height * geometry.minimap_height,
      world_left: worldLeft,
      world_top: worldTop,
      world_width: visibleWorldWidth,
      world_height: visibleWorldHeight
    });
  }

  function localPoint(clientInput = {}, rectInput = {}, minimapInput = {}) {
    const width = positiveSize(minimapInput.width, positiveSize(rectInput.width));
    const height = positiveSize(minimapInput.height, positiveSize(rectInput.height));
    const rectWidth = positiveSize(rectInput.width, width);
    const rectHeight = positiveSize(rectInput.height, height);
    const localCssX = clamp((Number(clientInput.x) || 0) - (Number(rectInput.left) || 0), 0, rectWidth);
    const localCssY = clamp((Number(clientInput.y) || 0) - (Number(rectInput.top) || 0), 0, rectHeight);
    return Object.freeze({
      x: localCssX / rectWidth * width,
      y: localCssY / rectHeight * height
    });
  }

  function scrollTargetForMinimapPoint(pointInput = {}, viewportInput = {}, worldInput = {}, minimapInput = {}, insetInput = {}) {
    const geometry = normalizedGeometry(worldInput, minimapInput);
    const leftInset = Math.max(0, Number(insetInput.left) || 0);
    const topInset = Math.max(0, Number(insetInput.top) || 0);
    const viewportWidth = positiveSize(viewportInput.width);
    const viewportHeight = positiveSize(viewportInput.height);
    const visibleWorldWidth = Math.min(geometry.world_width, Math.max(1, viewportWidth - leftInset));
    const visibleWorldHeight = Math.min(geometry.world_height, Math.max(1, viewportHeight - topInset));
    const worldX = clamp(Number(pointInput.x) || 0, 0, geometry.minimap_width) / geometry.minimap_width * geometry.world_width;
    const worldY = clamp(Number(pointInput.y) || 0, 0, geometry.minimap_height) / geometry.minimap_height * geometry.world_height;
    return Object.freeze({
      left: clamp(worldX - visibleWorldWidth / 2, 0, Math.max(0, geometry.world_width - visibleWorldWidth)),
      top: clamp(worldY - visibleWorldHeight / 2, 0, Math.max(0, geometry.world_height - visibleWorldHeight))
    });
  }

  function projectVerticalLine(worldX, worldInput = {}, minimapInput = {}) {
    const geometry = normalizedGeometry(worldInput, minimapInput);
    return clamp(Number(worldX) || 0, 0, geometry.world_width) / geometry.world_width * geometry.minimap_width;
  }

  function projectHorizontalLine(worldY, worldInput = {}, minimapInput = {}) {
    const geometry = normalizedGeometry(worldInput, minimapInput);
    return clamp(Number(worldY) || 0, 0, geometry.world_height) / geometry.world_height * geometry.minimap_height;
  }

  return Object.freeze({
    clamp,
    projectPoint,
    projectItems,
    viewportRect,
    localPoint,
    scrollTargetForMinimapPoint,
    projectVerticalLine,
    projectHorizontalLine
  });
});