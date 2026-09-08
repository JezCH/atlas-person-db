import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const eraModel = fs.readFileSync(new URL('../atlas-person-era-model.js', import.meta.url), 'utf8');
const tableView = fs.readFileSync(new URL('../atlas-person-table-view.js', import.meta.url), 'utf8');
const spacetimeView = fs.readFileSync(new URL('../atlas-person-spacetime-view.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('ATLAS global era boundaries have one reviewed source of truth', () => {
  assert.match(eraModel, /code: "early-civilization"[^\n]*range: "BC 1000 이전"[^\n]*start_year: null[^\n]*end_year: -1001/);
  assert.match(eraModel, /code: "ancient"[^\n]*range: "BC 1000 – 601"[^\n]*start_year: -1000[^\n]*end_year: -601/);
  assert.match(eraModel, /code: "classical"[^\n]*range: "BC 600 – AD 599"[^\n]*start_year: -600[^\n]*end_year: 599/);
  assert.match(eraModel, /code: "early-medieval"[^\n]*range: "AD 600 – 999"[^\n]*start_year: 600[^\n]*end_year: 999/);
  assert.match(eraModel, /code: "late-medieval"[^\n]*range: "AD 1000 – 1491"[^\n]*start_year: 1000[^\n]*end_year: 1491/);
  assert.match(eraModel, /code: "early-modern"[^\n]*range: "AD 1492 – 1749"[^\n]*start_year: 1492[^\n]*end_year: 1749/);
  assert.match(eraModel, /code: "industrial-imperial"[^\n]*range: "AD 1750 – 1913"[^\n]*start_year: 1750[^\n]*end_year: 1913/);
  assert.match(eraModel, /code: "world-wars"[^\n]*range: "AD 1914 – 1944"[^\n]*start_year: 1914[^\n]*end_year: 1944/);
  assert.match(eraModel, /code: "cold-war"[^\n]*range: "AD 1945 – 1990"[^\n]*start_year: 1945[^\n]*end_year: 1990/);
  assert.match(eraModel, /code: "information"[^\n]*range: "AD 1991 이후"[^\n]*start_year: 1991[^\n]*end_year: null/);
  assert.match(eraModel, /code: "unknown"[^\n]*label: "전설, 신화, 연대미상"[^\n]*range: "연표 외 · 주요 활동연도 미상"/);
  assert.match(eraModel, /year === 0/);
});

test('superseded legacy cutoffs and collapsed era codes are absent from the authority model', () => {
  assert.doesNotMatch(eraModel, /range: "BC 480 이전"|start_year: -480|end_year: -481/);
  assert.doesNotMatch(eraModel, /code: "medieval"|code: "contemporary"/);
  assert.doesNotMatch(eraModel, /range: "AD 500 – 1491"|range: "AD 1945 이후"/);
});

test('Person table consumes the shared era model instead of redeclaring boundaries', () => {
  assert.match(tableView, /window\.ATLAS_PERSON_ERA_MODEL/);
  assert.match(tableView, /eraModel\.eraForYear\(year\)/);
  assert.doesNotMatch(tableView, /const ERAS\s*=/);
  assert.doesNotMatch(tableView, /BC 1000 이전|AD 1492 – 1749|AD 1991 이후/);
});

test('spacetime view consumes the shared era model while retaining its own placement model', () => {
  assert.match(spacetimeView, /window\.ATLAS_PERSON_ERA_MODEL/);
  assert.match(spacetimeView, /eraModel\.ERAS\.map/);
  assert.doesNotMatch(spacetimeView, /ERA_DEFINITIONS/);
  assert.doesNotMatch(spacetimeView, /BC 1000 이전|AD 1492 – 1749|AD 1991 이후/);
  assert.match(spacetimeView, /placement_basis !== "polity_place_function"/);
  assert.match(spacetimeView, /place_function_period_gap/);
  assert.match(spacetimeView, /place_function_region_conflict/);
});

test('shared era model loads before Person table and before lazy spacetime activation', () => {
  const eraIndex = html.indexOf('atlas-person-era-model.js?v=20260909-era-10-band-v1');
  const tableIndex = html.indexOf('atlas-person-table-view.js?v=20260819-era-model-r2');
  const navIndex = html.indexOf('atlas-main-authority-nav.js');
  assert.ok(eraIndex >= 0, 'shared era model script must be present');
  assert.ok(tableIndex > eraIndex, 'table view must load after era model');
  assert.ok(navIndex > eraIndex, 'authority navigation / spacetime loader must run after era model');
});
