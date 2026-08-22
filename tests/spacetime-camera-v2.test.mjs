import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const camera = require("../atlas-person-spacetime-camera-v2.js");

const WORLD = Object.freeze({ minTime: -3000, maxTime: 2025, minSpace: 0, maxSpace: 1 });
const VIEWPORT = Object.freeze({ width: 1200, height: 800 });

function almostEqual(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} !== ${expected}`);
}

test("fitWorld maps the full logical spacetime world onto the viewport", () => {
  const fit = camera.fitWorld(WORLD);
  const oldestWest = camera.project({ time: WORLD.minTime, space: WORLD.minSpace }, fit, WORLD, VIEWPORT);
  const newestEast = camera.project({ time: WORLD.maxTime, space: WORLD.maxSpace }, fit, WORLD, VIEWPORT);

  assert.deepEqual(fit, {
    centerTime: (WORLD.minTime + WORLD.maxTime) / 2,
    centerSpace: 0.5,
    zoomTime: 1,
    zoomSpace: 1
  });
  almostEqual(oldestWest.x, 0);
  almostEqual(oldestWest.y, 0);
  almostEqual(newestEast.x, VIEWPORT.width);
  almostEqual(newestEast.y, VIEWPORT.height);
});

test("world to screen projection round-trips without changing logical coordinates", () => {
  const state = camera.createCamera(WORLD, {
    centerTime: 1450,
    centerSpace: 0.34,
    zoomTime: 12,
    zoomSpace: 8
  });
  const worldPoint = { time: 1517.25, space: 0.3175 };
  const screen = camera.project(worldPoint, state, WORLD, VIEWPORT);
  const restored = camera.unproject(screen, state, WORLD, VIEWPORT);

  almostEqual(restored.time, worldPoint.time);
  almostEqual(restored.space, worldPoint.space);
});

test("pointer-centered zoom keeps the world coordinate under the pointer stable", () => {
  const state = camera.createCamera(WORLD, {
    centerTime: 1200,
    centerSpace: 0.55,
    zoomTime: 4,
    zoomSpace: 4
  });
  const pointer = { x: 860, y: 280 };
  const before = camera.unproject(pointer, state, WORLD, VIEWPORT);
  const zoomed = camera.zoomAt(state, WORLD, VIEWPORT, pointer, { uniform: 2 });
  const after = camera.unproject(pointer, zoomed, WORLD, VIEWPORT);

  almostEqual(after.time, before.time);
  almostEqual(after.space, before.space);
  assert.equal(zoomed.zoomTime, 8);
  assert.equal(zoomed.zoomSpace, 8);
});

test("time and space zoom can be controlled independently", () => {
  const state = camera.createCamera(WORLD, {
    centerTime: 1000,
    centerSpace: 0.5,
    zoomTime: 4,
    zoomSpace: 4
  });
  const pointer = { x: VIEWPORT.width / 2, y: VIEWPORT.height / 2 };
  const zoomed = camera.zoomAt(state, WORLD, VIEWPORT, pointer, { time: 2, space: 1 });

  assert.equal(zoomed.zoomTime, 8);
  assert.equal(zoomed.zoomSpace, 4);
  almostEqual(zoomed.centerTime, state.centerTime);
  almostEqual(zoomed.centerSpace, state.centerSpace);
});

test("drag pan moves the camera in the opposite world direction and clamps at world edges", () => {
  const state = camera.createCamera(WORLD, {
    centerTime: 1000,
    centerSpace: 0.5,
    zoomTime: 10,
    zoomSpace: 10
  });
  const moved = camera.panByPixels(state, WORLD, VIEWPORT, { x: 120, y: 80 });

  assert.ok(moved.centerSpace < state.centerSpace);
  assert.ok(moved.centerTime < state.centerTime);

  const clamped = camera.panByPixels(moved, WORLD, VIEWPORT, { x: 1e9, y: 1e9 });
  const visible = camera.visibleWorld(clamped, WORLD);
  assert.ok(visible.minSpace >= WORLD.minSpace - 1e-9);
  assert.ok(visible.maxSpace <= WORLD.maxSpace + 1e-9);
  assert.ok(visible.minTime >= WORLD.minTime - 1e-9);
  assert.ok(visible.maxTime <= WORLD.maxTime + 1e-9);
});

test("zoom is bounded so the v2 camera cannot invert or escape its world contract", () => {
  const state = camera.createCamera(WORLD, { zoomTime: 2, zoomSpace: 2 });
  const pointer = { x: 600, y: 400 };
  const huge = camera.zoomAt(state, WORLD, VIEWPORT, pointer, { uniform: 1e9 });
  assert.equal(huge.zoomTime, camera.DEFAULT_MAX_ZOOM);
  assert.equal(huge.zoomSpace, camera.DEFAULT_MAX_ZOOM);

  const backOut = camera.zoomAt(huge, WORLD, VIEWPORT, pointer, { uniform: 1e-9 });
  assert.equal(backOut.zoomTime, camera.DEFAULT_MIN_ZOOM);
  assert.equal(backOut.zoomSpace, camera.DEFAULT_MIN_ZOOM);
  assert.deepEqual(camera.visibleWorld(backOut, WORLD), WORLD);
});
