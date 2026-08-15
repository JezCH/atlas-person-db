import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const tableCss = fs.readFileSync(new URL('../atlas-person-table-view.css', import.meta.url), 'utf8');
const mainSource = fs.readFileSync(new URL('../atlas-person-main.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('UI-T1 renders the Person table directly from the authoritative Main renderer', () => {
  assert.match(mainSource, /function personTableHeaderHtml\(\)/);
  assert.match(mainSource, /function personTableRow\(person\)/);
  assert.match(mainSource, /person-table-grid/);
  assert.match(mainSource, /person-table-head/);
  assert.match(mainSource, /person-table-identity/);
  assert.match(mainSource, /person-table-range/);
  assert.match(mainSource, /person-table-activities/);
  assert.match(mainSource, /person-table-count/);
  assert.doesNotMatch(html, /atlas-person-table-view\.js/);
  assert.doesNotMatch(mainSource, /data-person-table-decorated|ATLAS_PERSON_TABLE_VIEW/);
});

test('UI-T1 keeps the UI-6R4 authoritative correlated Activity tuple intact', () => {
  assert.match(mainSource, /person\?\.activity_summaries/);
  assert.match(mainSource, /activity\?\.polity\?\.display_name/);
  assert.match(mainSource, /activity\?\.relation\?\.code/);
  assert.match(mainSource, /activity\?\.role\?\.display_name/);
  assert.match(mainSource, /activity\?\.period_basis\?\.display_name/);
  assert.match(mainSource, /activity\?\.start/);
  assert.match(mainSource, /activity\?\.end/);
  assert.match(mainSource, /activity\?\.chronology_status/);
  assert.match(mainSource, /activity\?\.confidence/);
  assert.doesNotMatch(mainSource.slice(mainSource.indexOf('function compactActivityHtml'), mainSource.indexOf('function exceptionalPersonStatusHtml')), /facets\./);
});

test('UI-T1 uses four visible columns and folds default historical status into Person identity', () => {
  assert.match(mainSource, /person-table-status-inline/);
  assert.match(mainSource, /historicity\.toLowerCase\(\) !== "historical"/);
  assert.match(mainSource, /personType\.toLowerCase\(\) !== "historical"/);
  assert.match(tableCss, /person-table-status-inline/);
  assert.match(tableCss, /grid-template-columns:minmax\(200px,1\.1fr\) minmax\(165px,\.85fr\) minmax\(500px,3\.45fr\) 76px/);
});

test('UI-T1 exposes semantic subheaders and human-readable Main labels directly', () => {
  assert.match(mainSource, /활동 수/);
  assert.match(mainSource, /정치체 · 관계/);
  assert.match(mainSource, /역할 · 기간 기준/);
  assert.match(mainSource, /활동 기간/);
  assert.match(mainSource, /rules: "통치"/);
  assert.match(mainSource, /reign: "재위"/);
  assert.match(mainSource, /"relation 미상": "관계 미확정"/);
  assert.match(mainSource, /역사 자료에서 실재 인물로 분류된 인물입니다/);
  assert.match(mainSource, /전설·신화 또는 역사성 판정이 확정되지 않은 인물/);
});

test('UI-T1 hides ordinary diagnostics and duplicate single-Activity periods while preserving exceptions', () => {
  assert.match(mainSource, /exact_as_recorded: null/);
  assert.match(mainSource, /legacy_asserted: null/);
  assert.match(mainSource, /reviewed_stage2_traditional_disputed: "연대 논쟁 있음"/);
  assert.match(mainSource, /const redundant = singleActivity/);
  assert.match(mainSource, /is-redundant/);
  assert.match(tableCss, /person-card-activity-period\.is-redundant\{visibility:hidden\}/);
  assert.match(tableCss, /person-table-exception/);
});

test('UI7 responsive presentation stays one table model on desktop and mobile', () => {
  assert.match(tableCss, /overflow-x:auto/);
  assert.match(tableCss, /grid-template-columns/);
  assert.match(tableCss, /position:sticky;left:0/);
  assert.match(tableCss, /@media\(max-width:760px\)/);
  assert.match(tableCss, /@media\(max-width:520px\)/);
  assert.doesNotMatch(tableCss, /display:\s*none[^}]*person-table/i);
});

test('UI-T1 keeps table CSS but removes the post-render JavaScript presentation layer', () => {
  assert.match(html, /atlas-person-table-view\.css\?v=20260815-ui7-table-r3/);
  assert.match(html, /atlas-person-main\.js\?v=20260816-ui-t01/);
  assert.doesNotMatch(html, /atlas-person-table-view\.js/);
});
