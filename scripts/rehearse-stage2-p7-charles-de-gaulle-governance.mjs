import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import pg from "pg";

const require = createRequire(import.meta.url);
const { Client } = pg;
const { applyAuthoringMigrations } = require("../server/atlas-authoring-migrations.js");
const { applyCorrectionMigrations } = require("../server/atlas-correction-migrations.js");
const { applyStage2SchemaRelease } = require("../server/atlas-stage2-schema-release.js");
const { applyReviewedPolityAuthoring } = require("../server/atlas-stage2-reviewed-polity-authoring.js");
const { applyReviewedSourceAuthoring } = require("../server/atlas-stage2-reviewed-source-authoring.js");
const { applyReviewedGovernanceAuthoring } = require("../server/atlas-stage2-reviewed-governance-authoring.js");
const { createCorrectionV2TargetSnapshot } = require("../server/atlas-correction-v2-snapshot-service.js");
const { synthesizeUnifiedCorrectionV2Manifest } = require("../server/atlas-correction-v2-unified-plan-synthesizer.js");
const { createUnifiedCorrectionManifestV2Service } = require("../server/atlas-correction-manifest-v2-unified-service.js");
const { loadGovernanceBundle } = require("../server/atlas-correction-v2-stage2-assertions.js");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseUrl = String(process.env.DATABASE_URL || "").trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error("DATABASE_URL is required");

const ACTIVITY_ID = "4ac4c38c-6d8b-55ce-b999-b0639e67eb22";
const PERSON_ID = "4e43bb75-d0a5-50b3-afc2-72d9cb42f73a";
const OLD_POLITY_ID = "524642ff-33fb-52f3-8623-e4a877b1997a";
const FRENCH_REPUBLIC_ID = "b138f5e4-ff83-40f6-bdb1-83b08c0256cb";
const GOVERNS_ID = "67a57b37-1853-5f2a-b7ab-e6b2d32b56b6";
const GOVERNANCE_CONTEXT_ID = "078c50b9-4a15-46b4-9181-567cf07ee838";
const GOVERNANCE_PERIOD_ID = "9c3d4f6a-1478-4b10-a15d-893822fbf38c";
const ORIGINAL_SOURCE_ID = "55efaae0-3d24-5462-9d30-bc813ea7de0a";
const START_SOURCE_ID = "c95a0544-44ca-4032-91b9-6d111da0feca";
const END_SOURCE_ID = "9738fe22-93fb-4fc5-9a37-70e93d4edfc8";
const CONSTITUTION_SOURCE_ID = "87dc2d0d-6da4-4d81-b4e5-27e524c66362";

const flatten = (items, key) => items.flatMap((item) => (item.names || []).map((name) => ({ ...name, [key]: item.id })));
async function insertJson(client, rows, sql) { if (rows.length) await client.query(sql, [JSON.stringify(rows)]); }
function parseLegacySourceKey(key) {
  const match = /^(.*):(\d+):([0-9a-f]{16})$/i.exec(String(key || ""));
  if (!match) throw new Error(`P7_DE_GAULLE_LEGACY_SOURCE_KEY_INVALID:${key}`);
  return { file: match[1], index: Number(match[2]), content_hash_prefix: match[3].toLowerCase() };
}

async function seedIdentityCatalogs(client, catalogs) {
  await insertJson(client, catalogs.persons, `insert into atlas_v2.persons(id,canonical_key,person_type,historicity) select x.id::uuid,x.canonical_key,x.person_type,x.historicity from jsonb_to_recordset($1::jsonb) as x(id text,canonical_key text,person_type text,historicity text)`);
  await insertJson(client, flatten(catalogs.persons, "person_id"), `insert into atlas_v2.person_names(id,person_id,locale,name,name_type,is_preferred) select x.id::uuid,x.person_id::uuid,x.locale,x.name,x.name_type,x.is_preferred from jsonb_to_recordset($1::jsonb) as x(id text,person_id text,locale text,name text,name_type text,is_preferred boolean)`);
  await insertJson(client, catalogs.polities, `insert into atlas_v2.polities(id,canonical_key,polity_type,historicity) select x.id::uuid,x.canonical_key,x.polity_type,x.historicity from jsonb_to_recordset($1::jsonb) as x(id text,canonical_key text,polity_type text,historicity text)`);
  await insertJson(client, flatten(catalogs.polities, "polity_id"), `insert into atlas_v2.polity_names(id,polity_id,locale,name,name_type,is_preferred) select x.id::uuid,x.polity_id::uuid,x.locale,x.name,x.name_type,x.is_preferred from jsonb_to_recordset($1::jsonb) as x(id text,polity_id text,locale text,name text,name_type text,is_preferred boolean)`);
  await insertJson(client, catalogs.roles, `insert into atlas_v2.roles(id,code,category,source_label,is_active) select x.id::uuid,x.code,x.category,x.source_label,x.is_active from jsonb_to_recordset($1::jsonb) as x(id text,code text,category text,source_label text,is_active boolean)`);
  await insertJson(client, flatten(catalogs.roles, "role_id"), `insert into atlas_v2.role_names(id,role_id,locale,name,is_preferred) select x.id::uuid,x.role_id::uuid,x.locale,x.name,x.is_preferred from jsonb_to_recordset($1::jsonb) as x(id text,role_id text,locale text,name text,is_preferred boolean)`);
  await insertJson(client, catalogs.period_bases, `insert into atlas_v2.period_bases(id,code,is_active) select x.id::uuid,x.code,x.is_active from jsonb_to_recordset($1::jsonb) as x(id text,code text,is_active boolean)`);
  await insertJson(client, flatten(catalogs.period_bases, "period_basis_id"), `insert into atlas_v2.period_basis_names(id,period_basis_id,locale,name,is_preferred) select x.id::uuid,x.period_basis_id::uuid,x.locale,x.name,x.is_preferred from jsonb_to_recordset($1::jsonb) as x(id text,period_basis_id text,locale text,name text,is_preferred boolean)`);
  await insertJson(client, catalogs.sources, `insert into atlas_v2.sources(id,source_key,source_type,title,sha256,bytes) select x.id::uuid,x.source_key,x.source_type,x.title,x.sha256,x.bytes from jsonb_to_recordset($1::jsonb) as x(id text,source_key text,source_type text,title text,sha256 text,bytes integer)`);
}

