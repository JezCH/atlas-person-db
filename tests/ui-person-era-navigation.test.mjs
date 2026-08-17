import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const navSource = fs.readFileSync(new URL('../atlas-person-era-navigation.js', import.meta.url), 'utf8');
const navCss = fs.readFileSync(new URL('../atlas-person-era-navigation.css', import.meta.url), 'utf8');
const tableSource = fs.readFileSync(new URL('../atlas-person-table-view.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('era navigation consumes rendered era bands instead of creating a second chronology model', () => {
  assert.match(navSource, /\.person-era-group\[data-atlas-era\]/);
  assert.match(navSource, /\.person-era-band/);
  assert.match(navSource, /aria-label/);
  assert.match(navSource, /atlasEra/);
  assert.doesNotMatch(navSource, /BC 480|AD 499|AD 1492|AD 1750|AD 1914|AD 1945/);
  assert.match(tableSource, /const ERAS = Object\.freeze\(\[/);
});

test('era navigation owns Person search, Polity filtering, and current-result status in one toolbar', () => {
  assert.match(navSource, /person-era-search/);
  assert.match(navSource, /search\.id = "personMainSearch"/);
  assert.match(navSource, /controls\.append\(search, select, summary\)/);
  assert.match(navSource, /atlas-person-search-change/);
  assert.match(navSource, /person-era-polity-filter/);
  assert.match(navSource, /모든 정치체/);
  assert.match(navSource, /인물 \$\{state\.visibleCount\}명 · 정치체 \$\{state\.visiblePolityCount\}개/);
  assert.match(navSource, /atlas-person-polity-filter-change/);
  assert.match(navSource, /selectedPolityId/);
  assert.match(navSource, /polityOptions/);
  assert.doesNotMatch(html, /atlas-person-summary-counts\.js/);
});

test('era navigation keeps search available even when the current query has no era results', () => {
  assert.match(navSource, /if \(!state\.entries\.length\)/);
  assert.match(navSource, /현재 조건에 해당하는 시대가 없습니다/);
  const zeroResultBody = navSource.slice(navSource.indexOf('if (!state.entries.length)'), navSource.indexOf('const preserved'));
  assert.doesNotMatch(zeroResultBody, /nav\.remove|existing\?\.remove/);
});

test('era navigation remains a presentation enhancement on the Person Main render lifecycle', () => {
  assert.match(navSource, /atlas-person-main-rendered/);
  assert.match(navSource, /personMainGroups/);
  assert.match(navSource, /scrollIntoView/);
  assert.match(navSource, /prefers-reduced-motion/);
  assert.doesNotMatch(navSource, /fetch\s*\(|ATLAS_SERVER_WRITE_ADAPTER|listPersons|readPerson|data-authoring-action/);
});

test('era navigation tracks current location without repeating the era count', () => {
  assert.match(navSource, /aria-current/);
  assert.match(navSource, /이전 시대로 이동/);
  assert.match(navSource, /다음 시대로 이동/);
  assert.match(navSource, /ArrowLeft/);
  assert.match(navSource, /ArrowRight/);
  assert.match(navSource, /현재 위치:/);
  assert.match(navSource, /visiblePersonCount/);
  assert.match(navSource, /const text = \[entry\.label, entry\.range\]/);
  assert.doesNotMatch(navSource, /const text = \[entry\.label, entry\.range, `\$\{entry\.count\}명 표시`\]/);
});

test('era navigation is sticky, responsive, and preserves horizontal era scrolling', () => {
  assert.match(navCss, /\.person-era-navigator\{position:sticky/);
  assert.match(navCss, /\.person-era-nav-top/);
  assert.match(navCss, /\.person-era-nav-track/);
  assert.match(navCss, /\.person-era-search/);
  assert.match(navCss, /\.person-era-polity-filter/);
  assert.match(navCss, /\.person-era-jump-list\{[^}]*overflow-x:auto/);
  assert.match(navCss, /\.person-era-group\{scroll-margin-top:/);
  assert.match(navCss, /@media\(max-width:760px\)/);
  assert.match(navCss, /@media\(max-width:520px\)/);
  assert.match(navCss, /top:64px/);
});

test('era navigation assets load after era grouping/palette and before Person Main initializes', () => {
  const tableJs = 'atlas-person-table-view.js?v=20260816-era-band-v1';
  const navJs = 'atlas-person-era-navigation.js?v=20260817-era-search-toolbar-v1';
  const mainJs = 'atlas-person-main.js?v=20260817-era-search-toolbar-v1';
  const paletteCss = 'atlas-person-era-palette.css?v=20260816-era-palette-v1';
  const navCssAsset = 'atlas-person-era-navigation.css?v=20260817-era-search-toolbar-v1';
  const mobileCss = 'atlas-person-mobile-column-widths.css?v=20260816-mobile-widths-v2';

  for (const asset of [tableJs, navJs, mainJs, paletteCss, navCssAsset, mobileCss]) assert.ok(html.includes(asset));
  assert.ok(html.indexOf(tableJs) < html.indexOf(navJs));
  assert.ok(html.indexOf(navJs) < html.indexOf(mainJs));
  assert.ok(html.indexOf(paletteCss) < html.indexOf(navCssAsset));
  assert.ok(html.indexOf(navCssAsset) < html.indexOf(mobileCss));
});