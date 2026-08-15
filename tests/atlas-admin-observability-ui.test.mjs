import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../admin.html', import.meta.url), 'utf8');
const observability = fs.readFileSync(new URL('../atlas-admin-observability.js', import.meta.url), 'utf8');
const sessionGate = fs.readFileSync(new URL('../atlas-admin-session-gate.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../atlas-admin-observability.css', import.meta.url), 'utf8');

test('Admin loads the isolated read-only observability surface after authentication', () => {
  assert.match(html, /atlas-admin-observability\.css/);
  assert.match(html, /atlas-admin-observability\.js/);
  assert.match(html, /id="systemStatusBody"/);
  assert.match(html, /id="adminInspectorForm"/);
  assert.match(html, /id="inspectorKind"/);
  assert.match(html, /id="inspectorId"/);
  assert.match(html, /SYSTEM \/ STATUS · READ ONLY/);
  assert.match(html, /OBJECT INSPECTOR · READ ONLY/);
  assert.match(css, /\.obs-summary-grid/);
  assert.match(css, /\.obs-tree/);
});

test('observability browser module is GET-only and session-cookie based', () => {
  assert.match(observability, /const STATUS_ENDPOINT = "\/api\/atlas-admin-system-status"/);
  assert.match(observability, /const INSPECTOR_ENDPOINT = "\/api\/atlas-admin-inspector"/);
  assert.match(observability, /method: "GET"/);
  assert.match(observability, /credentials: "same-origin"/);
  assert.doesNotMatch(observability, /method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i);
  assert.doesNotMatch(observability, /authorization|bearer\s|ATLAS_SESSION_SECRET|ATLAS_MUTATION_TOKEN|SUPABASE_DB_URL/i);
});

test('Inspector kinds come from authenticated server capabilities instead of a frontend authority list', () => {
  assert.match(observability, /payload\.supported_kinds/);
  assert.match(observability, /loadInspectorCapabilities/);
  assert.doesNotMatch(observability, /new Set\(\[\s*["']person["']/);
  assert.match(observability, /encodeURIComponent\(kind\)/);
  assert.match(observability, /encodeURIComponent\(id\)/);
});

test('Admin session gate treats the new read endpoints as protected session surfaces', () => {
  assert.match(sessionGate, /"\/api\/atlas-admin-inspector"/);
  assert.match(sessionGate, /"\/api\/atlas-admin-system-status"/);
  assert.match(sessionGate, /atlas-admin-auth-expired/);
  assert.match(observability, /atlas-admin-auth-expired/);
  assert.match(observability, /atlas-admin-logged-out/);
  assert.match(observability, /clearAdminReadState/);
});

test('System Status renders unknown states without fabricating GitHub Actions health', () => {
  assert.match(observability, /unknown \/ not supplied/);
  assert.match(observability, /github_actions_status_embedded/);
  assert.match(html, /GitHub Actions 결과는 런타임 내부 값이 아니므로/);
  assert.doesNotMatch(observability, /Actions[^\n]{0,40}(?:PASS|success|green)/i);
});

test('Admin observability UI never embeds server secrets or raw audit inventory', () => {
  for (const source of [html, observability]) {
    assert.doesNotMatch(source, /SUPABASE_DB_URL|ATLAS_SESSION_SECRET|ATLAS_MUTATION_TOKEN|service_role|postgres:\/\/|postgresql:\/\//i);
    assert.doesNotMatch(source, /\/api\/atlas-audit-inventory/);
  }
  assert.match(html, /secret 값은 표시하지 않습니다/);
});
