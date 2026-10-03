import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("UI V8 loads the static mobile hierarchy layer after Person Chronicle Detail", () => {
  const html = read("index.html");
  const detail = html.indexOf("atlas-person-chronicle-detail.css?v=20261003-ui-v5-detail-v1");
  const mobile = html.indexOf("atlas-ui-mobile-v8.css?v=20261003-ui-v8-mobile-v1");
  assert.ok(detail >= 0);
  assert.ok(mobile > detail);
  assert.match(html, /atlas-main-authority-nav\.js\?v=20261003-ui-v8-mobile-v1/);
});

test("UI V8 prevents document-width overflow at the 390px acceptance surface", () => {
  const css = read("atlas-ui-mobile-v8.css");
  const spacetime = read("atlas-person-spacetime-mobile-v8.css");

  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /html,\n  body \{\n    overflow-x: clip;/);
  assert.match(css, /\.person-card-grid\.person-table-grid \{[\s\S]*?max-width: 100%/);
  assert.match(spacetime, /\.person-spacetime-mount\[data-spacetime-tools="instrument-v7"\] \{[\s\S]*?overflow-x: clip/);
  assert.match(spacetime, /\.spacetime-workspace \{[\s\S]*?grid-template-columns: minmax\(0,1fr\)/);
});

test("UI V8 gives Person mobile controls sequential hierarchy instead of three cramped controls", () => {
  const css = read("atlas-ui-mobile-v8.css");

  assert.match(css, /\.person-era-navigator \{[\s\S]*?top: 58px/);
  assert.match(css, /background: rgba\(17,20,23,\.975\)/);
  assert.match(css, /\.person-era-search,[\s\S]*?border-bottom: 1px solid #40484d/);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*?\.person-era-nav-controls \{[\s\S]*?grid-template-columns: minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css, /\.person-era-search \{\n    grid-column: 1 \/ -1;/);
  assert.match(css, /\.person-domain-filter\.is-active \{[\s\S]*?border-color: var\(--person-filter-domain-color\)/);
});

test("UI V8 makes the mobile Person Register show name, period and one primary Activity first", () => {
  const css = read("atlas-ui-mobile-v8.css");

  assert.match(css, /Register: name \+ period \+ one primary activity are the immediate layer/);
  assert.match(css, /\.person-table-identity > strong \{[\s\S]*?font-size: 17px/);
  assert.match(css, /\.person-register-range \{[\s\S]*?font-size: 10px/);
  assert.match(css, /\.person-card-activity:nth-child\(n \+ 2\) \{\n    display: none;/);
  assert.match(css, /@media \(max-width: 390px\)[\s\S]*?\.person-table-identity > \.person-card-canonical,[\s\S]*?\.person-table-status-inline \{\n    display: none;/);

  const view = read("atlas-person-table-view.js");
  assert.match(view, /person-register-activities/);
  assert.match(view, /person-register-count/);
});

test("UI V8 keeps Detail rich on mobile while centering the portrait-first hero", () => {
  const css = read("atlas-ui-mobile-v8.css");

  assert.match(css, /Detail: portrait first, identity second, then editorial chronology/);
  assert.match(css, /#personMainDetail\.person-main-detail \{[\s\S]*?width: calc\(100vw - 8px\)/);
  assert.match(css, /\.person-chronicle-hero \.person-detail-portrait \{\n    width: min\(248px, 70vw\)/);
  assert.match(css, /\.person-chronicle-identity \{\n    text-align: center;/);
  assert.match(css, /\.person-detail-status \{\n    justify-content: center;/);
  assert.match(css, /@media \(max-width: 390px\)[\s\S]*?width: min\(230px, 68vw\)/);
});

test("UI V8 loads Spacetime mobile CSS after V7 and keeps the toolbar two-tier", () => {
  const nav = read("atlas-main-authority-nav.js");
  const v7 = "atlas-person-spacetime-instrument-tools.css?v=20261003-ui-v7-tools-v1";
  const v8 = "atlas-person-spacetime-mobile-v8.css?v=20261003-ui-v8-mobile-v1";
  const css = read("atlas-person-spacetime-mobile-v8.css");

  assert.ok(nav.includes(v7));
  assert.ok(nav.includes(v8));
  assert.ok(nav.indexOf(v7) < nav.indexOf(v8));
  assert.match(css, /Two-tier toolbar: search first, camera second/);
  assert.match(css, /\.spacetime-controls \{[\s\S]*?grid-template-columns: minmax\(0,1fr\)/);
  assert.match(css, /\.spacetime-camera \{[\s\S]*?grid-template-columns: 34px 38px minmax\(58px,auto\) 38px minmax\(48px,auto\)/);
  assert.match(css, /\.spacetime-precision-legend \{\n    display: none;/);
});

test("UI V8 prioritizes macroregions on mobile and lets existing semantic LOD restore subregions above overview", () => {
  const css = read("atlas-person-spacetime-mobile-v8.css");
  const view = read("atlas-person-spacetime-view.js");

  assert.match(css, /Macroregion first\. Subregion returns above overview zoom through existing LOD/);
  assert.match(css, /\.spacetime-frame\[data-spacetime-overview="true"\] \.spacetime-region-head-layer\.is-subregion \{\n    opacity: 0 !important;/);
  assert.match(css, /\.spacetime-region-head-layer\.is-place,[\s\S]*?opacity: 0 !important/);
  assert.match(css, /\.spacetime-era-boundary-emblem \{[\s\S]*?width: 5px/);
  assert.match(view, /data-spacetime-overview="\$\{cameraZoom <= CAMERA_DEFAULT_ZOOM \? "true" : "false"\}"/);
  assert.match(view, /style="opacity:\$\{spaceHeader\.subregion_opacity\}"/);
});

test("UI V8 keeps mobile side tools compact and selection-driven", () => {
  const css = read("atlas-person-spacetime-mobile-v8.css");

  assert.match(css, /Sidecar hierarchy: minimap before inspector, selection expands inspector/);
  assert.match(css, /\.spacetime-minimap \{[\s\S]*?order: 1/);
  assert.match(css, /\.spacetime-sticky-inspector \{[\s\S]*?order: 2/);
  assert.match(css, /\.spacetime-minimap-surface \{\n    height: 88px;/);
  assert.match(css, /\.spacetime-sticky-inspector\.is-empty \{[\s\S]*?max-height: 49px/);
  assert.match(css, /@media \(max-width: 390px\)[\s\S]*?\.spacetime-minimap-surface \{\n    height: 76px;/);
});

test("UI V8 syncs mobile appbar title with the active authority domain", () => {
  const nav = read("atlas-main-authority-nav.js");
  assert.match(nav, /const mobileTitle = document\.querySelector\("\.mobile-appbar-title strong"\)/);
  assert.match(nav, /const mobileSubtitle = document\.querySelector\("\.mobile-appbar-title small"\)/);
  assert.match(nav, /mobileTitle\.textContent = meta\?\.label \|\| personHeading\.title/);
  assert.match(nav, /mobileSubtitle\.textContent = "ATLAS 편집"/);
});

test("UI V8 leaves Spacetime geometry constants and data paths unchanged", () => {
  const view = read("atlas-person-spacetime-view.js");
  assert.match(view, /const CAMERA_MIN_ZOOM = 0\.5;/);
  assert.match(view, /const CAMERA_DEFAULT_ZOOM = 5;/);
  assert.match(view, /const CAMERA_MAX_ZOOM = 15;/);
  assert.match(view, /const GLOBAL_EXTENT_COMPRESSION = 0\.748;/);
  assert.match(view, /const MOBILE_AXIS_WIDTH = 80;/);
  assert.match(view, /const MOBILE_ERA_AXIS_WIDTH = 36;/);
  assert.match(view, /const MOBILE_PRESENTATION_SCALE = 0\.46;/);
  assert.match(view, /dataStore\.loadSpatialIndex/);
  assert.match(view, /dataStore\.loadPersons/);
});
