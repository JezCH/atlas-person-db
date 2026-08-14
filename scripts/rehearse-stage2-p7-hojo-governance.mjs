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
const { applyReviewedSourceAuthoring } = require("../server/atlas-stage2-reviewed-source-authoring.js");
const { applyReviewedGovernanceAuthoring } = require("../server/atlas-stage2-reviewed-governance-authoring.js");
const { createCorrectionV2TargetSnapshot } = require("../server/atlas-correction-v2-snapshot-service.js");
const { synthesizeUnifiedCorrectionV2Manifest } = require("../server/atlas-correction-v2-unified-plan-synthesizer.js");
const { createUnifiedCorrectionManifestV2Service } = require("../server/atlas-correction-manifest-v2-unified-service.js");
const { loadGovernanceBundle } = require("../server/atlas-correction-v2-stage2-assertions.js");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseUrl = String(process.env.DATABASE_URL || "").trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error("DATABASE_URL is required");

const ACTIVITY_ID = "f5ea0e7c-1886-56f8-b4cc-b1ceba9dd1dd";
const JAPAN_ID = "e029b047-544a-52c7-8897-4e494ac72af4";
const KAMAKURA_POLITY_ID = "53943675-7711-5053-9f2e-f149f727aa54";
const GOVERNANCE_CONTEXT_ID = "56c8f804-2962-4a5b-90ed-a4913043d0e7";
const GOVERNANCE_PERIOD_ID = "366e7a25-7262-432b-9030-f4300f9a68b8";
const MASS_SOURCE_ID = "e20a8f0f-ef96-4b86-8b73-751bd3e3c207";
const ORIGINAL_SOURCE_ID = "7f21dc19-2215-57ca-ad50-aab379abf450";
const GOVERNS_ID = "67a57b37-1853-5f2a-b7ab-e6b2d32b56b6";

const flatten = (items, key) => items.flatMap((item) => (item.names || []).map((name) => ({ ...name, [key]: item.id })));

async function insertJson(client, rows, sql) {
  if (rows.length) await client.query(sql, [JSON.stringify(rows)]);
}

function parseLegacySourceKey(key) {
  const match = /^(.*):(\d+):([0-9a-f]{16})$/i.exec(String(key || ""));
  if (!match) throw new Error(`P7_HOJO_LEGACY_SOURCE_KEY_INVALID:${key}`);
  return { file: match[1], index: Number(match[2]), content_hash_prefix: match[3].toLowerCase() };
}

async function seedIdentityCatalogs(client, catalogs) {
  await insertJson(client, catalogs.persons, `insert into atlas_v2.persons(id,canonical_key,person_type,historicity)
    select x.id::uuid,x.canonical_key,x.person_type,x.historicity from jsonb_to_recordset($1::jsonb) as x(id text,canonical_key text,person_type text,historicity text)`);
  await insertJson(client, flatten(catalogs.persons, "person_id"), `insert into atlas_v2.person_names(id,person_id,locale,name,name_type,is_preferred)
    select x.id::uuid,x.person_id::uuid,x.locale,x.name,x.name_type,x.is_preferred from jsonb_to_recordset($1::jsonb) as x(id text,person_id text,locale text,name text,name_type text,is_preferred boolean)`);
  await insertJson(client, catalogs.polities, `insert into atlas_v2.polities(id,canonical_key,polity_type,historicity)
    select x.id::uuid,x.canonical_key,x.polity_type,x.historicity from jsonb_to_recordset($1::jsonb) as x(id text,canonical_key text,polity_type text,historicity text)`);
  await insertJson(client, flatten(catalogs.polities, "polity_id"), `insert into atlas_v2.polity_names(id,polity_id,locale,name,name_type,is_preferred)
    select x.id::uuid,x.polity_id::uuid,x.locale,x.name,x.name_type,x.is_preferred from jsonb_to_recordset($1::jsonb) as x(id text,polity_id text,locale text,name text,name_type text,is_preferred boolean)`);
  await insertJson(client, catalogs.roles, `insert into atlas_v2.roles(id,code,category,source_label,is_active)
    select x.id::uuid,x.code,x.category,x.source_label,x.is_active from jsonb_to_recordset($1::jsonb) as x(id text,code text,category text,source_label text,is_active boolean)`);
  await insertJson(client, flatten(catalogs.roles, "role_id"), `insert into atlas_v2.role_names(id,role_id,locale,name,is_preferred)
    select x.id::uuid,x.role_id::uuid,x.locale,x.name,x.is_preferred from jsonb_to_recordset($1::jsonb) as x(id text,role_id text,locale text,name text,is_preferred boolean)`);
  await insertJson(client, catalogs.period_bases, `insert into atlas_v2.period_bases(id,code,is_active)
    select x.id::uuid,x.code,x.is_active from jsonb_to_recordset($1::jsonb) as x(id text,code text,is_active boolean)`);
  await insertJson(client, flatten(catalogs.period_bases, "period_basis_id"), `insert into atlas_v2.period_basis_names(id,period_basis_id,locale,name,is_preferred)
    select x.id::uuid,x.period_basis_id::uuid,x.locale,x.name,x.is_preferred from jsonb_to_recordset($1::jsonb) as x(id text,period_basis_id text,locale text,name text,is_preferred boolean)`);
  await insertJson(client, catalogs.sources, `insert into atlas_v2.sources(id,source_key,source_type,title,sha256,bytes)
    select x.id::uuid,x.source_key,x.source_type,x.title,x.sha256,x.bytes from jsonb_to_recordset($1::jsonb) as x(id text,source_key text,source_type text,title text,sha256 text,bytes integer)`);
}