async function seedBaselineActivity(client, baseline, row) {
  const parsed = parseLegacySourceKey(row.legacy_source_key);
  const source = (baseline.catalogs.sources || []).find((item) => item.title === parsed.file);
  assert.ok(source, `Baseline A source file unresolved: ${parsed.file}`);
  assert.equal(String(source.id).toLowerCase(), ORIGINAL_SOURCE_ID);
  await insertJson(client, [{ id:row.activity_id,person_id:row.person_id,polity_id:row.polity_id,role_id:row.role_id,period_basis_id:row.period_basis_id,activity_start:row.activity_start,activity_end:row.activity_end,confidence:row.confidence,chronology_status:row.chronology_status,legacy_source_key:row.legacy_source_key,notes:row.notes,source_locator:{file:parsed.file,index:parsed.index,source_sha256:source.sha256},content_hash:parsed.content_hash_prefix }], `insert into atlas_v2.person_politics_v2(id,person_id,polity_id,role_id,period_basis_id,activity_start,activity_end,confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash) select x.id::uuid,x.person_id::uuid,x.polity_id::uuid,x.role_id::uuid,x.period_basis_id::uuid,x.activity_start,x.activity_end,x.confidence,x.chronology_status,x.legacy_source_key,x.notes,x.source_locator,x.content_hash from jsonb_to_recordset($1::jsonb) as x(id text,person_id text,polity_id text,role_id text,period_basis_id text,activity_start integer,activity_end integer,confidence text,chronology_status text,legacy_source_key text,notes text,source_locator jsonb,content_hash text)`);
  await client.query(`insert into atlas_v2.person_politics_sources(person_politics_id,source_id,source_locator_key) values($1::uuid,$2::uuid,$3)`, [row.activity_id,source.id,`${parsed.file}:${parsed.index}`]);
}

async function activityState(client) {
  const a = await client.query(`select id::text,person_id::text,polity_id::text,relation_type_id::text,role_id::text,period_basis_id::text,activity_start,activity_start_month,activity_start_day,activity_start_granularity,activity_start_certainty,activity_start_calendar,activity_end,activity_end_month,activity_end_day,activity_end_granularity,activity_end_certainty,activity_end_calendar,confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash from atlas_v2.person_politics_v2 where id=$1::uuid`, [ACTIVITY_ID]);
  const s = await client.query(`select person_politics_id::text,source_id::text,source_locator_key from atlas_v2.person_politics_sources where person_politics_id=$1::uuid order by source_id::text,source_locator_key`, [ACTIVITY_ID]);
  return { activity:a.rows[0]||null, sources:s.rows.map((r)=>({person_politics_id:String(r.person_politics_id).toLowerCase(),source_id:String(r.source_id).toLowerCase(),source_locator_key:r.source_locator_key})) };
}

const baseline = JSON.parse(fs.readFileSync(path.resolve(root, process.env.ATLAS_BASELINE_A_PATH || "artifacts/baseline-a-source.json"), "utf8"));
const plan = JSON.parse(fs.readFileSync(path.join(root,"stage2/execution/p7-charles-de-gaulle-fifth-republic-governance-execution.v1.json"),"utf8"));
const schema = fs.readFileSync(path.join(root,"db/schema/atlas_v2.current.sql"),"utf8");
const row = baseline.rows.find((item)=>String(item.activity_id).toLowerCase()===ACTIVITY_ID);
assert.ok(row);
assert.equal(row.person_id,PERSON_ID);assert.equal(row.polity_id,OLD_POLITY_ID);assert.equal(row.activity_start,1959);assert.equal(row.activity_end,1969);assert.equal(Number(row.source_count),1);

