import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("SPACETIME-L2 publishes the premium instrument stylesheet after the merged L1 chronology canvas", () => {
  const nav = read("atlas-main-authority-nav.js");
  const canvas = "atlas-person-spacetime-monumental-canvas.css?v=20261008-spacetime-l1-chronograph-v1";
  const tools = "atlas-person-spacetime-instrument-tools.css?v=20261008-spacetime-l2-instrument-finish-v1";
  const mobile = "atlas-person-spacetime-mobile-v8.css?v=20261007-spacetime-m4-mobile-material-v1";
  assert.ok(nav.includes(canvas), "merged canvas asset must remain authoritative");
  assert.ok(nav.includes(tools), "P1b CSS version must be published");
  assert.ok(nav.includes(mobile), "later mobile authority must be preserved");
  assert.ok(nav.indexOf(canvas) < nav.indexOf(tools));
  assert.ok(nav.indexOf(tools) < nav.indexOf(mobile));
});

test("SPACETIME-L2 provides refined quiet materials and selected dossier emphasis without geometry changes", () => {
  const css = read("atlas-person-spacetime-instrument-tools.css");
  const start = css.indexOf("/* SPACETIME-L2 — Precision instrument finish.");
  const end = css.indexOf("/* V8 owns responsive hierarchy.", start);
  assert.ok(start >= 0 && end > start);
  const finish = css.slice(start, end);

  for (const item of [
    ".spacetime-toolbar",
    ".spacetime-minimap",
    ".spacetime-minimap-surface",
    ".spacetime-minimap-viewport",
    ".spacetime-sticky-inspector:not(.is-empty)",
    ".spacetime-inspector-person > strong",
    ".spacetime-inspector-activity.is-selected",
    ".spacetime-selection-evidence-row"
  ]) assert.ok(finish.includes(item), item);

  for (const token of [
    "--atlas-material-sheen-strong",
    "--atlas-material-hairline-soft",
    "--atlas-material-edge-dark",
    "--atlas-material-wash-selected",
    "--atlas-material-rail",
    "--atlas-text-strong"
  ]) assert.ok(finish.includes(`var(${token})`), token);

  // The material checkpoint never changes world geometry, input dimensions,
  // text scale, selection state machine, domain-color ownership or camera.
  assert.doesNotMatch(finish, /(?:^|\n)\s*(?:width|height|min-width|max-width|min-height|max-height|padding|margin|gap|font-size|line-height|letter-spacing|grid-template-columns|grid-template-rows|left|right|top|bottom|position|transform|opacity|z-index)\s*:/);
  assert.doesNotMatch(finish, /#[\da-f]{3,8}\b/i);
  assert.doesNotMatch(finish, /@keyframes|animation:|transition:|!important/);
  assert.match(finish, /\.spacetime-inspector-activity\.is-selected\s*\{[\s\S]*?inset 2px 0 0 var\(--atlas-material-rail\)/);
  assert.match(finish, /\.spacetime-sticky-inspector:not\(\.is-empty\)\s*\{/);
  assert.doesNotMatch(finish, /\.person-register-entry|\.person-table-|person-card-grid/);
});
