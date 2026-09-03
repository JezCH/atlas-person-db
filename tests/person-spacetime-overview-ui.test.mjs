import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const view = readFileSync(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../atlas-person-spacetime-view.css", import.meta.url), "utf8");
const lod = readFileSync(new URL("../atlas-person-spacetime-lod.js", import.meta.url), "utf8");
const semanticAxis = readFileSync(new URL("../atlas-person-spacetime-semantic-axis.js", import.meta.url), "utf8");

test("spacetime opens directly at the readable 500 percent floor", () => {
  assert.match(view, /const CAMERA_MIN_ZOOM = 5;/);
  assert.match(view, /let cameraZoom = CAMERA_MIN_ZOOM;/);
  assert.match(view, /const GLOBAL_EXTENT_COMPRESSION = 0\.748;/);
  assert.match(view, /baseWorldWidth \* cameraZoom \* GLOBAL_EXTENT_COMPRESSION/);
  assert.match(view, /DEFAULT_TIMELINE_HEIGHT \* cameraZoom \* GLOBAL_EXTENT_COMPRESSION/);
  assert.doesNotMatch(view, /horizontalViewMode/);
  assert.doesNotMatch(view, /spacetimeHorizontalMode/);
  assert.doesNotMatch(view, /DETAIL_SPACE_ZOOM/);
});

test("below-floor overview representations are physically absent", () => {
  assert.equal(existsSync(new URL("../atlas-person-spacetime-density.js", import.meta.url)), false);
  assert.doesNotMatch(view, /density\.buildDensityField/);
  assert.doesNotMatch(view, /spacetimeDensityCanvas/);
  assert.doesNotMatch(view, /spacetimePointLayer/);
  assert.doesNotMatch(view, /spacetime-person-point/);
  assert.doesNotMatch(css, /spacetime-density/);
  assert.doesNotMatch(css, /spacetime-person-point/);
  assert.doesNotMatch(css, /is-overview/);
});

test("minimum representation is Person labels plus rails", () => {
  assert.match(lod, /const MIN_SUPPORTED_ZOOM = 5;/);
  assert.match(lod, /labels: 1/);
  assert.match(lod, /rails: 1/);
  assert.doesNotMatch(lod, /density_fade_start/);
  assert.doesNotMatch(lod, /point_in_start/);
  assert.match(view, /spacetime-track-label/);
  assert.match(view, /spacetime-track-rail/);
  assert.match(css, /\.spacetime-track-label\{/);
  assert.match(css, /\.spacetime-track-rail\{/);
});

test("world geometry remains stable and density-independent", () => {
  assert.match(view, /spaceAxis\.stableRegionLayout\(compiled\.continuum, contentWidth\)/);
  assert.match(view, /segment\.x_anchor \* contentWidth/);
  assert.doesNotMatch(view, /lane_offset/);
  assert.doesNotMatch(view, /peak concurrency/i);
  assert.doesNotMatch(view, /buildRegionMeta/);
});

test("subregion context is always available at the readable floor", () => {
  assert.match(view, /semanticAxis\.buildSpaceHeaderPlan\(compiled\.continuum, contentWidth, cameraZoom, spatialCompile\.REVIEWED_PLACE_BINDINGS\)/);
  assert.match(view, /spacetime-region-head-layer is-subregion/);
  assert.match(semanticAxis, /PLACE_DETAIL_START_ZOOM = 7\.2/);
  assert.match(semanticAxis, /stage: zoom > PLACE_DETAIL_START_ZOOM \? "place" : "subregion"/);
  assert.match(semanticAxis, /subregion_opacity: 1 - 0\.18 \* placeOpacity/);
  assert.doesNotMatch(semanticAxis, /stage: "macroregion"/);
});

test("the timeline remains a map-like camera viewport", () => {
  assert.match(css, /\.spacetime-scroll\{[^}]*overflow:auto/);
  assert.match(css, /height:clamp\(520px,72vh,860px\)/);
  assert.match(css, /max-height:860px/);
  assert.match(css, /overscroll-behavior:contain/);
});

test("common chrome and label geometry are uniformly compact", () => {
  assert.match(css, /\.spacetime-sticky-corner\{[^}]*width:var\(--spacetime-axis-width,112px\);height:var\(--spacetime-header-height,32px\)/);
  assert.match(css, /\.spacetime-region-head\{[^}]*height:var\(--spacetime-header-height,32px\);margin-left:var\(--spacetime-axis-width,112px\)/);
  assert.match(css, /\.spacetime-canvas\{[^}]*left:var\(--spacetime-axis-width,112px\);top:var\(--spacetime-header-height,32px\)/);
  assert.match(css, /\.spacetime-track-label\{[^}]*height:18px/);
});
