import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import pg from 'pg';

const require = createRequire(import.meta.url);
const { applyAuthoringMigrations } = require('../server/atlas-authoring-migrations.js');
const { applyCorrectionMigrations } = require('../server/atlas-correction-migrations.js');
const { applyStage2SchemaRelease } = require('../server/atlas-stage2-schema-release.js');
const { applyReviewedEntityAuthoring } = require('../server/atlas-stage2-reviewed-entity-authoring.js');
const { applyReviewedSourceAuthoring } = require('../server/atlas-stage2-reviewed-source-authoring.js');
const { createCorrectionV2TargetSnapshot } = require('../server/atlas-correction-v2-snapshot-service.js');
const { requiredSnapshotActivityIds, synthesizeCorrectionV2Manifest } = require('../server/atlas-correction-v2-manifest-synthesizer.js');
const { MARKER_V2, createCorrectionManifestV2Service } = require('../server/atlas-correction-manifest-v2-service.js');

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required');

const BASELINE_SHA = 'ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
const BASELINE_DIGEST = 'sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const baselinePath = path.resolve(root, process.env.ATLAS_BASELINE_A_PATH || 'artifacts/baseline-a-source.json');
const planPath = path.resolve(root, 'stage2/execution/p7-relation-resolution-execution.v1.json');
const baselineSchemaPath = path.resolve(root, 'db/schema/atlas_v2.current.sql');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const flattenNames = (catalog, foreignKey) => catalog.flatMap((entity) => (entity.names || []).map((name) => ({ ...name, [foreignKey]: entity.id })));

function parseLegacySourceKey(key) {
  const match = /^(.*):(\d+):([0-9a-f]{16})$/i.exec(String(key || ''));
  if (!match) throw new Error(`P7_REHEARSAL_LEGACY_SOURCE_KEY_UNSUPPORTED:${key}`);
  return Object.freeze({ file: match[1], index: Number(match[2]), content_hash_prefix: match[3].toLowerCase() });
}

function baselineSourceEvidence(row, sourceByTitle) {
  const parsed = parseLegacySourceKey(row.legacy_source_key);
  const source = sourceByTitle.get(parsed.file);
  if (!source) throw new Error(`P7_REHEARSAL_SOURCE_FILE_UNRESOLVED:${parsed.file}`);
  return Object.freeze({
    activity: Object.freeze({
      id: row.activity_id,
      person_id: row.person_id,
      polity_id: row.polity_id,
      role_id: row.role_id,
      period_basis_id: row.period_basis_id,
      activity_start: row.activity_start,
      activity_end: row.activity_end,
      confidence: row.confidence,
      chronology_status: row.chronology_status,
      legacy_source_key: row.legacy_source_key,
      notes: row.notes,
      source_locator: Object.freeze({ file: parsed.file, index: parsed.index, source_sha256: source.sha256 }),
      content_hash: parsed.content_hash_prefix
    }),
    source_link: Object.freeze({ person_politics_id: row.activity_id, source_id: source.id, source_locator_key: `${parsed.file}:${parsed.index}` })
  });
}

async function insertJson(client, rows, sql) {
  if (rows.length) await client.query(sql, [JSON.stringify(rows)]);
}

