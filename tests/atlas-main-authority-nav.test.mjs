import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const nav = fs.readFileSync(new URL('../atlas-main-authority-nav.js', import.meta.url), 'utf8');
const catalog = fs.readFileSync(new URL('../atlas-ui-authority-catalog.ko.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../atlas-main-authority-nav.css', import.meta.url), 'utf8');
const dashboardCss = fs.readFileSync(new URL('../atlas-dashboard.css', import.meta.url), 'utf8');
const personMain = fs.readFileSync(new URL('../atlas-person-main.js', import.meta.url), 'utf8');
const polityView = fs.readFileSync(new URL('../atlas-polity-review-workbench.js', import.meta.url), 'utf8');
const entityRoute = fs.readFileSync(new URL('../atlas-entity-route.js', import.meta.url), 'utf8');

test('Main navigation exposes all authority domains through static controls plus the current spacetime extension', () => {
  for (const domain of ['dashboard', 'persons', 'polities', 'places', 'events', 'sources', 'geometry']) {
    assert.match(html, new RegExp(`data-atlas-domain="${domain}"`));
  }
  assert.doesNotMatch(html, /data-atlas-domain="(?:dashboard|polities|places|events|sources|geometry)"[^>]*disabled/);
  assert.match(nav, /"dashboard", "persons", "spacetime", "polities", "places", "events", "sources", "geometry"/);
  assert.match(nav, /dataAtlasDomain|dataset\.atlasDomain|data-atlas-domain="spacetime"/i);
  assert.match(catalog, /spacetime: entry/);
  assert.match(html, /atlas-main-authority-nav\.css\?v=20260923-root-batch1/);
  assert.match(html, /atlas-main-authority-nav\.js\?v=[^"]+/);
  assert.match(nav, /atlasDashboardMount/);
  assert.match(nav, /ATLAS_DASHBOARD/);
  assert.match(nav, /function ensureSpacetimeModel\(\)/);
  assert.match(nav, /function ensureDashboardAssets\(\)/);
  assert.match(nav, /atlas-dashboard-model\.js/);
  assert.match(nav, /atlas-dashboard\.js/);
  assert.match(nav, /atlas-dashboard\.css/);
  assert.match(nav, /function activateDashboard\(\)/);
  assert.doesNotMatch(html, /atlas-dashboard-model\.js/);
  assert.doesNotMatch(html, /atlas-person-spacetime-model\.js/);
  assert.doesNotMatch(html, /atlas-dashboard\.js/);
  assert.doesNotMatch(html, /atlas-dashboard\.css/);
  assert.match(nav, /atlasPolityMount/);
  assert.match(nav, /atlasPolityReviewMount/);
  assert.match(nav, /ATLAS_POLITY_BROWSER_VIEW/);
  assert.match(nav, /atlas-polity-browser-reader\.js/);
  assert.match(nav, /ATLAS_POLITY_BROWSER_READER/);
  assert.match(nav, /atlas-polity-review-candidates\.js/);
  assert.match(nav, /atlas-polity-review-panel\.js/);
  assert.match(nav, /ATLAS_POLITY_REVIEW_PANEL/);
  assert.doesNotMatch(nav, /authority-domain-card/);
});

test('future authority shells state readiness from the Korean catalog instead of fabricating first-class data', () => {
  assert.match(catalog, /백엔드 조회 필요/);
  assert.match(catalog, /향후 단계 · P14/);
  assert.match(catalog, /부분 조회/);
  assert.match(catalog, /현재 canonical Polity 목록을 먼저 조회/);
  assert.match(catalog, /검토 candidate registry는 판단 대기열/);
  assert.match(catalog, /독립 출처 목록·상세 조회와 first-class Source authoring은 P13에서 완성해야 합니다/);
  assert.match(catalog, /인물 → 활동 → 정치체 → 영토 → 지리 형상/);
  assert.match(nav, /ATLAS_UI_AUTHORITY_CATALOG_KO/);
  assert.doesNotMatch(nav, /fetch\s*\(/);
  assert.doesNotMatch(nav, /XMLHttpRequest|\/api\//);
});

test('Persons remains the authoritative working surface and future shells only hide or restore it', () => {
  assert.match(nav, /document\.getElementById\("personMainView"\)/);
  assert.doesNotMatch(nav, /relationshipAuthoringTools/);
  assert.match(nav, /personView\.hidden = !isPersons/);
  assert.match(nav, /shell\.hidden = isPersons/);
});

test('desktop and mobile navigation stay synchronized and hash-addressable', () => {
  assert.match(nav, /\.nav-list \[data-atlas-domain\]/);
  assert.match(nav, /\.mobile-nav \[data-atlas-domain\]/);
  assert.match(nav, /aria-current/);
  assert.match(entityRoute, /#atlas-/);
  assert.match(nav, /routeModel\.domainHash/);
  assert.match(nav, /hashchange/);
  assert.match(nav, /mobileMenuClose/);
  assert.match(nav, /function syncNavigationStatusLabels\(buttons\)/);
  assert.match(nav, /meta = DOMAINS\?\.\[button\.dataset\.atlasDomain\]/);
  assert.match(nav, /status\.textContent = meta\.status_label/);
  assert.match(nav, /syncNavigationStatusLabels\(\[\.\.\.desktopButtons, \.\.\.mobileButtons\]\)/);
  for (const domain of ['dashboard', 'persons', 'polities', 'places', 'events', 'sources', 'geometry']) {
    assert.match(html, new RegExp(`data-atlas-domain="${domain}"[^>]*>.*?<small><\\/small>`));
  }
});


test('Person and Polity selections have UUID-only shareable deep links with browser-history restoration', () => {
  const routeIndex=html.indexOf('atlas-entity-route.js');
  const personIndex=html.indexOf('atlas-person-main.js');
  const navIndex=html.indexOf('atlas-main-authority-nav.js');
  assert.ok(routeIndex >= 0 && personIndex > routeIndex && navIndex > routeIndex);

  assert.match(entityRoute, /#atlas-\$\{normalizeDomain\(domain\)\}/);
  assert.match(entityRoute, /ENTITY_BY_DOMAIN/);
  assert.match(entityRoute, /UUID_PATTERN/);
  assert.doesNotMatch(entityRoute, /canonical_name|preferred_name|display_name/);

  assert.match(nav, /routeModel\.parseHash/);
  assert.match(nav, /routeModel\.entityHash\("persons","person"/);
  assert.match(nav, /routeModel\.entityHash\("polities","polity"/);
  assert.match(nav, /addEventListener\("popstate", applyLocationRoute\)/);
  assert.match(nav, /ATLAS_PERSON_MAIN\?\.openPerson/);
  assert.match(nav, /browser\?\.selectPolity/);
  assert.match(nav, /browser\?\.clearSelection/);

  assert.match(personMain, /atlas-person-selected/);
  assert.match(personMain, /async function openPerson/);
  assert.match(personMain, /initialLoadPromise/);
  assert.match(personMain, /function clearSelection/);

  assert.match(polityView, /initialPolityId/);
  assert.match(polityView, /atlas-polity-selected/);
  assert.match(polityView, /function selectPolity/);
  assert.match(polityView, /function clearSelection/);
});

test('authority navigation does not retain the retired mobile Person search fallback', () => {
  assert.doesNotMatch(html, /mobileSearchInput|mobileSearchClear|mobileSearchCount/);
  assert.doesNotMatch(nav, /mobileSearchInput|mobileSearchClear|mobileSearchCount|setMobileSearchEnabled|독립 검색 기능 준비 전/);
  assert.doesNotMatch(css, /\.mobile-search input:disabled/);
});

test('authority shell and control-center Dashboard remain responsive without the retired shortcut grid', () => {
  assert.match(css, /authority-state-grid/);
  assert.doesNotMatch(css, /authority-dashboard-grid|authority-domain-card/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(dashboardCss, /dashboard-kpi-grid/);
  assert.match(dashboardCss, /dashboard-main-grid/);
  assert.match(dashboardCss, /@media\(max-width:900px\)/);
  assert.match(dashboardCss, /@media\(max-width:600px\)/);
  assert.match(dashboardCss, /\.dashboard-completeness td button,\.dashboard-breakdown-action\{min-width:44px;min-height:44px/);
});

test('Main authority shell never embeds Admin-only secrets or audit endpoints', () => {
  for (const source of [html, nav, catalog, css]) {
    assert.doesNotMatch(source, /SUPABASE_DB_URL|ATLAS_SESSION_SECRET|ATLAS_MUTATION_TOKEN|service_role|postgres:\/\/|postgresql:\/\//i);
    assert.doesNotMatch(source, /\/api\/atlas-audit-inventory/);
  }
});