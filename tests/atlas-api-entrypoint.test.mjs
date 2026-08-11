import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const apiDir = new URL('../api/', import.meta.url);
const apiFiles = fs.readdirSync(apiDir).filter((name) => name.endsWith('.js')).sort();
const authoringApplyApi = fs.readFileSync(new URL('../api/atlas-authoring-apply.js', import.meta.url), 'utf8');
const duplicateReviewApi = fs.readFileSync(new URL('../api/atlas-duplicate-review.js', import.meta.url), 'utf8');
const identityApi = fs.readFileSync(new URL('../api/atlas-identity.js', import.meta.url), 'utf8');
const mutateApi = fs.readFileSync(new URL('../api/atlas-mutate.js', import.meta.url), 'utf8');
const readApi = fs.readFileSync(new URL('../api/atlas-read.js', import.meta.url), 'utf8');
const sessionApi = fs.readFileSync(new URL('../api/atlas-session.js', import.meta.url), 'utf8');
const postgresClient = fs.readFileSync(new URL('../server/atlas-postgres-client.js', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const admin = fs.readFileSync(new URL('../admin.html', import.meta.url), 'utf8');

test('Vercel exposes exactly the current ATLAS API entrypoints', () => {
  assert.deepEqual(apiFiles, [
    'atlas-authoring-apply.js',
    'atlas-duplicate-review.js',
    'atlas-identity.js',
    'atlas-mutate.js',
    'atlas-read.js',
    'atlas-session.js'
  ]);
});

test('database-backed browser entrypoints share one server PostgreSQL client boundary', () => {
  const sources = [duplicateReviewApi, identityApi, mutateApi, readApi];
  for (const source of sources) {
    assert.match(source, /atlas-postgres-client\.js/);
    assert.match(source, /createPostgresClient/);
    assert.doesNotMatch(source, /require\("pg"\)|new Client\(/);
    assert.doesNotMatch(source, /service_role|postgres:\/\/|postgresql:\/\//);
  }
  assert.match(postgresClient, /require\("pg"\)/);
  assert.match(postgresClient, /new Client\(/);
  assert.match(postgresClient, /SUPABASE_DB_CA/);
});

test('server-only authoring apply endpoint delegates to its isolated handler', () => {
  assert.match(authoringApplyApi, /atlas-authoring-apply-handler\.js/);
  assert.match(authoringApplyApi, /createAuthoringApplyHandler/);
  assert.doesNotMatch(authoringApplyApi, /SUPABASE_DB_URL|postgres:\/\/|postgresql:\/\//);
});

test('session entrypoint is the only browser authentication endpoint', () => {
  assert.match(sessionApi, /atlas-session-auth|createSessionHandler/);
  assert.doesNotMatch(sessionApi, /person_politics|atlas_v2\./);
});

test('server runtime dependency is explicit and lock-backed', () => {
  assert.equal(pkg.private, true);
  assert.equal(typeof pkg.dependencies?.pg, 'string');
  assert.equal(typeof pkg.scripts?.test, 'string');
  assert.equal(fs.existsSync(new URL('../package-lock.json', import.meta.url)), true);
});

test('browser pages do not load server entrypoints or pg', () => {
  for (const html of [index, admin]) {
    assert.doesNotMatch(html, /api\/atlas-(?:authoring-apply|duplicate-review|identity|mutate|read|session)\.js/);
    assert.doesNotMatch(html, /node_modules\/pg|require\("pg"\)/);
  }
});
