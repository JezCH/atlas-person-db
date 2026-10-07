import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("SPACETIME-M2 restores shared focus ownership after late lazy-loaded CSS", () => {
  const tools = read("atlas-person-spacetime-instrument-tools.css");
  const canvas = read("atlas-person-spacetime-monumental-canvas.css");
  const nav = read("atlas-main-authority-nav.js");

  assert.match(canvas, /SPACETIME-M2 — Late focus ownership repair/);
  assert.match(canvas, /button:focus-visible,\n\.spacetime-frame\[data-spacetime-visual="chronology-v6"\] \.spacetime-scroll:focus-visible \{\n  outline: 1px solid var\(--atlas-focus-ring\);\n  outline-offset: 2px;/);

  const toolsM2 = tools.indexOf("SPACETIME-M2 — Late focus ownership repair");
  const lastOutlineNone = tools.lastIndexOf("outline: none;");
  assert.ok(toolsM2 > lastOutlineNone);

  for (const selector of [
    ".spacetime-controls input:focus",
    ".spacetime-camera button:focus-visible",
    ".spacetime-precision-legend > summary:focus-visible",
    ".spacetime-search-result-list button:focus-visible",
    ".spacetime-meanwhile-activities button:focus-visible",
    ".spacetime-minimap-surface:focus-visible",
    ".spacetime-inspector-actions button:focus-visible",
    ".spacetime-inspector-activity-select:focus-visible"
  ]) {
    assert.ok(tools.slice(toolsM2).includes(selector), `missing late focus selector: ${selector}`);
  }

  const m2 = tools.slice(toolsM2, tools.indexOf("/* V8 owns responsive hierarchy.", toolsM2));
  assert.match(m2, /outline: 1px solid var\(--atlas-focus-ring\)/);
  assert.match(m2, /outline-offset: 2px/);
  assert.doesNotMatch(m2, /outline:\s*none|rgba\(/);

  assert.match(nav, /atlas-person-spacetime-monumental-canvas\.css\?v=20261007-spacetime-m2-focus-v1/);
  assert.match(nav, /atlas-person-spacetime-instrument-tools\.css\?v=20261007-spacetime-m2-focus-v1/);
  assert.match(nav, /atlas-person-spacetime-mobile-v8\.css\?v=20261003-ui-v8-mobile-v1/);
  assert.match(nav, /atlas-person-spacetime-view\.js\?v=20261003-ui-v7-tools-v1/);
});
