import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../atlas-person-main.js', import.meta.url), 'utf8');
const reader = fs.readFileSync(new URL('../atlas-person-browser-reader.js', import.meta.url), 'utf8');
const nav = fs.readFileSync(new URL('../atlas-person-era-navigation.js', import.meta.url), 'utf8');
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

test('Person-centered Main renders only the historical Person group before Polity filtering', () => {
  assert.match(main, /reader\.preparePersonGroups\(persons, \{ query, sortOrder, facetFilters \}\)/);
  assert.match(main, /const rows = groups\.historical\.slice\(\)/);
  assert.match(main, /역사 인물/);
  assert.doesNotMatch(main, /OTHER \/ UNCERTAIN HISTORICITY/);
  assert.doesNotMatch(main, /전설·신화·역사성 미확정 및 기타/);
  assert.doesNotMatch(main, /groups\.other_or_uncertain/);
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
  const renderGroupsBody = main.slice(main.indexOf('function renderGroups'), main.indexOf('function setSearchQuery'));
  assert.doesNotMatch(renderGroupsBody, /readPerson\(/);
});

test('Person search is rendered left of Polity while current-result status sits beside era status', () => {
  assert.match(nav, /search\.id = "personMainSearch"/);
  assert.match(nav, /intro\.append\(title, status, summary\)/);
  assert.match(nav, /controls\.append\(search, select\)/);
  assert.match(nav, /atlas-person-search-change/);
  assert.match(main, /function setSearchQuery/);
  assert.match(main, /window\.addEventListener\("atlas-person-search-change"/);
  assert.doesNotMatch(main, /<input id="personMainSearch"/);
  assert.match(main, /if \(child\.id !== "personEraNavigator"\) child\.remove\(\)/);
  assert.match(main, /list\.insertAdjacentHTML\("beforeend", renderedGroups\)/);
});

test('Person Main emits one current-result Person and Polity status contract', () => {
  assert.match(main, /visiblePolityCount/);
  assert.match(main, /visibleCount: shown/);
  assert.match(main, /visiblePolityCount: polityCount/);
  assert.doesNotMatch(main, /<strong>\$\{rows\.length\}명<\/strong>/);
  assert.doesNotMatch(html, /atlas-person-summary-counts\.js/);
});

test('current-result Polity count uses authoritative facet IDs instead of stringifying facet objects', () => {
  assert.match(main, /function polityFacetId\(value\)/);
  assert.match(main, /typeof value === "object"/);
  assert.match(main, /String\(value\.id \|\| ""\)\.trim\(\)/);
  assert.match(main, /const id = polityFacetId\(value\)/);
  assert.doesNotMatch(main, /if \(facetFilters\.polity_id\) return rows\.length \? 1 : 0/);
});

test('Person detail renders readable names, descriptions, Person sources and user-facing Activity meaning', () => {
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

test('mobile shell does not create a second Person search owner', () => {
  assert.match(nav, /search\.id = "personMainSearch"/);
  assert.match(nav, /atlas-person-search-change/);
  assert.match(main, /new CustomEvent\("atlas-person-main-rendered"/);
  assert.doesNotMatch(mobile, /personMainSearch|atlas-person-main-rendered|atlas-person-search-change|visiblePersonCount/);
  assert.doesNotMatch(html, /mobileSearchInput|mobileSearchClear|mobileSearchCount/);
  assert.match(html, /mobile-appbar-title/);
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

test('Main no longer exposes an Other / Uncertain historicity section', () => {
  assert.doesNotMatch(main, /person-group-other/);
  assert.doesNotMatch(main, /OTHER \/ UNCERTAIN HISTORICITY/);
  assert.doesNotMatch(main, /other_or_uncertain/);
});
