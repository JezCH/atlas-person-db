import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const assetNames = [
  'atlas-v3-cartouche.svg',
  'atlas-v3-corner.svg',
  'atlas-v3-astrolabe.svg',
  'atlas-v3-illuminated-initial.svg',
  'atlas-v3-chapter-flourish.svg'
];

test('VIS3-03 originals: five self-contained accessible decorative SVGs', async () => {
  for (const name of assetNames) {
    const data = await read('assets/ornaments/' + name);
    assert.match(data, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(data, /viewBox="0 0 [0-9]+ [0-9]+"/);
    assert.match(data, /<title[^>]*>[^<]+<\/title>/);
    assert.match(data, /<desc[^>]*>[^<]+<\/desc>/);
    assert.match(data, /<\/svg>\s*$/);
    assert.doesNotMatch(data, /<script|<foreignObject|<iframe|onload\s*=|onclick\s*=|href\s*=|url\(https?:/i);
    assert.ok((data.match(/<(?:path|circle|rect|line|g)\b/g) || []).length >= 5, name + ' must be visibly decorative');
  }
});

test('VIS3-03 scoped CSS is opt-in, asset-backed and non-animating', async () => {
  const css = await read('atlas-ui-ornament-kit-v3.css');
  assert.match(css, /UNUSED by index\.html until later VIS3/);
  assert.match(css, /\.atlas-ornament-kit\s*\{/);
  for (const name of assetNames.filter(n => n !== 'atlas-v3-illuminated-initial.svg')) {
    assert.ok(css.includes('assets/ornaments/' + name), name + ' is referenced by CSS');
  }
  for (const token of [
    '.atlas-o-cartouche', '.atlas-o-plate', '.atlas-o-instrument',
    '.atlas-o-codex', '.atlas-o-folio', '.atlas-o-chapter',
    '--atlas-o-metal', '--atlas-o-engraving', 'pointer-events: none',
    'prefers-reduced-motion: reduce'
  ]) assert.ok(css.includes(token), token);
  assert.doesNotMatch(css, /(?:^|\n)\s*(?:html|body|:root|\.person-register-entry|\.spacetime-frame|\.dashboard-kpi|\.polity-browser-card)\s*\{/m);
  assert.doesNotMatch(css, /(?:@import|@font-face|background:\s*url\(https?:|animation-name\s*:)/i);
});

test('VIS3-03 standalone preview references local assets with no runtime/write scripts', async () => {
  const html = await read('experiments/vis3-03-ornament-showcase.html');
  assert.match(html, /<html lang="ko">/);
  assert.match(html, /VIS3-03/);
  assert.match(html, /\.\.\/atlas-ui-ornament-kit-v3\.css/);
  assert.match(html, /GRAND ATLAS/);
  assert.match(html, /CHRONOMETER/);
  assert.match(html, /ILLUMINATED CODEX/);
  for (const name of assetNames) assert.ok(html.includes('../assets/ornaments/' + name), name);
  assert.doesNotMatch(html, /<script\b|fetch\s*\(|supabase|\/api\//i);
  assert.match(html, /실제.*운영 UI에는 아직 연결되지 않았습니다/);
});

test('VIS3-03 is not accidentally injected into live index/app routes', async () => {
  const index = await read('index.html');
  assert.ok(!index.includes('atlas-ui-ornament-kit-v3.css'), 'VIS3-04 owns deliberate live route integration');
  assert.ok(!index.includes('vis3-03-ornament-showcase'));
  assert.ok(!index.includes('atlas-v3-cartouche.svg'));
});

test('VIS3-03 does not overwrite semantic domain palette or Spacetime coordinates', async () => {
  const css = await read('atlas-ui-ornament-kit-v3.css');
  assert.doesNotMatch(css, /representative_domain|#D4AF37|--spacetime-(?:base|compression|axis)|zoom\s*:/i);
  assert.ok(css.indexOf('.atlas-ornament-kit') >= 0);
  const owners = [
    'atlas-ui-visual-foundation.css',
    'atlas-person-monumental-register.css',
    'atlas-person-spacetime-instrument-tools.css',
    'atlas-person-chronicle-detail.css'
  ];
  for (const owner of owners) assert.ok((await read(owner)).length > 100, owner + ' remains available');
});
