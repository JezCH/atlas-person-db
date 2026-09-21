import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const geometryCss = fs.readFileSync(new URL('../atlas-person-table-alignment.css', import.meta.url), 'utf8');
const tableCss = fs.readFileSync(new URL('../atlas-person-table-view.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('canonical geometry contract owns viewport-fit mobile table widths', () => {
  const mobile = geometryCss.slice(geometryCss.indexOf('@media (max-width: 760px)'));
  assert.match(mobile, /--era-band-width:\s*34px/);
  assert.match(mobile, /--person-data-columns:\s*minmax\(88px, \.95fr\) minmax\(72px, \.72fr\) minmax\(0, 1\.55fr\) 44px/);
  assert.match(mobile, /--person-data-min-width:\s*0px/);
  assert.match(mobile, /--person-table-min-width:\s*0px/);
  assert.match(mobile, /@media \(max-width: 520px\)/);
  assert.match(mobile, /--era-band-width:\s*30px/);
  assert.match(mobile, /--person-data-columns:\s*minmax\(82px, \.95fr\) minmax\(68px, \.72fr\) minmax\(0, 1\.55fr\) 38px/);
  assert.doesNotMatch(mobile, /688px|726px|657px|689px|minmax\(390px|minmax\(375px/);
  assert.match(mobile, /white-space:\s*normal/);
  assert.match(mobile, /overflow-wrap:\s*anywhere/);
});

test('canonical geometry contract owns Activity subcolumns and mobile polity type size', () => {
  assert.match(geometryCss, /--person-activity-columns:\s*minmax\(145px, 1\.15fr\) minmax\(135px, 1fr\) minmax\(125px, \.9fr\)/);
  assert.match(geometryCss, /@media \(max-width: 760px\)[\s\S]*--person-activity-columns:\s*minmax\(0, 1fr\)/);
  assert.match(geometryCss, /\.person-table-activities \.person-card-activity-head b\s*\{[^}]*font-size:\s*14px/s);
  assert.match(geometryCss, /@media \(max-width: 760px\)[\s\S]*\.person-table-activities \.person-card-activity-head b\s*\{[^}]*font-size:\s*12px/s);
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
  const base = 'atlas-person-table-view.css?v=20260921-mobile-card-fit-v1';
  const geometry = 'atlas-person-table-alignment.css?v=20260921-mobile-card-fit-v1';
  assert.ok(html.includes(base));
  assert.ok(html.includes(geometry));
  assert.ok(html.indexOf(base) < html.indexOf(geometry));
});
