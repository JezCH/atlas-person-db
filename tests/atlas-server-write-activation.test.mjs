import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const adminHtml = fs.readFileSync(new URL('../admin.html', import.meta.url), 'utf8');
const admin = fs.readFileSync(new URL('../admin.js', import.meta.url), 'utf8');
const adminService = fs.readFileSync(new URL('../atlas-admin-write-service.js', import.meta.url), 'utf8');
const schema = fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');
const lockdown = fs.readFileSync(new URL('../migration/phase-8/phase8c-c4c-lockdown-public-writes.sql', import.meta.url), 'utf8');
const rollback = fs.readFileSync(new URL('../migration/phase-8/phase8c-c4c-rollback-public-writes.sql', import.meta.url), 'utf8');

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

test('admin uses normalized compatibility lookup and never client-writes either store', () => {
  assert.equal(adminHtml.includes('./atlas-server-write-adapter.js'), true);
  assert.equal(adminHtml.includes('./atlas-write-adapter.js'), false);
  assert.equal(adminHtml.includes('./atlas-write-mode.js'), false);
  assert.equal(adminHtml.includes('./atlas-v2-shadow-compiler.js'), false);
  assert.equal(admin.includes('window.ATLAS_SERVER_WRITE_ADAPTER'), true);
  assert.equal(admin.includes('window.ATLAS_WRITE_ADAPTER'), false);
  assert.equal(admin.includes('window.ATLAS_WRITE_MODE'), false);
  assert.equal(admin.includes('window.ATLAS_V2_SHADOW_COMPILER'), false);
  assert.equal(adminService.includes('.from("atlas_person_politics_compat_v1")'), true);
  assert.equal(adminService.includes('.from("person_politics")'), false);
  assert.equal(adminService.includes('.select("id")'), true);
  assert.equal(adminService.includes('.insert('), false);
  assert.equal(adminService.includes('.update('), false);
  assert.equal(adminService.includes('.delete('), false);
});

test('schema bootstrap is client-read-only and cannot recreate public write access', () => {
  assert.match(schema, /create policy "public read person politics"/i);
  assert.doesNotMatch(schema, /create policy "public insert person politics"/i);
  assert.doesNotMatch(schema, /create policy "public update person politics"/i);
  assert.doesNotMatch(schema, /create policy "public delete person politics"/i);
  assert.match(schema, /revoke insert, update, delete on table public\.person_politics from public/i);
  assert.match(schema, /from anon/i);
  assert.match(schema, /from authenticated/i);
});

test('public-write lockdown preserves read policy and removes all write-capable policies', () => {
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