async function seedBaselineActivity(client, baseline, row) {
  const parsed = parseLegacySourceKey(row.legacy_source_key);
  const source = (baseline.catalogs.sources || []).find((item) => item.title === parsed.file);
  assert.ok(source, `Baseline A source file unresolved: ${parsed.file}`);
  assert.equal(String(source.id).toLowerCase(), ORIGINAL_SOURCE_ID, "Hōjō original Source UUID drift");
  await insertJson(client, [{
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
    source_locator: { file: parsed.file, index: parsed.index, source_sha256: source.sha256 },
    content_hash: parsed.content_hash_prefix
  }], `insert into atlas_v2.person_politics_v2(id,person_id,polity_id,role_id,period_basis_id,activity_start,activity_end,confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash)
    select x.id::uuid,x.person_id::uuid,x.polity_id::uuid,x.role_id::uuid,x.period_basis_id::uuid,x.activity_start,x.activity_end,x.confidence,x.chronology_status,x.legacy_source_key,x.notes,x.source_locator,x.content_hash
    from jsonb_to_recordset($1::jsonb) as x(id text,person_id text,polity_id text,role_id text,period_basis_id text,activity_start integer,activity_end integer,confidence text,chronology_status text,legacy_source_key text,notes text,source_locator jsonb,content_hash text)`);
  await client.query(
    `insert into atlas_v2.person_politics_sources(person_politics_id,source_id,source_locator_key)
     values($1::uuid,$2::uuid,$3)`,
    [row.activity_id, source.id, `${parsed.file}:${parsed.index}`]
  );
}

async function activityBundleState(client) {
  const activity = await client.query(
    `select id::text,person_id::text,polity_id::text,relation_type_id::text,role_id::text,period_basis_id::text,
      activity_start,activity_start_month,activity_start_day,activity_start_granularity,activity_start_certainty,activity_start_calendar,
      activity_end,activity_end_month,activity_end_day,activity_end_granularity,activity_end_certainty,activity_end_calendar,
      confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash
     from atlas_v2.person_politics_v2 where id=$1::uuid`,
    [ACTIVITY_ID]
  );
  const sources = await client.query(
    `select person_politics_id::text,source_id::text,source_locator_key
       from atlas_v2.person_politics_sources
      where person_politics_id=$1::uuid
      order by source_id::text,source_locator_key`,
    [ACTIVITY_ID]
  );
  return {
    activity: activity.rows[0] || null,
    sources: sources.rows.map((row) => ({
      person_politics_id: String(row.person_politics_id).toLowerCase(),
      source_id: String(row.source_id).toLowerCase(),
      source_locator_key: row.source_locator_key
    }))
  };
}

