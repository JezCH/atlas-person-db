import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import pg from 'pg';

const require = createRequire(import.meta.url);
const { Client } = pg;
const { applyAuthoringMigrations } = require('../server/atlas-authoring-migrations.js');
const { applyCorrectionMigrations } = require('../server/atlas-correction-migrations.js');
const { applyStage2SchemaRelease } = require('../server/atlas-stage2-schema-release.js');
const { applyReviewedSourceAuthoring } = require('../server/atlas-stage2-reviewed-source-authoring.js');
const { createCorrectionV2TargetSnapshot } = require('../server/atlas-correction-v2-snapshot-service.js');
const { requiredSnapshotActivityIds, synthesizeCorrectionV2Manifest } = require('../server/atlas-correction-v2-manifest-synthesizer.js');
const { MARKER_V2, createCorrectionManifestV2Service } = require('../server/atlas-correction-manifest-v2-service.js');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required');
const baseline = JSON.parse(fs.readFileSync(path.resolve(root, process.env.ATLAS_BASELINE_A_PATH || 'artifacts/baseline-a-source.json'), 'utf8'));
const plan = JSON.parse(fs.readFileSync(path.resolve(root, 'stage2/execution/p7-broad-politic-relation-execution.v1.json'), 'utf8'));
const sourceManifestPath = path.resolve(root, 'stage2/authoring/p7-broad-politic-sources.v1.json');
const schema = fs.readFileSync(path.resolve(root, 'db/schema/atlas_v2.current.sql'), 'utf8');
const ACTIVE_IN = 'f33d2789-2e65-50c1-af3e-91335bcbd3ca';
const flatten = (items, key) => items.flatMap((item) => (item.names || []).map((name) => ({ ...name, [key]: item.id })));
async function insertJson(client, rows, sql) { if (rows.length) await client.query(sql, [JSON.stringify(rows)]); }
function parseLegacy(key) { const m = /^(.*):(\d+):([0-9a-f]{16})$/i.exec(String(key || '')); if (!m) throw new Error(`P7_BROAD_LEGACY_KEY_INVALID:${key}`); return { file:m[1], index:Number(m[2]), hash:m[3].toLowerCase() }; }

async function seedCatalogs(client, c) {
  await insertJson(client,c.persons,`insert into atlas_v2.persons(id,canonical_key,person_type,historicity) select x.id::uuid,x.canonical_key,x.person_type,x.historicity from jsonb_to_recordset($1::jsonb) as x(id text,canonical_key text,person_type text,historicity text)`);
  await insertJson(client,flatten(c.persons,'person_id'),`insert into atlas_v2.person_names(id,person_id,locale,name,name_type,is_preferred) select x.id::uuid,x.person_id::uuid,x.locale,x.name,x.name_type,x.is_preferred from jsonb_to_recordset($1::jsonb) as x(id text,person_id text,locale text,name text,name_type text,is_preferred boolean)`);
  await insertJson(client,c.polities,`insert into atlas_v2.polities(id,canonical_key,polity_type,historicity) select x.id::uuid,x.canonical_key,x.polity_type,x.historicity from jsonb_to_recordset($1::jsonb) as x(id text,canonical_key text,polity_type text,historicity text)`);
  await insertJson(client,flatten(c.polities,'polity_id'),`insert into atlas_v2.polity_names(id,polity_id,locale,name,name_type,is_preferred) select x.id::uuid,x.polity_id::uuid,x.locale,x.name,x.name_type,x.is_preferred from jsonb_to_recordset($1::jsonb) as x(id text,polity_id text,locale text,name text,name_type text,is_preferred boolean)`);
  await insertJson(client,c.roles,`insert into atlas_v2.roles(id,code,category,source_label,is_active) select x.id::uuid,x.code,x.category,x.source_label,x.is_active from jsonb_to_recordset($1::jsonb) as x(id text,code text,category text,source_label text,is_active boolean)`);
  await insertJson(client,flatten(c.roles,'role_id'),`insert into atlas_v2.role_names(id,role_id,locale,name,is_preferred) select x.id::uuid,x.role_id::uuid,x.locale,x.name,x.is_preferred from jsonb_to_recordset($1::jsonb) as x(id text,role_id text,locale text,name text,is_preferred boolean)`);
  await insertJson(client,c.period_bases,`insert into atlas_v2.period_bases(id,code,is_active) select x.id::uuid,x.code,x.is_active from jsonb_to_recordset($1::jsonb) as x(id text,code text,is_active boolean)`);
  await insertJson(client,flatten(c.period_bases,'period_basis_id'),`insert into atlas_v2.period_basis_names(id,period_basis_id,locale,name,is_preferred) select x.id::uuid,x.period_basis_id::uuid,x.locale,x.name,x.is_preferred from jsonb_to_recordset($1::jsonb) as x(id text,period_basis_id text,locale text,name text,is_preferred boolean)`);
  await insertJson(client,c.sources,`insert into atlas_v2.sources(id,source_key,source_type,title,sha256,bytes) select x.id::uuid,x.source_key,x.source_type,x.title,x.sha256,x.bytes from jsonb_to_recordset($1::jsonb) as x(id text,source_key text,source_type text,title text,sha256 text,bytes integer)`);
}

