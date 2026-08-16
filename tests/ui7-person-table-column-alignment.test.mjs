import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../atlas-person-table-view.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../atlas-person-table-view.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Person table composes an era band with the existing four Person data cells', () => {
  assert.match(source, /\["person-table-col-era", "시대"\]/);
  assert.match(source, /\[identity, range, activities, count\]/);
  assert.doesNotMatch(source, /\[identity, range, activities, count, status\]/);
  assert.match(source, /person-table-identity/);
  assert.match(source, /person-table-range/);
  assert.match(source, /person-table-activities/);
  assert.match(source, /person-table-count/);
  assert.match(source, /person-table-status-inline/);
  assert.match(source, /foldExceptionalStatus\(identity, status\)/);
});

test('era classification uses the agreed ATLAS global cut points and preserves unknown chronology', () => {
  assert.match(source, /year < -500/);
  assert.match(source, /year < 500/);
  assert.match(source, /year < 1500/);
  assert.match(source, /year < 1750/);
  assert.match(source, /year < 1914/);
  assert.match(source, /year < 1945/);
  for (const label of ['고대', '고전', '중세', '근세', '산업·제국', '세계대전', '현대', '연대 미상']) {
    assert.match(source, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(source, /groupRowsByEra\(grid\)/);
  assert.match(source, /person-era-group/);
  assert.match(source, /person-era-band/);
});

test('era band remains a sticky narrow first column on desktop and mobile', () => {
  assert.match(css, /--era-band-width:58px/);
  assert.match(css, /person-era-band\{position:sticky;left:0/);
  assert.match(css, /writing-mode:vertical-rl/);
  assert.match(css, /--era-band-width:46px/);
  assert.match(css, /--era-band-width:42px/);
});

test('era band presentation uses fresh browser cache keys', () => {
  assert.match(html, /atlas-person-table-view\.css\?v=20260816-era-band-v1/);
  assert.match(html, /atlas-person-table-view\.js\?v=20260816-era-band-v1/);
});
