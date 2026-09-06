import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../atlas-person-spacetime-view.css', import.meta.url), 'utf8');
const view = readFileSync(new URL('../atlas-person-spacetime-view.js', import.meta.url), 'utf8');

function cssRule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\{([^}]*)\\}`));
  assert.ok(match, `missing CSS rule for ${selector}`);
  return match[1];
}

test('rendered spacetime Person labels keep the complete single-line name visible', () => {
  const rule = cssRule('.spacetime-track-label');

  assert.match(rule, /white-space\s*:\s*nowrap/);
  assert.match(rule, /overflow\s*:\s*visible/);
  assert.match(rule, /text-overflow\s*:\s*clip/);
  assert.doesNotMatch(rule, /overflow\s*:\s*hidden/);
  assert.doesNotMatch(rule, /text-overflow\s*:\s*ellipsis/);
  assert.doesNotMatch(rule, /max-width\s*:/);
});

test('Person track label rendering remains delegated to the horizontal label engine', () => {
  const match = view.match(/function packTrackLabels\([\s\S]*?\n  }\n\n  function reasonLabel/);
  assert.ok(match, 'packTrackLabels implementation must remain present');
  const block = match[0];

  assert.match(block, /text:\s*item\.track\.display_name/);
  assert.match(block, /labelEngine\.packLabels\(/);
  assert.doesNotMatch(block, /preserveFullTextWidth\s*:\s*false/);
});
