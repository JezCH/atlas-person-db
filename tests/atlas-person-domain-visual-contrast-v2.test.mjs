import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const css = fs.readFileSync(path.join(root, 'atlas-person-domain-palette.css'), 'utf8').toLowerCase();
const spacetimeCss = fs.readFileSync(path.join(root, 'atlas-person-spacetime-domain-colors.css'), 'utf8').toLowerCase();
const owner = fs.readFileSync(path.join(root, 'atlas-domain-surface-owner.js'), 'utf8');

test('Person domain contrast assets are cache-busted without changing the UI surface contract', () => {
  assert.match(owner, /atlas-person-domain-palette\.css\?v=20260912-religion-warm-ivory-renderer/);
  assert.match(owner, /atlas-person-spacetime-domain-colors\.css\?v=20260912-religion-warm-ivory-renderer/);
});

test('Person table domain skin has a strong existing-cell edge and does not add a badge or dot', () => {
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

test('domain-aware Person links keep neutral text and use the domain edge as the underline cue', () => {
  assert.match(css, /\.person-card\[data-representative-domain\]\s+\.person-main-name-link\s*\{[^}]*color:\s*#34405f/s);
  assert.match(css, /text-decoration-color:\s*var\(--person-domain-edge\)/);
  assert.match(css, /text-decoration-thickness:\s*\.11em/);
  assert.match(css, /\.person-card\[data-representative-domain\]\s+\.person-main-name-link:hover\s*\{[^}]*text-decoration-color:\s*var\(--person-domain-edge\)/s);
});

test('religion restores Warm Ivory as the visible identity while the dark tone is outline-only', () => {
  assert.match(css, /--atlas-person-domain-religion:\s*#e2d7b9/);
  assert.match(css, /--atlas-person-domain-religion-edge:\s*#857856/);
  assert.match(css, /--atlas-person-domain-religion-tint:\s*rgba\(226, 215, 185, 0\.46\)/);
  assert.match(css, /--atlas-person-domain-religion-hover:\s*rgba\(226, 215, 185, 0\.54\)/);
  assert.match(css, /--atlas-person-domain-religion-selected:\s*rgba\(226, 215, 185, 0\.62\)/);
  assert.match(css, /\.person-card\[data-representative-domain="religion"\]\s+\.person-table-identity\s*\{[^}]*inset 5px 0 0 var\(--person-domain-color\)[^}]*inset 6px 0 0 var\(--person-domain-edge\)/s);
});

test('religion spacetime labels and rails keep Warm Ivory visible with a thin darker outline', () => {
  assert.match(spacetimeCss, /\.spacetime-track-label\[data-representative-domain="religion"\][^{]*\{[^}]*inset 3px 0 0 var\(--spacetime-person-domain-color\)[^}]*inset 4px 0 0 var\(--spacetime-person-domain-edge\)/s);
  assert.match(spacetimeCss, /\.spacetime-track-rail\[data-representative-domain="religion"\][^{]*\{[^}]*box-shadow:\s*inset 0 0 0 1px var\(--spacetime-person-domain-edge\)/s);
});
