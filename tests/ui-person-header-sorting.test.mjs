import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../atlas-person-header-sorting.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../atlas-person-header-sorting.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Person table headers own sorting for Person, activity period, and Polity', () => {
  assert.match(source, /installSortButton\(header\.querySelector\("\.person-table-col-identity"\), "인물", "person"\)/);
  assert.match(source, /installSortButton\(header\.querySelector\("\.person-table-col-range"\), "주요 활동기간", "start"\)/);
  assert.match(source, /installSortButton\(polity, "정치체 · 관계", "polity"\)/);
  assert.match(source, /"start-asc", "start-desc", "person-asc", "person-desc", "polity-asc", "polity-desc"/);
  assert.match(source, /icon\.textContent = active \? \(current\.direction === "desc" \? "▼" : "▲"\) : "↕"/);
  assert.match(source, /aria-sort/);
});

test('sorting uses visible Korean labels and real chronology while unknown values remain last', () => {
  assert.match(source, /function rowPersonName/);
  assert.match(source, /function rowPrimaryPolity/);
  assert.match(source, /function chronologyYearsFromRow/);
  assert.match(source, /new Intl\.Collator\("ko"/);
  assert.match(source, /if \(leftMissing && !rightMissing\) return 1/);
  assert.match(source, /compareNullableNumber/);
  assert.match(source, /compareNullableText/);
  assert.match(source, /compareRows\(left, right, requestedSort = sortOrder\)/);
});

test('sorting rebuilds physical DOM order and preserves era metadata', () => {
  assert.match(source, /rankedRows = rows\.slice\(\)\.sort/);
  assert.match(source, /group\.dataset\.atlasEra = code/);
  assert.match(source, /grid\.append\(built\.group\)/);
  assert.match(source, /person-era-group-flat/);
  assert.doesNotMatch(source, /style\.order/);
  assert.match(source, /ATLAS_PERSON_ERA_NAVIGATION\?\.installNavigator/);
  assert.match(css, /person-table-sort-flat \.person-era-group-flat \.person-era-band>span/);
});

test('obsolete Person sort dropdown is removed and header controls are responsive', () => {
  assert.match(source, /function removeLegacySortControl/);
  assert.match(source, /document\.getElementById\("personMainSort"\)/);
  assert.match(source, /controls\.remove\(\)/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /@media\(max-width:520px\)/);
});

test('sorting enhancement loads after table decoration and before era navigation and Person Main', () => {
  const tableJs = 'atlas-person-table-view.js?v=20260816-era-band-v1';
  const sortingJs = 'atlas-person-header-sorting.js?v=20260817-header-sort-v2';
  const navJs = 'atlas-person-era-navigation.js?v=20260817-era-search-toolbar-v2';
  const mainJs = 'atlas-person-main.js?v=20260817-era-search-toolbar-v2';
  const geometryCss = 'atlas-person-table-alignment.css?v=20260817-table-geometry-r2';
  const sortingCss = 'atlas-person-header-sorting.css?v=20260817-header-sort-v2';

  for (const asset of [tableJs, sortingJs, navJs, mainJs, geometryCss, sortingCss]) assert.ok(html.includes(asset));
  assert.ok(html.indexOf(tableJs) < html.indexOf(sortingJs));
  assert.ok(html.indexOf(sortingJs) < html.indexOf(navJs));
  assert.ok(html.indexOf(navJs) < html.indexOf(mainJs));
  assert.ok(html.indexOf(geometryCss) < html.indexOf(sortingCss));
});
