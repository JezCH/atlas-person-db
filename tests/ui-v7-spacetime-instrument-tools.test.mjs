import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("UI V7 loads after the V6 chronology canvas and cache-busts the modified loader", () => {
  const html = read("index.html");
  const nav = read("atlas-main-authority-nav.js");
  const base = 'atlas-person-spacetime-view.css?v=20260923-runtime-ownership-v1';
  const v6 = 'atlas-person-spacetime-monumental-canvas.css?v=20261008-spacetime-l1-chronograph-v1';
  const v7 = 'atlas-person-spacetime-instrument-tools.css?v=20261007-spacetime-m3-luminance-v1';

  const v8 = 'atlas-person-spacetime-mobile-v8.css?v=20261007-spacetime-m4-mobile-material-v1';
  assert.match(html, /atlas-main-authority-nav\.js\?v=20261004-dashboard-v11-r2/);
  assert.ok(nav.includes(base));
  assert.ok(nav.includes(v6));
  assert.ok(nav.includes(v7));
  assert.ok(nav.includes(v8));
  assert.ok(nav.indexOf(base) < nav.indexOf(v6));
  assert.ok(nav.indexOf(v6) < nav.indexOf(v7));
  assert.ok(nav.indexOf(v7) < nav.indexOf(v8));
  assert.match(nav, /atlas-person-spacetime-view\.js\?v=20261003-ui-v7-tools-v1/);
});

test("UI V7 marks the Spacetime mount as an instrument surface", () => {
  const view = read("atlas-person-spacetime-view.js");
  assert.match(view, /mount\.dataset\.spacetimeTools = "instrument-v7"/);
  assert.match(view, /data-spacetime-visual="chronology-v6"/);
});

test("UI V7 turns toolbar controls into an instrument rail rather than boxed controls", () => {
  const css = read("atlas-person-spacetime-instrument-tools.css");
  assert.match(css, /TOOLBAR — an instrument rail/);
  assert.match(css, /\.spacetime-toolbar \{/);
  assert.match(css, /border-top: 1px solid var\(--spacetime-tools-line-soft\)/);
  assert.match(css, /border-bottom: 1px solid var\(--spacetime-tools-line\)/);
  assert.match(css, /\.spacetime-controls input \{/);
  assert.match(css, /border-bottom: 1px solid #4a5257/);
  assert.match(css, /\.spacetime-camera button,/);
  assert.match(css, /background: transparent/);
  assert.match(css, /\.spacetime-precision-content \{/);
  assert.match(css, /background: rgba\(18,21,24,\.985\)/);
});

test("UI V7 converts status pills into a micro telemetry line while retaining warning emphasis", () => {
  const css = read("atlas-person-spacetime-instrument-tools.css");
  assert.match(css, /STATUS — micro telemetry, pills only for warnings/);
  assert.match(css, /\.spacetime-status-row > span,/);
  assert.match(css, /border-radius: 0/);
  assert.match(css, /background: transparent/);
  assert.match(css, /content: "·"/);
  assert.match(css, /\.spacetime-integrity-status/);
  assert.match(css, /rgba\(197,156,86,\.42\)/);
});

test("UI V7 makes minimap an instrument overview with a dark world and neutral density marks", () => {
  const css = read("atlas-person-spacetime-instrument-tools.css");
  const view = read("atlas-person-spacetime-view.js");

  assert.match(css, /SIDECAR — minimap \+ inspector read as one instrument stack/);
  assert.match(css, /\.spacetime-minimap-surface \{/);
  assert.match(css, /background: #101315/);
  assert.match(css, /\.spacetime-minimap-viewport \{/);
  assert.match(css, /border: 1px solid var\(--spacetime-tools-metal\)/);
  assert.match(css, /\.spacetime-minimap-selected \{/);

  assert.match(view, /context\.fillStyle = "#101315"/);
  assert.match(view, /context\.strokeStyle = "#343b40"/);
  assert.match(view, /context\.strokeStyle = "#2a3034"/);
  assert.match(view, /rgba\(205,201,191,\.28\)/);
  assert.doesNotMatch(view, /context\.fillStyle = "#f8fafc"/);
});

test("UI V7 applies selection-as-ceremony to the inspector", () => {
  const css = read("atlas-person-spacetime-instrument-tools.css");
  assert.match(css, /INSPECTOR — quiet before selection, stronger only after selection/);
  assert.match(css, /\.spacetime-sticky-inspector\.is-empty \{/);
  assert.match(css, /max-height: 58px/);
  assert.match(css, /\.spacetime-sticky-inspector\.is-empty p \{/);
  assert.match(css, /display: none/);
  assert.match(css, /\.spacetime-inspector-person > strong \{/);
  assert.match(css, /font-family: var\(--atlas-font-display/);
  assert.match(css, /\.spacetime-inspector-activity\.is-selected \{/);
  assert.match(css, /box-shadow: inset 2px 0 0 rgba\(192,174,136,\.62\)/);
});

test("UI V7 preserves evidence, interaction IDs and geometry/camera invariants", () => {
  const view = read("atlas-person-spacetime-view.js");
  const css = read("atlas-person-spacetime-instrument-tools.css");

  for (const id of [
    "spacetimeSearch",
    "spacetimeCameraZoomOut",
    "spacetimeCameraZoomValue",
    "spacetimeCameraZoomIn",
    "spacetimeCameraZoomReset",
    "spacetimeMinimapSurface",
    "spacetimePrevPerson",
    "spacetimeFocusPerson",
    "spacetimeDetailPerson",
    "spacetimeNextPerson",
    "spacetimeClearPerson"
  ]) assert.match(view, new RegExp(id));

  assert.match(view, /const CAMERA_MIN_ZOOM = 0\.5;/);
  assert.match(view, /const CAMERA_DEFAULT_ZOOM = 5;/);
  assert.match(view, /const CAMERA_MAX_ZOOM = 15;/);
  assert.match(view, /const GLOBAL_EXTENT_COMPRESSION = 0\.748;/);
  assert.match(view, /dataStore\.loadSpatialIndex/);
  assert.match(view, /dataStore\.loadPersons/);
  assert.match(css, /Evidence becomes stacked instrument readout/);
});

test("UI V7 defers responsive hierarchy changes to V8 and preserves reduced-motion handling", () => {
  const css = read("atlas-person-spacetime-instrument-tools.css");
  assert.match(css, /V8 owns responsive hierarchy/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
