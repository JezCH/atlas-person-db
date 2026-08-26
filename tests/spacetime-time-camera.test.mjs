import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const model = require("../atlas-person-spacetime-model.js");
const semanticTime = require("../atlas-person-spacetime-time-projection.js");
const viewSource = readFileSync(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../atlas-person-spacetime-view.css", import.meta.url), "utf8");

test("time camera keeps the current surface while moving onto semantic time projection", () => {
  assert.doesNotThrow(() => new Function(viewSource));
  assert.match(viewSource, /createSemanticTimeProjection\(/);
  assert.match(viewSource, /DEFAULT_TIMELINE_HEIGHT \* timeCameraZoom/);
  assert.match(viewSource, /spacetimeTimeZoomOut/);
  assert.match(viewSource, /spacetimeTimeZoomIn/);
  assert.match(viewSource, /spacetimeTimeZoomReset/);
  assert.doesNotMatch(viewSource, /id="spacetimeScale"/);
});

test("time camera zoom is bounded by the readable minimum and pointer zoom requires an explicit modifier", () => {
  assert.match(viewSource, /TIME_CAMERA_MIN_ZOOM = 1/);
  assert.match(viewSource, /TIME_CAMERA_MAX_ZOOM = 8/);
  assert.match(viewSource, /TIME_CAMERA_ZOOM_STEP = 1\.35/);
  assert.match(viewSource, /Math\.max\(TIME_CAMERA_MIN_ZOOM, numeric\)/);
  assert.match(viewSource, /!event\.ctrlKey && !event\.metaKey/);
  assert.match(viewSource, /event\.preventDefault\(\)/);
  assert.match(viewSource, /pendingCameraAnchor/);
});

test("spacetime surface is an independent scroll viewport while the camera is active", () => {
  assert.match(cssSource, /\.spacetime-scroll\{[^}]*overflow:auto/);
  assert.match(cssSource, /height:clamp\(520px,72vh,860px\)/);
  assert.match(cssSource, /overscroll-behavior:contain/);
});

test("100 percent semantic camera is numerically identical to the previous log projection", () => {
  const base = model.createSpacetimeTimeProjection(-3000, 2026, 4200, 420);
  const semantic = semanticTime.createSemanticTimeProjection(-3000, 2026, 4200, 420, 1);
  for (const year of [-2500, -1, 1, 500, 1919, 2026]) {
    const ordinal = model.historicalYearToOrdinal(year);
    assert.equal(semantic.worldToScreenY(ordinal), base.worldToScreenY(ordinal));
    assert.equal(semantic.screenToWorldOrdinal(base.worldToScreenY(ordinal)), base.screenToWorldOrdinal(base.worldToScreenY(ordinal)));
  }
});

test("changing semantic time zoom preserves the historical ordinal under a viewport anchor", () => {
  const headerHeight = 44;
  const viewportY = 320;
  const anchorOrdinal = model.historicalYearToOrdinal(1919);
  const base = semanticTime.createSemanticTimeProjection(-3000, 2026, 4200, 420, 1);
  const zoomed = semanticTime.createSemanticTimeProjection(-3000, 2026, 4200 * 1.35, 420, 1.35);

  const oldScrollTop = headerHeight + base.worldToScreenY(anchorOrdinal) - viewportY;
  const newScrollTop = headerHeight + zoomed.worldToScreenY(anchorOrdinal) - viewportY;
  const recoveredOld = base.screenToWorldOrdinal(oldScrollTop + viewportY - headerHeight);
  const recoveredNew = zoomed.screenToWorldOrdinal(newScrollTop + viewportY - headerHeight);

  assert.ok(Math.abs(recoveredOld - anchorOrdinal) < 1e-8);
  assert.ok(Math.abs(recoveredNew - anchorOrdinal) < 1e-6);
  assert.notEqual(oldScrollTop, newScrollTop);
});
