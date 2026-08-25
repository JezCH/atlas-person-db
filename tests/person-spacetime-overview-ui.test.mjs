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

test('spacetime vertical timeline is constrained to the map-like camera viewport', async () => {
  const css = await fixture(cssUrl);
  assert.match(css, /\.spacetime-scroll\{[^}]*overflow:auto/);
  assert.match(css, /\.spacetime-scroll\{[^}]*height:clamp\(520px,72vh,860px\)/);
  assert.match(css, /\.spacetime-scroll\{[^}]*max-height:860px/);
  assert.ok(css.includes('@media(max-width:900px){'));
  assert.ok(css.includes('.spacetime-scroll{height:65vh;min-height:460px}'));
});

test('overview renders name-only 24px micro-cards while detail mode keeps full activity information', async () => {
  const view = await fixture(viewUrl);
  const css = await fixture(cssUrl);
  assert.ok(view.includes('const OVERVIEW_CARD_HEIGHT = 24;'));
  assert.ok(view.includes('const OVERVIEW_MAX_CARD_WIDTH = 108;'));
  assert.ok(view.includes('const totalLaneOffset = Math.min(10, maxLane * 2);'));
  assert.ok(view.includes('const cardBody = overview'));
  assert.ok(view.includes('? `<strong>${escapeHtml(personLabel(item.person))}</strong>`'));
  assert.ok(view.includes(': `<strong>${escapeHtml(personLabel(item.person))}</strong>\n      <span>${escapeHtml(polityLabel(item.activity))}</span>'));
  assert.ok(css.includes('.spacetime-frame.is-overview .spacetime-person-card.is-overview{height:24px;min-height:24px;max-height:24px;max-width:108px;'));
  assert.ok(css.includes('border-left:2px solid #607ca9'));
  assert.ok(css.includes('box-shadow:none'));
  assert.ok(css.includes('.spacetime-frame.is-overview .spacetime-person-card.is-overview>span,.spacetime-frame.is-overview .spacetime-person-card.is-overview small,.spacetime-frame.is-overview .spacetime-person-card.is-overview i{display:none}'));
  assert.ok(css.includes('.spacetime-frame.is-overview .spacetime-duration-rail{width:2px;opacity:.72}'));
});