import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import pg from 'pg';

const require = createRequire(import.meta.url);
const { Client } = pg;
const { applyAuthoringMigrations } = require('../../server/atlas-authoring-migrations.js');
const { applyCorrectionMigrations } = require('../../server/atlas-correction-migrations.js');
const { applyStage2SchemaRelease } = require('../../server/atlas-stage2-schema-release.js');
const { applyReviewedSourceAuthoring } = require('../../server/atlas-stage2-reviewed-source-authoring.js');
const { createCorrectionV2TargetSnapshot } = require('../../server/atlas-correction-v2-snapshot-service.js');
const { requiredSnapshotActivityIds, synthesizeCorrectionV2Manifest } = require('../../server/atlas-correction-v2-manifest-synthesizer.js');
const { MARKER_V2, createCorrectionManifestV2Service } = require('../../server/atlas-correction-manifest-v2-service.js');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const flatten = (items, key) => items.flatMap((item) => (item.names || []).map((name) => ({ ...name, [key]: item.id })));
const ACTIVITY_SELECT = `select id::text,person_id::text,polity_id::text,relation_type_id::text,role_id::text,period_basis_id::text,
  activity_start,activity_start_month,activity_start_day,activity_start_granularity,activity_start_certainty,activity_start_calendar,
  activity_end,activity_end_month,activity_end_day,activity_end_granularity,activity_end_certainty,activity_end_calendar,
  confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash
  from atlas_v2.person_politics_v2 where id = any($1::uuid[]) order by activity_start,activity_start_month nulls first,activity_start_day nulls first,id`;

async function insertJson(client, rows, sql) {
  if (rows.length) await client.query(sql, [JSON.stringify(rows)]);
}

function parseLegacySourceKey(key) {
  const match = /^(.*):(\d+):([0-9a-f]{16})$/i.exec(String(key || ''));
  if (!match) throw new Error(`P7_SPLIT_LEGACY_SOURCE_KEY_INVALID:${key}`);
  return { file: match[1], index: Number(match[2]), content_hash_prefix: match[3].toLowerCase() };
}

async function seedIdentityCatalogs(client, catalogs) {
  await insertJson(client, catalogs.persons, `insert into atlas_v2.persons(id,canonical_key,person_type,historicity) select x.id::uuid,x.canonical_key,x.person_type,x.historicity from jsonb_to_recordset($1::jsonb) as x(id text,canonical_key text,person_type text,historicity text)`);
  await insertJson(client, flatten(catalogs.persons, 'person_id'), `insert into atlas_v2.person_names(id,person_id,locale,name,name_type,is_preferred) select x.id::uuid,x.person_id::uuid,x.locale,x.name,x.name_type,x.is_preferred from jsonb_to_recordset($1::jsonb) as x(id text,person_id text,locale text,name text,name_type text,is_preferred boolean)`);
  await insertJson(client, catalogs.polities, `insert into atlas_v2.polities(id,canonical_key,polity_type,historicity) select x.id::uuid,x.canonical_key,x.polity_type,x.historicity from jsonb_to_recordset($1::jsonb) as x(id text,canonical_key text,polity_type text,historicity text)`);
  await insertJson(client, flatten(catalogs.polities, 'polity_id'), `insert into atlas_v2.polity_names(id,polity_id,locale,name,name_type,is_preferred) select x.id::uuid,x.polity_id::uuid,x.locale,x.name,x.name_type,x.is_preferred from jsonb_to_recordset($1::jsonb) as x(id text,polity_id text,locale text,name text,name_type text,is_preferred boolean)`);
  await insertJson(client, catalogs.roles, `insert into atlas_v2.roles(id,code,category,source_label,is_active) select x.id::uuid,x.code,x.category,x.source_label,x.is_active from jsonb_to_recordset($1::jsonb) as x(id text,code text,category text,source_label text,is_active boolean)`);
  await insertJson(client, flatten(catalogs.roles, 'role_id'), `insert into atlas_v2.role_names(id,role_id,locale,name,is_preferred) select x.id::uuid,x.role_id::uuid,x.locale,x.name,x.is_preferred from jsonb_to_recordset($1::jsonb) as x(id text,role_id text,locale text,name text,is_preferred boolean)`);
  await insertJson(client, catalogs.period_bases, `insert into atlas_v2.period_bases(id,code,is_active) select x.id::uuid,x.code,x.is_active from jsonb_to_recordset($1::jsonb) as x(id text,code text,is_active boolean)`);
  await insertJson(client, flatten(catalogs.period_bases, 'period_basis_id'), `insert into atlas_v2.period_basis_names(id,period_basis_id,locale,name,is_preferred) select x.id::uuid,x.period_basis_id::uuid,x.locale,x.name,x.is_preferred from jsonb_to_recordset($1::jsonb) as x(id text,period_basis_id text,locale text,name text,is_preferred boolean)`);
  await insertJson(client, catalogs.sources, `insert into atlas_v2.sources(id,source_key,source_type,title,sha256,bytes) select x.id::uuid,x.source_key,x.source_type,x.title,x.sha256,x.bytes from jsonb_to_recordset($1::jsonb) as x(id text,source_key text,source_type text,title text,sha256 text,bytes integer)`);
}

