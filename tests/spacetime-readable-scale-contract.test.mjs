import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const spaceAxis = require("../atlas-person-spacetime-space-axis.js");
const rootUrl = new URL("../", import.meta.url);
const view = readFileSync(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../atlas-person-spacetime-view.css", import.meta.url), "utf8");
const control = readFileSync(new URL("../atlas-person-spacetime-control-state.js", import.meta.url), "utf8");
const labelEngine = require("../atlas-person-spacetime-label-engine.js");

test("spacetime minimum and default scale are structurally locked to 500 percent", () => {
  assert.match(view, /const CAMERA_MIN_ZOOM = 5;/);
  assert.match(view, /const CAMERA_MAX_ZOOM = 8;/);
  assert.match(view, /let cameraZoom = CAMERA_MIN_ZOOM;/);
  assert.match(view, /const GLOBAL_EXTENT_COMPRESSION = 0\.748;/);
  assert.equal(spaceAxis.DEFAULT_MIN_BASE_WORLD_WIDTH, 900);
  assert.equal(spaceAxis.DEFAULT_MAX_BASE_WORLD_WIDTH, 1275);
  assert.equal(spaceAxis.DEFAULT_AXIS_WIDTH, 140);
  assert.match(view, /const AXIS_WIDTH = 140;/);
  assert.match(view, /const CAMERA_HEADER_HEIGHT = 36;/);
  assert.match(view, /id="spacetimeCameraZoomReset"[^>]*>500%<\/button>/);
  assert.match(view, /return Math\.min\(CAMERA_MAX_ZOOM, Math\.max\(CAMERA_MIN_ZOOM, numeric\)\);/);
  assert.doesNotMatch(view, /100%/);
});

test("reviewed compact label geometry preserves text readability while reducing collision waste", () => {
  assert.equal(labelEngine.DEFAULT_LABEL_HEIGHT, 18);
  assert.equal(labelEngine.DEFAULT_HORIZONTAL_GAP, 2);
  assert.equal(labelEngine.DEFAULT_MIN_LABEL_WIDTH, 30);
  assert.equal(labelEngine.DEFAULT_MAX_LABEL_WIDTH, 148);
  assert.equal(labelEngine.DEFAULT_LABEL_CHROME_WIDTH, 4);
  assert.equal(labelEngine.DEFAULT_MIN_LABEL_WIDTH - labelEngine.DEFAULT_LABEL_CHROME_WIDTH, 26);
  assert.equal(labelEngine.DEFAULT_MAX_LABEL_WIDTH - labelEngine.DEFAULT_LABEL_CHROME_WIDTH, 144);
  assert.match(css, /\.spacetime-track-label\{[^}]*height:18px[^}]*padding:0 1px[^}]*font-size:10px[^}]*line-height:16px/);
  assert.doesNotMatch(css, /@media\(max-width:1100px\)\{\.spacetime-track-label\{font-size:9px\}/);
  assert.match(view, /labelEngine\.DEFAULT_MIN_LABEL_WIDTH/);
  assert.match(view, /labelEngine\.DEFAULT_MAX_LABEL_WIDTH/);
  assert.match(view, /labelEngine\.DEFAULT_LABEL_CHROME_WIDTH/);
  assert.doesNotMatch(view, /Math\.max\(38, Math\.min\(156/);
});

test("one global camera zoom owns both horizontal and vertical extent", () => {
  assert.match(view, /DEFAULT_TIMELINE_HEIGHT \* cameraZoom \* GLOBAL_EXTENT_COMPRESSION/);
  assert.match(view, /baseWorldWidth \* cameraZoom \* GLOBAL_EXTENT_COMPRESSION/);
  assert.match(view, /spaceAxis\.baseWorldWidthForViewport\(/);
  assert.doesNotMatch(view, /horizontalViewMode/);
  assert.doesNotMatch(view, /spacetimeHorizontalMode/);
  assert.doesNotMatch(view, /DETAIL_SPACE_ZOOM/);
  assert.doesNotMatch(view, /TIME_CAMERA_MIN_ZOOM/);
});

test("viewport growth cannot inflate base world beyond the global cap", () => {
  assert.equal(spaceAxis.baseWorldWidthForViewport(1024, 140), 900);
  assert.equal(spaceAxis.baseWorldWidthForViewport(1280, 140), 1138);
  assert.equal(spaceAxis.baseWorldWidthForViewport(1440, 140), 1275);
  assert.equal(spaceAxis.baseWorldWidthForViewport(1920, 140), 1275);
  assert.equal(spaceAxis.baseWorldWidthForViewport(3840, 140), 1275);
  assert.throws(() => spaceAxis.baseWorldWidthForViewport(1280, 140, { minWidth: 1300, maxWidth: 1200 }), /maxWidth must be >= minWidth/);
});

test("shared chrome geometry is compact and owned by renderer constants", () => {
  assert.match(view, /--spacetime-axis-width:\$\{AXIS_WIDTH\}px/);
  assert.match(view, /--spacetime-header-height:\$\{CAMERA_HEADER_HEIGHT\}px/);
  assert.match(css, /width:var\(--spacetime-axis-width,140px\)/);
  assert.match(css, /height:var\(--spacetime-header-height,36px\)/);
});

test("retired low-scale overview rendering has no production artifacts", () => {
  assert.equal(existsSync(new URL("../atlas-person-spacetime-density.js", import.meta.url)), false);
  assert.doesNotMatch(view, /ATLAS_PERSON_SPACETIME_DENSITY/);
  assert.doesNotMatch(view, /spacetimeDensityCanvas/);
  assert.doesNotMatch(view, /spacetimePointLayer/);
  assert.doesNotMatch(view, /spacetime-person-point/);
  assert.doesNotMatch(css, /spacetime-density/);
  assert.doesNotMatch(css, /spacetime-person-point/);
  assert.doesNotMatch(css, /is-overview/);
});

test("time projection is globally uniform and rejects below-floor zoom", () => {
  const projection = require("../atlas-person-spacetime-time-projection.js");
  assert.equal(typeof projection.createUniformTimeProjection, "function");
  assert.equal(projection.MIN_SUPPORTED_ZOOM, 5);
  assert.throws(() => projection.createUniformTimeProjection(-3000, 2026, 1000, 4.99), /zoom must be >= 5/);
  const scale = projection.createUniformTimeProjection(-3000, 2026, 10000, 5);
  const y1800 = scale.yForYear(1800);
  const y1900 = scale.yForYear(1900);
  const y2000 = scale.yForYear(2000);
  assert.ok(Math.abs((y1900 - y1800) - (y2000 - y1900)) < 1e-8);
  assert.equal(scale.mode, "linear_time");
});

test("LOD contains only reachable readable-scale representations", () => {
  const lod = require("../atlas-person-spacetime-lod.js");
  assert.throws(() => lod.lodWeights({ zoom: 4.99 }), /zoom must be >= 5/);
  const minimum = lod.lodWeights({ zoom: 5 });
  assert.equal(minimum.labels, 1);
  assert.equal(minimum.rails, 1);
  assert.equal(Object.hasOwn(minimum, "density"), false);
  assert.equal(Object.hasOwn(minimum, "points"), false);
  assert.equal(lod.representationStage(minimum), "rail");
});

test("control adapter derives its lower bound from the visible 500 percent reset", () => {
  assert.match(control, /const MAXIMUM_PERCENT = 800;/);
  assert.doesNotMatch(control, /spacetimeHorizontalMode/);
  assert.doesNotMatch(control, /captureHorizontalCamera/);
  assert.doesNotMatch(control, /restoreHorizontalCamera/);
});
