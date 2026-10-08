import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const navScript = readFileSync(new URL('../atlas-main-authority-nav.js', import.meta.url), 'utf8');
const navCss = readFileSync(new URL('../atlas-main-authority-nav.css', import.meta.url), 'utf8');
const spacetimeCss = readFileSync(new URL('../atlas-person-spacetime-view.css', import.meta.url), 'utf8');
const spacetimeView = readFileSync(new URL('../atlas-person-spacetime-view.js', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('spacetime owns a bounded map-like viewport once the incremental time camera is active', () => {
  assert.match(spacetimeCss, /\.spacetime-scroll\{[^}]*overflow:auto/);
  assert.match(spacetimeCss, /\.spacetime-scroll\{[^}]*height:clamp\(480px,62vh,720px\)/);
  assert.match(spacetimeCss, /\.spacetime-scroll\{[^}]*overscroll-behavior:contain/);
  assert.match(spacetimeView, /function bindCameraViewport\(/);
  assert.match(spacetimeView, /!event\.ctrlKey && !event\.metaKey/);
  assert.match(spacetimeView, /event\.preventDefault\(\)/);
});

test('authority navigation lazy-loads the canonical spacetime model and current renderer without a stale cache key', () => {
  assert.doesNotMatch(indexHtml, /atlas-person-spacetime-model\.js/);
  assert.match(navScript, /function ensureSpacetimeModel\(\)/);
  assert.match(navScript, /atlas-person-spacetime-model\.js\?v=20260903-south-asia-r3/);
  assert.match(navScript, /atlas-person-spacetime-view\.js\?v=20261003-ui-v7-tools-v1/);
  assert.match(navScript, /atlas-person-spacetime-view\.css\?v=20260923-runtime-ownership-v1/);
  assert.match(navScript, /atlas-person-spacetime-monumental-canvas\.css\?v=20261008-spacetime-l1-chronograph-v1/);
  assert.match(navScript, /atlas-person-spacetime-instrument-tools\.css\?v=20261007-spacetime-m3-luminance-v1/);
  assert.match(navScript, /atlas-person-spacetime-mobile-v8\.css\?v=20261007-spacetime-m4-mobile-material-v1/);
  assert.match(spacetimeView, /atlas-person-spacetime-space-axis\.js\?v=20261001-east-asia-v4/);
  assert.match(spacetimeView, /atlas-person-spacetime-spatial-compile\.js\?v=20260903-taxonomy-r2/);
  assert.match(spacetimeView, /atlas-person-spacetime-person-tracks\.js\?v=20260902-inspector-evidence/);
  assert.match(spacetimeView, /atlas-person-spacetime-data-parity\.js\?v=20260902-final-parity/);
  assert.match(spacetimeView, /atlas-person-spacetime-uncertainty\.js\?v=20260903-c6/);
  assert.match(spacetimeView, /atlas-person-spacetime-inspector\.js\?v=20260903-c8/);
  assert.match(spacetimeView, /atlas-person-spacetime-semantic-axis\.js\?v=20260920-exact-fit-floor/);
  assert.match(spacetimeView, /ATLAS_CLIENT_DATA_STORE/);
  assert.match(spacetimeView, /dataStore\.loadSpatialIndex/);
  assert.match(spacetimeView, /dataStore\.loadPersons/);
  assert.match(indexHtml, /atlas-main-authority-nav\.js\?v=[^"]+/);
});

test('spacetime topbar suppresses desktop-only explanatory subtitle and syncs the mobile domain title', () => {
  assert.match(navScript, /subtitle\.hidden = domain === "spacetime"/);
  assert.match(navScript, /subtitle\.hidden = false/);
  assert.match(navScript, /document\.querySelector\("\.mobile-appbar-title strong"\)/);
  assert.match(navScript, /mobileTitle\.textContent = meta\?\.label \|\| personHeading\.title/);
  assert.match(navScript, /mobileSubtitle\.textContent = "ATLAS 편집"/);
});

test('authority navigation resets the viewport only when the domain changes', () => {
  assert.match(navScript, /const previousDomain\s*=\s*currentDomain/);
  assert.match(navScript, /previousDomain\s*!==\s*next/);
  assert.match(navScript, /window\.scrollTo\(\{\s*top:\s*0,\s*left:\s*0,\s*behavior:\s*["']auto["']\s*\}\)/s);
});

test('inactive person surfaces are forced out of layout', () => {
  assert.match(navCss, /#personMainView\[hidden\]/);
  assert.doesNotMatch(navCss, /#relationshipAuthoringTools\[hidden\]/);
  assert.match(navCss, /display\s*:\s*none\s*!important/);
});