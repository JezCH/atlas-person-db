import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const controlSource = readFileSync(new URL("../atlas-person-spacetime-control-state.js", import.meta.url), "utf8");

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
