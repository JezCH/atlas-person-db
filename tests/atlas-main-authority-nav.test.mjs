import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const nav = fs.readFileSync(new URL('../atlas-main-authority-nav.js', import.meta.url), 'utf8');
const catalog = fs.readFileSync(new URL('../atlas-ui-authority-catalog.ko.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../atlas-main-authority-nav.css', import.meta.url), 'utf8');

test('Main navigation exposes all authority domains through static controls plus the current spacetime extension', () => {
  for (const domain of ['dashboard', 'persons', 'polities', 'places', 'events', 'sources', 'geometry']) {
    assert.match(html, new RegExp(`data-atlas-domain="${domain}"`));
  }
  assert.doesNotMatch(html, /data-atlas-domain="(?:dashboard|polities|places|events|sources|geometry)"[^>]*disabled/);
  assert.match(nav, /"dashboard", "persons", "spacetime", "polities", "places", "events", "sources", "geometry"/);
  assert.match(nav, /dataAtlasDomain|dataset\.atlasDomain|data-atlas-domain="spacetime"/i);
  assert.match(catalog, /spacetime: entry/);
  assert.match(html, /atlas-main-authority-nav\.css\?v=20260815-ui5/);
  assert.match(html, /atlas-main-authority-nav\.js\?v=20260901-spacetime-compact-shared-chrome/);
});

test('future authority shells state readiness from the Korean catalog instead of fabricating first-class data', () => {
  assert.match(catalog, /백엔드 조회 필요/);
  assert.match(catalog, /향후 단계 · P14/);
  assert.match(catalog, /부분 조회/);
  assert.match(catalog, /독립 정치체 목록·상세·설명·출처를 제공하는 공개 조회 계약이 아직 없습니다/);
  assert.match(catalog, /독립 출처 목록·상세 조회와 first-class Source authoring은 P13에서 완성해야 합니다/);
  assert.match(catalog, /인물 → 활동 → 정치체 → 영토 → 지리 형상/);
  assert.match(nav, /ATLAS_UI_AUTHORITY_CATALOG_KO/);
  assert.doesNotMatch(nav, /fetch\s*\(/);
  assert.doesNotMatch(nav, /XMLHttpRequest|\/api\//);
});

test('Persons remains the authoritative working surface and future shells only hide or restore it', () => {
  assert.match(nav, /document\.getElementById\("personMainView"\)/);
  assert.match(nav, /document\.getElementById\("relationshipAuthoringTools"\)/);
  assert.match(nav, /personView\.hidden = !isPersons/);
  assert.match(nav, /authoringTools\.hidden = !isPersons/);
  assert.match(nav, /shell\.hidden = isPersons/);
});

test('desktop and mobile navigation stay synchronized and hash-addressable', () => {
  assert.match(nav, /\.nav-list \[data-atlas-domain\]/);
  assert.match(nav, /\.mobile-nav \[data-atlas-domain\]/);
  assert.match(nav, /aria-current/);
  assert.match(nav, /#atlas-/);
  assert.match(nav, /hashchange/);
  assert.match(nav, /mobileMenuClose/);
});

test('mobile Person search remains fail-closed outside Persons if the legacy shell input exists', () => {
  assert.match(nav, /mobileSearch\.disabled = !enabled/);
  assert.match(nav, /독립 검색 기능 준비 전/);
  assert.match(nav, /setMobileSearchEnabled\(isPersons/);
});

test('authority shell layout remains responsive', () => {
  assert.match(css, /authority-state-grid/);
  assert.match(css, /authority-dashboard-grid/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 700px\)/);
});

test('Main authority shell never embeds Admin-only secrets or audit endpoints', () => {
  for (const source of [html, nav, catalog, css]) {
    assert.doesNotMatch(source, /SUPABASE_DB_URL|ATLAS_SESSION_SECRET|ATLAS_MUTATION_TOKEN|service_role|postgres:\/\/|postgresql:\/\//i);
    assert.doesNotMatch(source, /\/api\/atlas-audit-inventory/);
  }
});