import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
const canvas = read("atlas-person-spacetime-monumental-canvas.css");
const tools = read("atlas-person-spacetime-instrument-tools.css");
const mobile = read("atlas-person-spacetime-mobile-v8.css");
const nav = read("atlas-main-authority-nav.js");
const html = read("index.html");

function declarationBlock(css, selector) {
  const index = css.indexOf(selector + " {");
  assert.ok(index >= 0, `selector not found: ${selector}`);
  const end = css.indexOf("\n}", index);
  assert.ok(end > index, `selector is not closed: ${selector}`);
  return css.slice(index, end + 2);
}

const canvasSelector = (suffix) => `.spacetime-frame[data-spacetime-visual="chronology-v6"] ${suffix}`;
const toolsSelector = (suffix) => `.person-spacetime-mount[data-spacetime-tools="instrument-v7"] ${suffix}`;

test("UI-03A chronology uses readable major year, era and world-region labels without resizing the world model", () => {
  assert.match(declarationBlock(canvas, canvasSelector(".spacetime-region-head-layer.is-macro .spacetime-region-head-band strong")), /font-size: 11px/);
  assert.match(declarationBlock(canvas, canvasSelector(".spacetime-region-head-layer.is-macro .spacetime-region-head-band small")), /font-size: 9px/);
  assert.match(declarationBlock(canvas, canvasSelector(".spacetime-region-head-layer.is-subregion .spacetime-region-head-band strong")), /font-size: 10px/);
  assert.match(declarationBlock(canvas, canvasSelector(".spacetime-era-axis > div span")), /font-size: 11px/);
  assert.match(declarationBlock(canvas, canvasSelector(".spacetime-year-axis span")), /font-size: 10px/);
  assert.match(declarationBlock(canvas, canvasSelector(".spacetime-year-axis span.is-major")), /font-size: 11\.5px/);
  assert.match(canvas, /--spacetime-label-muted: #a9b2b6/);
  assert.match(declarationBlock(canvas, canvasSelector(".spacetime-track-label")), /height: 18px/);
  assert.match(declarationBlock(canvas, canvasSelector(".spacetime-track-label")), /font-size: 10px/);
});

test("UI-03A inspector keeps readable historical activity with six navigation actions", () => {
  assert.match(declarationBlock(tools, toolsSelector(".spacetime-controls input")), /font-size: 12px/);
  assert.match(declarationBlock(tools, toolsSelector(".spacetime-inspector-person > p")), /font-size: 11px/);
  assert.match(declarationBlock(tools, toolsSelector(".spacetime-inspector-actions button")), /font-size: 10px/);
  assert.match(declarationBlock(tools, toolsSelector(".spacetime-inspector-activity-select strong")), /font-size: 11px/);
  assert.match(declarationBlock(tools, toolsSelector(".spacetime-inspector-actions")), /grid-template-columns: repeat\(6,minmax\(0,1fr\)\)/);
});

test("UI-03A responsive hierarchy and deployed lazy stylesheet versions stay attached", () => {
  assert.match(mobile, /\.spacetime-region-head-layer\.is-macro \.spacetime-region-head-band strong \{\s*font-size: 9\.5px/);
  assert.match(mobile, /\.spacetime-year-axis span\.is-major \{\s*font-size: 10px/);
  assert.match(mobile, /\.spacetime-inspector-actions button \{\s*min-width: 0;\s*height: 30px;\s*font-size: 9px/);
  for (const name of [
    "atlas-person-spacetime-monumental-canvas.css",
    "atlas-person-spacetime-instrument-tools.css",
    "atlas-person-spacetime-mobile-v8.css"
  ]) {
    assert.match(nav, new RegExp(name.replaceAll(".", "\\.") + "\\?v=[^\"\\n]+&ui=20261119-ui03a-readability-v1"));
  }
  assert.match(html, /atlas-main-authority-nav\.js\?v=[a-z0-9-]+&ui=20261119-ui03a-readability-v1/);
  assert.match(read("atlas-person-spacetime-view.js"), /const CAMERA_DEFAULT_ZOOM = 5;/);
  assert.match(read("atlas-person-spacetime-view.js"), /const GLOBAL_EXTENT_COMPRESSION = 0\.748;/);
});
