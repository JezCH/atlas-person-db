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

const FORMAL_ID = "7c315e1c-90c3-5199-a292-8f68ba69d4b2";
const RETIRED_ID = "400c78d5-a7e1-5ddb-83ef-91e0193db0f8";
const COMPRESSED_ID = "79dc9310-cd56-5bed-9a35-fe5361bdf0b6";
const PERSON_ID = "308373b7-1bb5-5e02-9e95-a832a875c8a2";
const JAPAN_ID = "e029b047-544a-52c7-8897-4e494ac72af4";
const TOKUGAWA_POLITY_ID = "46534f7e-9247-5644-b5ad-9525c3d4f5d6";
const GOVERNS_ID = "67a57b37-1853-5f2a-b7ab-e6b2d32b56b6";
const GOVERNANCE_CONTEXT_ID = "b0448ada-fdd4-49bf-8669-bd54480bc1a3";
const GOVERNANCE_PERIOD_ID = "0b6580fd-a8e4-4f5b-9850-eae466e9dc59";
const PENDING_SOURCE_ID = "a30be4b7-5a35-5781-8a41-eb6c1d836180";
const CORRECTIONS_SOURCE_ID = "6ab43c8c-2d16-526a-8a2f-8159877becfe";
const ARCHIVES_SOURCE_ID = "a04aae2d-ce8f-40be-b4a9-fa764bcc3010";
const CAMBRIDGE_SOURCE_ID = "e45a3aa1-bc34-4be2-af12-6858d3e5c512";

const flatten = (items, key) => items.flatMap((item) => (item.names || []).map((name) => ({ ...name, [key]: item.id })));

async function insertJson(client, rows, sql) {
  if (rows.length) await client.query(sql, [JSON.stringify(rows)]);
}

