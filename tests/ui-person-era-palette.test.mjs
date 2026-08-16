import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const palette = fs.readFileSync(new URL('../atlas-person-era-palette.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('ATLAS era bands use the reviewed accessible categorical palette', () => {
  const expected = [
    ['person-era-ancient', '#F3E8CF', '#6A4B18'],
    ['person-era-classical', '#E4EAF3', '#354F73'],
    ['person-era-medieval', '#E4EDE5', '#3E5B46'],
    ['person-era-early-modern', '#EDE4EE', '#65486B'],
    ['person-era-industrial-imperial', '#E5E7E8', '#4E5963'],
    ['person-era-world-wars', '#E8E6D9', '#4B5237'],
    ['person-era-contemporary', '#E1EEF1', '#315E68'],
    ['person-era-unknown', '#ECEFF2', '#616A75']
  ];
  for (const [className, background, foreground] of expected) {
    assert.match(palette, new RegExp(`\\.${className}\\{background:${background};color:${foreground}\\}`, 'i'));
  }
});

test('era palette loads after the base table stylesheet and before mobile width overrides', () => {
  const base = 'atlas-person-table-view.css?v=20260816-era-band-v1';
  const paletteAsset = 'atlas-person-era-palette.css?v=20260816-era-palette-v1';
  const mobile = 'atlas-person-mobile-column-widths.css?v=20260816-mobile-widths-v2';
  assert.ok(html.includes(base));
  assert.ok(html.includes(paletteAsset));
  assert.ok(html.includes(mobile));
  assert.ok(html.indexOf(base) < html.indexOf(paletteAsset));
  assert.ok(html.indexOf(paletteAsset) < html.indexOf(mobile));
});
