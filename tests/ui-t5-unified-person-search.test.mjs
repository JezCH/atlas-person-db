import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const nonTimeline = fs.readFileSync(new URL('../non-timeline-list.js', import.meta.url), 'utf8');
const mobile = fs.readFileSync(new URL('../mobile-ui.js', import.meta.url), 'utf8');
const reader = fs.readFileSync(new URL('../atlas-person-browser-reader.js', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../atlas-person-main.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('UI-T5 shares the authoritative Person query with the curated non-timeline table', () => {
  assert.match(main, /new CustomEvent\("atlas-person-main-rendered"/);
  assert.match(main, /detail: \{ visibleCount: shown, query, activeFacetCount: activeFacetCount\(\) \}/);
  assert.match(nonTimeline, /window\.addEventListener\("atlas-person-main-rendered"/);
  assert.match(nonTimeline, /event\?\.detail\?\.query/);
  assert.match(nonTimeline, /applySearch\(currentQuery\)/);
});

test('UI-T5 uses normalized phrase/compact/token matching on both Person table sources', () => {
  for (const source of [reader, nonTimeline]) {
    assert.match(source, /function normalizeSearchText\(value\)/);
    assert.match(source, /normalize\("NFKD"\)/);
    assert.match(source, /toLocaleLowerCase\("ko-KR"\)/);
    assert.match(source, /tokens\.every\(\(token\) => haystack\.includes\(token\)\)/);
  }
  assert.match(reader, /function compactSearchText\(value\)/);
  assert.match(reader, /compactHaystack\.includes\(compactNeedle\)/);
});

test('UI-T5 curated search covers names, polity, historicity, chronology basis, role, reason and map policy', () => {
  for (const token of [
    'row.display_name_ko',
    'row.person_name',
    'row.politic_name',
    'row.historicity',
    'row.date_basis',
    'row.role_ko',
    'row.timeline_status',
    'row.reason',
    'row.map_policy',
    'row.traditional_year',
    'row.traditional_year_alternative',
    'row.activity_start',
    'row.activity_end'
  ]) assert.ok(nonTimeline.includes(token), `expected curated search to include ${token}`);
  assert.match(nonTimeline, /BC \$\{absolute\}/);
  assert.match(nonTimeline, /BCE \$\{absolute\}/);
  assert.match(nonTimeline, /기원전 \$\{absolute\}/);
  assert.match(nonTimeline, /AD \$\{year\}/);
  assert.match(nonTimeline, /CE \$\{year\}/);
  assert.match(nonTimeline, /서기 \$\{year\}/);
});

test('UI-T5 does not imply authoritative semantic filtering or chronological sorting for curated records', () => {
  assert.match(nonTimeline, /같은 인물 검색을 공유하며, 연대·Activity 의미 필터와 정렬은 authoritative Person 표에만 적용됩니다/);
  assert.doesNotMatch(nonTimeline, /facetFilters|relation_type_id|period_basis_id|sortOrder/);
});

test('UI-T5 reports combined mobile search result count across both Person tables', () => {
  assert.match(mobile, /function visibleNonTimelineCount\(\)/);
  assert.match(mobile, /function visiblePersonRecordCount\(\)/);
  assert.match(mobile, /return visiblePersonCount\(\) \+ visibleNonTimelineCount\(\)/);
  assert.match(mobile, /window\.addEventListener\("atlas-non-timeline-rendered"/);
  assert.match(nonTimeline, /new CustomEvent\("atlas-non-timeline-rendered"/);
  assert.match(mobile, /updateMobileSearchState\(visiblePersonRecordCount\(\)\)/);
});

test('UI-T5 versions changed browser assets instead of relying on stale cached scripts', () => {
  assert.match(html, /atlas-person-browser-reader\.js\?v=20260816-ui-t5/);
  assert.match(html, /mobile-ui\.js\?v=20260816-ui-t5/);
  assert.match(html, /non-timeline-list\.js\?v=20260816-ui-t5/);
  assert.match(html, /atlas-responsive-shell\.js\?v=20260816-ui-t4/);
  assert.match(html, /atlas-responsive-shell\.css\?v=20260816-ui-t4/);
});
