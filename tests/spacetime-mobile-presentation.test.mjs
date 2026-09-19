import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const spaceAxis = require("../atlas-person-spacetime-space-axis.js");
const view = readFileSync(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../atlas-person-spacetime-view.css", import.meta.url), "utf8");
const authorityCss = readFileSync(new URL("../atlas-main-authority-nav.css", import.meta.url), "utf8");

function numericConstant(name) {
  const match = view.match(new RegExp(`const ${name} = ([\\d.]+);`));
  assert.ok(match, `missing ${name}`);
  return Number(match[1]);
}

test("mobile presentation keeps semantic zoom at the reviewed 500 to 800 percent contract", () => {
  assert.equal(numericConstant("CAMERA_MIN_ZOOM"), 5);
  assert.equal(numericConstant("CAMERA_MAX_ZOOM"), 8);
  assert.equal(numericConstant("MOBILE_VIEWPORT_MAX_WIDTH"), 760);
  assert.equal(numericConstant("MOBILE_AXIS_WIDTH"), 96);
  assert.equal(numericConstant("MOBILE_ERA_AXIS_WIDTH"), 44);
  assert.equal(numericConstant("MOBILE_HEADER_HEIGHT"), 34);
  assert.equal(numericConstant("MOBILE_PRESENTATION_SCALE"), 0.46);
  assert.match(view, /const responsive = responsivePresentationMetrics\(viewportWidth\);/);
  assert.match(view, /lod\.lodWeights\(\{ zoom: cameraZoom \}\)/);
});

test("mobile presentation applies one uniform physical projection scale to both world axes", () => {
  assert.match(view, /DEFAULT_TIMELINE_HEIGHT \* cameraZoom \* GLOBAL_EXTENT_COMPRESSION \* responsive\.extentScale/);
  assert.match(view, /baseWorldWidth \* cameraZoom \* GLOBAL_EXTENT_COMPRESSION \* responsive\.extentScale/);
  assert.doesNotMatch(view, /mobileHorizontalScale|mobileVerticalScale/);
});

test("390px mobile viewport starts near four screen widths instead of the former ten-plus", () => {
  const axis = numericConstant("MOBILE_AXIS_WIDTH");
  const scale = numericConstant("MOBILE_PRESENTATION_SCALE");
  const minZoom = numericConstant("CAMERA_MIN_ZOOM");
  const compression = numericConstant("GLOBAL_EXTENT_COMPRESSION");
  const base = spaceAxis.baseWorldWidthForViewport(390, axis);
  const extent = base * minZoom * compression * scale;

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
  assert.match(css, /\.spacetime-scroll\{scrollbar-gutter:auto;touch-action:pan-x pan-y\}/);
  assert.match(view, /data-spacetime-presentation="\$\{responsive\.mobile \? "mobile" : "desktop"\}"/);
});

test("authority shell prevents wide spacetime descendants from becoming document width", () => {
  assert.match(authorityCss, /\.atlas-authority-shell \{[^}]*min-width: 0;[^}]*width: 100%;[^}]*max-width: 100%;[^}]*overflow-x: clip;/);
  assert.match(authorityCss, /\.atlas-dashboard-mount, \.person-spacetime-mount, \.atlas-polity-review-mount \{ min-width: 0; width: 100%; max-width: 100%; \}/);
});
