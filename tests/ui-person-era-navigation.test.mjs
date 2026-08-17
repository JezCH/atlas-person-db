import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const navSource = fs.readFileSync(new URL('../atlas-person-era-navigation.js', import.meta.url), 'utf8');
const navCss = fs.readFileSync(new URL('../atlas-person-era-navigation.css', import.meta.url), 'utf8');
const tableSource = fs.readFileSync(new URL('../atlas-person-table-view.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('era navigation consumes the rendered era bands instead of creating a second chronology model', () => {
  assert.match(navSource, /\.person-era-group\[data-atlas-era\]/);
  assert.match(navSource, /\.person-era-band/);
  assert.match(navSource, /aria-label/);
  assert.match(navSource, /atlasEra/);
  assert.doesNotMatch(navSource, /BC 480|AD 499|AD 1492|AD 1750|AD 1914|AD 1945/);
  assert.match(tableSource, /const ERAS = \[/);
});

test('era navigation remains a presentation-only enhancement on the Person Main render lifecycle', () => {
  assert.match(navSource, /atlas-person-main-rendered/);
  assert.match(navSource, /personMainGroups/);
  assert.match(navSource, /scrollIntoView/);
  assert.match(navSource, /prefers-reduced-motion/);
  assert.doesNotMatch(navSource, /fetch\s*\(|ATLAS_SERVER_WRITE_ADAPTER|listPersons|readPerson|data-authoring-action/);
});

test('era navigation tracks current location and supports adjacent-era and keyboard navigation', () => {
  assert.match(navSource, /aria-current/);
  assert.match(navSource, /이전 시대로 이동/);
  assert.match(navSource, /다음 시대로 이동/);
  assert.match(navSource, /ArrowLeft/);
  assert.match(navSource, /ArrowRight/);
  assert.match(navSource, /현재 위치:/);
  assert.match(navSource, /visiblePersonCount/);
});

test('era navigation is sticky, responsive, and does not replace the table horizontal-scroll model', () => {
  assert.match(navCss, /\.person-era-navigator\{position:sticky/);
  assert.match(navCss, /\.person-era-jump-list\{[^}]*overflow-x:auto/);
  assert.match(navCss, /\.person-era-group\{scroll-margin-top:/);
  assert.match(navCss, /@media\(max-width:760px\)/);
  assert.match(navCss, /top:64px/);
});

test('era navigation assets load after era grouping/palette and before Person Main initializes', () => {
  const tableJs = 'atlas-person-table-view.js?v=20260816-era-band-v1';
  const navJs = 'atlas-person-era-navigation.js?v=20260817-era-navigation-v1';
  const mainJs = 'atlas-person-main.js?v=20260815-ui6r4';
  const paletteCss = 'atlas-person-era-palette.css?v=20260816-era-palette-v1';
  const navCssAsset = 'atlas-person-era-navigation.css?v=20260817-era-navigation-v1';
  const mobileCss = 'atlas-person-mobile-column-widths.css?v=20260816-mobile-widths-v2';

  for (const asset of [tableJs, navJs, mainJs, paletteCss, navCssAsset, mobileCss]) assert.ok(html.includes(asset));
  assert.ok(html.indexOf(tableJs) < html.indexOf(navJs));
  assert.ok(html.indexOf(navJs) < html.indexOf(mainJs));
  assert.ok(html.indexOf(paletteCss) < html.indexOf(navCssAsset));
  assert.ok(html.indexOf(navCssAsset) < html.indexOf(mobileCss));
});
