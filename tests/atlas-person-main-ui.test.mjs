import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../atlas-person-main.js', import.meta.url), 'utf8');
const reader = fs.readFileSync(new URL('../atlas-person-browser-reader.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../atlas-person-main.css', import.meta.url), 'utf8');
const mobile = fs.readFileSync(new URL('../mobile-ui.js', import.meta.url), 'utf8');

test('Main loads the Person reader before the Person-centered screen module', () => {
  assert.match(html, /atlas-person-main\.css/);
  assert.doesNotMatch(html, /atlas-person-main-filters\.css/);
  const readerIndex = html.indexOf('atlas-person-browser-reader.js');
  const mainIndex = html.indexOf('atlas-person-main.js');
  assert.ok(readerIndex >= 0);
  assert.ok(mainIndex > readerIndex);
  assert.match(main, /ATLAS_PERSON_BROWSER_READER/);
});

test('Person-centered Main makes historicity an explicit primary grouping before Polity filtering', () => {
  assert.match(main, /reader\.preparePersonGroups\(persons, \{ query, sortOrder, facetFilters \}\)/);
  assert.match(main, /역사 인물/);
  assert.match(main, /전설·신화·역사성 미확정 및 기타/);
  assert.match(main, /historical 이외의 authoritative historicity 값을 별도 구역에 원문 그대로 표시합니다/);
  assert.match(reader, /partitionByHistoricity/);
  assert.match(reader, /PRIMARY_HISTORICITY_VALUE = "historical"/);
  assert.match(reader, /personMatchesFacets/);
});

test('Person Main owns only Polity filter state and delegates its control surface to era navigation', () => {
  assert.match(main, /let facetFilters = \{ polity_id: "" \}/);
  assert.match(main, /function setPolityFilter/);
  assert.match(main, /atlas-person-polity-filter-change/);
  assert.match(main, /selectedPolityId: facetFilters\.polity_id/);
  assert.match(main, /polityOptions: polityOptions\(\)/);
  for (const removed of ['personMainFilterToggle', 'personMainFilters', 'personMainRelationFilter', 'personMainRoleFilter', 'personMainBasisFilter', 'personMainClearFilters', 'personMainSummary', 'personMainStatus']) {
    assert.doesNotMatch(main, new RegExp(removed));
  }
  const renderGroupsBody = main.slice(main.indexOf('function renderGroups'), main.indexOf('function setPolityFilter'));
  assert.doesNotMatch(renderGroupsBody, /readPerson\(/);
});

test('Person Main emits one current-result Person and Polity status contract', () => {
  assert.match(main, /visiblePolityCount/);
  assert.match(main, /visibleCount: shown/);
  assert.match(main, /visiblePolityCount: polityCount/);
  assert.doesNotMatch(main, /<strong>\$\{rows\.length\}명<\/strong>/);
  assert.doesNotMatch(html, /atlas-person-summary-counts\.js/);
});

test('Person detail renders readable names, descriptions, Person sources and complete Activity meaning', () => {
  for (const token of [
    'person.names',
    'person.descriptions',
    'person.sources',
    'person.activities',
    'activity.polity',
    'activity.relation',
    'activity.role',
    'activity.period_basis',
    'activity.start',
    'activity.end',
    'activity.confidence',
    'activity.chronology_status',
    'activity.notes',
    'activity.sources'
  ]) assert.match(main, new RegExp(token.replaceAll('.', '\\.')));
  assert.match(main, /Activity 출처/);
  assert.match(main, /Person 출처/);
});

test('Main renders BCE/CE and unknown chronology without changing historicity', () => {
  assert.match(main, /return `BC \$\{Math\.abs\(value\)\}`/);
  assert.match(main, /return `AD \$\{value\}`/);
  assert.match(main, /연도 미상/);
  assert.match(main, /활동연도가 미상이어도 역사성 분류는 유지됩니다/);
});

test('refresh preserves selected Person and forces authoritative detail refresh', () => {
  assert.match(main, /selectPerson\(selectedPersonId, \{ force: true \}\)/);
  assert.match(main, /\(!force && selectedPersonId === personId\)/);
});

test('mobile appbar search delegates to the Person Main search after Person shell installation', () => {
  assert.match(mobile, /function personMainSearch\(\)/);
  assert.match(mobile, /personSearch\.dispatchEvent\(new Event\("input", \{ bubbles: true \}\)\)/);
  assert.match(mobile, /atlas-person-main-rendered/);
  assert.match(main, /new CustomEvent\("atlas-person-main-rendered"/);
  assert.match(mobile, /visiblePersonCount/);
});

test('existing Activity authoring DOM is moved into a separate expandable tool instead of being recreated or deleted', () => {
  assert.match(main, /body\.append\(toolbar, legacyContent\)/);
  assert.match(main, /relationshipAuthoringTools/);
  assert.match(main, /전체 관계 편집표/);
  assert.match(main, /기존 Activity 행 등록·수정·엑셀 도구/);
  assert.match(html, /id="addButton"/);
  assert.match(html, /id="dataBody"/);
  assert.match(html, /id="editorDialog"/);
});

test('Person Main is read-only and does not embed Admin-only or mutation surfaces', () => {
  assert.doesNotMatch(main, /\/api\/atlas-(?:mutate|identity|authoring|duplicate-review|admin-inspector|admin-system-status|audit-inventory)/);
  assert.doesNotMatch(main, /SUPABASE_DB_URL|ATLAS_SESSION_SECRET|ATLAS_MUTATION_TOKEN|authorization|bearer\s/i);
  assert.match(main, /reader\.listPersons\(\)/);
  assert.match(main, /reader\.readPerson\(personId\)/);
});

test('source links are restricted to HTTP(S) and user-visible strings are escaped', () => {
  assert.match(main, /url\.protocol === "http:" \|\| url\.protocol === "https:"/);
  assert.match(main, /rel="noopener noreferrer"/);
  assert.match(main, /escapeHtml/);
});

test('Person Main CSS isolates the new layout and keeps responsive fallbacks', () => {
  assert.match(css, /\.person-main-layout/);
  assert.match(css, /\.person-group-other/);
  assert.match(css, /\.person-main-detail/);
  assert.match(css, /\.relationship-authoring-tools/);
  assert.match(css, /@media\(max-width:760px\)/);
});
