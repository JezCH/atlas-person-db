import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("UI V9 loads last after the V8 mobile layer", () => {
  const html = read("index.html");
  const v8 = html.indexOf("atlas-ui-mobile-v8.css?v=20261007-mobile-era1-ownership-v1");
  const v9 = html.indexOf("atlas-ui-motion-material-v9.css?v=20261007-controls-m2-luminance-v1");
  assert.ok(v8 >= 0);
  assert.ok(v9 > v8);
});

test("UI V9 defines one restrained motion system", () => {
  const css = read("atlas-ui-motion-material-v9.css");
  assert.match(css, /--atlas-motion-fast: 110ms/);
  assert.match(css, /--atlas-motion-standard: 170ms/);
  assert.match(css, /--atlas-motion-emphasis: 240ms/);
  assert.match(css, /--atlas-motion-ease: cubic-bezier\(\.2,\.72,\.2,1\)/);
  assert.match(css, /No decorative particles, fake parchment, marble, shimmer, or layout animation/);
  assert.doesNotMatch(css, /animation-iteration-count:\s*infinite/);
});

test("UI P5 keeps Register semantic state out of the motion layer", () => {
  const motion = read("atlas-ui-motion-material-v9.css");
  const register = read("atlas-person-monumental-register.css");
  assert.match(motion, /Person Register: motion only; semantic state lives in Register/);
  assert.match(motion, /\.person-register-entry::after \{\n  transition:/);
  assert.doesNotMatch(motion, /\.person-register-entry::after \{[\s\S]*?background: var\(--atlas-honor-metal-strong\)/);
  assert.doesNotMatch(motion, /\.person-register-entry:hover \.person-main-name-link,[\s\S]*?color: #f0ece4/);
  assert.match(register, /P5 interaction precedence/);
  assert.match(register, /\.person-register-entry::after \{[\s\S]*?background: var\(--atlas-honor-metal-strong\)/);
  assert.match(register, /\.person-register-entry\.is-selected::after \{\s*opacity: 1;\s*transform: scaleY\(1\)/s);
});

test("DETAIL-M2 keeps late V9 from overriding Chronicle material and interaction ownership", () => {
  const css = read("atlas-ui-motion-material-v9.css");
  assert.match(css, /\.person-detail-authoring > summary,/);
  assert.match(css, /\.person-chronicle-activity \.person-evidence-inspector > summary,/);
  assert.match(css, /\.person-detail-authoring > summary:focus-visible,/);
  assert.match(css, /\.person-chronicle-activity \.person-evidence-inspector > summary:focus-visible,/);
  assert.match(css, /\.person-main-detail \{\n  border-color: var\(--atlas-material-hairline\);\n\}/);
  assert.doesNotMatch(css, /\.sidebar,[\s\S]{0,120}\.person-main-detail,[\s\S]{0,180}background-image:/);
  assert.match(css, /person-chronicle-activity:hover::before,[\s\S]*?var\(--atlas-material-wash-hover\)/);
  assert.doesNotMatch(css, /0 0 0 5px rgba\(192,174,136,\.07\)/);
});

test("UI V9 uses short entrance motion only for Detail and mobile drawer", () => {
  const css = read("atlas-ui-motion-material-v9.css");
  assert.match(css, /#personMainDetailBackdrop:not\(\[hidden\]\)/);
  assert.match(css, /#personMainDetail\.person-main-detail:not\(\[hidden\]\)/);
  assert.match(css, /@keyframes atlas-v9-detail-in/);
  assert.match(css, /transform: translateX\(10px\)/);
  assert.match(css, /\.mobile-drawer\.open/);
  assert.doesNotMatch(css, /\.mobile-drawer:not\(\[hidden\]\)/);
  assert.match(css, /@keyframes atlas-v9-drawer-in/);
  assert.match(css, /transform: translateX\(-12px\)/);
});

test("UI V9 changes Spacetime state through luminance/material rather than geometry", () => {
  const css = read("atlas-ui-motion-material-v9.css");
  assert.match(css, /state changes move through luminance, never geometry/);
  assert.match(css, /\.spacetime-track-label,/);
  assert.match(css, /\.spacetime-track-rail,/);
  assert.match(css, /opacity var\(--atlas-motion-standard\)/);
  assert.match(css, /background-color var\(--atlas-motion-standard\)/);
  assert.match(css, /border-color var\(--atlas-motion-standard\)/);
  assert.match(css, /\.spacetime-track-rail\.is-selected \{/);
  assert.match(css, /var\(--spacetime-selection-metal-strong\)/);

  const view = read("atlas-person-spacetime-view.js");
  assert.match(view, /const CAMERA_MIN_ZOOM = 0\.5;/);
  assert.match(view, /const CAMERA_DEFAULT_ZOOM = 5;/);
  assert.match(view, /const CAMERA_MAX_ZOOM = 15;/);
  assert.match(view, /const GLOBAL_EXTENT_COMPRESSION = 0\.748;/);
});

test("UI V9 unifies focus-visible treatment across historical and operational surfaces", () => {
  const css = read("atlas-ui-motion-material-v9.css");
  assert.match(css, /--atlas-focus-ring: rgba\(208,188,145,\.62\)/);
  assert.match(css, /\.nav-item:focus-visible,/);
  assert.match(css, /\.person-domain-filter:focus-visible,/);
  assert.match(css, /\.person-monumental-register \.person-table-sort-button:focus-visible,/);
  assert.match(css, /\.spacetime-minimap-surface:focus-visible/);
  assert.match(css, /outline: 1px solid var\(--atlas-focus-ring\)/);
  assert.match(css, /outline-offset: 2px/);
});

test("UI V9 materiality stays tone-on-tone and avoids fake historical decoration", () => {
  const css = read("atlas-ui-motion-material-v9.css");
  assert.match(css, /Material system: graphite \+ aged metal \+ ivory/);
  assert.match(css, /--atlas-material-edge: rgba\(239,235,226,\.055\)/);
  assert.match(css, /linear-gradient\(180deg, rgba\(255,255,255,\.012\), transparent 84px\)/);
  assert.match(css, /Tone-on-tone material restraint/);
  assert.doesNotMatch(css, /url\(/);
  assert.doesNotMatch(css, /background-image:[^;]*(marble|parchment)/i);
});

test("UI V9 fully disables motion under prefers-reduced-motion", () => {
  const css = read("atlas-ui-motion-material-v9.css");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /--atlas-motion-fast: 0ms/);
  assert.match(css, /--atlas-motion-standard: 0ms/);
  assert.match(css, /--atlas-motion-emphasis: 0ms/);
  assert.match(css, /animation: none !important/);
  assert.match(css, /\.mobile-drawer,/);
  assert.match(css, /transition: none !important/);
});
