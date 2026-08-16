import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../atlas-person-table-view.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../atlas-person-table-view.css', import.meta.url), 'utf8');
const alignmentCss = fs.readFileSync(new URL('../atlas-person-table-alignment.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Person table composes an era band with the existing four Person data cells', () => {
  assert.match(source, /\["person-table-col-era", "시대"\]/);
  assert.match(source, /\[identity, range, activities, count\]/);
  assert.doesNotMatch(source, /\[identity, range, activities, count, status\]/);
  assert.match(source, /person-table-identity/);
  assert.match(source, /person-table-range/);
  assert.match(source, /person-table-activities/);
  assert.match(source, /person-table-count/);
  assert.match(source, /person-table-status-inline/);
  assert.match(source, /foldExceptionalStatus\(identity, status\)/);
});

test('era classification uses the agreed ATLAS global cut points and preserves unknown chronology', () => {
  assert.match(source, /year < -480/);
  assert.match(source, /year < 500/);
  assert.match(source, /year < 1492/);
  assert.match(source, /year < 1750/);
  assert.match(source, /year < 1914/);
  assert.match(source, /year < 1945/);
  for (const label of ['고대', '고전', '중세', '근세', '산업·제국', '세계대전', '현대', '연대 미상']) {
    assert.match(source, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(source, /groupRowsByEra\(grid\)/);
  assert.match(source, /person-era-group/);
  assert.match(source, /person-era-band/);
});

test('era band remains a sticky narrow first column on desktop and mobile', () => {
  assert.match(css, /--era-band-width:58px/);
  assert.match(css, /person-era-band\{position:sticky;left:0/);
  assert.match(css, /writing-mode:vertical-rl/);
  assert.match(css, /--era-band-width:46px/);
  assert.match(css, /--era-band-width:42px/);
});

test('header and every era group share one width and column geometry contract', () => {
  assert.match(alignmentCss, /--person-data-columns:\s*minmax\(200px, 1\.1fr\) minmax\(165px, \.85fr\) minmax\(500px, 3\.45fr\) 76px/);
  assert.match(alignmentCss, /--person-table-min-width:\s*998px/);
  assert.match(alignmentCss, /\.person-table-head,\s*\n\.person-era-group\s*\{[^}]*width:\s*100%[^}]*min-width:\s*var\(--person-table-min-width\)/s);
  assert.match(alignmentCss, /\.person-table-head\s*\{[^}]*grid-template-columns:\s*var\(--era-band-width\) var\(--person-data-columns\)/s);
  assert.match(alignmentCss, /\.person-era-group\s*\{[^}]*grid-template-columns:\s*var\(--era-band-width\) minmax\(0, 1fr\)/s);
  assert.match(alignmentCss, /\.person-era-rows > \.person-card\s*\{[^}]*width:\s*100%[^}]*grid-template-columns:\s*var\(--person-data-columns\)/s);
});

test('polity label has the same primary type size as the Person name', () => {
  assert.match(alignmentCss, /\.person-table-activities \.person-card-activity-head b\s*\{[^}]*font-size:\s*14px/s);
  assert.match(alignmentCss, /@media \(max-width: 760px\)[\s\S]*\.person-table-activities \.person-card-activity-head b\s*\{[^}]*font-size:\s*13px/s);
});

test('alignment layer is loaded after existing table and mobile width styles', () => {
  const tableStyle = html.indexOf('atlas-person-table-view.css');
  const mobileWidths = html.indexOf('atlas-person-mobile-column-widths.css');
  const alignment = html.indexOf('atlas-person-table-alignment.css?v=20260816-table-alignment-v1');
  assert.ok(tableStyle >= 0 && mobileWidths > tableStyle && alignment > mobileWidths);
});

test('era band presentation uses fresh browser cache keys', () => {
  assert.match(html, /atlas-person-table-view\.css\?v=20260816-era-band-v1/);
  assert.match(html, /atlas-person-table-view\.js\?v=20260816-era-band-v1/);
});
