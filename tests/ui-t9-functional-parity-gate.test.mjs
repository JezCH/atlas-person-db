import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../atlas-person-main.js', import.meta.url), 'utf8');
const reader = fs.readFileSync(new URL('../atlas-person-browser-reader.js', import.meta.url), 'utf8');
const mobile = fs.readFileSync(new URL('../mobile-ui.js', import.meta.url), 'utf8');
const nonTimeline = fs.readFileSync(new URL('../non-timeline-list.js', import.meta.url), 'utf8');
const responsive = fs.readFileSync(new URL('../atlas-responsive-shell.js', import.meta.url), 'utf8');
const adminWorkspace = fs.readFileSync(new URL('../atlas-admin-workspace.js', import.meta.url), 'utf8');
const adminObservability = fs.readFileSync(new URL('../atlas-admin-observability.js', import.meta.url), 'utf8');

test('UI-T9 preserves direct Main authoring and utility access', () => {
  for (const token of [
    'id="personMainAdd"', 'id="personMainRefresh"', 'id="personMainFilterToggle"',
    '엑셀 내보내기', '엑셀 불러오기', 'href="./admin.html"', '전체 관계 편집표'
  ]) assert.ok(main.includes(token), `missing Main utility ${token}`);
  for (const legacyId of ['addButton', 'refreshButton', 'exportButton', 'importInput', 'dataBody', 'editorDialog']) {
    assert.ok(html.includes(`id="${legacyId}"`), `legacy authoring integration lost ${legacyId}`);
  }
});

test('UI-T9 preserves Activity edit/delete by exact Activity id rather than Person deletion', () => {
  assert.match(main, /data-authoring-action="edit"/);
  assert.match(main, /data-authoring-action="delete"/);
  assert.match(main, /data-activity-id="\$\{activityId\}"/);
  assert.match(main, /String\(button\.dataset\.id\) === String\(activityId\)/);
  assert.doesNotMatch(main, /deletePerson|personDelete|data-person-delete/i);
});

test('UI-T9 preserves broad search, semantic filters and chronological sort', () => {
  assert.match(main, /personMainSearch/);
  assert.match(main, /personMainPolityFilter/);
  assert.match(main, /personMainRelationFilter/);
  assert.match(main, /personMainRoleFilter/);
  assert.match(main, /personMainBasisFilter/);
  assert.match(main, /start-desc/);
  assert.match(reader, /personMatchesQuery/);
  assert.match(reader, /personMatchesFacets/);
  assert.match(reader, /comparePersons/);
  assert.match(reader, /activitySearchText/);
});

test('UI-T9 keeps authoritative and curated Person discovery reachable from the same mobile search', () => {
  assert.match(mobile, /personSearch\.dispatchEvent\(new Event\("input", \{ bubbles: true \}\)\)/);
  assert.match(nonTimeline, /window\.addEventListener\("atlas-person-main-rendered"/);
  assert.match(nonTimeline, /applySearch\(currentQuery\)/);
  assert.match(mobile, /visiblePersonCount\(\) \+ visibleNonTimelineCount\(\)/);
});

test('UI-T9 preserves information-complete Person detail and source provenance', () => {
  for (const token of [
    'person.names', 'person.descriptions', 'person.sources', 'person.activities',
    'activity.polity', 'activity.relation', 'activity.role', 'activity.period_basis',
    'activity.start', 'activity.end', 'activity.confidence', 'activity.chronology_status',
    'activity.notes', 'activity.sources', 'source?.canonical_url', 'source?.citation_text', 'source?.locator'
  ]) assert.ok(main.includes(token), `Main detail lost ${token}`);
  assert.match(responsive, /role", "dialog"/);
  assert.match(responsive, /aria-modal/);
});

test('UI-T9 preserves all four protected Admin workspaces and raw observability', () => {
  assert.match(adminWorkspace, /VIEW_ORDER = \["overview", "review", "authoring", "inspector"\]/);
  assert.match(adminObservability, /\/api\/atlas-admin-system-status/);
  assert.match(adminObservability, /\/api\/atlas-admin-inspector/);
  assert.match(adminObservability, /renderKeyValueTable\(payload\.object/);
});

test('UI-T9 Main presentation changes do not introduce a new API endpoint', () => {
  for (const source of [main, reader, mobile, nonTimeline, responsive]) {
    assert.doesNotMatch(source, /\/api\/atlas-[a-z0-9-]+/i, 'Main presentation module must not add a new API route');
  }
  assert.match(reader, /const ENDPOINT = "\/api\/atlas-person-read"/);
});
