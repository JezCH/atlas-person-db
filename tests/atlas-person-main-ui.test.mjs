import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../atlas-person-main.js', import.meta.url), 'utf8');
const reader = fs.readFileSync(new URL('../atlas-person-browser-reader.js', import.meta.url), 'utf8');
const nav = fs.readFileSync(new URL('../atlas-person-era-navigation.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../atlas-person-main.css', import.meta.url), 'utf8');
const mobile = fs.readFileSync(new URL('../mobile-ui.js', import.meta.url), 'utf8');
const dataStore = fs.readFileSync(new URL('../atlas-client-data-store.js', import.meta.url), 'utf8');

test('Main loads the Person reader and shared data store before the Person-centered screen module', () => {
  assert.match(html, /atlas-person-main\.css/);
  const readerIndex = html.indexOf('atlas-person-browser-reader.js');
  const storeIndex = html.indexOf('atlas-client-data-store.js');
  const mainIndex = html.indexOf('atlas-person-main.js');
  assert.ok(readerIndex >= 0);
  assert.ok(storeIndex > readerIndex);
  assert.ok(mainIndex > storeIndex);
  assert.match(main, /ATLAS_PERSON_BROWSER_READER/);
  assert.match(main, /ATLAS_CLIENT_DATA_STORE/);
});

test('Person-centered Main renders all historicity groups in one chronology table', () => {
  assert.match(main, /reader\.preparePersonGroups\(persons, \{/);
  assert.match(main, /secondaryPredicate:dashboardFilter/);
  assert.match(main, /\.\.\.groups\.historical/);
  assert.match(main, /\.\.\.groups\.other_or_uncertain/);
  assert.match(main, /\.\.\.visibleUnknownRegistryPersons\(\)/);
  assert.match(main, /개인 활동연대를 방어할 수 없는 인물은 모두 ‘전설, 신화, 연대미상’에 함께 표시합니다/);
  assert.match(main, /dataStore\.loadNonTimelinePersons/);
  assert.match(dataStore, /non-timeline-persons\.json/);
  assert.match(reader, /partitionByHistoricity/);
});

test('Person Main owns only Polity filter state and delegates its control surface to era navigation', () => {
  assert.match(main, /let facetFilters = \{ polity_id: "" \}/);
  assert.match(main, /function setPolityFilter/);
  assert.match(main, /atlas-person-polity-filter-change/);
  assert.match(main, /selectedPolityId: facetFilters\.polity_id/);
  assert.match(main, /polityOptions: polityOptions\(\)/);
});

test('Person search is rendered by era navigation and not duplicated in Main', () => {
  assert.match(nav, /search\.id = "personMainSearch"/);
  assert.match(nav, /atlas-person-search-change/);
  assert.match(main, /function setSearchQuery/);
  assert.match(main, /window\.addEventListener\("atlas-person-search-change"/);
  assert.doesNotMatch(main, /<input id="personMainSearch"/);
});

test('Person detail renders identity, portrait slot, sources and Activity meaning', () => {
  for (const token of ['person.names','person.descriptions','person.sources','person.activities','activity.polity','activity.relation','activity.role','activity.period_basis','activity.start','activity.end','activity.notes','activity.sources']) {
    assert.match(main, new RegExp(token.replaceAll('.', '\\.')));
  }
  assert.match(main, /person-detail-portrait/);
  assert.match(main, /person-detail-portrait-empty">없음/);
  assert.match(main, /Activity 출처/);
  assert.match(main, /Person 출처/);
});

test('legacy Activity table, detail panel, dialog and app runtime are retired', () => {
  assert.doesNotMatch(html, /id="addButton"|id="dataBody"|id="detailPanel"|id="editorDialog"|\.\/app\.js/);
  assert.doesNotMatch(main, /relationshipAuthoringTools|전체 관계 편집표|legacyContent|legacyActivityButton|invokeLegacyActivityAction/);
});

test('supported mutations are owned by Person Main instead of DOM-clicking a legacy editor', () => {
  assert.match(main, /ATLAS_SERVER_WRITE_ADAPTER/);
  assert.match(main, /setPersonKoreanName/);
  assert.match(main, /setPersonExternalReference/);
  assert.match(main, /profileWriter\.deleteActivity\(activityId\)/);
  assert.doesNotMatch(main, /button\.click\(\)|input\.click\(\)|refreshAfterLegacyRowsChange|openLegacyTools/);
});

test('Main renders BCE/CE and unknown chronology without changing historicity', () => {
  assert.match(main, /return `BC \$\{Math\.abs\(value\)\}`/);
  assert.match(main, /return `AD \$\{value\}`/);
  assert.match(main, /연도 미상/);
  assert.match(main, /역사성 분류는 별도 값으로 유지됩니다/);
});

test('refresh preserves selected Person and forces authoritative detail refresh', () => {
  assert.match(main, /selectPerson\(selectedPersonId, \{ force: true \}\)/);
  assert.match(main, /\(!force && selectedPersonId === personId\)/);
});

test('mobile shell does not create a second Person search or legacy row owner', () => {
  assert.match(nav, /search\.id = "personMainSearch"/);
  assert.doesNotMatch(mobile, /personMainSearch|dataBody|mobile-expanded/);
  assert.doesNotMatch(html, /mobileSearchInput|mobileSearchClear|mobileSearchCount/);
  assert.match(html, /mobile-appbar-title/);
});

test('Person Main consumes the shared snapshot without embedding server endpoints or secrets', () => {
  assert.doesNotMatch(main, /\/api\/atlas-(?:mutate|identity|authoring|duplicate-review|admin-inspector|admin-system-status|audit-inventory)/);
  assert.doesNotMatch(main, /SUPABASE_DB_URL|ATLAS_SESSION_SECRET|ATLAS_MUTATION_TOKEN|authorization|bearer\s/i);
  assert.match(main, /dataStore\.loadPersons/);
  assert.match(dataStore, /personReader\.listPersons\(\)/);
  assert.match(main, /reader\.readPerson\(personId/);
});

test('source links are restricted to HTTP(S) and user-visible strings are escaped', () => {
  assert.match(main, /url\.protocol === "http:" \|\| url\.protocol === "https:"/);
  assert.match(main, /rel="noopener noreferrer"/);
  assert.match(main, /escapeHtml/);
});

test('Person Main CSS owns one responsive detail surface and no legacy authoring surface', () => {
  assert.match(css, /\.person-main-layout/);
  assert.match(css, /\.person-main-detail/);
  assert.match(css, /\.person-detail-portrait/);
  assert.doesNotMatch(css, /\.relationship-authoring-tools|\.relationship-authoring-body/);
  assert.match(css, /@media\(max-width:760px\)/);
});
