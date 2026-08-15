import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const apiDir = new URL('../api/', import.meta.url);
const apiFiles = fs.readdirSync(apiDir).filter((name) => name.endsWith('.js')).sort();
const auditInventoryApi = fs.readFileSync(new URL('../api/atlas-audit-inventory.js', import.meta.url), 'utf8');
const authoringApi = fs.readFileSync(new URL('../api/atlas-authoring.js', import.meta.url), 'utf8');
const authoringApplyApi = fs.readFileSync(new URL('../api/atlas-authoring-apply.js', import.meta.url), 'utf8');
const correctionApplyApi = fs.readFileSync(new URL('../api/atlas-correction-apply.js', import.meta.url), 'utf8');
const duplicateReviewApi = fs.readFileSync(new URL('../api/atlas-duplicate-review.js', import.meta.url), 'utf8');
const identityApi = fs.readFileSync(new URL('../api/atlas-identity.js', import.meta.url), 'utf8');
const mutateApi = fs.readFileSync(new URL('../api/atlas-mutate.js', import.meta.url), 'utf8');
const p10ReleaseApi = fs.readFileSync(new URL('../api/atlas-p10-revalidation-release.js', import.meta.url), 'utf8');
const readApi = fs.readFileSync(new URL('../api/atlas-read.js', import.meta.url), 'utf8');
const sessionApi = fs.readFileSync(new URL('../api/atlas-session.js', import.meta.url), 'utf8');
const stage2SchemaReleaseApi = fs.readFileSync(new URL('../api/atlas-stage2-schema-release.js', import.meta.url), 'utf8');
const stage2Train2ReleaseApi = fs.readFileSync(new URL('../api/atlas-stage2-train2-release.js', import.meta.url), 'utf8');
const postgresClient = fs.readFileSync(new URL('../server/atlas-postgres-client.js', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const admin = fs.readFileSync(new URL('../admin.html', import.meta.url), 'utf8');

test('Vercel exposes exactly the current ATLAS API entrypoints', () => {
  assert.deepEqual(apiFiles, [
    'atlas-audit-inventory.js',
    'atlas-authoring-apply.js',
    'atlas-authoring.js',
    'atlas-correction-apply.js',
    'atlas-duplicate-review.js',
    'atlas-identity.js',
    'atlas-mutate.js',
    'atlas-p10-revalidation-release.js',
    'atlas-read.js',
    'atlas-session.js',
    'atlas-stage2-schema-release.js',
    'atlas-stage2-train2-release.js'
  ]);
});

test('database-backed browser entrypoints share one server PostgreSQL client boundary', () => {
  const sources = [authoringApi, duplicateReviewApi, identityApi, mutateApi, readApi];
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

test('normal human authoring endpoint delegates to the Stage 2-native direct authoring handler', () => {
  assert.match(authoringApi, /atlas-human-authoring-handler\.js/);
  assert.match(authoringApi, /createHumanAuthoringHandler/);
  assert.doesNotMatch(authoringApi, /SUPABASE_DB_URL|postgres:\/\/|postgresql:\/\//);
});

test('server-only authoring apply endpoint delegates to its isolated handler', () => {
  assert.match(authoringApplyApi, /atlas-authoring-apply-handler\.js/);
  assert.match(authoringApplyApi, /createAuthoringApplyHandler/);
  assert.doesNotMatch(authoringApplyApi, /SUPABASE_DB_URL|postgres:\/\/|postgresql:\/\//);
});

test('server-only correction apply endpoint delegates to its isolated handler', () => {
  assert.match(correctionApplyApi, /atlas-correction-apply-handler\.js/);
  assert.match(correctionApplyApi, /createCorrectionApplyHandler/);
  assert.doesNotMatch(correctionApplyApi, /SUPABASE_DB_URL|postgres:\/\/|postgresql:\/\//);
});

test('server-only audit inventory endpoint delegates to its isolated read-only handler', () => {
  assert.match(auditInventoryApi, /atlas-audit-inventory-handler\.js/);
  assert.match(auditInventoryApi, /createAuditInventoryHandler/);
  assert.doesNotMatch(auditInventoryApi, /SUPABASE_DB_URL|postgres:\/\/|postgresql:\/\//);
  assert.doesNotMatch(auditInventoryApi, /insert\s+into|\bupdate\b|\bdelete\s+from|\btruncate\b/i);
});

test('server-only Stage 2 schema release endpoint delegates to its isolated exact-SHA handler', () => {
  assert.match(stage2SchemaReleaseApi, /atlas-stage2-schema-release-handler\.js/);
  assert.match(stage2SchemaReleaseApi, /createStage2SchemaReleaseHandler/);
  assert.doesNotMatch(stage2SchemaReleaseApi, /SUPABASE_DB_URL|postgres:\/\/|postgresql:\/\//);
});

test('server-only Stage 2 Train 2 endpoint delegates to its isolated exact-SHA OIDC handler', () => {
  assert.match(stage2Train2ReleaseApi, /atlas-stage2-train2-release-handler\.js/);
  assert.match(stage2Train2ReleaseApi, /createStage2Train2ReleaseHandler/);
  assert.doesNotMatch(stage2Train2ReleaseApi, /SUPABASE_DB_URL|postgres:\/\/|postgresql:\/\//);
});

test('server-only P10 release endpoint delegates to its exact-SHA OIDC release handler', () => {
  assert.match(p10ReleaseApi, /atlas-p10-production-release-handler\.js/);
  assert.match(p10ReleaseApi, /createP10ProductionReleaseHandler/);
  assert.doesNotMatch(p10ReleaseApi, /SUPABASE_DB_URL|postgres:\/\/|postgresql:\/\//);
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
    assert.doesNotMatch(html, /api\/atlas-(?:audit-inventory|authoring|authoring-apply|correction-apply|duplicate-review|identity|mutate|p10-revalidation-release|read|session|stage2-schema-release|stage2-train2-release)\.js/);
    assert.doesNotMatch(html, /node_modules\/pg|require\("pg"\)/);
  }
});
