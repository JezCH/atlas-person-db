import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const viewUrl = new URL('../atlas-person-spacetime-view.js', import.meta.url);
const cssUrl = new URL('../atlas-person-spacetime-view.css', import.meta.url);

async function fixture(path) {
  return readFile(path, 'utf8');
}

test('spacetime defaults to a world overview with an explicit detail fallback', async () => {
  const view = await fixture(viewUrl);
  assert.match(view, /let horizontalViewMode = "overview";/);
  assert.match(view, /id="spacetimeHorizontalMode"/);
  assert.match(view, /<option value="overview"[^>]*>전체 보기<\/option>/);
  assert.match(view, /<option value="detail"[^>]*>상세 보기<\/option>/);
  assert.match(view, /function buildRegionMeta\(/);
  assert.match(view, /mount\.clientWidth/);
  assert.match(view, /OVERVIEW_MIN_REGION_WIDTH \* regionLayouts\.length/);
});

test('overview keeps all region columns inside the available canvas budget on desktop', async () => {
  const view = await fixture(viewUrl);
  assert.match(view, /const availableWidth = Math\.max\(/);
  assert.match(view, /const flexible = Math\.max\(0, availableWidth - minimumTotal\);/);
  assert.match(view, /return \{ regions, contentWidth: x \};/);
  assert.match(view, /card_width: cardWidth/);
  assert.match(view, /lane_offset: laneOffset/);
});

test('era labels read top-to-bottom without the former upside-down rotation', async () => {
  const css = await fixture(cssUrl);
  assert.match(css, /\.spacetime-era-axis>div span\{[^}]*writing-mode:vertical-rl;[^}]*text-orientation:upright;[^}]*transform:none;/);
  assert.doesNotMatch(css, /\.spacetime-era-axis>div span\{[^}]*rotate\(180deg\)/);
});

test('spacetime vertical timeline is not constrained to a nested viewport height', async () => {
  const css = await fixture(cssUrl);
  assert.match(css, /\.spacetime-scroll\{[^}]*max-height:none;/);
  assert.doesNotMatch(css, /\.spacetime-scroll\{[^}]*max-height:72vh/);
  assert.doesNotMatch(css, /@media\(max-width:900px\)\{[^}]*\.spacetime-scroll\{[^}]*75vh/);
});

test('overview renders name-only 24px micro-cards while detail mode keeps full activity information', async () => {
  const view = await fixture(viewUrl);
  const css = await fixture(cssUrl);
  assert.match(view, /const OVERVIEW_CARD_HEIGHT = 24;/);
  assert.match(view, /const OVERVIEW_MAX_CARD_WIDTH = 108;/);
  assert.match(view, /const totalLaneOffset = Math\.min\(10, maxLane \* 2\);/);
  assert.match(view, /const cardBody = overview/);
  assert.match(view, /\? `<strong>\$\{escapeHtml\(personLabel\(item\.person\)\)\}<\/strong>`/);
  assert.match(view, /: `<strong>\$\{escapeHtml\(personLabel\(item\.person\)\)\}<\/strong>\n      <span>/);
  assert.match(css, /\.spacetime-frame\.is-overview \.spacetime-person-card\.is-overview\{[^}]*height:24px;[^}]*max-width:108px;[^}]*border-left:2px solid #607ca9;[^}]*box-shadow:none;/);
  assert.match(css, /\.spacetime-frame\.is-overview \.spacetime-person-card\.is-overview>span,[^{]+\{display:none\}/);
  assert.match(css, /\.spacetime-frame\.is-overview \.spacetime-duration-rail\{[^}]*width:2px;[^}]*opacity:\.72;/);
});
