import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const controlSource = readFileSync(new URL("../atlas-person-spacetime-control-state.js", import.meta.url), "utf8");
const controlCss = readFileSync(new URL("../atlas-person-spacetime-control-state.css", import.meta.url), "utf8");
const viewSource = readFileSync(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");
const viewCss = readFileSync(new URL("../atlas-person-spacetime-view.css", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function loadControlApi() {
  const window = {};
  const document = {
    readyState: "loading",
    addEventListener() {},
    getElementById() { return null; },
    documentElement: {}
  };
  const context = { window, document, MutationObserver: class MutationObserver {} };
  vm.runInNewContext(controlSource, context, { filename: "atlas-person-spacetime-control-state.js" });
  return window.ATLAS_PERSON_SPACETIME_CONTROL_STATE;
}

function button(textContent = "") {
  return {
    textContent,
    disabled: false,
    attributes: new Map(),
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
  };
}

function zoomMount(current = "500%", minimum = null) {
  const zoomOut = button();
  const zoomValue = button(current);
  const zoomIn = button();
  const reset = button("기본");
  const nodes = {
    "#spacetimeCameraZoomOut": zoomOut,
    "#spacetimeCameraZoomValue": zoomValue,
    "#spacetimeCameraZoomIn": zoomIn,
    "#spacetimeCameraZoomReset": reset
  };
  return {
    mount: {
      dataset: minimum == null ? {} : { spacetimeMinimumZoomPercent: String(minimum) },
      querySelector(selector) { return nodes[selector] || null; }
    },
    zoomOut,
    zoomValue,
    zoomIn,
    reset
  };
}

function approximatelyEqual(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${actual} ≈ ${expected}`);
}

test("production page loads the unified spacetime camera control state", () => {
  assert.match(indexSource, /atlas-person-spacetime-control-state\.css/);
  assert.match(indexSource, /atlas-person-spacetime-control-state\.js/);
  assert.match(controlCss, /\.spacetime-camera button:disabled\{/);
  assert.doesNotMatch(controlCss, /spacetime-time-camera/);
});

test("viewport-fit can become the effective minimum on either side of 100 percent", () => {
  const api = loadControlApi();
  const state = zoomMount("500%");

  assert.equal(api.syncZoomControlState(state.mount), true);
  assert.equal(state.zoomOut.disabled, false);
  assert.equal(state.zoomIn.disabled, false);
  assert.equal(state.reset.disabled, true);

  state.zoomValue.textContent = "50%";
  assert.equal(api.syncZoomControlState(state.mount), true);
  assert.equal(state.zoomOut.disabled, true);
  assert.equal(state.zoomIn.disabled, false);
  assert.equal(state.reset.disabled, false);

  state.zoomValue.textContent = "625%";
  assert.equal(api.syncZoomControlState(state.mount), true);
  assert.equal(state.zoomOut.disabled, false);
  assert.equal(state.zoomIn.disabled, false);
  assert.equal(state.reset.disabled, false);

  const fitted = zoomMount("134%", 134);
  assert.equal(api.minimumPercentForMount(fitted.mount), 134);
  assert.equal(api.syncZoomControlState(fitted.mount), true);
  assert.equal(fitted.zoomOut.disabled, true);
  fitted.zoomValue.textContent = "168%";
  assert.equal(api.syncZoomControlState(fitted.mount), true);
  assert.equal(fitted.zoomOut.disabled, false);
});

test("1500 percent is the maximum", () => {
  const api = loadControlApi();
  const state = zoomMount("1500%");
  assert.equal(api.syncZoomControlState(state.mount), true);
  assert.equal(state.zoomOut.disabled, false);
  assert.equal(state.zoomIn.disabled, true);
  assert.equal(state.reset.disabled, false);
});

test("visible bounds stay aligned with the unified renderer camera contract", () => {
  const api = loadControlApi();
  assert.equal(api.parsePercent("500%"), 500);
  assert.equal(api.parsePercent(" 625% "), 625);
  assert.equal(api.parsePercent("not a zoom"), null);

  const minMatch = viewSource.match(/const CAMERA_MIN_ZOOM = ([\d.]+);/);
  const maxMatch = viewSource.match(/const CAMERA_MAX_ZOOM = ([\d.]+);/);
  const adapterMaxMatch = controlSource.match(/const MAXIMUM_PERCENT = ([\d.]+);/);
  assert.ok(minMatch);
  assert.ok(maxMatch);
  assert.ok(adapterMaxMatch);
  assert.equal(Number(minMatch[1]) * 100, 50);
  assert.equal(Number(maxMatch[1]) * 100, 1500);
  assert.equal(Number(adapterMaxMatch[1]), Number(maxMatch[1]) * 100);
  assert.match(viewSource, /function viewportFitMinimumZoom\(scroll, referenceZoom = cameraZoom\)/);
  assert.match(viewSource, /usableWidth \/ worldWidthAtOne/);
  assert.match(viewSource, /spacetimeMinimumZoomPercent/);
  assert.match(controlSource, /minimumPercentForMount\(mount\)/);
  assert.match(viewSource, /id="spacetimeCameraZoomReset"[^>]*aria-label="500% 기본 배율로 복귀"[^>]*>기본<\/button>/);
  assert.doesNotMatch(viewSource, /spacetimeTimeZoom/);
  assert.doesNotMatch(viewSource, />100%<\/button>/);
});

test("desktop toolbar uses a compact reset label without parsing it as a percent", () => {
  assert.doesNotMatch(controlSource, /parsePercent\(reset\.textContent\)/);
  assert.match(controlSource, /const atDefault = Math\.abs\(currentPercent - DEFAULT_PERCENT\) <= BOUND_EPSILON;/);
  assert.match(viewCss, /\.spacetime-controls input\{width:180px;height:30px/);
  assert.match(viewCss, /\.spacetime-camera button,\.spacetime-camera output\{height:30px/);
});

test("touch pinch inside spacetime controls the internal viewport-fit to 1500 percent camera", () => {
  assert.match(viewSource, /function bindPinchCameraZoom\(mount\)/);
  assert.match(viewSource, /event\.pointerType !== "touch"/);
  assert.match(viewSource, /event\.target\?\.closest\?\.\("\.spacetime-scroll"\)/);
  assert.match(viewSource, /start_zoom: cameraZoom/);
  assert.match(viewSource, /geometry\.distance \/ pinch\.start_distance/);
  assert.match(viewSource, /zoom: clampCameraZoom\(pinch\.start_zoom \* \(geometry\.distance \/ pinch\.start_distance\)\)/);
  assert.match(viewSource, /requestCameraZoom\([\s\S]*?pending\.zoom,[\s\S]*?pending\.client_x - rect\.left,[\s\S]*?pending\.client_y - rect\.top/);
  assert.match(viewSource, /bindPinchCameraZoom\(mount\);/);
  assert.match(viewCss, /\.spacetime-scroll\{height:54vh;min-height:400px;scrollbar-gutter:auto;touch-action:pan-x pan-y\}/);
});

test("desktop mouse drag pans the spacetime camera without stealing simple clicks", () => {
  assert.match(viewSource, /function bindMouseCameraPan\(scroll\)/);
  assert.match(viewSource, /const DRAG_THRESHOLD = 5;/);
  assert.match(viewSource, /event\.pointerType !== "mouse" \|\| event\.button !== 0/);
  assert.match(viewSource, /if \(!event\.target\?\.closest\?\.\("\.spacetime-canvas"\)\) return;/);
  assert.match(viewSource, /if \(interactiveTarget\(event\.target\)\) return;/);
  assert.match(viewSource, /event\.preventDefault\(\);\s*scroll\.classList\.add\("is-mouse-pan-armed"\);/);
  assert.match(viewSource, /Math\.hypot\(dx, dy\) < DRAG_THRESHOLD/);
  assert.match(viewSource, /scroll\.scrollLeft = drag\.start_left - dx;/);
  assert.match(viewSource, /scroll\.scrollTop = drag\.start_top - dy;/);
  assert.match(viewSource, /scroll\.classList\.add\("is-mouse-panning"\)/);
  assert.match(viewSource, /scroll\.addEventListener\("click",[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);[\s\S]*?, true\);/);
  assert.match(viewSource, /bindMouseCameraPan\(scroll\);/);
  assert.match(viewCss, /@media\(hover:hover\) and \(pointer:fine\)\{\.spacetime-canvas\{cursor:grab\}/);
  assert.match(viewCss, /\.spacetime-scroll\.is-mouse-pan-armed,\.spacetime-scroll\.is-mouse-pan-armed \*\{user-select:none\}/);
  assert.match(viewCss, /\.spacetime-scroll\.is-mouse-panning[^}]*cursor:grabbing!important/);
  assert.match(viewSource, /scroll\.classList\.remove\("is-mouse-pan-armed"\)/);
});

test("ctrl-wheel remains contained inside spacetime at the viewport-fit camera bound", () => {
  const wheelBlock = viewSource.match(/scroll\.addEventListener\("wheel",[\s\S]*?\}, \{ passive: false \}\);/)?.[0] || "";
  assert.match(wheelBlock, /event\.preventDefault\(\);[\s\S]*?clampCameraZoom\(wheelZoomTarget, scroll\)/);
});

test("mobile gesture arbiter keeps pan and pinch in separate touch sessions", () => {
  assert.match(viewSource, /let pinchSessionLocked = false;/);
  assert.match(viewSource, /const beginPinchTouchSession = \(event\) => \{/);
  assert.match(viewSource, /if \(!event\.touches \|\| event\.touches\.length < 2\) return;/);
  assert.match(viewSource, /pinchSessionLocked = true;[\s\S]*?event\.preventDefault\(\);/);
  assert.match(viewSource, /const guardPinchTouchMove = \(event\) => \{[\s\S]*?if \(!pinchSessionLocked\) return;[\s\S]*?event\.preventDefault\(\);/);
  assert.match(viewSource, /const finishPinchTouchSession = \(event\) => \{[\s\S]*?if \(event\.touches && event\.touches\.length > 0\) return;[\s\S]*?pinchSessionLocked = false;/);
  assert.match(viewSource, /mount\.addEventListener\("touchstart", beginPinchTouchSession, \{ passive: false \}\)/);
  assert.match(viewSource, /mount\.addEventListener\("touchmove", guardPinchTouchMove, \{ passive: false \}\)/);
  assert.match(viewSource, /mount\.addEventListener\("touchend", finishPinchTouchSession, \{ passive: false \}\)/);
  assert.match(viewSource, /mount\.addEventListener\("touchcancel", finishPinchTouchSession, \{ passive: false \}\)/);
  assert.match(viewSource, /if \(pointers\.size === 0\) pinchSessionLocked = false;/);
  assert.match(viewCss, /\.spacetime-scroll\{height:54vh;min-height:400px;scrollbar-gutter:auto;touch-action:pan-x pan-y\}/);
});

test("pinch outside spacetime remains browser page zoom", () => {
  assert.match(indexSource, /<meta name="viewport" content="width=device-width, initial-scale=1\.0" \/>/);
  assert.doesNotMatch(indexSource, /user-scalable\s*=\s*no/i);
  assert.doesNotMatch(indexSource, /maximum-scale\s*=\s*1/i);
  assert.match(viewSource, /const scroll = event\.target\?\.closest\?\.\("\.spacetime-scroll"\);/);
  assert.match(viewSource, /if \(!scroll \|\| !mount\.contains\(scroll\)\) return;/);
});

test("normalized horizontal camera center remains stable when the unified world extent changes", () => {
  const api = loadControlApi();
  const viewportWidth = 1200;
  const axisWidth = 152;
  const worldA = 4200;
  const worldB = 6300;
  const center = api.horizontalCenterRatio(1200, viewportWidth, axisWidth, worldA);
  const restored = api.scrollLeftForHorizontalCenter(center, viewportWidth, axisWidth, worldB);
  approximatelyEqual(api.horizontalCenterRatio(restored, viewportWidth, axisWidth, worldB), center);
});

test("control state contains no retired horizontal overview-detail adapter", () => {
  assert.doesNotMatch(controlSource, /spacetimeHorizontalMode/);
  assert.doesNotMatch(controlSource, /captureHorizontalCamera/);
  assert.doesNotMatch(controlSource, /restoreHorizontalCamera/);
  assert.match(controlSource, /let activeMount = null;/);
  assert.match(controlSource, /const observer = new MutationObserver\(bindCurrentMount\)/);
});
