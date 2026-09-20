import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const view = readFileSync(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../atlas-person-spacetime-view.css", import.meta.url), "utf8");
const lod = readFileSync(new URL("../atlas-person-spacetime-lod.js", import.meta.url), "utf8");
const semanticAxis = readFileSync(new URL("../atlas-person-spacetime-semantic-axis.js", import.meta.url), "utf8");

test("spacetime opens at 500 percent default inside a wider zoom range", () => {
  assert.match(view, /const CAMERA_MIN_ZOOM = 0\.5;/);
  assert.match(view, /const CAMERA_DEFAULT_ZOOM = 5;/);
  assert.match(view, /const CAMERA_MAX_ZOOM = 15;/);
  assert.match(view, /let cameraZoom = CAMERA_DEFAULT_ZOOM;/);
  assert.match(view, /const GLOBAL_EXTENT_COMPRESSION = 0\.748;/);
  assert.match(view, /baseWorldWidth \* cameraZoom \* GLOBAL_EXTENT_COMPRESSION/);
  assert.match(view, /DEFAULT_TIMELINE_HEIGHT \* cameraZoom \* GLOBAL_EXTENT_COMPRESSION/);
  assert.doesNotMatch(view, /horizontalViewMode/);
  assert.doesNotMatch(view, /spacetimeHorizontalMode/);
  assert.doesNotMatch(view, /DETAIL_SPACE_ZOOM/);
});

test("alternate density overview representations remain physically absent", () => {
  assert.equal(existsSync(new URL("../atlas-person-spacetime-density.js", import.meta.url)), false);
  assert.doesNotMatch(view, /density\.buildDensityField/);
  assert.doesNotMatch(view, /spacetimeDensityCanvas/);
  assert.doesNotMatch(view, /spacetimePointLayer/);
  assert.doesNotMatch(view, /spacetime-person-point/);
  assert.doesNotMatch(css, /spacetime-density/);
  assert.doesNotMatch(css, /spacetime-person-point/);
  assert.doesNotMatch(css, /is-overview/);
});

test("viewport-fit minimum representation remains Person labels plus rails", () => {
  assert.match(lod, /const MIN_SUPPORTED_ZOOM = 0\.5;/);
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

test("subregion context remains available across the widened range", () => {
  assert.match(view, /semanticAxis\.buildSpaceHeaderPlan\(compiled\.continuum, contentWidth, cameraZoom, spatialCompile\.REVIEWED_PLACE_BINDINGS\)/);
  assert.match(view, /spacetime-region-head-layer is-subregion/);
  assert.match(semanticAxis, /PLACE_DETAIL_START_ZOOM = 7\.2/);
  assert.match(semanticAxis, /stage: zoom > PLACE_DETAIL_START_ZOOM \? "place" : "subregion"/);
  assert.match(semanticAxis, /subregion_opacity: 1 - 0\.18 \* placeOpacity/);
  assert.doesNotMatch(semanticAxis, /stage: "macroregion"/);
});

test("desktop sidecar stays compact and expands the inspector only when populated", () => {
  assert.match(css, /\.spacetime-sidecar\{display:grid;gap:8px;min-width:0;align-self:start;position:sticky;top:8px;max-height:clamp\(480px,62vh,720px\);overflow:hidden\}/);
  assert.match(css, /\.spacetime-sticky-inspector:not\(\.is-empty\)\{max-height:calc\(clamp\(480px,62vh,720px\) - 148px\)\}/);
  assert.match(css, /\.spacetime-sticky-inspector\.is-empty\{min-height:0;max-height:76px;padding:9px 10px/);
  assert.match(css, /\.spacetime-minimap-surface\{[^}]*height:112px/);
  assert.match(css, /\.spacetime-sidecar\{position:relative;top:auto;max-height:none;overflow:visible\}/);
});

test("desktop status and empty meanwhile rows stay compact above the table", () => {
  assert.match(css, /@media\(min-width:761px\)\{[\s\S]*?\.spacetime-status-row\{align-items:center;overflow:visible;padding-bottom:0;margin-bottom:2px\}/);
  assert.match(css, /\.spacetime-status-more>summary\{display:inline-flex;align-items:center;height:24px/);
  assert.match(css, /\.spacetime-status-more-content\{display:none!important;position:absolute;z-index:85/);
  assert.match(css, /\.spacetime-status-more\[open\]>.spacetime-status-more-content\{display:flex!important/);
  assert.match(css, /\.spacetime-meanwhile\.is-empty\{min-height:16px;padding:0;margin:0 0 2px\}/);
});

test("spacetime top chrome keeps compact controls and moves precision guidance behind a disclosure", () => {
  assert.match(view, /<section class="spacetime-toolbar card">[\s\S]*?<div class="spacetime-controls">[\s\S]*?<details class="spacetime-precision-legend">[\s\S]*?<summary>표시 기준<\/summary>/);
  assert.match(view, /<div class="spacetime-precision-content">[\s\S]*?공간 배치 정밀도/);
  assert.doesNotMatch(view, /<section class="spacetime-precision-legend card">/);
  assert.doesNotMatch(view, /spacetime-integrity-note/);
  assert.match(view, /spacetime-integrity-status/);
  assert.match(view, /근거 없는 위치는 자동 추정하지 않습니다\./);
  assert.match(view, /spacetimeDomPersonCount/);
  assert.match(view, /spacetimeDeferredLabelCount/);
  assert.match(view, /<section class="spacetime-meanwhile is-empty"/);
  assert.doesNotMatch(view, /spacetime-meanwhile card is-empty/);
  assert.match(css, /\.spacetime-toolbar\{display:flex;align-items:center;justify-content:flex-start;gap:8px;padding:5px 7px;margin-bottom:4px;overflow:visible/);
  assert.match(css, /\.spacetime-status-row\{display:flex;gap:4px;flex-wrap:nowrap;margin-bottom:4px;overflow-x:auto/);
  assert.match(css, /\.spacetime-controls input\{width:180px;height:30px/);
  assert.match(css, /\.spacetime-camera\{display:flex;align-items:center/);
  assert.match(css, /\.spacetime-precision-legend\{position:relative;margin-left:auto/);
  assert.match(css, /\.spacetime-precision-content\{position:absolute;z-index:90/);
});

test("the timeline remains a map-like camera viewport", () => {
  assert.match(css, /\.spacetime-scroll\{[^}]*overflow:auto/);
  assert.match(css, /height:clamp\(480px,62vh,720px\)/);
  assert.match(css, /max-height:720px/);
  assert.match(css, /overscroll-behavior:contain/);
});

test("sticky era axis stays opaque while only era content fades", () => {
  assert.match(view, /class="spacetime-era-axis" style="--spacetime-era-content-opacity:\$\{timeAxis\.era_opacity\}"/);
  assert.doesNotMatch(view, /class="spacetime-era-axis" style="opacity:/);
  assert.match(css, /\.spacetime-era-axis\{[^}]*background:#fff/);
  assert.match(css, /\.spacetime-era-axis>div\{[^}]*opacity:var\(--spacetime-era-content-opacity,1\)/);
});

test("common chrome and label geometry are uniformly compact", () => {
  assert.match(css, /\.spacetime-sticky-corner\{[^}]*width:var\(--spacetime-axis-width,140px\);height:var\(--spacetime-header-height,36px\)/);
  assert.match(css, /\.spacetime-region-head\{[^}]*height:var\(--spacetime-header-height,36px\);margin-top:calc\(-1 \* var\(--spacetime-header-height,36px\)\);margin-left:var\(--spacetime-axis-width,140px\)/);
  assert.match(css, /\.spacetime-time-axis\{[^}]*margin-top:0\}/);
  assert.match(css, /\.spacetime-canvas\{[^}]*left:var\(--spacetime-axis-width,140px\);top:var\(--spacetime-header-height,36px\)/);
  assert.match(css, /\.spacetime-track-label\{[^}]*height:18px/);
});