const baseline = JSON.parse(fs.readFileSync(path.resolve(root, process.env.ATLAS_BASELINE_A_PATH || "artifacts/baseline-a-source.json"), "utf8"));
const plan = JSON.parse(fs.readFileSync(path.join(root, "stage2/execution/p7-hojo-kamakura-governance-execution.v1.json"), "utf8"));
const schema = fs.readFileSync(path.join(root, "db/schema/atlas_v2.current.sql"), "utf8");
const row = baseline.rows.find((item) => String(item.activity_id).toLowerCase() === ACTIVITY_ID);
assert.ok(row, "Hōjō Baseline A Activity missing");
assert.equal(row.person_id, "11fbeb26-a0e2-5abc-b6aa-e4010ff52e62");
assert.equal(row.polity_id, KAMAKURA_POLITY_ID);
assert.equal(row.activity_start, 1268);
assert.equal(row.activity_end, 1284);
assert.equal(Number(row.source_count), 1);
assert.equal(Number(row.chronology_claim_count), 0);
assert.equal(Number(row.description_count), 0);
assert.equal(plan.operations.length, 1);
assert.equal(plan.stage2_assertions.length, 1);

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query("drop schema if exists atlas_v2 cascade");
  await client.query(schema);
  await seedIdentityCatalogs(client, baseline.catalogs);
  await seedBaselineActivity(client, baseline, row);
  await applyAuthoringMigrations(client);
  await applyCorrectionMigrations(client);
  const release = await applyStage2SchemaRelease(client);
  assert.equal(release.applied.length, 6);

  const sourceManifestPath = path.join(root, "stage2/authoring/p7-hojo-governance-sources.v1.json");
  const sourceWrite = await applyReviewedSourceAuthoring(client, { manifestPath: sourceManifestPath });
  assert.equal(sourceWrite.inserted_sources, 1);
  assert.equal(sourceWrite.replay, false);
  const sourceReplay = await applyReviewedSourceAuthoring(client, { manifestPath: sourceManifestPath });
  assert.equal(sourceReplay.inserted_sources, 0);
  assert.equal(sourceReplay.replay, true);

  const governanceManifestPath = path.join(root, "stage2/authoring/p7-reviewed-governance-contexts.v1.json");
  const governanceWrite = await applyReviewedGovernanceAuthoring(client, { manifestPath: governanceManifestPath });
  assert.deepEqual(governanceWrite.inserted, { governance_contexts: 1, governance_context_names: 3 });
  assert.equal(governanceWrite.replay, false);
  const governanceReplay = await applyReviewedGovernanceAuthoring(client, { manifestPath: governanceManifestPath });
  assert.deepEqual(governanceReplay.inserted, { governance_contexts: 0, governance_context_names: 0 });
  assert.equal(governanceReplay.replay, true);

  const snapshot = await createCorrectionV2TargetSnapshot(client, [ACTIVITY_ID]);
  const manifest = synthesizeUnifiedCorrectionV2Manifest(plan, snapshot);
  assert.deepEqual(manifest.operations.map((operation) => operation.type), ["rewrite_activity", "assert_governance_period"]);
  const service = createUnifiedCorrectionManifestV2Service({ client });

  const beforeDry = await activityBundleState(client);
  assert.equal(await loadGovernanceBundle(client, GOVERNANCE_PERIOD_ID), null);
  const dry = await service.execute(manifest, { dryRun: true });
  assert.equal(dry.committed, false);
  assert.equal(dry.replay, false);
  assert.deepEqual(await activityBundleState(client), beforeDry, "dry-run mutated Hōjō Activity");
  assert.equal(await loadGovernanceBundle(client, GOVERNANCE_PERIOD_ID), null, "dry-run leaked governance assertion");

  const applied = await service.execute(manifest);
  assert.equal(applied.committed, true);
  assert.equal(applied.replay, false);

  const after = await activityBundleState(client);
  assert.equal(after.activity.id, ACTIVITY_ID);
  assert.equal(after.activity.polity_id, JAPAN_ID);
  assert.equal(after.activity.relation_type_id, GOVERNS_ID);
  assert.equal(after.activity.activity_start, 1268);
  assert.equal(after.activity.activity_end, 1284);
  assert.equal(after.activity.activity_start_granularity, null);
  assert.equal(after.activity.activity_end_granularity, null);
  assert.equal(after.activity.legacy_source_key, row.legacy_source_key);
  assert.equal(after.sources.length, 2);
  assert.deepEqual(new Set(after.sources.map((link) => link.source_id)), new Set([ORIGINAL_SOURCE_ID, MASS_SOURCE_ID]));

  const governanceBundle = await loadGovernanceBundle(client, GOVERNANCE_PERIOD_ID);
  assert.ok(governanceBundle);
  assert.equal(governanceBundle.period.polity_id, JAPAN_ID);
  assert.equal(governanceBundle.period.governance_context_id, GOVERNANCE_CONTEXT_ID);
  assert.equal(governanceBundle.period.valid_from_year, 1268);
  assert.equal(governanceBundle.period.valid_to_year, 1284);
  assert.equal(governanceBundle.source_links.length, 2);
  assert.deepEqual(new Set(governanceBundle.source_links.map((link) => link.source_id)), new Set([ORIGINAL_SOURCE_ID, MASS_SOURCE_ID]));

  const oldPolity = await client.query(`select id::text from atlas_v2.polities where id=$1::uuid`, [KAMAKURA_POLITY_ID]);
  assert.equal(oldPolity.rowCount, 1, "Hōjō correction must not physically delete the old Kamakura Polity identity");

  const replay = await service.execute(manifest);
  assert.equal(replay.committed, true);
  assert.equal(replay.replay, true);
  assert.deepEqual(await activityBundleState(client), after, "exact replay drifted Hōjō Activity");
  assert.deepEqual(await loadGovernanceBundle(client, GOVERNANCE_PERIOD_ID), governanceBundle, "exact replay drifted governance assertion");

  console.log(JSON.stringify({
    marker: "ATLAS_STAGE2_P7_HOJO_GOVERNANCE_REHEARSAL_OK",
    activity_id: ACTIVITY_ID,
    relinked_polity_id: JAPAN_ID,
    relation_type_id: GOVERNS_ID,
    governance_context_id: GOVERNANCE_CONTEXT_ID,
    governance_period_id: GOVERNANCE_PERIOD_ID,
    activity_source_links: after.sources.length,
    governance_source_links: governanceBundle.source_links.length,
    dry_run_apply_replay_verified: true,
    production_mutation_authorized: false,
    production_or_vercel_contacted: false
  }, null, 2));
} finally {
  await client.end();
}
