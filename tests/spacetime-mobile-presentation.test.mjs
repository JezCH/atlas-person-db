import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const spaceAxis = require("../atlas-person-spacetime-space-axis.js");
const view = readFileSync(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../atlas-person-spacetime-view.css", import.meta.url), "utf8");
const authorityCss = readFileSync(new URL("../atlas-main-authority-nav.css", import.meta.url), "utf8");
const mobileCss = readFileSync(new URL("../mobile-compact.css", import.meta.url), "utf8");

function numericConstant(name) {
  const match = view.match(new RegExp(`const ${name} = ([\\d.]+);`));
  assert.ok(match, `missing ${name}`);
  return Number(match[1]);
}

test("mobile presentation keeps a 500 default inside the 100 to 1500 percent contract", () => {
  assert.equal(numericConstant("CAMERA_MIN_ZOOM"), 1);
  assert.equal(numericConstant("CAMERA_DEFAULT_ZOOM"), 5);
  assert.equal(numericConstant("CAMERA_MAX_ZOOM"), 15);
  assert.equal(numericConstant("MOBILE_VIEWPORT_MAX_WIDTH"), 760);
  assert.equal(numericConstant("MOBILE_AXIS_WIDTH"), 80);
  assert.equal(numericConstant("MOBILE_ERA_AXIS_WIDTH"), 36);
  assert.equal(numericConstant("MOBILE_HEADER_HEIGHT"), 34);
  assert.equal(numericConstant("MOBILE_PRESENTATION_SCALE"), 0.46);
  assert.match(view, /const responsive = responsivePresentationMetrics\(viewportWidth\);/);
  assert.match(view, /lod\.lodWeights\(\{ zoom: cameraZoom \}\)/);
});


test("mobile toolbar keeps separate rows while using compact controls", () => {
  assert.match(css, /\.spacetime-toolbar\{display:grid;grid-template-columns:1fr;gap:4px;max-width:100%;padding:5px 6px/);
  assert.match(css, /\.spacetime-controls\{display:grid;grid-template-columns:1fr;gap:4px;width:100%;min-width:0\}/);
  assert.match(css, /\.spacetime-controls label\{display:grid;grid-template-columns:38px minmax\(0,1fr\)/);
  assert.match(css, /\.spacetime-controls input\{width:100%;min-width:0;height:38px\}/);
  assert.match(css, /\.spacetime-camera\{display:grid;grid-template-columns:38px minmax\(62px,1fr\) 38px 64px/);
  assert.match(css, /\.spacetime-camera button,\.spacetime-camera output\{height:38px/);
  assert.match(css, /\.spacetime-precision-legend\{display:none\}/);
});

test("mobile vertical chrome is compact without changing timeline geometry", () => {
  assert.match(css, /\.spacetime-scroll\{height:54vh;min-height:400px;scrollbar-gutter:auto;touch-action:pan-x pan-y\}/);
  assert.match(css, /\.spacetime-status-row\{max-width:100%;display:flex;flex-wrap:wrap;gap:3px;overflow:visible;margin-bottom:4px\}/);
  assert.match(css, /\.spacetime-meanwhile\.is-empty span\{display:none\}/);
  assert.match(css, /\.spacetime-sticky-inspector\.is-empty\{min-height:0;padding:8px 10px\}/);
  assert.match(css, /\.spacetime-sticky-inspector\.is-empty p\{display:none\}/);
  assert.match(css, /\.spacetime-minimap-surface\{height:92px\}/);
  assert.match(css, /@media\(max-width:560px\)\{\.spacetime-minimap\{width:100%\}\.spacetime-minimap-surface\{height:84px\}/);
});

test("mobile 100 to 500 percent overview prioritizes macroregions and defers leaf labels", () => {
  assert.match(view, /data-spacetime-zoom="\$\{Math\.round\(cameraZoom \* 100\)\}"/);
  assert.match(view, /data-spacetime-overview="\$\{cameraZoom <= CAMERA_DEFAULT_ZOOM \? "true" : "false"\}"/);
  assert.match(css, /data-spacetime-overview="true"\] \.spacetime-region-head-layer\.is-macro\{opacity:1!important\}/);
  assert.match(css, /data-spacetime-overview="true"\] \.spacetime-region-head-layer\.is-subregion\{opacity:0!important\}/);
  assert.match(css, /data-spacetime-overview="true"\] \.spacetime-subregion-line\{opacity:\.16!important\}/);
});

test("mobile status surface keeps only core chips visible until expanded", () => {
  assert.match(view, /class="spacetime-status-primary"/);
  assert.match(view, /<details class="spacetime-status-more">/);
  assert.match(view, /<summary>상태 더보기<\/summary>/);
  assert.match(css, /\.spacetime-status-more:not\(\[open\]\)>\.spacetime-status-more-content\{display:none!important\}/);
  assert.match(css, /\.spacetime-status-more\[open\]>\.spacetime-status-more-content\{display:flex!important/);
});

test("mobile spacetime sticky headers stay below the mobile app bar", () => {
  assert.match(mobileCss, /\.mobile-appbar \{[\s\S]*?z-index:40;/);
  assert.match(css, /\.spacetime-frame\.is-mobile-presentation \.spacetime-sticky-corner\{z-index:35\}/);
  assert.match(css, /\.spacetime-frame\.is-mobile-presentation \.spacetime-region-head\{z-index:30\}/);
});

test("mobile minimap is a non-overlay sidecar panel", () => {
  assert.match(view, /<aside class="spacetime-sidecar">[\s\S]*?\$\{renderMinimap\(\)\}[\s\S]*?\$\{renderStickyInspector/);
  assert.match(css, /\.spacetime-sidecar\{display:grid;gap:8px;min-width:0;align-self:start;position:sticky/);
  assert.match(css, /\.spacetime-sidecar\{position:relative;top:auto;max-height:none;overflow:visible\}/);
  assert.match(css, /\.spacetime-minimap\{position:relative;right:auto;bottom:auto;z-index:1;width:100%/);
  assert.doesNotMatch(css, /\.spacetime-frame\.is-mobile-presentation \.spacetime-minimap/);
});

test("mobile region header shares the first row with era and year headers", () => {
  assert.match(css, /.spacetime-frame\.is-mobile-presentation \.spacetime-region-head\{z-index:30\}/);
});

test("mobile presentation applies one uniform physical projection scale to both world axes", () => {
  assert.match(view, /DEFAULT_TIMELINE_HEIGHT \* cameraZoom \* GLOBAL_EXTENT_COMPRESSION \* responsive\.extentScale/);
  assert.match(view, /baseWorldWidth \* cameraZoom \* GLOBAL_EXTENT_COMPRESSION \* responsive\.extentScale/);
  assert.doesNotMatch(view, /mobileHorizontalScale|mobileVerticalScale/);
});

test("390px mobile viewport starts near four screen widths instead of the former ten-plus", () => {
  const axis = numericConstant("MOBILE_AXIS_WIDTH");
  const scale = numericConstant("MOBILE_PRESENTATION_SCALE");
  const defaultZoom = numericConstant("CAMERA_DEFAULT_ZOOM");
  const compression = numericConstant("GLOBAL_EXTENT_COMPRESSION");
  const base = spaceAxis.baseWorldWidthForViewport(390, axis);
  const extent = base * defaultZoom * compression * scale;

  assert.equal(base, 900);
  assert.ok(extent >= 1300 && extent <= 1700, `unexpected mobile extent: ${extent}`);
  assert.ok(Math.abs(extent - 1548.36) < 1e-9);
});

test("camera interactions derive mobile insets from rendered geometry rather than desktop constants", () => {
  assert.match(view, /function cameraInsets\(scroll\)/);
  assert.match(view, /axis_width: offsetLeft > 0 \? offsetLeft : AXIS_WIDTH/);
  assert.match(view, /const insets = cameraInsets\(scroll\);/);
  assert.match(view, /\{ leftInset: insets\.left, topInset: insets\.top \}/);
  assert.match(view, /cameraInsets\(scroll\)/);
});

test("mobile spacetime remains contained inside its own scroll viewport", () => {
  assert.match(css, /@media\(max-width:760px\)\{[^}]*\.person-spacetime-mount\{width:100%;max-width:100%;min-width:0;overflow-x:clip;contain:inline-size\}/);
  assert.match(css, /\.spacetime-workspace,\.spacetime-frame,\.spacetime-scroll\{width:100%;max-width:100%;min-width:0\}/);
  assert.match(css, /\.spacetime-scroll\{height:54vh;min-height:400px;scrollbar-gutter:auto;touch-action:pan-x pan-y\}/);
  assert.match(view, /data-spacetime-presentation="\$\{responsive\.mobile \? "mobile" : "desktop"\}"/);
});

test("authority shell prevents wide spacetime descendants from becoming document width", () => {
  assert.match(authorityCss, /\.atlas-authority-shell \{[^}]*min-width: 0;[^}]*width: 100%;[^}]*max-width: 100%;[^}]*overflow-x: clip;/);
  assert.match(authorityCss, /\.atlas-dashboard-mount, \.person-spacetime-mount, \.atlas-polity-review-mount \{ min-width: 0; width: 100%; max-width: 100%; \}/);
});
