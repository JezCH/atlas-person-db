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
  assert.match(spacetimeCss, /\.spacetime-scroll\{[^}]*height:clamp\(520px,72vh,860px\)/);
  assert.match(spacetimeCss, /\.spacetime-scroll\{[^}]*overscroll-behavior:contain/);
  assert.match(spacetimeView, /function bindCameraViewport\(/);
  assert.match(spacetimeView, /!event\.ctrlKey && !event\.metaKey/);
  assert.match(spacetimeView, /event\.preventDefault\(\)/);
});

test('authority navigation loads the current spacetime renderer without a stale cache key', () => {
  assert.match(navScript, /atlas-person-spacetime-view\.js\?v=20260827-activity-glyph-a11y/);
  assert.match(navScript, /atlas-person-spacetime-view\.css\?v=20260827-state-visibility/);
  assert.match(indexHtml, /atlas-main-authority-nav\.js\?v=20260827-spacetime-activity-glyph-a11y/);
});

test('authority navigation resets the viewport only when the domain changes', () => {
  assert.match(navScript, /const previousDomain\s*=\s*currentDomain/);
  assert.match(navScript, /previousDomain\s*!==\s*next/);
  assert.match(navScript, /window\.scrollTo\(\{\s*top:\s*0,\s*left:\s*0,\s*behavior:\s*["']auto["']\s*\}\)/s);
});

test('inactive person surfaces are forced out of layout', () => {
  assert.match(navCss, /#personMainView\[hidden\]/);
  assert.match(navCss, /#relationshipAuthoringTools\[hidden\]/);
  assert.match(navCss, /display\s*:\s*none\s*!important/);
});