import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync(new URL('../admin.html', import.meta.url), 'utf8');
const gate = fs.readFileSync(new URL('../atlas-admin-session-gate.js', import.meta.url), 'utf8');
const sessionApi = fs.readFileSync(new URL('../api/atlas-session.js', import.meta.url), 'utf8');

test('admin page has an explicit same-origin session entry gate before protected runtime activates', () => {
  assert.match(html, /id="adminLoginForm"/);
  assert.match(html, /id="adminPassword"[^>]+type="password"/);
  assert.match(html, /id="duplicateProtectedArea"[^>]+inert/);
  assert.match(html, /id="dataProtectedArea"[^>]+inert/);
  assert.match(html, /await window\.ATLAS_ASSETS\.loadScript\("\.\/atlas-admin-session-gate\.js"\)/);
  assert.match(html, /const gate = window\.ATLAS_ADMIN_SESSION_GATE/);
  assert.match(html, /await gate\.ready/);
  assert.match(html, /if \(gate\.isAuthenticated\(\)\) await loadAdminAssets\(\)/);
  assert.match(html, /atlas-admin-authenticated/);

  const gateLoad = html.indexOf('await window.ATLAS_ASSETS.loadScript("./atlas-admin-session-gate.js")');
  const gateReady = html.indexOf('await gate.ready');
  const guardedActivation = html.indexOf('if (gate.isAuthenticated()) await loadAdminAssets()');
  assert.ok(gateLoad >= 0 && gateReady > gateLoad && guardedActivation > gateReady);
});

test('session gate uses the existing server session API without persisting credentials', () => {
  assert.match(gate, /const SESSION_ENDPOINT = "\/api\/atlas-session"/);
  assert.match(gate, /credentials: "same-origin"/);
  assert.match(gate, /sessionRequest\("GET"\)/);
  assert.match(gate, /sessionRequest\("POST", \{ password \}\)/);
  assert.match(gate, /sessionRequest\("DELETE"\)/);
  assert.match(gate, /passwordInput\.value = ""/);
  assert.doesNotMatch(gate, /localStorage|sessionStorage|ATLAS_ADMIN_PASSWORD|ATLAS_MUTATION_TOKEN/);
});

test('protected admin surfaces lock on missing or expired authentication', () => {
  assert.match(gate, /area\.inert = locked/);
  assert.match(gate, /PROTECTED_API_PATHS/);
  assert.match(gate, /response\.status === 401/);
  assert.match(gate, /atlas-admin-auth-expired/);
  assert.match(gate, /setAuthenticated\(false/);
  assert.match(gate, /setAuthenticated\(true/);
});

test('server session endpoint remains password-to-HttpOnly-cookie boundary', () => {
  assert.match(sessionApi, /requireEnv\(env, "ATLAS_ADMIN_PASSWORD"\)/);
  assert.match(sessionApi, /requireEnv\(env, "ATLAS_MUTATION_TOKEN"\)/);
  assert.match(sessionApi, /issueSessionToken/);
  assert.match(sessionApi, /sessionCookie/);
  assert.match(sessionApi, /clearSessionCookie/);
});
