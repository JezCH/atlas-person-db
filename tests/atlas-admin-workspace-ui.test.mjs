import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../admin.html', import.meta.url), 'utf8');
const workspace = fs.readFileSync(new URL('../atlas-admin-workspace.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../atlas-admin-workspace.css', import.meta.url), 'utf8');

test('Admin loads the dedicated workspace shell before authenticated feature modules', () => {
  assert.match(html, /atlas-admin-workspace\.css\?v=20260815-ui4/);
  assert.match(html, /loadScript\("\.\/atlas-admin-workspace\.js"\)/);
  assert.match(html, /loadScript\("\.\/atlas-admin-session-gate\.js"\)/);
  assert.ok(html.indexOf('loadScript("./atlas-admin-workspace.js")') < html.indexOf('loadScript("./atlas-admin-session-gate.js")'));
});

test('workspace preserves the four explicit Admin information domains', () => {
  assert.match(workspace, /\["overview", "review", "authoring", "inspector"\]/);
  assert.match(workspace, /label: "개요"/);
  assert.match(workspace, /label: "중복 검토"/);
  assert.match(workspace, /label: "신규 등록"/);
  assert.match(workspace, /label: "Object Inspector"/);
  assert.match(workspace, /정보를 삭제하지 않으며 URL hash로 직접 접근/);
});

test('workspace reorganizes existing protected DOM instead of reimplementing write semantics', () => {
  assert.match(workspace, /document\.getElementById\("duplicateProtectedArea"\)/);
  assert.match(workspace, /document\.getElementById\("dataProtectedArea"\)/);
  assert.match(workspace, /aria-labelledby="system-status-title"/);
  assert.match(workspace, /aria-labelledby="inspector-title"/);
  assert.match(workspace, /aria-labelledby="identity-title"/);
  assert.match(workspace, /aria-labelledby="input-title"/);
  assert.doesNotMatch(workspace, /fetch\s*\(/);
  assert.doesNotMatch(workspace, /\/api\//);
  assert.doesNotMatch(workspace, /method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i);
});

test('workspace navigation is keyboard accessible and hash-addressable', () => {
  assert.match(workspace, /role="tablist"/);
  assert.match(workspace, /setAttribute\("role", "tab"\)/);
  assert.match(workspace, /aria-selected/);
  assert.match(workspace, /ArrowRight/);
  assert.match(workspace, /ArrowLeft/);
  assert.match(workspace, /event\.key === "Home"/);
  assert.match(workspace, /event\.key === "End"/);
  assert.match(workspace, /hashchange/);
  assert.match(workspace, /#admin-/);
});

test('workspace styling keeps tabs usable on desktop and mobile', () => {
  assert.match(css, /grid-template-columns: repeat\(4/);
  assert.match(css, /position: sticky/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /overflow-x: auto/);
  assert.match(css, /admin-workspace-view\[hidden\]/);
});

test('workspace does not embed secrets or audit-only surfaces', () => {
  for (const source of [workspace, css, html]) {
    assert.doesNotMatch(source, /SUPABASE_DB_URL|ATLAS_SESSION_SECRET|ATLAS_MUTATION_TOKEN|service_role|postgres:\/\/|postgresql:\/\//i);
    assert.doesNotMatch(source, /\/api\/atlas-audit-inventory/);
  }
});
