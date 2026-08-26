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

test("spacetime zoom-bound affordance is loaded by the production page", () => {
  assert.match(indexSource, /atlas-person-spacetime-control-state\.css\?v=20260826-zoom-bound-affordance/);
  assert.match(indexSource, /atlas-person-spacetime-control-state\.js\?v=20260826-zoom-bound-affordance/);
  assert.match(controlCss, /\.spacetime-time-camera button:disabled\{/);
});

test("minimum zoom disables controls that cannot change the camera", () => {
  const api = loadControlApi();
  const zoomOut = button();
  const zoomValue = button("100%");
  const reset = button("100%");
  const nodes = {
    "#spacetimeTimeZoomOut": zoomOut,
    "#spacetimeTimeZoomValue": zoomValue,
    "#spacetimeTimeZoomReset": reset
  };
  const mount = { querySelector(selector) { return nodes[selector] || null; } };

  assert.equal(api.syncZoomControlState(mount), true);
  assert.equal(zoomOut.disabled, true);
  assert.equal(reset.disabled, true);
  assert.equal(zoomOut.attributes.get("aria-disabled"), "true");
  assert.equal(reset.attributes.get("aria-disabled"), "true");

  zoomValue.textContent = "135%";
  assert.equal(api.syncZoomControlState(mount), true);
  assert.equal(zoomOut.disabled, false);
  assert.equal(reset.disabled, false);
  assert.equal(zoomOut.attributes.get("aria-disabled"), "false");
});

test("minimum bound is derived from the rendered reset control and stays aligned with the renderer contract", () => {
  const api = loadControlApi();
  assert.equal(api.parsePercent("100%"), 100);
  assert.equal(api.parsePercent(" 135% "), 135);
  assert.equal(api.parsePercent("not a zoom"), null);
  assert.match(viewSource, /const TIME_CAMERA_MIN_ZOOM = 1;/);
  assert.match(viewSource, /id="spacetimeTimeZoomReset"[^>]*>100%<\/button>/);
  assert.doesNotMatch(controlSource, /TIME_CAMERA_MAX_ZOOM|800\s*%/);
});
