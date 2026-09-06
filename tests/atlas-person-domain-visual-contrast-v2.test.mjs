import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const css = fs.readFileSync(path.join(root, 'atlas-person-domain-palette.css'), 'utf8').toLowerCase();
const owner = fs.readFileSync(path.join(root, 'atlas-domain-surface-owner.js'), 'utf8');

test('Person domain contrast asset is cache-busted without changing the UI surface contract', () => {
  assert.match(owner, /atlas-person-domain-palette\.css\?v=20260906-contrast-v3/);
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

test('domain-aware Person links keep neutral text and use the domain as the underline cue', () => {
  assert.match(css, /\.person-card\[data-representative-domain\]\s+\.person-main-name-link\s*\{[^}]*color:\s*#34405f/s);
  assert.match(css, /text-decoration-color:\s*var\(--person-domain-edge\)/);
  assert.match(css, /text-decoration-thickness:\s*\.11em/);
});

test('bright religion identity has an explicit darker edge and stronger state tints', () => {
  assert.match(css, /--atlas-person-domain-religion-edge:\s*#857856/);
  assert.match(css, /--atlas-person-domain-religion-tint:\s*rgba\(226, 215, 185, 0\.30\)/);
  assert.match(css, /--atlas-person-domain-religion-hover:\s*rgba\(226, 215, 185, 0\.38\)/);
  assert.match(css, /--atlas-person-domain-religion-selected:\s*rgba\(226, 215, 185, 0\.46\)/);
});
