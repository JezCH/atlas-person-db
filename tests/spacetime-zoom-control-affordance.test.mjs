import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const controlSource = readFileSync(new URL("../atlas-person-spacetime-control-state.js", import.meta.url), "utf8");
const controlCss = readFileSync(new URL("../atlas-person-spacetime-control-state.css", import.meta.url), "utf8");
const viewSource = readFileSync(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");
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

function zoomMount(current = "500%") {
  const zoomOut = button();
  const zoomValue = button(current);
  const zoomIn = button();
  const reset = button("500%");
  const nodes = {
    "#spacetimeCameraZoomOut": zoomOut,
    "#spacetimeCameraZoomValue": zoomValue,
    "#spacetimeCameraZoomIn": zoomIn,
    "#spacetimeCameraZoomReset": reset
  };
  return {
    mount: { querySelector(selector) { return nodes[selector] || null; } },
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

test("500 percent is the visible and structural minimum", () => {
  const api = loadControlApi();
  const state = zoomMount("500%");

  assert.equal(api.syncZoomControlState(state.mount), true);
  assert.equal(state.zoomOut.disabled, true);
  assert.equal(state.zoomIn.disabled, false);
  assert.equal(state.reset.disabled, true);
  assert.equal(state.zoomOut.attributes.get("aria-disabled"), "true");
  assert.equal(state.zoomIn.attributes.get("aria-disabled"), "false");
  assert.equal(state.reset.attributes.get("aria-disabled"), "true");

  state.zoomValue.textContent = "625%";
  assert.equal(api.syncZoomControlState(state.mount), true);
  assert.equal(state.zoomOut.disabled, false);
  assert.equal(state.zoomIn.disabled, false);
  assert.equal(state.reset.disabled, false);
});

test("800 percent is the maximum", () => {
  const api = loadControlApi();
  const state = zoomMount("800%");
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
  assert.equal(Number(minMatch[1]) * 100, 500);
  assert.equal(Number(adapterMaxMatch[1]), Number(maxMatch[1]) * 100);
  assert.match(viewSource, /id="spacetimeCameraZoomReset"[^>]*>500%<\/button>/);
  assert.doesNotMatch(viewSource, /spacetimeTimeZoom/);
  assert.doesNotMatch(viewSource, />100%<\/button>/);
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
