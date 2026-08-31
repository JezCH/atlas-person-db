import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const view = readFileSync(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../atlas-person-spacetime-view.css", import.meta.url), "utf8");

test("exploration remains on the single production renderer", () => {
  assert.doesNotThrow(() => new Function(view));
  assert.match(view, /ATLAS_PERSON_SPACETIME_EXPLORATION/);
  assert.match(view, /exploration\.projectTrack\(track, projection, contentWidth\)/);
  assert.match(view, /exploration\.focusScrollTarget/);
  assert.match(view, /exploration\.panTarget/);
  assert.doesNotMatch(view, /spacetime-v2/i);
});

test("search and direct selection preserve camera context", () => {
  assert.match(view, /renderSearchResults\(searchItems, needle\)/);
  assert.match(view, /if \(event\.isComposing\) return;/);
  assert.match(view, /selectPerson\(mount, first\.person_id, \{ focus: true \}\)/);
  assert.match(view, /target\.dataset\.spacetimePerson, \{ focus: false \}/);
  assert.match(css, /\.spacetime-search-results\{/);
});

test("detail action raises only the unified camera zoom", () => {
  assert.match(view, /const FOCUS_DETAIL_ZOOM = 6\.5;/);
  assert.match(view, /if \(selectedPersonId && options\.detail\)/);
  assert.match(view, /cameraZoom = Math\.max\(cameraZoom, FOCUS_DETAIL_ZOOM\)/);
  assert.doesNotMatch(view, /horizontalViewMode/);
  assert.doesNotMatch(view, /timeCameraZoom/);
  assert.match(view, /id="spacetimeDetailPerson"/);
});

test("keyboard navigation keeps panning cycling focus zoom and selection clearing", () => {
  assert.match(view, /scroll\.addEventListener\("keydown"/);
  assert.match(view, /exploration\.keyboardCommand\(event\)/);
  assert.match(view, /command === "zoom-in" \|\| command === "zoom-out"/);
  assert.match(view, /requestCameraZoom\(mount, keyboardZoomTarget\)/);
  assert.match(view, /command === "clear-selection"/);
  assert.match(view, /Shift\+↑\/↓ 이전\/다음 인물/);
});

test("keyboard and modifier-wheel zoom respect the 500 percent bound", () => {
  const keydown = view.indexOf('scroll.addEventListener("keydown"');
  const keyTarget = view.indexOf('const keyboardZoomTarget = command === "zoom-in"', keydown);
  const keyGuard = view.indexOf('Math.abs(clampCameraZoom(keyboardZoomTarget) - cameraZoom) < 1e-9', keydown);
  const keyRequest = view.indexOf('requestCameraZoom(mount, keyboardZoomTarget);', keydown);
  assert.ok(keyTarget > keydown && keyGuard > keyTarget && keyRequest > keyGuard);

  const wheel = view.indexOf('scroll.addEventListener("wheel"');
  const wheelTarget = view.indexOf('const wheelZoomTarget = cameraZoom * factor;', wheel);
  const wheelGuard = view.indexOf('Math.abs(clampCameraZoom(wheelZoomTarget) - cameraZoom) < 1e-9', wheel);
  const wheelRequest = view.indexOf('requestCameraZoom(mount, wheelZoomTarget, event.clientX - rect.left, event.clientY - rect.top);', wheel);
  assert.ok(wheelTarget > wheel && wheelGuard > wheelTarget && wheelRequest > wheelGuard);
});

test("selection cycling remains inert with one Person", () => {
  assert.match(view, /const canCycle = Number\(navigationCount\) > 1/);
  assert.match(view, /navigationItems\.length <= 1\) return/);
  assert.match(css, /\.spacetime-selection-actions button:disabled/);
});

test("activation invalidates stale data requests and retry reloads failed runtime scripts", () => {
  assert.match(view, /let dataLoadGeneration = 0/);
  assert.match(view, /if \(generation !== dataLoadGeneration\) return false/);
  assert.match(view, /dataLoadGeneration \+= 1/);
  assert.match(view, /runtimePromise = null/);
  assert.match(view, /script\.remove\?\.\(\)/);
});
