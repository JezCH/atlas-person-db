import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  collectPublicUiRootFiles,
  isPublicUiRootFile,
  syncPublicUi
} from '../scripts/prepare-vercel-public-ui.mjs';

const config = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

test('Vercel build publishes the root UI into public', () => {
  assert.equal(config.buildCommand, 'node scripts/prepare-vercel-public-ui.mjs');
  const files = collectPublicUiRootFiles(repoRoot);
  for (const required of [
    'index.html',
    'styles.css',
    'app.js',
    'atlas-person-main.js',
    'atlas-person-spacetime-view.js',
    'atlas-polity-spatial-index.json',
    'atlas-place-spatial-registry.json',
    'non-timeline-persons.json'
  ]) {
    assert.ok(files.includes(required), `missing public UI asset: ${required}`);
  }
});

test('private project configuration and package metadata are never copied', () => {
  for (const forbidden of ['package.json', 'package-lock.json', 'vercel.json']) {
    assert.equal(isPublicUiRootFile(forbidden), false, `${forbidden} must not be public`);
  }
});

test('sync copies browser assets without deleting existing public artifacts', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-public-ui-'));
  const publicDir = path.join(fixtureRoot, 'public');
  fs.mkdirSync(publicDir);
  fs.writeFileSync(path.join(fixtureRoot, 'index.html'), '<!doctype html><title>ATLAS</title>');
  fs.writeFileSync(path.join(fixtureRoot, 'styles.css'), 'body{}');
  fs.writeFileSync(path.join(fixtureRoot, 'package.json'), '{"private":true}');
  fs.writeFileSync(path.join(fixtureRoot, 'atlas-polity-spatial-index.json'), '{}');
  fs.writeFileSync(path.join(publicDir, 'existing-marker.json'), '{"keep":true}');

  const copied = syncPublicUi({ rootDir: fixtureRoot, publicDir });
  assert.deepEqual(copied, ['atlas-polity-spatial-index.json', 'index.html', 'styles.css']);
  assert.equal(fs.existsSync(path.join(publicDir, 'index.html')), true);
  assert.equal(fs.existsSync(path.join(publicDir, 'styles.css')), true);
  assert.equal(fs.existsSync(path.join(publicDir, 'atlas-polity-spatial-index.json')), true);
  assert.equal(fs.existsSync(path.join(publicDir, 'package.json')), false);
  assert.equal(fs.existsSync(path.join(publicDir, 'existing-marker.json')), true);
});
