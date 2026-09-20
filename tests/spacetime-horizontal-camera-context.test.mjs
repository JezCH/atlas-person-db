import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const controlSource = readFileSync(new URL("../atlas-person-spacetime-control-state.js", import.meta.url), "utf8");
const viewSource = readFileSync(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../atlas-person-spacetime-view.css", import.meta.url), "utf8");

function loadControlApi() {
  const window = {};
  const document = { readyState: "loading", addEventListener() {}, getElementById() { return null; }, documentElement: {} };
  vm.runInNewContext(controlSource, { window, document, MutationObserver: class MutationObserver {} }, { filename: "atlas-person-spacetime-control-state.js" });
  return window.ATLAS_PERSON_SPACETIME_CONTROL_STATE;
}
function approximatelyEqual(a,b,e=1e-9){ assert.ok(Math.abs(a-b)<=e, `${a} != ${b}`); }

test("normalized horizontal center survives uniform extent changes", () => {
  const api = loadControlApi();
  const ratio = api.horizontalCenterRatio(1829, 2000, 152, 5490);
  const restored = api.scrollLeftForHorizontalCenter(ratio, 1200, 152, 3090);
  approximatelyEqual(api.horizontalCenterRatio(restored, 1200, 152, 3090), ratio);
});

test("retired overview-detail snapshot adapter is absent", () => {
  assert.equal(loadControlApi().captureHorizontalCamera, undefined);
  assert.equal(loadControlApi().restoreHorizontalCamera, undefined);
  assert.doesNotMatch(controlSource, /spacetimeHorizontalMode/);
});

test("era and year columns share one sticky horizontal freeze pane", () => {
  assert.match(viewSource, /<div class="spacetime-time-axis" style="height:\$\{timelineHeight\}px">/);
  assert.match(viewSource, /<div class="spacetime-era-axis"/);
  assert.match(viewSource, /<div class="spacetime-year-axis"/);
  assert.match(cssSource, /\.spacetime-time-axis\{position:sticky;z-index:28;left:0;width:var\(--spacetime-axis-width,140px\)/);
  assert.match(cssSource, /\.spacetime-year-axis\{position:absolute;z-index:1;left:var\(--spacetime-era-axis-width,68px\);top:0;/);
  assert.match(cssSource, /\.spacetime-time-axis\{[^}]*margin-top:0\}/);
});

test("window resize restores normalized horizontal center", () => {
  assert.match(viewSource, /pendingViewportHorizontalRatio\s*=\s*horizontalCameraRatioFromStoredGeometry\(\)/);
  assert.match(viewSource, /scrollLeftForHorizontalCameraRatio\(scroll, pendingViewportHorizontalRatio\)/);
});

test("window resize preserves historical time at viewport center", () => {
  assert.match(viewSource, /pendingViewportCameraOrdinal\s*=\s*cameraCenterOrdinal/);
  assert.match(viewSource, /projection\.worldToScreenY\(pendingViewportCameraOrdinal\)/);
  assert.match(viewSource, /cameraHeaderHeight\(scroll\) \+ centerY - cameraViewportCenterY\(scroll\)/);
});

test("unified pointer zoom explicitly preserves horizontal ratio and historical ordinal", () => {
  assert.match(viewSource, /horizontal_ratio: horizontalPointerRatio\(scroll, safeViewportX\)/);
  assert.match(viewSource, /ordinal: currentTimelineProjection\.screenToWorldOrdinal\(currentCanvasY\)/);
  assert.match(viewSource, /scrollLeftForHorizontalPointerRatio\(scroll, pendingCameraAnchor\.horizontal_ratio, pendingCameraAnchor\.viewport_x\)/);
});
