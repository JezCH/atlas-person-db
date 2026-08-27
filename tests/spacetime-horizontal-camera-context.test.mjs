import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const controlSource = readFileSync(new URL("../atlas-person-spacetime-control-state.js", import.meta.url), "utf8");
const viewSource = readFileSync(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");

function loadControlApi() {
  const window = {};
  const document = {
    readyState: "loading",
    addEventListener() {},
    getElementById() { return null; },
    documentElement: {}
  };
  vm.runInNewContext(controlSource, { window, document, MutationObserver: class MutationObserver {} }, {
    filename: "atlas-person-spacetime-control-state.js"
  });
  return window.ATLAS_PERSON_SPACETIME_CONTROL_STATE;
}

function approximatelyEqual(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${actual} ≈ ${expected}`);
}

test("horizontal camera snapshot survives the overview-to-detail DOM geometry change", () => {
  const api = loadControlApi();
  const scroll = { scrollLeft: 0, clientWidth: 1200 };
  const canvas = { offsetLeft: 168, offsetWidth: 1030, style: { width: "1030px" } };
  const sticky = { offsetWidth: 168 };
  const mount = {
    querySelector(selector) {
      if (selector === ".spacetime-scroll") return scroll;
      if (selector === ".spacetime-canvas") return canvas;
      if (selector === ".spacetime-sticky-corner") return sticky;
      return null;
    }
  };

  const snapshot = api.captureHorizontalCamera(mount);
  assert.ok(snapshot);
  approximatelyEqual(snapshot.ratio, 516 / 1030);

  canvas.offsetWidth = 3090;
  canvas.style.width = "3090px";
  assert.equal(api.restoreHorizontalCamera(mount, snapshot), true);
  approximatelyEqual(scroll.scrollLeft, 1032);
  approximatelyEqual(api.horizontalCenterRatio(scroll.scrollLeft, scroll.clientWidth, canvas.offsetLeft, canvas.offsetWidth), snapshot.ratio);
});

test("horizontal camera snapshot fails closed when spacetime geometry is unavailable", () => {
  const api = loadControlApi();
  assert.equal(api.captureHorizontalCamera({ querySelector() { return null; } }), null);
  assert.equal(api.restoreHorizontalCamera({ querySelector() { return null; } }, { ratio: 0.5 }), false);
});


test("window resize restores the same normalized horizontal world center", () => {
  const api = loadControlApi();
  const oldViewport = 2000;
  const oldAxis = 168;
  const oldWorld = 5490;
  const oldScrollLeft = 1829;
  const ratio = api.horizontalCenterRatio(oldScrollLeft, oldViewport, oldAxis, oldWorld);

  const newViewport = 1200;
  const newAxis = 168;
  const newWorld = 3090;
  const restoredLeft = api.scrollLeftForHorizontalCenter(ratio, newViewport, newAxis, newWorld);
  approximatelyEqual(api.horizontalCenterRatio(restoredLeft, newViewport, newAxis, newWorld), ratio);

  assert.match(viewSource, /pendingResizeHorizontalRatio\s*=\s*horizontalCameraRatioFromStoredGeometry\(\)/);
  assert.match(viewSource, /scrollLeftForHorizontalCameraRatio\(scroll, pendingResizeHorizontalRatio\)/);
  assert.ok(
    viewSource.indexOf("pendingResizeHorizontalRatio = horizontalCameraRatioFromStoredGeometry()")
      < viewSource.indexOf("if (mount && !mount.hidden) renderInto(mount)"),
    "resize must snapshot the normalized horizontal center before rerendering the resized world"
  );
});
