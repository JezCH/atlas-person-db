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
const vercel = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const admin = fs.readFileSync(new URL('../admin.html', import.meta.url), 'utf8');

test('Vercel exposes exactly twelve physical ATLAS API functions on Hobby', () => {
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
  assert.equal(apiFiles.length, 12);
});

test('logical Person and audit surfaces consolidate onto existing physical functions', () => {
  assert.deepEqual(vercel.rewrites, [
    { source: '/api/atlas-reviewed-person-merge', destination: '/api/atlas-authoring?__atlas_authoring_surface=reviewed-person-merge' },
    { source: '/api/atlas-namuwiki-link', destination: '/api/atlas-authoring?__atlas_authoring_surface=namuwiki-link' },
    { source: '/api/atlas-person-read', destination: '/api/atlas-read?__atlas_read_surface=person' },
    { source: '/api/atlas-admin-inspector', destination: '/api/atlas-read?__atlas_read_surface=admin-inspector' },
    { source: '/api/atlas-admin-system-status', destination: '/api/atlas-read?__atlas_read_surface=admin-system-status' },
    { source: '/api/atlas-person-domain', destination: '/api/atlas-mutate?__atlas_mutation_surface=person-domain' },
    { source: '/api/atlas-p11-baseline-b-capture', destination: '/api/atlas-audit-inventory?__atlas_audit_surface=p11-baseline-b-capture' }
  ]);
});

test('consolidated read entrypoint preserves normalized, Person and authenticated Admin handlers', () => {
  assert.match(readApi, /atlas-normalized-read-handler\.js/);
  assert.match(readApi, /createNormalizedReadHandler/);
  assert.match(readApi, /atlas-person-read-handler\.js/);
  assert.match(readApi, /createPersonReadHandler/);
  assert.match(readApi, /atlas-admin-inspector-handler\.js/);
  assert.match(readApi, /createAdminInspectorHandler/);
  assert.match(readApi, /atlas-admin-system-status-handler\.js/);
  assert.match(readApi, /createAdminSystemStatusHandler/);
  assert.doesNotMatch(readApi, /SUPABASE_DB_URL|ATLAS_SESSION_SECRET|ATLAS_MUTATION_TOKEN|postgres:\/\/|postgresql:\/\//);
});

test('consolidated mutation entrypoint preserves generic mutation and Person domain handlers', () => {
  assert.match(mutateApi, /atlas-vercel-mutation-handler\.js/);
  assert.match(mutateApi, /createVercelMutationHandler/);
  assert.match(mutateApi, /atlas-person-domain-handler\.js/);
  assert.match(mutateApi, /createPersonDomainHandler/);
  assert.match(mutateApi, /surface === "person-domain"/);
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

test('NamuWiki logical endpoint delegates to its isolated exact-SHA OIDC handler without adding a physical function', () => {
  assert.match(authoringApi, /atlas-namuwiki-link-handler\.js/);
  assert.match(authoringApi, /createNamuWikiLinkHandler/);
  assert.match(authoringApi, /surface === "namuwiki-link"/);
  assert.doesNotMatch(authoringApi, /SUPABASE_DB_URL|ATLAS_SESSION_SECRET|ATLAS_MUTATION_TOKEN|postgres:\/\/|postgresql:\/\//);
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

test('audit inventory and P11 Baseline B share one physical read-only function with isolated handlers', () => {
  assert.match(auditInventoryApi, /atlas-audit-inventory-handler\.js/);
  assert.match(auditInventoryApi, /createAuditInventoryHandler/);
  assert.match(auditInventoryApi, /atlas-p11-baseline-b-capture-handler\.js/);
  assert.match(auditInventoryApi, /createP11BaselineBCaptureHandler/);
  assert.match(auditInventoryApi, /p11-baseline-b-capture/);
  assert.match(auditInventoryApi, /ATLAS_AUDIT_SURFACE_NOT_FOUND/);
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

test('session entrypoint remains the only browser authentication endpoint', () => {
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
    assert.doesNotMatch(html, /api\/atlas-(?:admin-inspector|admin-system-status|audit-inventory|authoring|authoring-apply|correction-apply|duplicate-review|identity|mutate|p10-revalidation-release|person-read|read|session|stage2-schema-release|stage2-train2-release)\.js/);
    assert.doesNotMatch(html, /node_modules\/pg|require\("pg"\)/);
  }
});
