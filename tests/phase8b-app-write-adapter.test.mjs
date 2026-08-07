import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');

test('index loads write mode and adapter before app', () => {
  const mode = index.indexOf('atlas-write-mode.js');
  const adapter = index.indexOf('atlas-write-adapter.js');
  const appPos = index.indexOf('app.js');
  assert.ok(mode >= 0);
  assert.ok(adapter > mode);
  assert.ok(appPos > adapter);
});

test('app uses AtlasWriteAdapter in legacy-only mode', () => {
  assert.ok(app.includes('ATLAS_WRITE_ADAPTER.createAdapter'));
  assert.ok(app.includes('mode: "legacy-only"'));
  assert.ok(app.includes('writeAdapter.createActivity'));
  assert.ok(app.includes('writeAdapter.updateActivity'));
  assert.ok(app.includes('writeAdapter.deleteActivity'));
  assert.ok(app.includes('writeAdapter.importActivities'));
});

test('app no longer directly mutates person_politics', () => {
  assert.equal(app.includes('.from("person_politics").insert('), false);
  assert.equal(app.includes('.from("person_politics").update('), false);
  assert.equal(app.includes('.from("person_politics").delete('), false);
});

test('app contains no v2 commit route', () => {
  assert.equal(app.includes('atlas_v2'), false);
  assert.equal(app.includes('dual-write'), false);
  assert.equal(app.includes('v2-only'), false);
});
