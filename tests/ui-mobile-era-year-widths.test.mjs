import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../atlas-person-mobile-column-widths.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('mobile table uses tighter era, person and year columns', () => {
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /--era-band-width:\s*38px/);
  assert.match(css, /124px 108px minmax\(390px, 1fr\) 66px/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /--era-band-width:\s*32px/);
  assert.match(css, /116px 104px minmax\(375px, 1fr\) 62px/);
  assert.match(css, /white-space:\s*nowrap/);
});

test('mobile table enlarges polity names inside Activity rows', () => {
  assert.match(css, /\.person-table-activities \.person-card-activity-head b\s*\{[^}]*font-size:\s*12px/s);
});

test('mobile width override loads after the base table stylesheet', () => {
  const base = 'atlas-person-table-view.css?v=20260816-era-band-v1';
  const override = 'atlas-person-mobile-column-widths.css?v=20260816-mobile-widths-v2';
  assert.ok(html.includes(base));
  assert.ok(html.includes(override));
  assert.ok(html.indexOf(base) < html.indexOf(override));
});
