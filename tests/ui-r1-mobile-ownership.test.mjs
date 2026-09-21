import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const mobile = fs.readFileSync(new URL('../mobile-ui.js', import.meta.url), 'utf8');
const compactCss = fs.readFileSync(new URL('../mobile-compact.css', import.meta.url), 'utf8');
const era = fs.readFileSync(new URL('../atlas-person-era-navigation.js', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../atlas-person-main.js', import.meta.url), 'utf8');

test('era navigation is the sole visible Person search owner on desktop and mobile', () => {
  assert.match(era, /search\.id = "personMainSearch"/);
  assert.match(era, /atlas-person-search-change/);
  assert.doesNotMatch(html, /mobileSearchInput|mobileSearchClear|mobileSearchCount/);
  assert.doesNotMatch(mobile, /personMainSearch|atlas-person-search-change|filterRenderedRows|syncMobileSearchToMain/);
});

test('Person Main is the sole visible Excel owner and legacy upload controls are retired', () => {
  assert.match(main, /personMainExcelExport/);
  assert.doesNotMatch(main, /personMainExcelImport/);
  assert.doesNotMatch(html, /mobileToolsButton|mobileToolsMenu|data-mobile-action="export"|data-mobile-action="import"|importInput/);
  assert.doesNotMatch(mobile, /mobileTools|exportButton|importInput|data-mobile-action/);
});

test('mobile-ui owns only the shell drawer', () => {
  assert.match(mobile, /mobileMenuButton/);
  assert.match(mobile, /mobileDrawer/);
  assert.match(mobile, /mobileDrawerBackdrop/);
  assert.match(mobile, /matchMedia\("\(max-width: 760px\)"\)/);
  assert.doesNotMatch(mobile, /dataBody|mobile-expanded/);
});

test('mobile appbar is localized shell identity rather than a second search or tools surface', () => {
  assert.match(html, /mobile-appbar-title/);
  assert.match(html, /<strong>인물<\/strong>/);
  assert.match(html, /<small>ATLAS 편집<\/small>/);
  assert.match(compactCss, /\.mobile-appbar-title/);
  assert.doesNotMatch(compactCss, /#dataBody|mobile-expanded|\.mobile-search\b|\.mobile-search-count\b|\.mobile-tools-menu\b/);
});

test('mobile ownership assets use the single-surface cache-busted runtime pair', () => {
  assert.match(html, /mobile-compact\.css\?v=20260921-person-density-v2/);
  assert.match(html, /mobile-ui\.js\?v=20260920-single-person-surface/);
});
