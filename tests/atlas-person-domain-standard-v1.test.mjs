import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const css = fs.readFileSync(path.join(root, 'atlas-person-domain-palette.css'), 'utf8').toLowerCase();
const ui = fs.readFileSync(path.join(root, 'atlas-person-domain-ui.js'), 'utf8');
const proposals = ['batch-001.json','batch-002.json','batch-003.json','batch-004.json','batch-005.json','palette-smoke-001.json']
  .map((name) => fs.readFileSync(path.join(root, 'proposals/person-representative-domain', name), 'utf8'))
  .join('\n');

const palette = Object.freeze({
  governance:'#d4af37',
  military:'#b83a3a',
  knowledge:'#3f78c5',
  technology:'#59636d',
  commerce:'#2e8b57',
  culture:'#9a5ba5',
  religion:'#e2d7b9',
  exploration:'#d96b1e'
});

test('final ATLAS representative-domain palette uses the eight exact canonical colors', () => {
  for (const [domain, hex] of Object.entries(palette)) {
    assert.match(css, new RegExp(`--atlas-person-domain-${domain}:\\s*${hex.replace('#','\\#')}`));
    assert.match(css, new RegExp(`data-representative-domain="${domain}"`));
  }
  assert.match(css, /--person-domain-color:\s*transparent/);
  assert.match(css, /--person-domain-edge:\s*transparent/);
  assert.match(css, /--person-domain-tint:\s*transparent/);
});

test('browser registry and reviewed proposals use canonical codes only', () => {
  for (const domain of Object.keys(palette)) assert.match(ui, new RegExp(`code:\"${domain}\"`));
  assert.doesNotMatch(ui, /code:\"ruler\"|code:\"science\"/);
  assert.doesNotMatch(proposals, /"representative_domain"\s*:\s*"(?:ruler|science)"/);
});

test('first reviewed batch remains 48 assignments plus an independent 8-color smoke set', () => {
  const batchCount = ['batch-001.json','batch-002.json','batch-003.json','batch-004.json','batch-005.json']
    .map((name) => JSON.parse(fs.readFileSync(path.join(root, 'proposals/person-representative-domain', name), 'utf8')).entries.length)
    .reduce((a,b) => a+b, 0);
  const smoke = JSON.parse(fs.readFileSync(path.join(root, 'proposals/person-representative-domain/palette-smoke-001.json'), 'utf8'));
  const hold = JSON.parse(fs.readFileSync(path.join(root, 'proposals/person-representative-domain/hold-001.json'), 'utf8'));
  assert.equal(batchCount, 48);
  assert.equal(smoke.entries.length, 8);
  assert.deepEqual(new Set(smoke.entries.map((entry) => entry.representative_domain)), new Set(Object.keys(palette)));
  assert.equal(hold.entries.length, 2);
});
