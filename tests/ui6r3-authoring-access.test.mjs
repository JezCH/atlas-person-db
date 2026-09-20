import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const mainSource = fs.readFileSync(new URL('../atlas-person-main.js', import.meta.url), 'utf8');
const mainCss = fs.readFileSync(new URL('../atlas-person-main.css', import.meta.url), 'utf8');
const eraSource = fs.readFileSync(new URL('../atlas-person-era-navigation.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Person Main exposes only current supported operations before the Person list', () => {
  for (const token of ['id="personMainRefresh"','id="personMainExcelExport"','⇩ 엑셀 출력','href="./admin.html"']) assert.ok(mainSource.includes(token));
  for (const retired of ['personMainAdd','personMainExcelImport','personMainMoreButton','relationshipAuthoringTools','전체 관계 편집표']) assert.doesNotMatch(mainSource, new RegExp(retired));
  const toolbarPosition = mainSource.indexOf('person-main-actions');
  const groupPosition = mainSource.indexOf('person-main-layout');
  assert.ok(toolbarPosition >= 0 && groupPosition > toolbarPosition);
});

test('Person Main directly owns supported Person profile and Activity delete mutations', () => {
  assert.match(mainSource, /ATLAS_SERVER_WRITE_ADAPTER/);
  assert.match(mainSource, /setPersonKoreanName/);
  assert.match(mainSource, /setPersonExternalReference/);
  assert.match(mainSource, /profileWriter\.deleteActivity\(activityId\)/);
  assert.doesNotMatch(mainSource, /createActivity\(|updateActivity\(|importActivities\(/);
});

test('Activity cards no longer expose the retired inline update path', () => {
  assert.match(mainSource, /data-authoring-action="delete"/);
  assert.doesNotMatch(mainSource, /data-authoring-action="edit"/);
  assert.doesNotMatch(mainSource, /#dataBody|legacyActivityButton|invokeLegacyActivityAction/);
});

test('legacy Activity authoring DOM and runtime are absent from current Main HTML', () => {
  assert.doesNotMatch(html, /id="addButton"|id="dataBody"|id="editorDialog"|\.\/app\.js/);
  assert.doesNotMatch(mainSource, /MutationObserver|relationshipAuthoringTools|legacyContent/);
});

test('current exploration UI keeps persistent Polity, Relation, and Person-domain filtering with era navigation', () => {
  assert.match(mainSource, /let facetFilters = \{ polity_id: "", relation_type_id: "", domain: "" \}/);
  assert.doesNotMatch(mainSource, /personMainFilterToggle|personMainRoleFilter|personMainBasisFilter/);
  assert.match(eraSource, /person-era-polity-filter/);
  assert.match(eraSource, /person-era-relation-filter/);
  assert.match(eraSource, /person-domain-filter-row/);
  assert.match(eraSource, /atlas-person-polity-filter-change/);
  assert.match(eraSource, /atlas-person-relation-filter-change/);
  assert.match(eraSource, /atlas-person-domain-filter-change/);
  assert.match(mainSource, /loadPersonDomains/);
  assert.match(mainCss, /@media\(max-width:760px\)/);
});