async function seedIdentityCatalogs(client, catalogs) {
  await insertJson(client, catalogs.persons, `insert into atlas_v2.persons(id,canonical_key,person_type,historicity)
    select x.id::uuid,x.canonical_key,x.person_type,x.historicity from jsonb_to_recordset($1::jsonb) as x(id text,canonical_key text,person_type text,historicity text)`);
  await insertJson(client, flattenNames(catalogs.persons, 'person_id'), `insert into atlas_v2.person_names(id,person_id,locale,name,name_type,is_preferred)
    select x.id::uuid,x.person_id::uuid,x.locale,x.name,x.name_type,x.is_preferred from jsonb_to_recordset($1::jsonb) as x(id text,person_id text,locale text,name text,name_type text,is_preferred boolean)`);
  await insertJson(client, catalogs.polities, `insert into atlas_v2.polities(id,canonical_key,polity_type,historicity)
    select x.id::uuid,x.canonical_key,x.polity_type,x.historicity from jsonb_to_recordset($1::jsonb) as x(id text,canonical_key text,polity_type text,historicity text)`);
  await insertJson(client, flattenNames(catalogs.polities, 'polity_id'), `insert into atlas_v2.polity_names(id,polity_id,locale,name,name_type,is_preferred)
    select x.id::uuid,x.polity_id::uuid,x.locale,x.name,x.name_type,x.is_preferred from jsonb_to_recordset($1::jsonb) as x(id text,polity_id text,locale text,name text,name_type text,is_preferred boolean)`);
  await insertJson(client, catalogs.roles, `insert into atlas_v2.roles(id,code,category,source_label,is_active)
    select x.id::uuid,x.code,x.category,x.source_label,x.is_active from jsonb_to_recordset($1::jsonb) as x(id text,code text,category text,source_label text,is_active boolean)`);
  await insertJson(client, flattenNames(catalogs.roles, 'role_id'), `insert into atlas_v2.role_names(id,role_id,locale,name,is_preferred)
    select x.id::uuid,x.role_id::uuid,x.locale,x.name,x.is_preferred from jsonb_to_recordset($1::jsonb) as x(id text,role_id text,locale text,name text,is_preferred boolean)`);
  await insertJson(client, catalogs.period_bases, `insert into atlas_v2.period_bases(id,code,is_active)
    select x.id::uuid,x.code,x.is_active from jsonb_to_recordset($1::jsonb) as x(id text,code text,is_active boolean)`);
  await insertJson(client, flattenNames(catalogs.period_bases, 'period_basis_id'), `insert into atlas_v2.period_basis_names(id,period_basis_id,locale,name,is_preferred)
    select x.id::uuid,x.period_basis_id::uuid,x.locale,x.name,x.is_preferred from jsonb_to_recordset($1::jsonb) as x(id text,period_basis_id text,locale text,name text,is_preferred boolean)`);
  await insertJson(client, catalogs.sources, `insert into atlas_v2.sources(id,source_key,source_type,title,sha256,bytes)
    select x.id::uuid,x.source_key,x.source_type,x.title,x.sha256,x.bytes from jsonb_to_recordset($1::jsonb) as x(id text,source_key text,source_type text,title text,sha256 text,bytes integer)`);
}

async function seedActivities(client, rows, sourceByTitle) {
  const evidence = rows.map((row) => baselineSourceEvidence(row, sourceByTitle));
  await insertJson(client, evidence.map((row) => row.activity), `insert into atlas_v2.person_politics_v2(
      id,person_id,polity_id,role_id,period_basis_id,activity_start,activity_end,confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash)
    select x.id::uuid,x.person_id::uuid,x.polity_id::uuid,x.role_id::uuid,x.period_basis_id::uuid,x.activity_start,x.activity_end,x.confidence,x.chronology_status,x.legacy_source_key,x.notes,x.source_locator,x.content_hash
      from jsonb_to_recordset($1::jsonb) as x(id text,person_id text,polity_id text,role_id text,period_basis_id text,activity_start integer,activity_end integer,confidence text,chronology_status text,legacy_source_key text,notes text,source_locator jsonb,content_hash text)`);
  await insertJson(client, evidence.map((row) => row.source_link), `insert into atlas_v2.person_politics_sources(person_politics_id,source_id,source_locator_key)
    select x.person_politics_id::uuid,x.source_id::uuid,x.source_locator_key from jsonb_to_recordset($1::jsonb) as x(person_politics_id text,source_id text,source_locator_key text)`);
}

const baseline = readJson(baselinePath);
const plan = readJson(planPath);
assert.equal(baseline?.marker, 'ATLAS_CORRECTION_BASELINE_A_V2');
assert.equal(baseline?.deployment_sha, BASELINE_SHA);
assert.equal(baseline?.baseline_digest, BASELINE_DIGEST);
assert.equal(plan?.baseline?.deployment_sha, BASELINE_SHA);
assert.equal(plan?.baseline?.baseline_digest, BASELINE_DIGEST);
assert.equal(plan?.execution_rules?.production_executable, false);
assert.equal(plan?.execution_rules?.production_mutation_authorized, false);
assert.equal(plan.operations.length, 4);

const targetIds = requiredSnapshotActivityIds(plan);
assert.equal(targetIds.length, 4);
const baselineById = new Map(baseline.rows.map((row) => [String(row.activity_id).toLowerCase(), row]));
const targets = targetIds.map((id) => {
  const row = baselineById.get(id);
  assert.ok(row, `P7 target missing from Baseline A ${id}`);
  assert.equal(Number(row.source_count), 1);
  assert.equal(Number(row.chronology_claim_count), 0);
  assert.equal(Number(row.description_count), 0);
  return row;
});
const sourceByTitle = new Map((baseline.catalogs.sources || []).map((row) => [row.title, row]));
const baselineSchema = fs.readFileSync(baselineSchemaPath, 'utf8');

