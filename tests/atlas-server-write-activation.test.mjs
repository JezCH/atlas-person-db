import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const adminHtml = fs.readFileSync(new URL('../admin.html', import.meta.url), 'utf8');
const admin = fs.readFileSync(new URL('../admin.js', import.meta.url), 'utf8');
const adminService = fs.readFileSync(new URL('../atlas-admin-write-service.js', import.meta.url), 'utf8');
const semantics = fs.readFileSync(new URL('../atlas-activity-semantics.js', import.meta.url), 'utf8');
const cleanup = JSON.parse(fs.readFileSync(new URL('../migration/phase-8/reports/phase8c-c9-final-repository-cleanup.json', import.meta.url), 'utf8'));
const lockdown = fs.readFileSync(new URL('../migration/phase-8/phase8c-c4c-lockdown-public-writes.sql', import.meta.url), 'utf8');
const rollback = fs.readFileSync(new URL('../migration/phase-8/phase8c-c4c-rollback-public-writes.sql', import.meta.url), 'utf8');

function exists(rel) {
  return fs.existsSync(new URL(`../${rel}`, import.meta.url));
}

test('authoring app selects only the authenticated server write adapter', () => {
  assert.equal(index.includes('atlas-server-write-adapter.js'), true);
  assert.equal(index.includes('atlas-write-adapter.js'), false);
  assert.equal(index.includes('atlas-write-mode.js'), false);
  assert.equal(index.includes('atlas-v2-shadow-compiler.js'), false);
  assert.equal(app.includes('window.ATLAS_SERVER_WRITE_ADAPTER'), true);
  assert.equal(app.includes('window.ATLAS_WRITE_ADAPTER'), false);
  assert.equal(app.includes('window.ATLAS_WRITE_MODE'), false);
  assert.equal(app.includes('window.ATLAS_V2_SHADOW_COMPILER'), false);
  assert.equal(app.includes('outcome.legacy?.committed'), false);
  assert.equal(app.includes('outcome.v2.normalized_relationship_ids'), true);
});

test('admin uses direct normalized lookup, shared semantic identity, and never client-writes either store', () => {
  assert.equal(adminHtml.includes('./atlas-activity-semantics.js'), true);
  assert.equal(adminHtml.includes('./atlas-server-write-adapter.js'), true);
  assert.equal(adminHtml.includes('./atlas-write-adapter.js'), false);
  assert.equal(adminHtml.includes('./atlas-write-mode.js'), false);
  assert.equal(adminHtml.includes('./atlas-v2-shadow-compiler.js'), false);
  assert.equal(admin.includes('window.ATLAS_SERVER_WRITE_ADAPTER'), true);
  assert.equal(admin.includes('window.ATLAS_WRITE_ADAPTER'), false);
  assert.equal(admin.includes('window.ATLAS_WRITE_MODE'), false);
  assert.equal(admin.includes('window.ATLAS_V2_SHADOW_COMPILER'), false);
  assert.equal(adminService.includes('/api/atlas-read'), true);
  assert.equal(adminService.includes('atlas-activity-semantics.js'), true);
  assert.equal(adminService.includes('normalized semantic activity lookup is ambiguous'), true);
  assert.match(semantics, /person.*polity.*start.*end.*role.*basis/s);
  assert.equal(adminService.includes('.from('), false);
  assert.equal(adminService.includes('.insert('), false);
  assert.equal(adminService.includes('.update('), false);
  assert.equal(adminService.includes('.delete('), false);
});

test('legacy root schema bootstrap is retired and cannot recreate public.person_politics', () => {
  assert.equal(exists('schema.sql'), false);
  const retired = cleanup.removed_active_paths.find((entry) => entry.path === 'schema.sql');
  assert.ok(retired, 'schema.sql retirement evidence missing');
  assert.equal(retired.blob_sha, '0b1fe423f110ae1a616af0e2f64189996cf712eb');
  assert.equal(cleanup.required_final_state.legacy_bootstrap_recreation_path, 0);
});

test('historical public-write lockdown evidence remains intact for audit only', () => {
  assert.match(lockdown, /public read person politics/);
  assert.match(lockdown, /DROP POLICY IF EXISTS "public insert person politics"/);
  assert.match(lockdown, /DROP POLICY IF EXISTS "public update person politics"/);
  assert.match(lockdown, /DROP POLICY IF EXISTS "public delete person politics"/);
  assert.match(lockdown, /REVOKE INSERT, UPDATE, DELETE/);
  assert.match(lockdown, /cmd IN \('ALL', 'INSERT', 'UPDATE', 'DELETE'\)/);
  assert.match(rollback, /CREATE POLICY "public insert person politics"/);
  assert.match(rollback, /CREATE POLICY "public update person politics"/);
  assert.match(rollback, /CREATE POLICY "public delete person politics"/);
});
