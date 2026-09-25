import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';

const candidates = fs.readFileSync(new URL('../atlas-polity-review-candidates.js', import.meta.url), 'utf8');
const browser = fs.readFileSync(new URL('../atlas-polity-review-workbench.js', import.meta.url), 'utf8');
const review = fs.readFileSync(new URL('../atlas-polity-review-panel.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../atlas-polity-review-workbench.css', import.meta.url), 'utf8');
const reader = fs.readFileSync(new URL('../atlas-polity-browser-reader.js', import.meta.url), 'utf8');
const nav = fs.readFileSync(new URL('../atlas-main-authority-nav.js', import.meta.url), 'utf8');

const registryContext = { window:{} };
vm.runInNewContext(candidates, registryContext);
const registry = registryContext.window.ATLAS_POLITY_REVIEW_CANDIDATES;

test('Polities main surface keeps canonical listing first and restores identity review below it', () => {
  assert.match(nav, /atlasPolityMount/);
  assert.match(nav, /atlasPolityReviewMount/);
  assert.match(nav, /ATLAS_POLITY_BROWSER_VIEW/);
  assert.match(nav, /ATLAS_POLITY_REVIEW_PANEL/);
  assert.match(nav, /atlas-polity-review-candidates\.js/);
  assert.match(nav, /atlas-polity-review-panel\.js/);
  assert.match(nav, /views\?\.browser\?\.mount/);
  assert.match(nav, /views\?\.review\?\.mount/);
});

test('canonical Polity listing stays live and compact', () => {
  assert.match(browser, /ATLAS_POLITY_BROWSER_READER/);
  assert.match(browser, /READER\.listPolities\(\)/);
  assert.match(browser, /payload\.polities/);
  assert.match(browser, /CANONICAL POLITY BROWSER/);
  assert.match(browser, /PAGE_SIZE = 12/);
  assert.match(browser, /data-polity-load-more/);
  assert.match(browser, /첫 화면은 12개만 표시/);
  assert.match(browser, /preferred_name_ko/);
  assert.match(browser, /canonical_name_en/);
  assert.match(browser, /polity_designation_name_ko/);
  assert.match(reader, /\/api\/atlas-polity-read/);
  assert.match(reader, /cache: "no-store"/);
});

test('restored review panel preserves prior decision workflow and live evidence', () => {
  assert.match(candidates, /confirmed_merges/);
  assert.match(candidates, /review_candidates/);
  assert.match(candidates, /split_candidates/);
  assert.match(review, /충돌·Identity 검토/);
  assert.match(review, /localStorage/);
  assert.match(review, /atlas-polity-review-decisions\/v1/);
  assert.match(review, /결정 JSON 내보내기/);
  assert.match(review, /ATLAS_POLITY_BROWSER_READER/);
  assert.match(review, /연결 인물/);
  assert.match(review, /양쪽 연결/);
  assert.match(review, /Identity 통합 ≠ 시대별 표현 통합/);
  assert.doesNotMatch(review, /atlas-mutate|ATLAS_MUTATION_TOKEN|SUPABASE_DB_URL/);
});

test('Polity review registry separates current active frontier from the old 28-case review snapshot', () => {
  assert.equal(registry.schema, 'atlas-polity-review-candidates/v2');
  assert.equal(registry.generated_at, '2026-09-25');
  assert.equal(registry.active_frontier.length, 7);
  assert.equal(registry.confirmed_merges.length + registry.review_candidates.length + registry.split_candidates.length, 28);
  assert.deepEqual(
    Array.from(registry.active_frontier, (row) => row.id),
    [
      'later-jin-houjin-houjin-collapse',
      'kingdom-of-serbia-medieval-modern-collapse',
      'egypt-ancient-modern-collapse',
      'poland-medieval-modern-collapse',
      'germany-pre1945-frg-collapse',
      'ireland-prestate-modern-collapse',
      'kingdom-of-italy-multi-era-collapse'
    ]
  );
  assert.equal(registry.resolved_frontier_history.length, 1);
  assert.equal(registry.resolved_frontier_history[0].id, 'han-han-character-collapse');
  assert.equal(registry.resolved_frontier_history[0].status, 'PRODUCTION_APPLIED_REPAIR');
  assert.equal(registry.resolved_frontier_history[0].reviewed_decision, 'repair');
  assert.equal(registry.active_frontier_source.issue, 977);
  assert.equal(registry.active_frontier_source.checkpoint_comment_id, 5748136361);
});

test('Polity review UI counts current frontier independently and moves old candidates to review history', () => {
  assert.match(review, /function activeCases\(\)/);
  assert.match(review, /function historyCases\(\)/);
  assert.match(review, /function resolvedFrontierHistoryCases\(\)/);
  assert.match(review, /PRODUCTION_APPLIED_REPAIR/);
  assert.match(review, /data-kind-filter="active"/);
  assert.match(review, /data-kind-filter="history"/);
  assert.match(review, /<small>현재 검토<\/small><strong>\$\{activeCases\(\)\.length\}<\/strong>/);
  assert.match(review, /<small>검토 이력<\/small><strong>\$\{historyCases\(\)\.length\}<\/strong>/);
  assert.match(review, /현재 frontier는 최신 전수감사에서 확정된 미해결 건만 포함/);
  assert.doesNotMatch(review, /<small>전체 검토<\/small><strong>\$\{allCases\(\)\.length\}/);
  assert.doesNotMatch(review, /<small>통합 검토<\/small><strong>\$\{DATA\.review_candidates\.length\}/);
  assert.match(review, /const cases = activeCases\(\)/);
  assert.match(review, /REVIEW_HISTORY/);
});

test('restored registry does not revive known stale Northern Yuan or Israel states', () => {
  assert.match(candidates, /Yuan Dynasty \/ Northern Yuan/);
  assert.match(candidates, /SUPERSEDED_NO_WRITE/);
  assert.match(candidates, /reviewed_decision: "keep_both"/);
  assert.match(candidates, /PRODUCTION_APPLIED_SPLIT/);
  assert.match(review, /후속 검토로 폐기 · 별도 유지/);
  assert.match(review, /Production 분리 반영 완료/);
});

test('combined polity browser and review layout remains responsive', () => {
  assert.match(css, /polity-browser-kpis/);
  assert.match(css, /polity-browser-card/);
  assert.match(css, /polity-review-kpis/);
  assert.match(css, /polity-review-pair/);
  assert.match(css, /polity-review-controls/);
  assert.match(css, /atlas-polity-composite-shell/);
  assert.match(css, /@media\(max-width:1100px\)/);
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /@media\(max-width:600px\)/);
});