const expectedByActivity = new Map();
for (const operation of plan.operations) {
  if (operation.type === 'rewrite_activity') {
    expectedByActivity.set(operation.after.activity_id, operation.after);
  } else {
    for (const fragment of operation.fragments) expectedByActivity.set(fragment.activity_id, fragment);
  }
}
assert.equal(expectedByActivity.size, 10);

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query('drop schema if exists atlas_v2 cascade');
  await client.query(baselineSchema);
  await seedIdentityCatalogs(client, baseline.catalogs);
  await seedActivities(client, targets, sourceByTitle);

  await applyAuthoringMigrations(client);
  await applyCorrectionMigrations(client);
  const release = await applyStage2SchemaRelease(client);
  assert.equal(release.applied.length, 6);

  const p5 = await applyReviewedEntityAuthoring(client);
  assert.equal(p5.committed, true);
  const p7Sources = await applyReviewedSourceAuthoring(client);
  assert.equal(p7Sources.committed, true);
  assert.equal(p7Sources.replay, false);
  assert.equal(p7Sources.inserted_sources, 6);
  const p7SourcesReplay = await applyReviewedSourceAuthoring(client);
  assert.equal(p7SourcesReplay.replay, true);
  assert.equal(p7SourcesReplay.inserted_sources, 0);

  const snapshot = await createCorrectionV2TargetSnapshot(client, targetIds);
  const manifest = synthesizeCorrectionV2Manifest(plan, snapshot);
  assert.equal(manifest.production_executable, true);
  assert.equal(manifest.operations.length, 4);
  assert.equal(manifest.exact_live_snapshot_digest, snapshot.snapshot_digest);

  const service = createCorrectionManifestV2Service({ client });
  const dry = await service.execute(manifest, { dryRun: true });
  assert.equal(dry.marker, MARKER_V2);
  assert.equal(dry.dry_run, true);
  assert.equal(dry.committed, false);
  const afterDry = await createCorrectionV2TargetSnapshot(client, targetIds);
  assert.equal(afterDry.snapshot_digest, snapshot.snapshot_digest, 'P7 dry-run mutated exact target state');

  const applied = await service.execute(manifest);
  assert.equal(applied.marker, MARKER_V2);
  assert.equal(applied.committed, true);
  assert.equal(applied.replay, false);
  const replay = await service.execute(manifest);
  assert.equal(replay.committed, true);
  assert.equal(replay.replay, true);

  const counts = await client.query(`select
    (select count(*)::int from atlas_v2.person_politics_v2) as activities,
    (select count(*)::int from atlas_v2.person_politics_sources) as activity_sources,
    (select count(*)::int from atlas_v2.person_politics_v2 where legacy_source_key is null) as native_fragments,
    (select count(*)::int from atlas_v2.correction_manifest_runs) as correction_runs`);
  assert.deepEqual(counts.rows[0], { activities: 10, activity_sources: 22, native_fragments: 6, correction_runs: 1 });

  const actualRows = await client.query(`select id::text,relation_type_id::text,activity_start,activity_end,
      activity_start_granularity,activity_start_certainty,activity_end_granularity,activity_end_certainty,
      legacy_source_key,notes
    from atlas_v2.person_politics_v2 order by id::text`);
  assert.equal(actualRows.rowCount, 10);
  for (const row of actualRows.rows) {
    const expected = expectedByActivity.get(row.id);
    assert.ok(expected, `unexpected P7 Activity ${row.id}`);
    assert.equal(row.relation_type_id, expected.relation_type_id);
    assert.equal(row.activity_start, expected.activity_start);
    assert.equal(row.activity_end, expected.activity_end);
    assert.equal(row.notes, expected.reviewed_notes);
    if (expected.survivor === false) assert.equal(row.legacy_source_key, null);
  }

  const confucius = actualRows.rows.filter((row) => [
    'dee419da-a75b-5624-8048-c4fbc422a056',
    '5db5cb8e-9e6d-5851-88b8-311b99a74158',
    'ecf31ce2-ec36-56e3-9c47-017f4c27d23b'
  ].includes(row.id));
  assert.equal(confucius.length, 3);
  for (const row of confucius) {
    assert.ok(row.activity_end < -496 || row.activity_start > -485, `Confucius Lu Activity improperly covers reviewed absence span: ${row.id}`);
  }

  console.log(JSON.stringify({
    marker: 'ATLAS_STAGE2_P7_RELATION_RESOLUTION_REHEARSAL_OK',
    baseline_targets: 4,
    result_activities: 10,
    direct_rewrite: 1,
    split_operations: 3,
    new_stage2_native_fragments: 6,
    normalized_activity_source_links: 22,
    reviewed_notes_exact_postcondition: true,
    confucius_reviewed_lu_absence_preserved: true,
    dry_run_rolled_back: true,
    exact_replay_verified: true,
    production_mutation_authorized: false,
    production_or_vercel_contacted: false
  }, null, 2));
} finally {
  await client.end();
}
