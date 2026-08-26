import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const viewUrl = new URL('../atlas-person-spacetime-view.js', import.meta.url);
const cssUrl = new URL('../atlas-person-spacetime-view.css', import.meta.url);
const densityUrl = new URL('../atlas-person-spacetime-density.js', import.meta.url);
const lodUrl = new URL('../atlas-person-spacetime-lod.js', import.meta.url);
const semanticAxisUrl = new URL('../atlas-person-spacetime-semantic-axis.js', import.meta.url);

async function fixture(path) {
  return readFile(path, 'utf8');
}

test('spacetime defaults to a stable world overview with an explicit spatial detail zoom', async () => {
  const view = await fixture(viewUrl);
  assert.match(view, /let horizontalViewMode = "overview";/);
  assert.match(view, /const DETAIL_SPACE_ZOOM = 3;/);
  assert.match(view, /const MIN_WORLD_WIDTH = 900;/);
  assert.match(view, /id="spacetimeHorizontalMode"/);
  assert.match(view, /<option value="overview"[^>]*>전체 보기<\/option>/);
  assert.match(view, /<option value="detail"[^>]*>공간 확대<\/option>/);
  assert.match(view, /const spaceZoom = horizontalViewMode === "detail" \? DETAIL_SPACE_ZOOM : 1;/);
  assert.match(view, /const contentWidth = baseWorldWidth \* spaceZoom;/);
});

test('macroregion X is owned by the stable continuum rather than result density or lane counts', async () => {
  const view = await fixture(viewUrl);
  assert.match(view, /spaceAxis\.stableRegionLayout\(compiled\.continuum, contentWidth\)/);
  assert.match(view, /segment\.x_anchor \* contentWidth/);
  assert.doesNotMatch(view, /function buildRegionMeta\(/);
  assert.doesNotMatch(view, /lane_offset/);
  assert.doesNotMatch(view, /OVERVIEW_MIN_REGION_WIDTH/);
});

test('era labels read top-to-bottom without the former upside-down rotation', async () => {
  const css = await fixture(cssUrl);
  assert.match(css, /\.spacetime-era-axis>div span\{[^}]*writing-mode:vertical-rl;[^}]*text-orientation:upright;[^}]*transform:none;/);
  assert.doesNotMatch(css, /\.spacetime-era-axis>div span\{[^}]*rotate\(180deg\)/);
});

test('spacetime vertical timeline remains constrained to the map-like camera viewport', async () => {
  const css = await fixture(cssUrl);
  assert.match(css, /\.spacetime-scroll\{[^}]*overflow:auto/);
  assert.match(css, /\.spacetime-scroll\{[^}]*height:clamp\(520px,72vh,860px\)/);
  assert.match(css, /\.spacetime-scroll\{[^}]*max-height:860px/);
  assert.match(css, /\.spacetime-scroll\{[^}]*overscroll-behavior:contain/);
  assert.ok(css.includes('@media(max-width:900px){'));
  assert.ok(css.includes('.spacetime-scroll{height:65vh;min-height:460px}'));
});

test('overview keeps collision-safe Person names over registered-Person density and retains detail layers', async () => {
  const view = await fixture(viewUrl);
  const css = await fixture(cssUrl);
  const density = await fixture(densityUrl);
  const lod = await fixture(lodUrl);
  const semanticAxis = await fixture(semanticAxisUrl);

  assert.ok(view.includes('atlas-person-spacetime-density.js'));
  assert.ok(view.includes('density.buildDensityField'));
  assert.ok(view.includes('renderDensityLegend(densityField'));
  assert.ok(view.includes('field.legend_label'));
  assert.ok(view.includes('spacetime-density-cell'));
  assert.ok(density.includes('ATLAS 등록 인물 밀도'));
  assert.ok(density.includes('unique_registered_person_activity_density'));

  assert.ok(lod.includes('overview_label_floor: 0.78'));
  assert.ok(view.includes('const needsLabels = lodWeights.labels > 0.01'));
  assert.ok(view.includes('이름 표시'));
  assert.ok(view.includes('spacetime-track-label'));

  assert.ok(view.includes('atlas-person-spacetime-semantic-axis.js'));
  assert.ok(view.includes('semanticAxis.buildTimeAxisPlan'));
  assert.ok(view.includes('semanticAxis.buildSpaceHeaderPlan'));
  assert.ok(view.includes('spacetime-region-head-layer is-subregion'));
  assert.ok(semanticAxis.includes('interval_years: 500'));
  assert.ok(semanticAxis.includes('interval_years: 10'));

  assert.ok(view.includes('spacetime-person-point'));
  assert.ok(view.includes('renderRails(visibleTracks, projection, contentWidth, lodWeights.rails)'));
  assert.ok(view.includes('renderActivityGlyphs(visibleTracks, projection, contentWidth, lodWeights.activities)'));
  assert.doesNotMatch(view, /OVERVIEW_CARD_HEIGHT/);
  assert.doesNotMatch(view, /spacetime-person-card/);
  assert.ok(css.includes('.spacetime-density-cell{'));
  assert.ok(css.includes('.spacetime-density-legend{'));
  assert.ok(css.includes('.spacetime-region-head-layer{'));
  assert.ok(css.includes('.spacetime-person-point{'));
  assert.ok(css.includes('.spacetime-track-label{'));
  assert.ok(css.includes('.spacetime-track-rail{'));
  assert.ok(css.includes('.spacetime-activity-glyph{'));
  assert.doesNotMatch(css, /\.spacetime-person-card/);
});
