import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const serverAdapter = fs.readFileSync(new URL('../atlas-server-write-adapter.js', import.meta.url), 'utf8');

test('index loads authenticated server write adapter before app and detaches legacy browser writers', () => {
  const reader = index.indexOf('atlas-reader.js');
  const adapter = index.indexOf('atlas-server-write-adapter.js');
  const appPos = index.indexOf('app.js');
  assert.ok(reader >= 0);
  assert.ok(adapter > reader);
  assert.ok(appPos > adapter);
  assert.equal(index.includes('atlas-write-mode.js'), false);
  assert.equal(index.includes('atlas-write-adapter.js'), false);
  assert.equal(index.includes('atlas-v2-shadow-compiler.js'), false);
});

test('app routes create update delete and import through authenticated server adapter', () => {
  assert.ok(app.includes('window.ATLAS_SERVER_WRITE_ADAPTER'));
  assert.ok(app.includes('window.ATLAS_SERVER_WRITE_ADAPTER.createAdapter()'));
  assert.ok(app.includes('writeAdapter.createActivity'));
  assert.ok(app.includes('writeAdapter.updateActivity'));
  assert.ok(app.includes('writeAdapter.deleteActivity'));
  assert.ok(app.includes('writeAdapter.importActivities'));
  assert.equal(app.includes('ATLAS_WRITE_ADAPTER'), false);
  assert.equal(app.includes('ATLAS_WRITE_MODE'), false);
  assert.equal(app.includes('ATLAS_V2_SHADOW_COMPILER'), false);
});

test('app no longer directly mutates person_politics', () => {
  assert.equal(app.includes('.from("person_politics").insert('), false);
  assert.equal(app.includes('.from("person_politics").update('), false);
  assert.equal(app.includes('.from("person_politics").delete('), false);
});

test('browser server adapter carries no server secret or Authorization header', () => {
  assert.equal(serverAdapter.includes('ATLAS_MUTATION_TOKEN'), false);
  assert.equal(serverAdapter.includes('Authorization'), false);
  assert.ok(serverAdapter.includes('credentials: "same-origin"'));
  assert.equal(serverAdapter.includes('.from('), false);
  assert.equal(serverAdapter.includes('.insert('), false);
  assert.equal(serverAdapter.includes('.update('), false);
  assert.equal(serverAdapter.includes('.delete('), false);
});

test('app contains no client-side fallback route', () => {
  assert.equal(app.includes('shadow-validate'), false);
  assert.equal(app.includes('legacy-only'), false);
  assert.equal(app.includes('dual-write'), false);
  assert.equal(app.includes('v2-only'), false);
});
