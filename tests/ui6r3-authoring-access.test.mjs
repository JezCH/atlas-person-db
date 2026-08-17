import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const mainSource = fs.readFileSync(new URL('../atlas-person-main.js', import.meta.url), 'utf8');
const mainCss = fs.readFileSync(new URL('../atlas-person-main.css', import.meta.url), 'utf8');
const eraSource = fs.readFileSync(new URL('../atlas-person-era-navigation.js', import.meta.url), 'utf8');

function expectToken(source, token) {
  assert.ok(source.includes(token), `expected source to contain ${token}`);
}

test('UI-6R3 keeps primary Person authoring controls before the long Person list', () => {
  for (const token of [
    'id="personMainAdd"',
    '+ 관계 추가',
    'id="personMainRefresh"',
    'id="personMainMoreButton"',
    'id="personMainMoreMenu"',
    '엑셀 내보내기',
    '엑셀 불러오기',
    'href="./admin.html"',
    '전체 관계 편집표'
  ]) expectToken(mainSource, token);

  const toolbarPosition = mainSource.indexOf('person-main-actions');
  const groupPosition = mainSource.indexOf('person-main-layout');
  assert.ok(toolbarPosition >= 0 && groupPosition > toolbarPosition, 'primary authoring controls must be emitted before the Person list/detail layout');
});

test('UI-6R3 reuses the existing authoring controls instead of introducing a second mutation adapter', () => {
  assert.doesNotMatch(mainSource, /ATLAS_SERVER_WRITE_ADAPTER|createAdapter\(|createActivity\(|updateActivity\(|deleteActivity\(|importActivities\(/);
  for (const token of [
    'document.getElementById("addButton")',
    'document.getElementById("exportButton")',
    'document.getElementById("importInput")',
    'button.click()',
    'input.click()'
  ]) expectToken(mainSource, token);
});

test('UI-6R3 exposes direct edit and delete controls on each authoritative Activity detail card', () => {
  for (const token of [
    'data-activity-id="${activityId}"',
    'data-authoring-action="edit"',
    'data-authoring-action="delete"',
    'invokeLegacyActivityAction(actionButton.dataset.activityId, actionButton.dataset.authoringAction)',
    '#dataBody button.${action}[data-id]'
  ]) expectToken(mainSource, token);
  assert.match(mainSource, /String\(button\.dataset\.id\) === String\(activityId\)/);
});

test('UI-6R3 refreshes Person read state after edit/create close and row-changing delete/import operations', () => {
  for (const token of [
    'refreshAfterDialogClose',
    'refreshAfterLegacyRowsChange',
    'loadPersons({ keepSelection: true })',
    'new MutationObserver'
  ]) expectToken(mainSource, token);
});

test('current exploration UI keeps only Polity filtering and places it with era navigation', () => {
  assert.match(mainSource, /let facetFilters = \{ polity_id: "" \}/);
  assert.doesNotMatch(mainSource, /personMainFilterToggle|personMainRelationFilter|personMainRoleFilter|personMainBasisFilter/);
  assert.match(eraSource, /person-era-polity-filter/);
  assert.match(eraSource, /atlas-person-polity-filter-change/);
  assert.match(mainCss, /@media\(max-width:760px\)/);
});

test('UI-6R3 keeps the complete legacy relationship table available as an explicit advanced surface', () => {
  for (const token of [
    'authoringTools.id = "relationshipAuthoringTools"',
    'body.append(toolbar, legacyContent)',
    'tools.open = true',
    'tools.scrollIntoView'
  ]) expectToken(mainSource, token);
});
