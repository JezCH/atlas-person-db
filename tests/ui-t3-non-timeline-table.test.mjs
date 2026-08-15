import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../non-timeline-list.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../non-timeline-list.css', import.meta.url), 'utf8');
const data = JSON.parse(fs.readFileSync(new URL('../non-timeline-persons.json', import.meta.url), 'utf8'));
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('UI-T3 keeps curated non-timeline Persons in a true table on mobile', () => {
  assert.match(source, /<table class="non-timeline-table">/);
  assert.match(source, /<thead><tr><th>인물<\/th><th>정치체<\/th><th>역사성<\/th><th>전승 연대<\/th><th>역할<\/th><th>연표·지도<\/th><\/tr><\/thead>/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /\.non-timeline-table\{display:table;width:100%;min-width:820px\}/);
  assert.match(css, /\.non-timeline-table thead\{display:table-header-group\}/);
  assert.match(css, /\.non-timeline-table tr\{display:table-row\}/);
  assert.match(css, /\.non-timeline-table th,\.non-timeline-table td\{display:table-cell/);
  assert.doesNotMatch(css, /\.non-timeline-table thead\{display:none\}/);
  assert.doesNotMatch(css, /content:attr\(data-label\)/);
});

test('UI-T3 table exposes core curated meaning and expandable evidence/policy without fabricating sources', () => {
  for (const token of [
    'row.historicity',
    'row.traditional_year',
    'row.traditional_year_alternative',
    'row.role_ko',
    'row.timeline_status',
    'row.date_basis',
    'row.activity_start',
    'row.activity_end',
    'row.reason',
    'row.map_policy'
  ]) assert.ok(source.includes(token), `expected renderer to preserve ${token}`);

  for (const label of ['역사성 원분류', '연대 기준', '연표 상태', '활동연도 필드', '판정 근거', '지도 처리 정책']) {
    assert.ok(source.includes(label), `expected expandable detail to expose ${label}`);
  }
  assert.doesNotMatch(source, /source_url|canonical_url|citation_text|출처 링크/);
});

test('UI-T3 preserves original values while adding readable labels', () => {
  assert.match(source, /legendary_or_composite: "전설·복합 인물 가능성"/);
  assert.match(source, /legendary_possible_historical_core: "전설·역사적 핵심 가능성"/);
  assert.match(source, /historical_tradition_uncertain_chronology: "역사 전승·연대 불확실"/);
  assert.match(source, /<code>\$\{escapeHtml\(rawHistoricity\)\}<\/code>/);
  assert.match(source, /<code>\$\{escapeHtml\(rawDateBasis\)\}<\/code>/);
  assert.match(source, /<code>\$\{escapeHtml\(rawTimeline\)\}<\/code>/);
});

test('UI-T3 does not coerce null historical years into year zero', () => {
  assert.match(source, /function numericYear\(value\)/);
  assert.match(source, /value == null \|\| String\(value\)\.trim\(\) === ""/);
  assert.match(source, /if \(year == null\) return "미상"/);
  assert.match(source, /if \(start == null && end == null\) return "시작·종료 모두 미상"/);
});

test('UI-T3 curated records carry the fields required by the restored surface', () => {
  assert.ok(Array.isArray(data) && data.length > 0);
  for (const [index, row] of data.entries()) {
    for (const key of ['person_name', 'historicity', 'timeline_status', 'date_basis', 'reason', 'map_policy']) {
      assert.ok(Object.prototype.hasOwnProperty.call(row, key), `row ${index} missing ${key}`);
    }
    assert.notEqual(String(row.historicity || '').trim(), '', `row ${index} missing historicity value`);
    assert.notEqual(String(row.reason || '').trim(), '', `row ${index} missing reason`);
    assert.notEqual(String(row.map_policy || '').trim(), '', `row ${index} missing map_policy`);
  }
});

test('UI-T3/T5 asset contract loads dedicated table CSS before the searchable non-timeline module', () => {
  assert.match(html, /non-timeline-list\.css\?v=20260816-ui-t3/);
  assert.match(html, /non-timeline-list\.js\?v=20260816-ui-t5/);
  assert.ok(html.indexOf('non-timeline-list.css') < html.indexOf('non-timeline-list.js'));
});
