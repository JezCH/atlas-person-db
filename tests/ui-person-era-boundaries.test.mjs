import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const eraModel = fs.readFileSync(new URL('../atlas-person-era-model.js', import.meta.url), 'utf8');
const tableView = fs.readFileSync(new URL('../atlas-person-table-view.js', import.meta.url), 'utf8');
const spacetimeView = fs.readFileSync(new URL('../atlas-person-spacetime-view.js', import.meta.url), 'utf8');
const authorityNav = fs.readFileSync(new URL('../atlas-main-authority-nav.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('ATLAS global era boundaries have one reviewed source of truth', () => {
  assert.match(eraModel, /code: "ancient"[^\n]*range: "BC 480 이전"[^\n]*end_year: -481/);
  assert.match(eraModel, /code: "classical"[^\n]*range: "BC 480 – AD 499"[^\n]*start_year: -480[^\n]*end_year: 499/);
  assert.match(eraModel, /code: "medieval"[^\n]*range: "AD 500 – 1491"[^\n]*start_year: 500[^\n]*end_year: 1491/);
  assert.match(eraModel, /code: "early-modern"[^\n]*range: "AD 1492 – 1749"[^\n]*start_year: 1492[^\n]*end_year: 1749/);
  assert.match(eraModel, /code: "industrial-imperial"[^\n]*range: "AD 1750 – 1913"[^\n]*start_year: 1750[^\n]*end_year: 1913/);
  assert.match(eraModel, /code: "world-wars"[^\n]*range: "AD 1914 – 1944"[^\n]*start_year: 1914[^\n]*end_year: 1944/);
  assert.match(eraModel, /code: "contemporary"[^\n]*range: "AD 1945 이후"[^\n]*start_year: 1945[^\n]*end_year: null/);
  assert.match(eraModel, /year === 0/);
});

test('the superseded BC 500 and AD 1500 cutoffs are not retained', () => {
  assert.doesNotMatch(eraModel, /range: "BC 500 이전"/);
  assert.doesNotMatch(eraModel, /range: "AD 1500 – 1749"/);
  assert.doesNotMatch(eraModel, /start_year: -500|end_year: -501/);
  assert.doesNotMatch(eraModel, /start_year: 1500/);
});

test('Person table and spacetime view consume the shared era model instead of redeclaring boundaries', () => {
  assert.match(tableView, /window\.ATLAS_PERSON_ERA_MODEL/);
  assert.match(tableView, /eraModel\.eraForYear\(year\)/);
  assert.doesNotMatch(tableView, /const ERAS\s*=/);
  assert.doesNotMatch(tableView, /BC 480 이전|AD 1492 – 1749|AD 1945 이후/);

  assert.match(spacetimeView, /window\.ATLAS_PERSON_ERA_MODEL/);
  assert.match(spacetimeView, /eraModel\.ERAS\.map/);
  assert.doesNotMatch(spacetimeView, /ERA_DEFINITIONS/);
  assert.doesNotMatch(spacetimeView, /BC 480 이전|AD 1492 – 1749|AD 1945 이후/);
});

test('shared era model loads before table rendering and spacetime uses the cache-busted consumer', () => {
  const eraIndex = html.indexOf('atlas-person-era-model.js?v=20260817-era-model-r1');
  const tableIndex = html.indexOf('atlas-person-table-view.js?v=20260817-era-model-r1');
  assert.ok(eraIndex >= 0 && tableIndex > eraIndex);
  assert.match(html, /atlas-main-authority-nav\.js\?v=20260817-era-model-r1/);
  assert.match(authorityNav, /atlas-person-spacetime-view\.js\?v=20260817-era-model-r1/);
});
