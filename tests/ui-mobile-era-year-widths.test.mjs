import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const geometryCss = fs.readFileSync(new URL('../atlas-person-table-alignment.css', import.meta.url), 'utf8');
const tableCss = fs.readFileSync(new URL('../atlas-person-table-view.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('canonical geometry contract owns the effective mobile table widths', () => {
  assert.match(geometryCss, /@media \(max-width: 760px\)/);
  assert.match(geometryCss, /--era-band-width:\s*38px/);
  assert.match(geometryCss, /--person-data-columns:\s*124px 108px minmax\(390px, 1fr\) 66px/);
  assert.match(geometryCss, /--person-data-min-width:\s*688px/);
  assert.match(geometryCss, /--person-table-min-width:\s*726px/);
  assert.match(geometryCss, /@media \(max-width: 520px\)/);
  assert.match(geometryCss, /--era-band-width:\s*32px/);
  assert.match(geometryCss, /--person-data-columns:\s*116px 104px minmax\(375px, 1fr\) 62px/);
  assert.match(geometryCss, /--person-data-min-width:\s*657px/);
  assert.match(geometryCss, /--person-table-min-width:\s*689px/);
  assert.match(geometryCss, /white-space:\s*nowrap/);
});

test('canonical geometry contract owns Activity subcolumns and mobile polity type size', () => {
  assert.match(geometryCss, /--person-activity-columns:\s*minmax\(145px, 1\.15fr\) minmax\(135px, 1fr\) minmax\(125px, \.9fr\)/);
  assert.match(geometryCss, /--person-activity-columns:\s*120px 105px 100px/);
  assert.match(geometryCss, /--person-activity-columns:\s*115px 100px 96px/);
  assert.match(geometryCss, /\.person-table-activities \.person-card-activity-head b\s*\{[^}]*font-size:\s*14px/s);
  assert.match(geometryCss, /@media \(max-width: 760px\)[\s\S]*\.person-table-activities \.person-card-activity-head b\s*\{[^}]*font-size:\s*13px/s);
});

test('presentation stylesheet no longer carries fallback table geometry', () => {
  assert.doesNotMatch(tableCss, /--era-band-width\s*:/);
  assert.doesNotMatch(tableCss, /grid-template-columns\s*:/);
  for (const staleWidth of ['998px', '940px', '770px', '724px', '733px', '691px']) {
    assert.doesNotMatch(tableCss, new RegExp(`min-width:${staleWidth.replace('.', '\\.')}`));
  }
});

test('legacy mobile width asset is fully retired', () => {
  assert.equal(fs.existsSync(new URL('../atlas-person-mobile-column-widths.css', import.meta.url)), false);
  assert.doesNotMatch(html, /atlas-person-mobile-column-widths\.css/);
});

test('canonical geometry contract loads after the base table with fresh cache keys', () => {
  const base = 'atlas-person-table-view.css?v=20260817-era-band-r2';
  const geometry = 'atlas-person-table-alignment.css?v=20260817-table-geometry-r2';
  assert.ok(html.includes(base));
  assert.ok(html.includes(geometry));
  assert.ok(html.indexOf(base) < html.indexOf(geometry));
});
