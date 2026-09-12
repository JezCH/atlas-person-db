import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const css = fs.readFileSync(path.join(root, 'atlas-person-domain-palette.css'), 'utf8').toLowerCase();
const spacetimeCss = fs.readFileSync(path.join(root, 'atlas-person-spacetime-domain-colors.css'), 'utf8').toLowerCase();
const owner = fs.readFileSync(path.join(root, 'atlas-domain-surface-owner.js'), 'utf8');

test('religion silver-blue palette asset is cache-busted without changing the spacetime stylesheet contract', () => {
  assert.match(owner, /atlas-person-domain-palette\.css\?v=20260912-religion-silver-blue-v6/);
  assert.match(owner, /atlas-person-spacetime-domain-colors\.css\?v=20260912-religion-silver-v5/);
});

test('Person table domain skin keeps a strong existing-cell edge and adds no badge or dot', () => {
  assert.match(css, /\.person-card\[data-representative-domain\]\s+\.person-table-identity\s*\{[^}]*box-shadow:\s*inset 5px 0 0 var\(--person-domain-edge\)/s);
  assert.match(css, /padding-inline-start:\s*10px/);
  assert.match(css, /var\(--person-domain-tint\) 42%/);
  assert.doesNotMatch(css, /\.person-card\[data-representative-domain\][^{]*::(?:before|after)[^{]*\{/);
});

test('domain identity remains visible through hover and selection without replacing selection state', () => {
  assert.match(css, /--person-domain-hover:\s*transparent/);
  assert.match(css, /--person-domain-selected:\s*transparent/);
  assert.match(css, /\.person-era-rows\s*>\s*\.person-card\[data-representative-domain\]:hover\s+\.person-table-identity/);
  assert.match(css, /var\(--person-domain-hover\) 42%/);
  assert.match(css, /\.person-era-rows\s*>\s*\.person-card\[data-representative-domain\]\.is-selected\s+\.person-table-identity/);
  assert.match(css, /var\(--person-domain-selected\) 42%/);
});

test('domain-aware Person links keep neutral text and use the domain edge as the visible underline cue', () => {
  assert.match(css, /\.person-card\[data-representative-domain\]\s+\.person-main-name-link\s*\{[^}]*color:\s*#34405f/s);
  assert.match(css, /text-decoration-color:\s*var\(--person-domain-edge\)/);
  assert.match(css, /text-decoration-thickness:\s*\.11em/);
});

test('non-religion white-background palette remains unchanged', () => {
  assert.match(css, /--atlas-person-domain-governance:\s*#b08b00/);
  assert.match(css, /--atlas-person-domain-governance-surface:\s*#d4af37/);
  assert.match(css, /--atlas-person-domain-technology:\s*#3b4147/);
  assert.match(css, /--atlas-person-domain-technology-surface:\s*#59636d/);
  assert.match(css, /--atlas-person-domain-culture:\s*#9a5ba5/);
  assert.match(css, /--atlas-person-domain-military:\s*#b83a3a/);
  assert.match(css, /--atlas-person-domain-knowledge:\s*#3f78c5/);
  assert.match(css, /--atlas-person-domain-commerce:\s*#2e8b57/);
  assert.match(css, /--atlas-person-domain-exploration:\s*#d96b1e/);
});

test('religion uses one plain silver-blue accent and keeps the quiet Pearl surface', () => {
  assert.match(css, /--atlas-person-domain-religion:\s*#afc1cc/);
  assert.match(css, /--atlas-person-domain-religion-edge:\s*#879eac/);
  assert.match(css, /--atlas-person-domain-religion-surface:\s*#dce8ef/);
  assert.match(css, /--atlas-person-domain-religion-tint:\s*rgba\(220, 232, 239, 0\.78\)/);
  assert.doesNotMatch(css, /\.person-card\[data-representative-domain="religion"\]\s+\.person-table-identity\s*\{/);
});

test('religion spacetime rail continues to use the shared plain accent without a category-specific outline', () => {
  assert.match(spacetimeCss, /data-representative-domain="religion"[\s\S]*--spacetime-person-domain-color:\s*var\(--atlas-person-domain-religion-edge\)/);
  assert.doesNotMatch(spacetimeCss, /\.spacetime-track-label\[data-representative-domain="religion"\]:not/);
  assert.doesNotMatch(spacetimeCss, /\.spacetime-track-rail\[data-representative-domain="religion"\]:not/);
});
