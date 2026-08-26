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

function zoomMount(current = "100%") {
  const zoomOut = button();
  const zoomValue = button(current);
  const zoomIn = button();
  const reset = button("100%");
  const nodes = {
    "#spacetimeTimeZoomOut": zoomOut,
    "#spacetimeTimeZoomValue": zoomValue,
    "#spacetimeTimeZoomIn": zoomIn,
    "#spacetimeTimeZoomReset": reset
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

test("spacetime camera control state is loaded by the production page", () => {
  assert.match(indexSource, /atlas-person-spacetime-control-state\.css\?v=20260826-zoom-bound-affordance/);
  assert.match(indexSource, /atlas-person-spacetime-control-state\.js\?v=20260826-zoom-bounds-affordance/);
  assert.match(controlCss, /\.spacetime-time-camera button:disabled\{/);
});

test("minimum zoom disables only controls that cannot change the camera", () => {
  const api = loadControlApi();
  const state = zoomMount("100%");

  assert.equal(api.syncZoomControlState(state.mount), true);
  assert.equal(state.zoomOut.disabled, true);
  assert.equal(state.zoomIn.disabled, false);
  assert.equal(state.reset.disabled, true);
  assert.equal(state.zoomOut.attributes.get("aria-disabled"), "true");
  assert.equal(state.zoomIn.attributes.get("aria-disabled"), "false");
  assert.equal(state.reset.attributes.get("aria-disabled"), "true");

  state.zoomValue.textContent = "135%";
  assert.equal(api.syncZoomControlState(state.mount), true);
  assert.equal(state.zoomOut.disabled, false);
  assert.equal(state.zoomIn.disabled, false);
  assert.equal(state.reset.disabled, false);
});

test("maximum zoom disables zoom-in while preserving zoom-out and reset", () => {
  const api = loadControlApi();
  const state = zoomMount("800%");

  assert.equal(api.syncZoomControlState(state.mount), true);
  assert.equal(state.zoomOut.disabled, false);
  assert.equal(state.zoomIn.disabled, true);
  assert.equal(state.reset.disabled, false);
  assert.equal(state.zoomIn.attributes.get("aria-disabled"), "true");

  state.zoomValue.textContent = "605%";
  assert.equal(api.syncZoomControlState(state.mount), true);
  assert.equal(state.zoomIn.disabled, false);
  assert.equal(state.zoomIn.attributes.get("aria-disabled"), "false");
});

test("visible zoom bounds stay aligned with the renderer camera contract", () => {
  const api = loadControlApi();
  assert.equal(api.parsePercent("100%"), 100);
  assert.equal(api.parsePercent(" 135% "), 135);
  assert.equal(api.parsePercent("not a zoom"), null);

  const minMatch = viewSource.match(/const TIME_CAMERA_MIN_ZOOM = ([\d.]+);/);
  const maxMatch = viewSource.match(/const TIME_CAMERA_MAX_ZOOM = ([\d.]+);/);
  const adapterMaxMatch = controlSource.match(/const MAXIMUM_PERCENT = ([\d.]+);/);
  assert.ok(minMatch);
  assert.ok(maxMatch);
  assert.ok(adapterMaxMatch);
  assert.equal(Number(minMatch[1]) * 100, 100);
  assert.equal(Number(adapterMaxMatch[1]), Number(maxMatch[1]) * 100);
  assert.match(viewSource, /id="spacetimeTimeZoomReset"[^>]*>100%<\/button>/);
});

test("overview to detail space zoom preserves the horizontal world center", () => {
  const api = loadControlApi();
  const viewportWidth = 1200;
  const axisWidth = 168;
  const overviewWorldWidth = 1030;
  const detailWorldWidth = overviewWorldWidth * 3;

  const overviewCenter = api.horizontalCenterRatio(0, viewportWidth, axisWidth, overviewWorldWidth);
  approximatelyEqual(overviewCenter, 516 / 1030);

  const detailScrollLeft = api.scrollLeftForHorizontalCenter(overviewCenter, viewportWidth, axisWidth, detailWorldWidth);
  approximatelyEqual(detailScrollLeft, 1032);

  const detailCenter = api.horizontalCenterRatio(detailScrollLeft, viewportWidth, axisWidth, detailWorldWidth);
  approximatelyEqual(detailCenter, overviewCenter);
});

test("horizontal camera context clamps safely at world edges and non-scrollable overview", () => {
  const api = loadControlApi();
  assert.equal(api.scrollLeftForHorizontalCenter(0, 1200, 168, 3090), 0);
  assert.equal(api.scrollLeftForHorizontalCenter(1, 1200, 168, 3090), 2058);
  assert.equal(api.scrollLeftForHorizontalCenter(0.75, 1200, 168, 1030), 0);
  assert.equal(api.horizontalCenterRatio(0, 1200, 168, 0), null);
  assert.match(controlSource, /addEventListener\("change"[\s\S]*spacetimeHorizontalMode[\s\S]*captureHorizontalCamera/);
  assert.match(controlSource, /Promise\.resolve\(\)\.then\(\(\) => restoreHorizontalCamera\(mount, snapshot\)\)/);
});
