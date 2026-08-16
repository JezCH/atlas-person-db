import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../atlas-person-table-view.js', import.meta.url), 'utf8');

test('ATLAS global era boundaries use the reviewed navigation cutoffs', () => {
  assert.match(source, /code: "ancient"[^\n]*range: "BC 480 이전"[^\n]*year < -480/);
  assert.match(source, /code: "classical"[^\n]*range: "BC 480 – AD 499"[^\n]*year < 500/);
  assert.match(source, /code: "medieval"[^\n]*range: "AD 500 – 1491"[^\n]*year < 1492/);
  assert.match(source, /code: "early-modern"[^\n]*range: "AD 1492 – 1749"[^\n]*year < 1750/);
  assert.match(source, /code: "industrial-imperial"[^\n]*range: "AD 1750 – 1913"[^\n]*year < 1914/);
  assert.match(source, /code: "world-wars"[^\n]*range: "AD 1914 – 1944"[^\n]*year < 1945/);
  assert.match(source, /code: "contemporary"[^\n]*range: "AD 1945 이후"/);
});

test('the superseded BC 500 and AD 1500 cutoffs are not retained', () => {
  assert.doesNotMatch(source, /range: "BC 500 이전"/);
  assert.doesNotMatch(source, /range: "AD 1500 – 1749"/);
  assert.doesNotMatch(source, /year < -500/);
  assert.doesNotMatch(source, /year < 1500/);
});