async function seedBaselineActivity(client, baseline, row) {
  const parsed = parseLegacySourceKey(row.legacy_source_key);
  const source = (baseline.catalogs.sources || []).find((item) => item.title === parsed.file);
  assert.ok(source, `Baseline A source file unresolved: ${parsed.file}`);
  await insertJson(client, [{
    id: row.activity_id, person_id: row.person_id, polity_id: row.polity_id, role_id: row.role_id, period_basis_id: row.period_basis_id,
    activity_start: row.activity_start, activity_end: row.activity_end, confidence: row.confidence, chronology_status: row.chronology_status,
    legacy_source_key: row.legacy_source_key, notes: row.notes,
    source_locator: { file: parsed.file, index: parsed.index, source_sha256: source.sha256 }, content_hash: parsed.content_hash_prefix
  }], `insert into atlas_v2.person_politics_v2(id,person_id,polity_id,role_id,period_basis_id,activity_start,activity_end,confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash)
    select x.id::uuid,x.person_id::uuid,x.polity_id::uuid,x.role_id::uuid,x.period_basis_id::uuid,x.activity_start,x.activity_end,x.confidence,x.chronology_status,x.legacy_source_key,x.notes,x.source_locator,x.content_hash
    from jsonb_to_recordset($1::jsonb) as x(id text,person_id text,polity_id text,role_id text,period_basis_id text,activity_start integer,activity_end integer,confidence text,chronology_status text,legacy_source_key text,notes text,source_locator jsonb,content_hash text)`);
  await client.query(`insert into atlas_v2.person_politics_sources(person_politics_id,source_id,source_locator_key) values($1::uuid,$2::uuid,$3)`, [row.activity_id, source.id, `${parsed.file}:${parsed.index}`]);
}

function assertPlanMatchesBaseline(operation, row) {
  for (const field of ['person_id','polity_id','role_id','period_basis_id','activity_start','activity_end','confidence','chronology_status','legacy_source_key']) {
    assert.equal(operation.baseline_before[field], row[field], `plan baseline drift ${field}`);
  }
  assert.equal(Number(operation.baseline_before.source_count), Number(row.source_count), 'plan baseline source_count drift');
}

