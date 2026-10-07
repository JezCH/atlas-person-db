import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("UI V6 loads a dedicated chronology canvas after the base Spacetime stylesheet", () => {
  const html = read("index.html");
  const nav = read("atlas-main-authority-nav.js");
  assert.match(html, /atlas-main-authority-nav\.js\?v=20261004-dashboard-v11-r2/);
  assert.match(html, /atlas-domain-surface-owner\.js\?v=20261004-ui-p1-dark-name-v1/);
  const base = 'atlas-person-spacetime-view.css?v=20260923-runtime-ownership-v1';
  const v6 = 'atlas-person-spacetime-monumental-canvas.css?v=20261007-spacetime-m2-focus-v1';
  assert.ok(nav.includes(base));
  assert.ok(nav.includes(v6));
  const v7 = 'atlas-person-spacetime-instrument-tools.css?v=20261007-spacetime-m3-luminance-v1';
  assert.ok(nav.indexOf(base) < nav.indexOf(v6));
  assert.ok(nav.indexOf(v6) < nav.indexOf(v7));
  assert.match(nav, /atlas-person-spacetime-view\.js\?v=20261003-ui-v7-tools-v1/);
});

test("UI V6 marks the canonical Spacetime frame without changing geometry constants", () => {
  const view = read("atlas-person-spacetime-view.js");
  assert.match(view, /data-spacetime-visual="chronology-v6"/);
  assert.match(view, /const CAMERA_MIN_ZOOM = 0\.5;/);
  assert.match(view, /const CAMERA_DEFAULT_ZOOM = 5;/);
  assert.match(view, /const CAMERA_MAX_ZOOM = 15;/);
  assert.match(view, /const GLOBAL_EXTENT_COMPRESSION = 0\.748;/);
  assert.match(view, /baseWorldWidth \* cameraZoom \* GLOBAL_EXTENT_COMPRESSION/);
  assert.doesNotMatch(view, /lane_offset/);
});

test("UI V6 adds full-width era boundary presentation without altering the era model", () => {
  const view = read("atlas-person-spacetime-view.js");
  assert.match(view, /spacetime-era-boundary/);
  assert.match(view, /eras\.filter\(\(era\) => era\.top > 0\)/);
  assert.match(view, /data-spacetime-era="\$\{escapeHtml\(era\.code\)\}"/);
  assert.match(view, /spacetime-era-boundary-emblem/);

  const css = read("atlas-person-spacetime-monumental-canvas.css");
  assert.match(css, /\.spacetime-era-boundary \{/);
  assert.match(css, /width: 100%/);
  assert.match(css, /spacetime-era-boundary-emblem/);
  assert.match(css, /font-family: var\(--atlas-font-display/);
});

test("UI V6 uses deep graphite chronology field and chronographic hierarchy", () => {
  const css = read("atlas-person-spacetime-monumental-canvas.css");
  assert.match(css, /--spacetime-ink: #121518/);
  assert.match(css, /\.spacetime-canvas \{/);
  assert.match(css, /\.spacetime-century-line\.is-major/);
  assert.match(css, /--spacetime-chronograph/);
  assert.match(css, /\.spacetime-region-head-layer\.is-macro/);
  assert.match(css, /text-transform: uppercase/);
  assert.match(css, /\.spacetime-year-axis span\.is-major::before/);
});

test("UI V6 makes Person labels strips and keeps domain color strongest on rails", () => {
  const css = read("atlas-person-spacetime-monumental-canvas.css");
  assert.match(css, /Person labels: text strips, not cards/);
  assert.match(css, /border-left: 2px solid var\(--spacetime-person-domain-edge\)/);
  assert.match(css, /\.spacetime-track-rail \{/);
  assert.match(css, /background: var\(--spacetime-person-domain-color\)/);
  assert.match(css, /\.spacetime-track-rail\.is-selected/);
  assert.match(css, /var\(--spacetime-selection-metal-strong\)/);

  const domainCss = read("atlas-person-spacetime-domain-colors.css");
  assert.match(domainCss, /var\(--atlas-person-domain-governance-surface\)/);
  assert.match(domainCss, /var\(--atlas-person-domain-technology-surface\)/);
  assert.match(domainCss, /rgba\(212,175,55,\.11\)/);
  assert.doesNotMatch(domainCss, /rgba\(255,255,255,\.94\)/);
});

test("UI V6 preserves uncertainty grammar and does not domain-color Activity glyphs", () => {
  const baseCss = read("atlas-person-spacetime-view.css");
  const v6Css = read("atlas-person-spacetime-monumental-canvas.css");
  const domainJs = read("atlas-person-spacetime-domain-colors.js");

  assert.match(baseCss, /border-top:1px dashed/);
  assert.match(baseCss, /\.spacetime-spatial-uncertainty\.is-subregion\{border-top-style:dotted/);
  assert.match(baseCss, /\.spacetime-multi-place-anchor/);
  assert.match(v6Css, /Preserve uncertainty grammar/);
  assert.doesNotMatch(v6Css, /border-top-style:\s*solid/);
  assert.doesNotMatch(domainJs, /spacetime-activity-glyph/);
});

test("UI V6 refreshes dynamically loaded domain-color CSS", () => {
  const owner = read("atlas-domain-surface-owner.js");
  assert.match(owner, /atlas-person-spacetime-domain-colors\.css\?v=20261004-person-domain-v2/);
  assert.match(owner, /if \(domain === "spacetime"\)/);
});
