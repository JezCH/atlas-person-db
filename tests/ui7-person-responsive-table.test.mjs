import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const tableView = fs.readFileSync(new URL('../atlas-person-table-view.js', import.meta.url), 'utf8');
const tableCss = fs.readFileSync(new URL('../atlas-person-table-view.css', import.meta.url), 'utf8');
const geometryCss = fs.readFileSync(new URL('../atlas-person-table-alignment.css', import.meta.url), 'utf8');
const mainSource = fs.readFileSync(new URL('../atlas-person-main.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('UI7 table presentation decorates the existing Person render without a second read or write path', () => {
  assert.match(tableView, /atlas-person-main-rendered/);
  assert.match(tableView, /\.person-card-grid/);
  assert.match(tableView, /\.person-card/);
  assert.match(tableView, /person-table-head/);
  assert.match(tableView, /person-table-identity/);
  assert.doesNotMatch(tableView, /fetch\s*\(/);
  assert.doesNotMatch(tableView, /listPersons|readPerson|ATLAS_SERVER_WRITE_ADAPTER|data-authoring-action/);
});

test('UI7 keeps the UI-6R4 authoritative compact Activity tuple intact', () => {
  assert.match(mainSource, /person-card-activities/);
  assert.match(mainSource, /activity\?\.polity\?\.display_name/);
  assert.match(mainSource, /activity\?\.relation\?\.code/);
  assert.match(mainSource, /activity\?\.role\?\.display_name/);
  assert.match(mainSource, /activity\?\.period_basis\?\.display_name/);
  assert.match(mainSource, /activity\?\.chronology_status/);
  assert.match(mainSource, /activity\?\.confidence/);
});

test('UI7 adds one derived era band while retaining the four authoritative Person data cells', () => {
  assert.match(tableView, /\["person-table-col-era", "시대"\]/);
  assert.doesNotMatch(tableView, /역사성 · 유형/);
  assert.match(tableView, /person-table-status-inline/);
  assert.match(tableView, /value\.toLowerCase\(\) === "historical"/);
  assert.match(tableView, /groupRowsByEra\(grid\)/);
  assert.match(tableCss, /person-era-group/);
  assert.match(geometryCss, /--person-data-columns:\s*minmax\(200px, 1\.1fr\) minmax\(165px, \.85fr\) minmax\(500px, 3\.45fr\) 76px/);
});

test('UI7 exposes semantic subheaders and human-readable Main labels', () => {
  assert.match(tableView, /활동 수/);
  assert.match(tableView, /정치체 · 관계/);
  assert.match(tableView, /역할 · 기간 기준/);
  assert.match(tableView, /활동 기간/);
  assert.match(tableView, /rules: "통치"/);
  assert.match(tableView, /reign: "재위"/);
  assert.match(tableView, /"relation 미상": "관계 미확정"/);
  assert.match(tableView, /역사 자료에서 실재 인물로 분류된 인물입니다/);
  assert.match(tableView, /historicity 값", "역사성 분류/);
});

test('UI7 hides ordinary diagnostics and duplicate single-Activity periods while preserving exceptions', () => {
  assert.match(tableView, /exact_as_recorded: null/);
  assert.match(tableView, /legacy_asserted: null/);
  assert.match(tableView, /reviewed_stage2_traditional_disputed: "연대 논쟁 있음"/);
  assert.match(tableView, /period\.classList\.add\("is-redundant"\)/);
  assert.match(tableCss, /person-card-activity-period\.is-redundant\{visibility:hidden\}/);
  assert.match(tableCss, /person-table-exception/);
});

test('UI7 uses one table model on desktop and mobile with sticky Era and Person columns', () => {
  assert.match(tableCss, /overflow-x:auto/);
  assert.match(geometryCss, /--era-band-width:\s*58px/);
  assert.match(tableCss, /person-era-band\{position:sticky;left:0/);
  assert.match(tableCss, /person-table-identity\{position:sticky;left:var\(--era-band-width\)/);
  assert.match(tableCss, /@media\(max-width:760px\)/);
  assert.match(tableCss, /@media\(max-width:520px\)/);
  assert.doesNotMatch(tableCss, /display:\s*none[^}]*person-table/i);
});

test('UI7 keeps presentation separate from canonical geometry ownership', () => {
  assert.doesNotMatch(tableCss, /--era-band-width\s*:/);
  assert.doesNotMatch(tableCss, /grid-template-columns\s*:/);
  assert.match(geometryCss, /grid-template-columns:\s*var\(--era-band-width\) var\(--person-data-columns\)/);
});

test('UI7 assets load as a presentation layer after shared era ownership and before Person Main initializes', () => {
  assert.match(html, /atlas-person-table-view\.css\?v=20260817-era-band-r2/);
  assert.match(html, /atlas-person-table-alignment\.css\?v=20260817-table-geometry-r2/);
  assert.match(html, /atlas-person-era-model\.js\?v=20260819-era-model-r2/);
  assert.match(html, /atlas-person-table-view\.js\?v=20260819-era-model-r2/);
  assert.ok(html.indexOf('atlas-person-era-model.js?v=20260819-era-model-r2') < html.indexOf('atlas-person-table-view.js?v=20260819-era-model-r2'));
  assert.ok(html.indexOf('atlas-person-table-view.js?v=20260819-era-model-r2') < html.indexOf('atlas-person-main.js?v=20260821-person-profile-v1'));
});