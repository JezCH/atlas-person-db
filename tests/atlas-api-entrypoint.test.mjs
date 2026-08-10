import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const apiDir = new URL('../api/', import.meta.url);
const apiFiles = fs.readdirSync(apiDir).filter((name) => name.endsWith('.js')).sort();
const duplicateReviewApi = fs.readFileSync(new URL('../api/atlas-duplicate-review.js', import.meta.url), 'utf8');
const mutateApi = fs.readFileSync(new URL('../api/atlas-mutate.js', import.meta.url), 'utf8');
const readApi = fs.readFileSync(new URL('../api/atlas-read.js', import.meta.url), 'utf8');
const sessionApi = fs.readFileSync(new URL('../api/atlas-session.js', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const admin = fs.readFileSync(new URL('../admin.html', import.meta.url), 'utf8');

test('Vercel exposes exactly the current ATLAS API entrypoints', () => {
  assert.deepEqual(apiFiles, [
    'atlas-duplicate-review.js',
    'atlas-mutate.js',
    'atlas-read.js',
    'atlas-session.js'
  ]);
});

test('database-backed entrypoints use server handlers and pg clients only', () => {
  assert.match(duplicateReviewApi, /require\("pg"\)/);
  assert.match(duplicateReviewApi, /createDuplicateReviewHandler/);
  assert.match(duplicateReviewApi, /await client\.connect\(\)/);
  assert.match(mutateApi, /require\("pg"\)/);
  assert.match(mutateApi, /createVercelMutationHandler/);
  assert.match(mutateApi, /await client\.connect\(\)/);
  assert.match(readApi, /require\("pg"\)/);
  assert.match(readApi, /createNormalizedReadHandler/);
  assert.match(readApi, /await client\.connect\(\)/);
  for (const source of [duplicateReviewApi, mutateApi, readApi]) {
    assert.doesNotMatch(source, /service_role|postgres:\/\/|postgresql:\/\//);
  }
});

test('session entrypoint is the only browser authentication endpoint', () => {
  assert.match(sessionApi, /atlas-session-auth|createSessionApi|createSession/);
  assert.doesNotMatch(sessionApi, /person_politics|atlas_v2\./);
});

test('server runtime dependency is explicit', () => {
  assert.equal(pkg.private, true);
  assert.equal(typeof pkg.dependencies?.pg, 'string');
});

test('browser pages do not load server entrypoints or pg', () => {
  for (const html of [index, admin]) {
    assert.doesNotMatch(html, /atlas-(?:duplicate-review|mutate|read|session)\.js/);
    assert.doesNotMatch(html, /node_modules\/pg|require\("pg"\)/);
  }
});