async function seedActivities(client, targets) {
  const sourceByTitle = new Map(baseline.catalogs.sources.map((row) => [row.title, row]));
  const activities = [], links = [];
  for (const row of targets) {
    const parsed = parseLegacy(row.legacy_source_key), source = sourceByTitle.get(parsed.file);
    assert.ok(source, `legacy Source missing ${parsed.file}`);
    activities.push({id:row.activity_id,person_id:row.person_id,polity_id:row.polity_id,role_id:row.role_id,period_basis_id:row.period_basis_id,activity_start:row.activity_start,activity_end:row.activity_end,confidence:row.confidence,chronology_status:row.chronology_status,legacy_source_key:row.legacy_source_key,notes:row.notes,source_locator:{file:parsed.file,index:parsed.index,source_sha256:source.sha256},content_hash:parsed.hash});
    links.push({person_politics_id:row.activity_id,source_id:source.id,source_locator_key:`${parsed.file}:${parsed.index}`});
  }
  await insertJson(client,activities,`insert into atlas_v2.person_politics_v2(id,person_id,polity_id,role_id,period_basis_id,activity_start,activity_end,confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash) select x.id::uuid,x.person_id::uuid,x.polity_id::uuid,x.role_id::uuid,x.period_basis_id::uuid,x.activity_start,x.activity_end,x.confidence,x.chronology_status,x.legacy_source_key,x.notes,x.source_locator,x.content_hash from jsonb_to_recordset($1::jsonb) as x(id text,person_id text,polity_id text,role_id text,period_basis_id text,activity_start integer,activity_end integer,confidence text,chronology_status text,legacy_source_key text,notes text,source_locator jsonb,content_hash text)`);
  await insertJson(client,links,`insert into atlas_v2.person_politics_sources(person_politics_id,source_id,source_locator_key) select x.person_politics_id::uuid,x.source_id::uuid,x.source_locator_key from jsonb_to_recordset($1::jsonb) as x(person_politics_id text,source_id text,source_locator_key text)`);
}

assert.equal(plan.operations.length, 2);
assert.equal(plan.execution_rules.production_executable, false);
assert.equal(plan.execution_rules.production_mutation_authorized, false);
const ids = requiredSnapshotActivityIds(plan);
assert.equal(ids.length, 2);
const byId = new Map(baseline.rows.map((row) => [String(row.activity_id).toLowerCase(), row]));
const targets = ids.map((id) => { const row = byId.get(id); assert.ok(row, `P7 broad target missing ${id}`); assert.equal(Number(row.source_count),1); assert.equal(Number(row.chronology_claim_count),0); assert.equal(Number(row.description_count),0); return row; });
const expectedNotes = new Map(targets.map((row) => [String(row.activity_id).toLowerCase(), row.notes]));
const reviewedSourceIds = new Set(plan.operations.map((op) => op.after.add_source_links[0].source_id));
assert.equal(reviewedSourceIds.size, 2);

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query('drop schema if exists atlas_v2 cascade');
  await client.query(schema);
  await seedCatalogs(client, baseline.catalogs);
  await seedActivities(client, targets);
  await applyAuthoringMigrations(client);
  await applyCorrectionMigrations(client);
  assert.equal((await applyStage2SchemaRelease(client)).applied.length, 6);
  const sourceAuthoring = await applyReviewedSourceAuthoring(client, { manifestPath: sourceManifestPath });
  assert.equal(sourceAuthoring.inserted_sources, 2);
  assert.equal(sourceAuthoring.replay, false);
  const sourceReplay = await applyReviewedSourceAuthoring(client, { manifestPath: sourceManifestPath });
  assert.equal(sourceReplay.inserted_sources, 0);
  assert.equal(sourceReplay.replay, true);

  const snapshot = await createCorrectionV2TargetSnapshot(client, ids);
  const manifest = synthesizeCorrectionV2Manifest(plan, snapshot);
  const service = createCorrectionManifestV2Service({ client });
  const dry = await service.execute(manifest, { dryRun:true });
  assert.equal(dry.marker, MARKER_V2);
  assert.equal(dry.committed, false);
  assert.equal((await createCorrectionV2TargetSnapshot(client, ids)).snapshot_digest, snapshot.snapshot_digest);
  const applied = await service.execute(manifest);
  assert.equal(applied.committed, true);
  assert.equal(applied.replay, false);
  const replay = await service.execute(manifest);
  assert.equal(replay.committed, true);
  assert.equal(replay.replay, true);

  const rows = await client.query(`select id::text,relation_type_id::text,activity_start,activity_end,notes from atlas_v2.person_politics_v2 order by id::text`);
  assert.equal(rows.rowCount, 2);
  for (const row of rows.rows) {
    const base = byId.get(row.id);
    assert.equal(row.relation_type_id, ACTIVE_IN);
    assert.equal(row.activity_start, base.activity_start);
    assert.equal(row.activity_end, base.activity_end);
    assert.equal(row.notes, expectedNotes.get(row.id));
  }
  const sourceLinks = await client.query(`select person_politics_id::text,source_id::text from atlas_v2.person_politics_sources order by person_politics_id::text,source_id::text`);
  assert.equal(sourceLinks.rowCount, 4);
  for (const id of ids) {
    const per = sourceLinks.rows.filter((row) => row.person_politics_id === id);
    assert.equal(per.length, 2);
    assert.equal(per.filter((row) => reviewedSourceIds.has(row.source_id)).length, 1);
  }
  console.log(JSON.stringify({marker:'ATLAS_STAGE2_P7_BROAD_POLITIC_REHEARSAL_OK',activities:2,relation:'active_in',existing_source_links_preserved:2,reviewed_source_links_added:2,periods_and_notes_unchanged:true,dry_run_apply_replay_verified:true,superseded_micro_polity_execution_forbidden:true,production_mutation_authorized:false,production_or_vercel_contacted:false},null,2));
} finally {
  await client.end();
}
