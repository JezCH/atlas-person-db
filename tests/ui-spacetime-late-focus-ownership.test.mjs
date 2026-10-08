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

  assert.match(nav, /atlas-person-spacetime-monumental-canvas\.css\?v=20261008-spacetime-l1-chronograph-v1/);
  assert.match(nav, /atlas-person-spacetime-instrument-tools\.css\?v=20261008-spacetime-l2-instrument-finish-v1/);
  assert.match(nav, /atlas-person-spacetime-mobile-v8\.css\?v=20261007-spacetime-m4-mobile-material-v1/);
  assert.match(nav, /atlas-person-spacetime-view\.js\?v=20261003-ui-v7-tools-v1/);
});


test("SPACETIME-M3 keeps instrument hover, pressed, and selected luminance semantically distinct", () => {
  const tools = read("atlas-person-spacetime-instrument-tools.css");
  const nav = read("atlas-main-authority-nav.js");
  const m1 = tools.indexOf("SPACETIME-M1 — Shared instrument material integration");
  const m3 = tools.indexOf("SPACETIME-M3 — Instrument interaction luminance ownership");
  const m2 = tools.indexOf("SPACETIME-M2 — Late focus ownership repair");
  assert.ok(m1 >= 0 && m3 > m1 && m2 > m3);

  const material = tools.slice(m1, m2);
  assert.match(material, /\.spacetime-search-result-list button:hover,[^}]*background: var\(--atlas-material-wash-hover\)/);
  assert.match(material, /\.spacetime-meanwhile-activities button:hover,[^}]*background: var\(--atlas-material-wash-hover\)/);
  assert.doesNotMatch(material, /\.spacetime-search-result-list button:hover,[^}]*background: var\(--atlas-material-wash-active\)/);
  assert.doesNotMatch(material, /\.spacetime-meanwhile-activities button:hover,[^}]*background: var\(--atlas-material-wash-selected\)/);

  const active = tools.slice(m3, m2);
  for (const selector of [
    ".spacetime-camera button:active:not(:disabled)",
    ".spacetime-precision-legend > summary:active",
    ".spacetime-search-result-list button:active",
    ".spacetime-meanwhile-activities button:active",
    ".spacetime-inspector-actions button:active:not(:disabled)",
    ".spacetime-inspector-activity-select:active"
  ]) {
    assert.ok(active.includes(selector), `missing active selector: ${selector}`);
  }
  assert.match(active, /background: var\(--atlas-material-wash-active\)/);

  assert.match(tools, /\.spacetime-inspector-activity\.is-selected \{[\s\S]*?var\(--atlas-material-wash-selected\)/);
  assert.match(nav, /atlas-person-spacetime-instrument-tools\.css\?v=20261008-spacetime-l2-instrument-finish-v1/);
  assert.match(nav, /atlas-person-spacetime-monumental-canvas\.css\?v=20261008-spacetime-l1-chronograph-v1/);
});
