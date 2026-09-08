import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const eraSource = fs.readFileSync(new URL('../atlas-person-era-model.js', import.meta.url), 'utf8');
const palette = fs.readFileSync(new URL('../atlas-person-era-palette.css', import.meta.url), 'utf8');
const tableView = fs.readFileSync(new URL('../atlas-person-table-view.js', import.meta.url), 'utf8');
const spacetimeView = fs.readFileSync(new URL('../atlas-person-spacetime-view.js', import.meta.url), 'utf8');

function loadEraModel() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(eraSource, context, { filename: 'atlas-person-era-model.js' });
  return context.window.ATLAS_PERSON_ERA_MODEL;
}

const expectedEras = [
  ['early-civilization', '초기문명', null, -1001],
  ['ancient', '고대', -1000, -601],
  ['classical', '고전', -600, 599],
  ['early-medieval', '전기중세', 600, 999],
  ['late-medieval', '후기중세', 1000, 1491],
  ['early-modern', '근세', 1492, 1749],
  ['industrial-imperial', '산업·제국', 1750, 1913],
  ['world-wars', '세계대전', 1914, 1944],
  ['cold-war', '냉전', 1945, 1990],
  ['information', '정보화', 1991, null]
];

test('canonical person era model exposes the ten ordered timeline eras', () => {
  const model = loadEraModel();
  assert.deepEqual(
    Array.from(model.ERAS, (era) => [era.code, era.label, era.start_year, era.end_year]),
    expectedEras
  );
  assert.equal(model.UNKNOWN_ERA.code, 'unknown');
});

test('era boundaries are continuous across all historical years except the intentionally invalid year zero', () => {
  const model = loadEraModel();
  const cases = [
    [-5000, 'early-civilization'],
    [-1001, 'early-civilization'],
    [-1000, 'ancient'],
    [-601, 'ancient'],
    [-600, 'classical'],
    [-1, 'classical'],
    [0, 'unknown'],
    [1, 'classical'],
    [599, 'classical'],
    [600, 'early-medieval'],
    [999, 'early-medieval'],
    [1000, 'late-medieval'],
    [1491, 'late-medieval'],
    [1492, 'early-modern'],
    [1749, 'early-modern'],
    [1750, 'industrial-imperial'],
    [1913, 'industrial-imperial'],
    [1914, 'world-wars'],
    [1944, 'world-wars'],
    [1945, 'cold-war'],
    [1990, 'cold-war'],
    [1991, 'information'],
    [2500, 'information']
  ];
  for (const [year, code] of cases) assert.equal(model.eraForYear(year).code, code, `year ${year}`);
});

test('person table and spacetime table both consume the canonical era model rather than duplicate era boundaries', () => {
  assert.match(tableView, /const eraModel = window\.ATLAS_PERSON_ERA_MODEL/);
  assert.match(tableView, /return eraModel\.eraForYear\(year\)/);
  assert.match(spacetimeView, /const eraModel = window\.ATLAS_PERSON_ERA_MODEL/);
  assert.match(spacetimeView, /eraModel\.ERAS\.map\(\(era\) =>/);
  assert.doesNotMatch(tableView, /start_year:\s*-?\d+|end_year:\s*-?\d+/);
  assert.doesNotMatch(spacetimeView, /code:\s*["'](?:ancient|classical|medieval|contemporary)["']/);
});

test('every canonical era and the non-timeline bucket has a palette class', () => {
  const model = loadEraModel();
  for (const era of model.ERAS) assert.match(palette, new RegExp(`\\.person-era-${era.code}\\{`));
  assert.match(palette, /\.person-era-unknown\{/);
});
