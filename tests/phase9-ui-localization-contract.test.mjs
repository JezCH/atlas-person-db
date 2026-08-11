import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const exists = (rel) => fs.existsSync(new URL(`../${rel}`, import.meta.url));
const contract = JSON.parse(read('migration/phase-9/ui-localization-ko.json'));
const app = read('app.js');
const mobile = read('mobile-ui.js');
const index = read('index.html');
const readerService = read('server/atlas-normalized-read-service.js');
const identityService = read('server/atlas-identity-service.js');

test('historical Korean localization contract remains evidence without becoming a live cardinality gate', () => {
  assert.equal(contract.version, 1);
  assert.equal(contract.locale, 'ko');
  assert.ok(Object.keys(contract.persons).length > 0);
  assert.ok(Object.keys(contract.polities).length > 0);
  assert.ok(Object.keys(contract.roles).length > 0);
  assert.equal(contract.persons['Aung San Suu Kyi'], '아웅 산 수 치');
  assert.equal(contract.persons['Gustav II Adolf'], '구스타브 2세 아돌프');
  assert.equal(contract.polities['Kingdom of Siam'], '시암 왕국');
  assert.equal(contract.polities['Western Xia'], '서하');
  assert.equal(contract.roles['Emperor'], '황제');
  assert.equal(contract.roles['King of Kings'], '왕중왕');
  assert.equal(contract.roles['Caliph'], '칼리프');
  assert.equal(contract.roles['Ajaw'], '아하우');
});

test('direct normalized projection separates canonical aliases from Korean display aliases', () => {
  assert.match(readerService, /person_display_name/);
  assert.match(readerService, /politic_display_name/);
  assert.match(readerService, /role_display_name/);
  assert.match(readerService, /pko\.locale = 'ko'/);
  assert.match(readerService, /tko\.locale = 'ko'/);
  assert.match(readerService, /rn\.locale = 'ko'/);
});

test('authoring UI defaults to signed chronology order and exposes reverse chronology toggle', () => {
  assert.match(index, /기본 정렬: 활동 시작연도 과거 → 현재/);
  assert.match(index, /id="sortOrder"/);
  assert.match(index, /value="start-asc"/);
  assert.match(index, /value="start-desc"/);
  assert.match(app, /Number\(a\.activity_start\) - Number\(b\.activity_start\)/);
  assert.doesNotMatch(app, /String\(a\.politic_name\).*Number\(a\.activity_start\)/s);
});

test('authoring UI displays localized fields while retaining canonical values for bilingual search', () => {
  assert.match(app, /record\.person_display_name \|\| record\.person_name/);
  assert.match(app, /record\.politic_display_name \|\| record\.politic_name/);
  assert.match(app, /record\.role_display_name \|\| record\.role/);
  assert.match(app, /data-search=/);
  assert.match(app, /record\.person_name/);
  assert.match(app, /record\.politic_name/);
  assert.match(mobile, /row\.dataset\.search \|\| row\.textContent/);
});

test('static browser locale patches are retired from the active page and repository root', () => {
  assert.doesNotMatch(index, /person-locales\.js/);
  assert.doesNotMatch(index, /person-locales-supplement/);
  assert.doesNotMatch(index, /search-index\.js/);
  assert.doesNotMatch(app, /ATLAS_LOCALES/);
  assert.equal(exists('person-locales.js'), false);
  assert.equal(exists('search-index.js'), false);
});

test('future Person and Polity localization is part of normalized identity authoring, not a one-time patch', () => {
  assert.match(identityService, /insert into atlas_v2\.person_names/);
  assert.match(identityService, /'en',\$2,'canonical',true/);
  assert.match(identityService, /'ko',\$3,'display',true/);
  assert.match(identityService, /insert into atlas_v2\.polity_names/);
  assert.match(identityService, /begin isolation level serializable/i);
});

test('completed one-time localization apply executable is retired', () => {
  assert.equal(exists('migration/phase-9/scripts/phase9-apply-ui-localization.mjs'), false);
});
