import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const workbench = fs.readFileSync(new URL('../atlas-polity-review-workbench.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../atlas-polity-review-workbench.css', import.meta.url), 'utf8');
const reader = fs.readFileSync(new URL('../atlas-polity-browser-reader.js', import.meta.url), 'utf8');
const nav = fs.readFileSync(new URL('../atlas-main-authority-nav.js', import.meta.url), 'utf8');

test('Polities main surface renders the current canonical Polity read instead of a static review registry', () => {
  assert.match(workbench, /ATLAS_POLITY_BROWSER_READER/);
  assert.match(workbench, /READER\.listPolities\(\)/);
  assert.match(workbench, /payload\.polities/);
  assert.match(workbench, /data-current-polity-list/);
  assert.match(workbench, /CANONICAL POLITY BROWSER/);
  assert.match(workbench, /Identity 검토 문서는 감사자료일 뿐 이 화면의 데이터 원천이 아닙니다/);
  assert.doesNotMatch(workbench, /ATLAS_POLITY_REVIEW_CANDIDATES/);
  assert.doesNotMatch(workbench, /localStorage|atlas-polity-review-decisions/);
  assert.match(reader, /\/api\/atlas-polity-read/);
  assert.match(reader, /cache: "no-store"/);
});

test('Polities main surface exposes current names, UUIDs, linked chronology and refresh/search/filter controls', () => {
  assert.match(workbench, /preferred_name_ko/);
  assert.match(workbench, /canonical_name_en/);
  assert.match(workbench, /polity\.id/);
  assert.match(workbench, /polity\.names/);
  assert.match(workbench, /polity\.activities/);
  assert.match(workbench, /polity_designation_name_ko/);
  assert.match(workbench, /현재 데이터 새로고침/);
  assert.match(workbench, /data-polity-search/);
  assert.match(workbench, /data-polity-filter="linked"/);
  assert.match(workbench, /data-polity-filter="orphan"/);
  assert.match(workbench, /data-polity-filter="ongoing"/);
  assert.match(workbench, /PAGE_SIZE = 120/);
  assert.match(workbench, /data-polity-load-more/);
});

test('Polity navigation no longer loads the static review candidate registry as a runtime data dependency', () => {
  assert.match(nav, /atlas-polity-browser-reader\.js/);
  assert.match(nav, /atlas-polity-review-workbench\.js/);
  assert.match(nav, /ATLAS_POLITY_BROWSER_VIEW/);
  assert.doesNotMatch(nav, /atlas-polity-review-candidates\.js/);
  assert.doesNotMatch(nav, /ATLAS_POLITY_REVIEW_CANDIDATES/);
});

test('canonical Polity browser remains responsive', () => {
  assert.match(css, /polity-browser-kpis/);
  assert.match(css, /polity-browser-card/);
  assert.match(css, /polity-browser-activities/);
  assert.match(css, /@media\(max-width:1100px\)/);
  assert.match(css, /@media\(max-width:700px\)/);
});