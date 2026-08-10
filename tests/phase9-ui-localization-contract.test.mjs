import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const contract = JSON.parse(read('migration/phase-9/ui-localization-ko.json'));
const app = read('app.js');
const mobile = read('mobile-ui.js');
const index = read('index.html');
const readerService = read('server/atlas-normalized-read-service.js');
const applyScript = read('migration/phase-9/scripts/phase9-apply-ui-localization.mjs');

test('Korean localization contract covers the audited live gaps exactly', () => {
  assert.equal(contract.version, 1);
  assert.equal(contract.locale, 'ko');
  assert.equal(Object.keys(contract.persons).length, 9);
  assert.equal(Object.keys(contract.polities).length, 15);
  assert.equal(Object.keys(contract.roles).length, 149);
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

test('static browser locale patches are retired from the active page', () => {
  assert.doesNotMatch(index, /person-locales\.js/);
  assert.doesNotMatch(index, /person-locales-supplement/);
  assert.doesNotMatch(index, /search-index\.js/);
  assert.doesNotMatch(app, /ATLAS_LOCALES/);
});

test('localization apply is additive and proves relationship row immutability', () => {
  assert.match(applyScript, /relationshipSnapshot/);
  assert.match(applyScript, /relationships_unchanged = true/);
  assert.match(applyScript, /after\.digest !== before\.digest/);
  assert.doesNotMatch(applyScript, /insert into atlas_v2\.person_politics_v2/i);
  assert.doesNotMatch(applyScript, /update atlas_v2\.person_politics_v2/i);
  assert.doesNotMatch(applyScript, /delete from atlas_v2\.person_politics_v2/i);
});
