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

test('Person Main is the sole visible Excel tools owner and the mobile legacy tools menu is retired', () => {
  assert.match(main, /personMainExcelExport/);
  assert.match(main, /personMainExcelImport/);
  assert.doesNotMatch(html, /mobileToolsButton|mobileToolsMenu|data-mobile-action="export"|data-mobile-action="import"/);
  assert.doesNotMatch(mobile, /mobileTools|exportButton|importInput|data-mobile-action/);
});

test('mobile-ui retains only shell drawer and legacy row expansion responsibilities', () => {
  assert.match(mobile, /mobileMenuButton/);
  assert.match(mobile, /mobileDrawer/);
  assert.match(mobile, /mobileDrawerBackdrop/);
  assert.match(mobile, /dataBody/);
  assert.match(mobile, /mobile-expanded/);
  assert.match(mobile, /matchMedia\("\(max-width: 760px\)"\)/);
  assert.doesNotMatch(mobile, /normalize|rowCount|emptyState/);
});

test('mobile appbar is shell identity rather than a second search or tools surface', () => {
  assert.match(html, /mobile-appbar-title/);
  assert.match(html, /<strong>Persons<\/strong>/);
  assert.match(compactCss, /\.mobile-appbar-title/);
  assert.doesNotMatch(compactCss, /\.mobile-search\b|\.mobile-search-count\b|\.mobile-tools-menu\b/);
});

test('legacy mobile row expansion remains visibly represented', () => {
  assert.match(mobile, /row\.classList\.add\("mobile-expanded"\)/);
  assert.match(compactCss, /#dataBody tr\.mobile-expanded::after/);
  assert.match(compactCss, /#dataBody tr\.mobile-expanded td:nth-child\(6\)/);
});

test('mobile ownership assets use one cache-busted runtime pair', () => {
  assert.match(html, /mobile-compact\.css\?v=20260817-r1-mobile-owner-v1/);
  assert.match(html, /mobile-ui\.js\?v=20260817-r1-mobile-owner-v1/);
});
