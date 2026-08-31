import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const model = require("../atlas-person-spacetime-model.js");
const timeProjection = require("../atlas-person-spacetime-time-projection.js");
const view = readFileSync(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../atlas-person-spacetime-view.css", import.meta.url), "utf8");

test("time projection is globally linear at every supported camera zoom", () => {
  const projection = timeProjection.createUniformTimeProjection(-3000, 2026, 17220, 5);
  assert.equal(projection.mode, "linear_time");
  assert.equal(projection.zoom, 5);
  for (const [a,b,c] of [[1800,1900,2000],[-300,-200,-100]]) {
    const left = projection.yForYear(b) - projection.yForYear(a);
    const right = projection.yForYear(c) - projection.yForYear(b);
    assert.ok(Math.abs(left - right) < 1e-8);
  }
});

test("camera zoom is bounded to 500-800 percent", () => {
  assert.match(view, /const CAMERA_MIN_ZOOM = 5;/);
  assert.match(view, /const CAMERA_MAX_ZOOM = 8;/);
  assert.match(view, /const CAMERA_ZOOM_STEP = 1\.25;/);
  assert.match(view, /Math\.max\(CAMERA_MIN_ZOOM, numeric\)/);
  assert.doesNotMatch(view, /TIME_CAMERA_MIN_ZOOM/);
  assert.throws(() => timeProjection.createUniformTimeProjection(-3000, 2026, 1000, 4.99), /zoom must be >= 5/);
});

test("unified camera owns both screen axes", () => {
  assert.match(view, /DEFAULT_TIMELINE_HEIGHT \* cameraZoom \* GLOBAL_EXTENT_COMPRESSION/);
  assert.match(view, /baseWorldWidth \* cameraZoom \* GLOBAL_EXTENT_COMPRESSION/);
  assert.match(view, /requestCameraZoom\(mount, wheelZoomTarget, event\.clientX - rect\.left, event\.clientY - rect\.top\)/);
  assert.match(view, /horizontalPointerRatio\(scroll, safeViewportX\)/);
  assert.match(view, /screenToWorldOrdinal\(currentCanvasY\)/);
});

test("pointer anchored zoom preserves historical Y", () => {
  const header = 40;
  const viewportY = 320;
  const ordinal = model.historicalYearToOrdinal(1919);
  const oldProjection = timeProjection.createUniformTimeProjection(-3000, 2026, 4200 * 5 * 0.82, 5);
  const newProjection = timeProjection.createUniformTimeProjection(-3000, 2026, 4200 * 6.25 * 0.82, 6.25);
  const oldTop = header + oldProjection.worldToScreenY(ordinal) - viewportY;
  const newTop = header + newProjection.worldToScreenY(ordinal) - viewportY;
  assert.ok(Math.abs(oldProjection.screenToWorldOrdinal(oldTop + viewportY - header) - ordinal) < 1e-8);
  assert.ok(Math.abs(newProjection.screenToWorldOrdinal(newTop + viewportY - header) - ordinal) < 1e-8);
});

test("spacetime remains an independent scroll camera", () => {
  assert.match(css, /\.spacetime-scroll\{[^}]*overflow:auto/);
  assert.match(css, /height:clamp\(520px,72vh,860px\)/);
  assert.match(css, /overscroll-behavior:contain/);
});