export async function rehearseP7Split({ planPath, sourceManifestPath, marker, verifyAfter }) {
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required');
  const baselinePath = path.resolve(root, process.env.ATLAS_BASELINE_A_PATH || 'artifacts/baseline-a-source.json');
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const plan = JSON.parse(fs.readFileSync(path.resolve(root, planPath), 'utf8'));
  const sourceManifest = JSON.parse(fs.readFileSync(path.resolve(root, sourceManifestPath), 'utf8'));
  const schema = fs.readFileSync(path.resolve(root, 'db/schema/atlas_v2.current.sql'), 'utf8');
  assert.equal(plan.operations.length, 1, 'generic split rehearsal requires exactly one operation');
  const operation = plan.operations[0];
  assert.equal(operation.type, 'split_activity');
  assert.equal(plan.execution_rules.production_executable, false);
  assert.equal(plan.execution_rules.production_mutation_authorized, false);
  assert.ok(Array.isArray(operation.fragments) && operation.fragments.length >= 2, 'split requires at least two fragments');
  assert.equal(operation.fragments.filter((fragment) => fragment.survivor === true).length, 1, 'split requires exactly one survivor');
  assert.equal(operation.fragments.some((fragment) => fragment.survivor === true && fragment.activity_id === operation.activity_id), true, 'survivor must preserve original Activity UUID');
  const fragmentIds = operation.fragments.map((fragment) => fragment.activity_id);
  assert.equal(new Set(fragmentIds).size, fragmentIds.length, 'split fragment UUIDs must be unique');
  for (const fragment of operation.fragments.filter((item) => !item.survivor)) assert.equal(fragment.legacy_source_key, null, 'new Stage 2 fragment must not fabricate legacy_source_key');
  const ids = requiredSnapshotActivityIds(plan);
  assert.deepEqual(ids, [operation.activity_id]);
  const row = baseline.rows.find((item) => String(item.activity_id).toLowerCase() === operation.activity_id);
  assert.ok(row, `Baseline A activity missing: ${operation.activity_id}`);
  assert.equal(Number(row.source_count), 1);
  assert.equal(Number(row.chronology_claim_count), 0);
  assert.equal(Number(row.description_count), 0);
  assertPlanMatchesBaseline(operation, row);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query('drop schema if exists atlas_v2 cascade');
    await client.query(schema);
    await seedIdentityCatalogs(client, baseline.catalogs);
    await seedBaselineActivity(client, baseline, row);
    await applyAuthoringMigrations(client);
    await applyCorrectionMigrations(client);
    assert.equal((await applyStage2SchemaRelease(client)).applied.length, 6);
    const authored = await applyReviewedSourceAuthoring(client, { manifestPath: path.resolve(root, sourceManifestPath) });
    assert.equal(authored.replay, false);
    assert.equal(authored.inserted_sources, Number(sourceManifest?.result?.source_count || 0));
    const authoredReplay = await applyReviewedSourceAuthoring(client, { manifestPath: path.resolve(root, sourceManifestPath) });
    assert.equal(authoredReplay.inserted_sources, 0);
    assert.equal(authoredReplay.replay, true);

    const snapshot = await createCorrectionV2TargetSnapshot(client, ids);
    const manifest = synthesizeCorrectionV2Manifest(plan, snapshot);
    const service = createCorrectionManifestV2Service({ client });
    const dry = await service.execute(manifest, { dryRun: true });
    assert.equal(dry.marker, MARKER_V2);
    assert.equal(dry.committed, false);
    assert.equal((await createCorrectionV2TargetSnapshot(client, ids)).snapshot_digest, snapshot.snapshot_digest);
    const applied = await service.execute(manifest);
    assert.equal(applied.committed, true);
    assert.equal(applied.replay, false);
    const replay = await service.execute(manifest);
    assert.equal(replay.committed, true);
    assert.equal(replay.replay, true);

    const actualRows = (await client.query(ACTIVITY_SELECT, [fragmentIds])).rows;
    assert.equal(actualRows.length, fragmentIds.length);
    const sourceLinks = (await client.query(`select person_politics_id::text,source_id::text,source_locator_key from atlas_v2.person_politics_sources where person_politics_id = any($1::uuid[]) order by person_politics_id::text,source_id::text,source_locator_key`, [fragmentIds])).rows;
    if (verifyAfter) await verifyAfter({ actualRows, sourceLinks, baselineRow: row, operation, plan, client });
    const result = { marker, source_activity_id: operation.activity_id, fragment_activity_ids: fragmentIds, dry_run_apply_replay_verified: true, production_mutation_authorized: false, production_or_vercel_contacted: false };
    console.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    await client.end();
  }
}
