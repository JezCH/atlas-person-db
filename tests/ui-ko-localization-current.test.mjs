import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const i18n = fs.readFileSync(new URL('../atlas-ui-localization.js', import.meta.url), 'utf8');
const catalog = fs.readFileSync(new URL('../atlas-ui-authority-catalog.ko.js', import.meta.url), 'utf8');
const nav = fs.readFileSync(new URL('../atlas-main-authority-nav.js', import.meta.url), 'utf8');
const nonTimeline = fs.readFileSync(new URL('../non-timeline-list.js', import.meta.url), 'utf8');
const nonTimelineData = JSON.parse(fs.readFileSync(new URL('../non-timeline-persons.json', import.meta.url), 'utf8'));
const assetLoader = fs.readFileSync(new URL('../asset-loader.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('shared Korean localization runtime owns reusable enum vocabulary without DOM mutation', () => {
  assert.match(i18n, /window\.ATLAS_UI_I18N/);
  assert.match(i18n, /relation: Object\.freeze/);
  assert.match(i18n, /period_basis: Object\.freeze/);
  assert.match(i18n, /historicity: Object\.freeze/);
  assert.match(i18n, /localizedName/);
  assert.doesNotMatch(i18n, /MutationObserver|querySelector|innerHTML/);
});

test('authority copy is externalized and includes the canonical spacetime place-function contract', () => {
  assert.match(catalog, /ATLAS_UI_AUTHORITY_CATALOG_KO/);
  assert.match(catalog, /spacetime: entry/);
  assert.match(catalog, /수도·왕정 중심·정치 중심/);
  assert.match(catalog, /장소 기능의 변화는 기준 Activity를 수정하지 않고 시각 배치 구간만 분할/);
  assert.match(nav, /window\.ATLAS_UI_AUTHORITY_CATALOG_KO/);
  assert.doesNotMatch(nav, /const DOMAINS = Object\.freeze\(\{/);
  assert.doesNotMatch(nav, /검토된 수도를 사용합니다/);
});

test('non-timeline presentation no longer maintains a hard-coded polity translation map', () => {
  assert.doesNotMatch(nonTimeline, /const koPolities/);
  assert.match(nonTimeline, /politic_display_name_ko/);
  assert.match(nonTimeline, /historicity_display_ko/);
  assert.doesNotMatch(nonTimeline, />Politic</);
  assert.doesNotMatch(nonTimeline, /content:"Politic"/);
  assert.ok(nonTimelineData.length > 0);
  for (const row of nonTimelineData) {
    assert.equal(typeof row.politic_display_name_ko, 'string');
    assert.ok(row.politic_display_name_ko.trim().length > 0);
    assert.equal(typeof row.historicity_display_ko, 'string');
    assert.ok(row.historicity_display_ko.trim().length > 0);
  }
});

test('Main and Admin load the same localization authority before dependent presentation code', () => {
  const i18nIndex = html.indexOf('atlas-ui-localization.js?v=20260819-ko-r2');
  const tableIndex = html.indexOf('atlas-person-table-view.js?v=20260819-era-model-r2');
  const catalogIndex = html.indexOf('atlas-ui-authority-catalog.ko.js?v=20260819-ko-r2');
  const navIndex = html.indexOf('atlas-main-authority-nav.js?v=');
  assert.ok(i18nIndex >= 0 && i18nIndex < tableIndex);
  assert.ok(catalogIndex >= 0 && catalogIndex < navIndex);
  assert.match(assetLoader, /LOCALIZATION_ASSET = "\.\/atlas-ui-localization\.js"/);
  assert.match(assetLoader, /await localizationReady/);
});

test('static primary navigation and editor chrome no longer leak the superseded English labels', () => {
  assert.doesNotMatch(html, />Dashboard</);
  assert.doesNotMatch(html, />Persons</);
  assert.doesNotMatch(html, />Polities</);
  assert.doesNotMatch(html, />Places</);
  assert.doesNotMatch(html, />Events</);
  assert.doesNotMatch(html, />Sources</);
  assert.doesNotMatch(html, />Geometry</);
  assert.doesNotMatch(html, />SELECTED RECORD</);
  assert.doesNotMatch(html, />RECORD EDITOR</);
});