const client = new Client({connectionString:databaseUrl});await client.connect();
try {
  await client.query("drop schema if exists atlas_v2 cascade");await client.query(schema);await seedIdentityCatalogs(client,baseline.catalogs);await seedBaselineActivity(client,baseline,row);await applyAuthoringMigrations(client);await applyCorrectionMigrations(client);const release=await applyStage2SchemaRelease(client);assert.equal(release.applied.length,6);
  const polityPath=path.join(root,"stage2/authoring/p7-charles-de-gaulle-polity.v1.json");const p1=await applyReviewedPolityAuthoring(client,{manifestPath:polityPath});assert.deepEqual(p1.inserted,{polities:1,polity_names:3});assert.equal(p1.replay,false);const p2=await applyReviewedPolityAuthoring(client,{manifestPath:polityPath});assert.deepEqual(p2.inserted,{polities:0,polity_names:0});assert.equal(p2.replay,true);
  const sourcePath=path.join(root,"stage2/authoring/p7-charles-de-gaulle-sources.v1.json");const s1=await applyReviewedSourceAuthoring(client,{manifestPath:sourcePath});assert.equal(s1.inserted_sources,3);assert.equal((await applyReviewedSourceAuthoring(client,{manifestPath:sourcePath})).replay,true);
  const governancePath=path.join(root,"stage2/authoring/p7-charles-de-gaulle-governance-context.v1.json");const g1=await applyReviewedGovernanceAuthoring(client,{manifestPath:governancePath});assert.deepEqual(g1.inserted,{governance_contexts:1,governance_context_names:3});assert.equal((await applyReviewedGovernanceAuthoring(client,{manifestPath:governancePath})).replay,true);
  const snapshot=await createCorrectionV2TargetSnapshot(client,[ACTIVITY_ID]);const manifest=synthesizeUnifiedCorrectionV2Manifest(plan,snapshot);assert.deepEqual(manifest.operations.map((op)=>op.type),["rewrite_activity","assert_governance_period"]);const service=createUnifiedCorrectionManifestV2Service({client});
  const before=await activityState(client);const dry=await service.execute(manifest,{dryRun:true});assert.equal(dry.replay,false);assert.deepEqual(await activityState(client),before);assert.equal(await loadGovernanceBundle(client,GOVERNANCE_PERIOD_ID),null);
  const applied=await service.execute(manifest);assert.equal(applied.replay,false);const after=await activityState(client);assert.equal(after.activity.id,ACTIVITY_ID);assert.equal(after.activity.polity_id,FRENCH_REPUBLIC_ID);assert.equal(after.activity.relation_type_id,GOVERNS_ID);assert.equal(after.activity.activity_start,1959);assert.equal(after.activity.activity_start_month,1);assert.equal(after.activity.activity_start_day,8);assert.equal(after.activity.activity_start_granularity,"day");assert.equal(after.activity.activity_end,1969);assert.equal(after.activity.activity_end_month,4);assert.equal(after.activity.activity_end_day,28);assert.equal(after.activity.activity_end_granularity,"day");assert.equal(after.sources.length,3);assert.deepEqual(new Set(after.sources.map((x)=>x.source_id)),new Set([ORIGINAL_SOURCE_ID,START_SOURCE_ID,END_SOURCE_ID]));
  const gb=await loadGovernanceBundle(client,GOVERNANCE_PERIOD_ID);assert.ok(gb);assert.equal(gb.period.polity_id,FRENCH_REPUBLIC_ID);assert.equal(gb.period.governance_context_id,GOVERNANCE_CONTEXT_ID);assert.equal(gb.period.valid_from_year,1958);assert.equal(gb.period.valid_from_month,10);assert.equal(gb.period.valid_from_day,4);assert.equal(gb.period.valid_to_year,null);assert.equal(gb.source_links.length,1);assert.equal(gb.source_links[0].source_id,CONSTITUTION_SOURCE_ID);
  const old=await client.query(`select id::text from atlas_v2.polities where id=$1::uuid`,[OLD_POLITY_ID]);assert.equal(old.rowCount,1);
  const replay=await service.execute(manifest);assert.equal(replay.replay,true);assert.deepEqual(await activityState(client),after);assert.deepEqual(await loadGovernanceBundle(client,GOVERNANCE_PERIOD_ID),gb);
  console.log(JSON.stringify({marker:"ATLAS_STAGE2_P7_CHARLES_DE_GAULLE_GOVERNANCE_REHEARSAL_OK",activity_id:ACTIVITY_ID,relinked_polity_id:FRENCH_REPUBLIC_ID,governance_context_id:GOVERNANCE_CONTEXT_ID,term:"1959-01-08/1969-04-28",activity_source_links:after.sources.length,governance_source_links:gb.source_links.length,dry_run_apply_replay_verified:true,production_mutation_authorized:false,production_or_vercel_contacted:false},null,2));
} finally { await client.end(); }