function parseLegacySourceKey(key) {
  const match = /^(.*):(\d+):([0-9a-f]{16})$/i.exec(String(key || ""));
  if (!match) throw new Error(`P7_TOKUGAWA_LEGACY_SOURCE_KEY_INVALID:${key}`);
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

async function seedBaselineActivities(client, baseline, rows) {
  for (const row of rows) {
    const parsed = parseLegacySourceKey(row.legacy_source_key);
    const source = (baseline.catalogs.sources || []).find((item) => item.title === parsed.file);
    assert.ok(source, `Baseline A source file unresolved: ${parsed.file}`);
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
}

async function activityBundleState(client, id) {
  const activity = await client.query(
    `select id::text,person_id::text,polity_id::text,relation_type_id::text,role_id::text,period_basis_id::text,
      activity_start,activity_start_month,activity_start_day,activity_start_granularity,activity_start_certainty,activity_start_calendar,
      activity_end,activity_end_month,activity_end_day,activity_end_granularity,activity_end_certainty,activity_end_calendar,
      confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash
     from atlas_v2.person_politics_v2 where id=$1::uuid`,
    [id]
  );
  const sources = await client.query(
    `select person_politics_id::text,source_id::text,source_locator_key
       from atlas_v2.person_politics_sources
      where person_politics_id=$1::uuid
      order by source_id::text,source_locator_key`,
    [id]
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
const planA = JSON.parse(fs.readFileSync(path.join(root, "stage2/execution/p7-tokugawa-ieyasu-governance-survivors-execution.v1.json"), "utf8"));
const planB = JSON.parse(fs.readFileSync(path.join(root, "stage2/execution/p7-tokugawa-ieyasu-compressed-retire-execution.v1.json"), "utf8"));
const schema = fs.readFileSync(path.join(root, "db/schema/atlas_v2.current.sql"), "utf8");
const targetIds = new Set([FORMAL_ID, RETIRED_ID, COMPRESSED_ID]);
const rows = baseline.rows.filter((item) => targetIds.has(String(item.activity_id).toLowerCase()));
assert.equal(rows.length, 3, "Tokugawa Baseline A rows missing");

const byId = new Map(rows.map((row) => [row.activity_id, row]));
assert.equal(byId.get(FORMAL_ID).legacy_source_key, "pending-records.json:17:e9627e306ab61f29");
assert.equal(byId.get(RETIRED_ID).legacy_source_key, "pending-records.json:18:4515cfc2a5f71b37");
assert.equal(byId.get(COMPRESSED_ID).legacy_source_key, "pending-records-corrections.json:30:4fded7433858c7b7");
for (const row of rows) {
  assert.equal(row.person_id, PERSON_ID);
  assert.equal(row.polity_id, TOKUGAWA_POLITY_ID);
  assert.equal(Number(row.source_count), 1);
  assert.equal(Number(row.chronology_claim_count), 0);
  assert.equal(Number(row.description_count), 0);
}

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query("drop schema if exists atlas_v2 cascade");
  await client.query(schema);
  await seedIdentityCatalogs(client, baseline.catalogs);
  await seedBaselineActivities(client, baseline, rows);
  await applyAuthoringMigrations(client);
  await applyCorrectionMigrations(client);
  const release = await applyStage2SchemaRelease(client);
  assert.equal(release.applied.length, 6);

  const sourceManifestPath = path.join(root, "stage2/authoring/p7-tokugawa-governance-sources.v1.json");
  const sourceWrite = await applyReviewedSourceAuthoring(client, { manifestPath: sourceManifestPath });
  assert.equal(sourceWrite.inserted_sources, 2);
  assert.equal(sourceWrite.replay, false);
  const sourceReplay = await applyReviewedSourceAuthoring(client, { manifestPath: sourceManifestPath });
  assert.equal(sourceReplay.inserted_sources, 0);
  assert.equal(sourceReplay.replay, true);

  const governanceManifestPath = path.join(root, "stage2/authoring/p7-tokugawa-governance-contexts.v1.json");
  const governanceWrite = await applyReviewedGovernanceAuthoring(client, { manifestPath: governanceManifestPath });
  assert.deepEqual(governanceWrite.inserted, { governance_contexts: 1, governance_context_names: 3 });
  assert.equal(governanceWrite.replay, false);
  const governanceReplay = await applyReviewedGovernanceAuthoring(client, { manifestPath: governanceManifestPath });
  assert.deepEqual(governanceReplay.inserted, { governance_contexts: 0, governance_context_names: 0 });
  assert.equal(governanceReplay.replay, true);

  const service = createUnifiedCorrectionManifestV2Service({ client });
  const snapshotA = await createCorrectionV2TargetSnapshot(client, [FORMAL_ID, RETIRED_ID]);
  const manifestA = synthesizeUnifiedCorrectionV2Manifest(planA, snapshotA);
  assert.deepEqual(manifestA.operations.map((operation) => operation.type), ["rewrite_activity", "rewrite_activity", "assert_governance_period"]);

  const beforeFormal = await activityBundleState(client, FORMAL_ID);
  const beforeRetired = await activityBundleState(client, RETIRED_ID);
  assert.equal(await loadGovernanceBundle(client, GOVERNANCE_PERIOD_ID), null);
  const dryA = await service.execute(manifestA, { dryRun: true });
  assert.equal(dryA.committed, false);
  assert.equal(dryA.replay, false);
  assert.deepEqual(await activityBundleState(client, FORMAL_ID), beforeFormal);
  assert.deepEqual(await activityBundleState(client, RETIRED_ID), beforeRetired);
  assert.equal(await loadGovernanceBundle(client, GOVERNANCE_PERIOD_ID), null);

  const appliedA = await service.execute(manifestA);
  assert.equal(appliedA.committed, true);
  assert.equal(appliedA.replay, false);

  const formalAfterA = await activityBundleState(client, FORMAL_ID);
  const retiredAfterA = await activityBundleState(client, RETIRED_ID);
  for (const state of [formalAfterA, retiredAfterA]) {
    assert.equal(state.activity.person_id, PERSON_ID);
    assert.equal(state.activity.polity_id, JAPAN_ID);
    assert.equal(state.activity.relation_type_id, GOVERNS_ID);
    assert.equal(state.sources.length, 3);
    assert.ok(state.sources.some((link) => link.source_id === CORRECTIONS_SOURCE_ID && link.source_locator_key === "pending-records-corrections.json:30"));
    assert.ok(state.sources.some((link) => link.source_id === ARCHIVES_SOURCE_ID));
  }
  assert.equal(formalAfterA.activity.activity_start, 1603);
  assert.equal(formalAfterA.activity.activity_end, 1605);
  assert.equal(retiredAfterA.activity.activity_start, 1605);
  assert.equal(retiredAfterA.activity.activity_end, 1616);

  const governanceBundle = await loadGovernanceBundle(client, GOVERNANCE_PERIOD_ID);
  assert.ok(governanceBundle);
  assert.equal(governanceBundle.period.polity_id, JAPAN_ID);
  assert.equal(governanceBundle.period.governance_context_id, GOVERNANCE_CONTEXT_ID);
  assert.equal(governanceBundle.period.valid_from_year, 1603);
  assert.equal(governanceBundle.period.valid_to_year, 1616);
  assert.equal(governanceBundle.source_links.length, 5);
  assert.deepEqual(new Set(governanceBundle.source_links.map((link) => link.source_id)),
    new Set([PENDING_SOURCE_ID, CORRECTIONS_SOURCE_ID, ARCHIVES_SOURCE_ID, CAMBRIDGE_SOURCE_ID]));

  const replayA = await service.execute(manifestA);
  assert.equal(replayA.replay, true);

  const snapshotB = await createCorrectionV2TargetSnapshot(client, [FORMAL_ID, RETIRED_ID, COMPRESSED_ID]);
  const manifestB = synthesizeUnifiedCorrectionV2Manifest(planB, snapshotB);
  assert.deepEqual(manifestB.operations.map((operation) => operation.type), ["retire_activity"]);
  assert.equal(manifestB.operations[0].replacement_survivors.length, 2);

  const beforeDryBFormal = await activityBundleState(client, FORMAL_ID);
  const beforeDryBRetired = await activityBundleState(client, RETIRED_ID);
  const beforeDryBCompressed = await activityBundleState(client, COMPRESSED_ID);
  assert.ok(beforeDryBCompressed.activity);
  const dryB = await service.execute(manifestB, { dryRun: true });
  assert.equal(dryB.committed, false);
  assert.equal(dryB.replay, false);
  assert.deepEqual(await activityBundleState(client, FORMAL_ID), beforeDryBFormal);
  assert.deepEqual(await activityBundleState(client, RETIRED_ID), beforeDryBRetired);
  assert.deepEqual(await activityBundleState(client, COMPRESSED_ID), beforeDryBCompressed);

  const appliedB = await service.execute(manifestB);
  assert.equal(appliedB.committed, true);
  assert.equal(appliedB.replay, false);
  assert.equal((await activityBundleState(client, COMPRESSED_ID)).activity, null);

  const formalFinal = await activityBundleState(client, FORMAL_ID);
  const retiredFinal = await activityBundleState(client, RETIRED_ID);
  assert.deepEqual(formalFinal, formalAfterA, "retirement should deduplicate the already-prebound compressed Source");
  assert.deepEqual(retiredFinal, retiredAfterA, "retirement should deduplicate the already-prebound compressed Source");

  const replayB = await service.execute(manifestB);
  assert.equal(replayB.replay, true);
  assert.deepEqual(await activityBundleState(client, FORMAL_ID), formalFinal);
  assert.deepEqual(await activityBundleState(client, RETIRED_ID), retiredFinal);

  const replayAAfterB = await service.execute(manifestA);
  assert.equal(replayAAfterB.replay, true);
  assert.deepEqual(await activityBundleState(client, FORMAL_ID), formalFinal);
  assert.deepEqual(await activityBundleState(client, RETIRED_ID), retiredFinal);
  assert.deepEqual(await loadGovernanceBundle(client, GOVERNANCE_PERIOD_ID), governanceBundle);

  const oldPolity = await client.query(`select id::text from atlas_v2.polities where id=$1::uuid`, [TOKUGAWA_POLITY_ID]);
  assert.equal(oldPolity.rowCount, 1, "Tokugawa correction must not physically delete the old government-as-Polity identity");

  console.log(JSON.stringify({
    marker: "ATLAS_STAGE2_P7_TOKUGAWA_IEYASU_GOVERNANCE_REHEARSAL_OK",
    survivor_activity_ids: [FORMAL_ID, RETIRED_ID],
    retired_compressed_activity_id: COMPRESSED_ID,
    relinked_polity_id: JAPAN_ID,
    relation_type_id: GOVERNS_ID,
    governance_context_id: GOVERNANCE_CONTEXT_ID,
    governance_period_id: GOVERNANCE_PERIOD_ID,
    survivor_source_links_each: formalFinal.sources.length,
    governance_source_links: governanceBundle.source_links.length,
    stage_a_replay_after_stage_b_verified: true,
    dry_run_apply_replay_verified: true,
    production_mutation_authorized: false,
    production_or_vercel_contacted: false
  }, null, 2));
} finally {
  await client.end();
}
