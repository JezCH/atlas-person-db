import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const compiler = fs.readFileSync(new URL('../atlas-v2-shadow-compiler.js', import.meta.url), 'utf8');

test('index loads write mode, adapter and shadow compiler before app', () => {
  const mode = index.indexOf('atlas-write-mode.js');
  const adapter = index.indexOf('atlas-write-adapter.js');
  const shadow = index.indexOf('atlas-v2-shadow-compiler.js');
  const appPos = index.indexOf('app.js');
  assert.ok(mode >= 0);
  assert.ok(adapter > mode);
  assert.ok(shadow > adapter);
  assert.ok(appPos > shadow);
});

test('app uses AtlasWriteAdapter in shadow-validate mode with compiler injection', () => {
  assert.ok(app.includes('ATLAS_WRITE_ADAPTER.createAdapter'));
  assert.ok(app.includes('mode: "shadow-validate"'));
  assert.ok(app.includes('shadowCompiler: window.ATLAS_V2_SHADOW_COMPILER.compile'));
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

test('shadow compiler is non-committing and has no DB mutation surface', () => {
  assert.ok(compiler.includes('commit: false'));
  assert.ok(compiler.includes('writes_performed: 0'));
  for (const token of ['.from(', '.insert(', '.update(', '.delete(', '.rpc(']) {
    assert.equal(compiler.includes(token), false, token);
  }
});

test('app contains no dual-write or v2-only route', () => {
  assert.equal(app.includes('dual-write'), false);
  assert.equal(app.includes('v2-only'), false);
});
