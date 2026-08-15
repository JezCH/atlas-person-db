import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const nav = fs.readFileSync(new URL('../atlas-main-authority-nav.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../atlas-main-authority-nav.css', import.meta.url), 'utf8');

test('Main navigation exposes all authority domains as real navigable controls', () => {
  for (const domain of ['dashboard', 'persons', 'polities', 'places', 'events', 'sources', 'geometry']) {
    assert.match(html, new RegExp(`data-atlas-domain="${domain}"`));
  }
  assert.doesNotMatch(html, /data-atlas-domain="(?:dashboard|polities|places|events|sources|geometry)"[^>]*disabled/);
  assert.match(html, /atlas-main-authority-nav\.css\?v=20260815-ui5/);
  assert.match(html, /atlas-main-authority-nav\.js\?v=20260815-ui5/);
});

test('future authority shells state readiness instead of fabricating first-class data', () => {
  assert.match(nav, /BACKEND SURFACE NEEDED/);
  assert.match(nav, /FUTURE \/ P14/);
  assert.match(nav, /PARTIAL READ/);
  assert.match(nav, /독립 Polity 목록·상세·설명·출처를 제공하는 public read contract가 아직 없습니다/);
  assert.match(nav, /standalone Source 목록\/상세 projection은 아직 없으며/);
  assert.match(nav, /Person → Activity → Polity → Territory → Geometry/);
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

test('mobile Person search is disabled outside Persons rather than pretending cross-domain search exists', () => {
  assert.match(nav, /mobileSearch\.disabled = !enabled/);
  assert.match(nav, /first-class 검색 surface 준비 전/);
  assert.match(nav, /setMobileSearchEnabled\(isPersons/);
});

test('authority shell layout remains responsive', () => {
  assert.match(css, /authority-state-grid/);
  assert.match(css, /authority-dashboard-grid/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 700px\)/);
});

test('Main authority shell never embeds Admin-only secrets or audit endpoints', () => {
  for (const source of [html, nav, css]) {
    assert.doesNotMatch(source, /SUPABASE_DB_URL|ATLAS_SESSION_SECRET|ATLAS_MUTATION_TOKEN|service_role|postgres:\/\/|postgresql:\/\//i);
    assert.doesNotMatch(source, /\/api\/atlas-audit-inventory/);
  }
});
