import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import pg from 'pg';
import { buildStage2P6LiteralExecutionPackage } from './build-stage2-p6-execution-package.mjs';

const require = createRequire(import.meta.url);
const { applyAuthoringMigrations } = require('../server/atlas-authoring-migrations.js');
const { applyCorrectionMigrations } = require('../server/atlas-correction-migrations.js');
const { applyStage2SchemaRelease } = require('../server/atlas-stage2-schema-release.js');
const { applyReviewedEntityAuthoring } = require('../server/atlas-stage2-reviewed-entity-authoring.js');
const { createCorrectionV2TargetSnapshot } = require('../server/atlas-correction-v2-snapshot-service.js');
const {
  requiredSnapshotActivityIds,
  synthesizeCorrectionV2Manifest
} = require('../server/atlas-correction-v2-manifest-synthesizer.js');
const {
  MARKER_V2,
  createCorrectionManifestV2Service
} = require('../server/atlas-correction-manifest-v2-service.js');

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required');

const BASELINE_SHA = 'ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
const BASELINE_DIGEST = 'sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const baselinePath = path.resolve(root, process.env.ATLAS_BASELINE_A_PATH || 'artifacts/baseline-a-source.json');
const goldenPlanPath = path.resolve(root, 'stage2/execution/p6-correction-v2-execution-batch1.v1.json');
const rolePrerequisitePath = path.resolve(root, 'stage2/execution/p6-reviewed-role-prerequisites.v1.json');
const baselineSchemaPath = path.resolve(root, 'db/schema/atlas_v2.current.sql');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function flattenNames(catalog, foreignKey) {
  return catalog.flatMap((entity) => (entity.names || []).map((name) => ({ ...name, [foreignKey]: entity.id })));
}

function parseLegacySourceKey(key) {
  const match = /^(.*):(\d+):([0-9a-f]{16})$/i.exec(String(key || ''));
  if (!match) throw new Error(`P6_FULL_REHEARSAL_LEGACY_SOURCE_KEY_UNSUPPORTED:${key}`);
  return Object.freeze({ file: match[1], index: Number(match[2]), content_hash_prefix: match[3].toLowerCase() });
}

function baselineSourceEvidence(row, sourceByTitle) {
  const parsed = parseLegacySourceKey(row.legacy_source_key);
  const source = sourceByTitle.get(parsed.file);
  if (!source) throw new Error(`P6_FULL_REHEARSAL_SOURCE_FILE_UNRESOLVED:${parsed.file}`);
  if (!/^[0-9a-f]{64}$/i.test(String(source.sha256 || ''))) throw new Error(`P6_FULL_REHEARSAL_SOURCE_SHA_INVALID:${parsed.file}`);
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
      // Baseline A v2 intentionally captured only the 16-hex content-hash prefix in legacy_source_key.
      // Do not fabricate the unavailable remaining 48 hex characters in this branch-only reconstruction.
      content_hash: parsed.content_hash_prefix
    }),
    source_link: Object.freeze({
      person_politics_id: row.activity_id,
      source_id: source.id,
      source_locator_key: `${parsed.file}:${parsed.index}`
    })
  });
}

async function insertJson(client, rows, sql) {
  if (!rows.length) return;
  await client.query(sql, [JSON.stringify(rows)]);
}

async function seedIdentityCatalogs(client, catalogs) {
  await insertJson(client, catalogs.persons, `
    insert into atlas_v2.persons(id,canonical_key,person_type,historicity)
    select x.id::uuid,x.canonical_key,x.person_type,x.historicity
      from jsonb_to_recordset($1::jsonb) as x(id text,canonical_key text,person_type text,historicity text)`);
  await insertJson(client, flattenNames(catalogs.persons, 'person_id'), `
    insert into atlas_v2.person_names(id,person_id,locale,name,name_type,is_preferred)
    select x.id::uuid,x.person_id::uuid,x.locale,x.name,x.name_type,x.is_preferred
      from jsonb_to_recordset($1::jsonb) as x(id text,person_id text,locale text,name text,name_type text,is_preferred boolean)`);

  await insertJson(client, catalogs.polities, `
    insert into atlas_v2.polities(id,canonical_key,polity_type,historicity)
    select x.id::uuid,x.canonical_key,x.polity_type,x.historicity
      from jsonb_to_recordset($1::jsonb) as x(id text,canonical_key text,polity_type text,historicity text)`);
  await insertJson(client, flattenNames(catalogs.polities, 'polity_id'), `
    insert into atlas_v2.polity_names(id,polity_id,locale,name,name_type,is_preferred)
    select x.id::uuid,x.polity_id::uuid,x.locale,x.name,x.name_type,x.is_preferred
      from jsonb_to_recordset($1::jsonb) as x(id text,polity_id text,locale text,name text,name_type text,is_preferred boolean)`);

  await insertJson(client, catalogs.roles, `
    insert into atlas_v2.roles(id,code,category,source_label,is_active)
    select x.id::uuid,x.code,x.category,x.source_label,x.is_active
      from jsonb_to_recordset($1::jsonb) as x(id text,code text,category text,source_label text,is_active boolean)`);
  await insertJson(client, flattenNames(catalogs.roles, 'role_id'), `
    insert into atlas_v2.role_names(id,role_id,locale,name,is_preferred)
    select x.id::uuid,x.role_id::uuid,x.locale,x.name,x.is_preferred
      from jsonb_to_recordset($1::jsonb) as x(id text,role_id text,locale text,name text,is_preferred boolean)`);

  await insertJson(client, catalogs.period_bases, `
    insert into atlas_v2.period_bases(id,code,is_active)
    select x.id::uuid,x.code,x.is_active
      from jsonb_to_recordset($1::jsonb) as x(id text,code text,is_active boolean)`);
  await insertJson(client, flattenNames(catalogs.period_bases, 'period_basis_id'), `
    insert into atlas_v2.period_basis_names(id,period_basis_id,locale,name,is_preferred)
    select x.id::uuid,x.period_basis_id::uuid,x.locale,x.name,x.is_preferred
      from jsonb_to_recordset($1::jsonb) as x(id text,period_basis_id text,locale text,name text,is_preferred boolean)`);

  await insertJson(client, catalogs.sources, `
    insert into atlas_v2.sources(id,source_key,source_type,title,sha256,bytes)
    select x.id::uuid,x.source_key,x.source_type,x.title,x.sha256,x.bytes
      from jsonb_to_recordset($1::jsonb) as x(id text,source_key text,source_type text,title text,sha256 text,bytes integer)`);
}

async function seedRequiredActivities(client, baselineRows, sourceByTitle) {
  const evidence = baselineRows.map((row) => baselineSourceEvidence(row, sourceByTitle));
  await insertJson(client, evidence.map((row) => row.activity), `
    insert into atlas_v2.person_politics_v2(
      id,person_id,polity_id,role_id,period_basis_id,activity_start,activity_end,
      confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash)
    select x.id::uuid,x.person_id::uuid,x.polity_id::uuid,x.role_id::uuid,x.period_basis_id::uuid,
           x.activity_start,x.activity_end,x.confidence,x.chronology_status,x.legacy_source_key,x.notes,x.source_locator,x.content_hash
      from jsonb_to_recordset($1::jsonb) as x(
        id text,person_id text,polity_id text,role_id text,period_basis_id text,
        activity_start integer,activity_end integer,confidence text,chronology_status text,
        legacy_source_key text,notes text,source_locator jsonb,content_hash text)`);
  await insertJson(client, evidence.map((row) => row.source_link), `
    insert into atlas_v2.person_politics_sources(person_politics_id,source_id,source_locator_key)
    select x.person_politics_id::uuid,x.source_id::uuid,x.source_locator_key
      from jsonb_to_recordset($1::jsonb) as x(person_politics_id text,source_id text,source_locator_key text)`);
}

async function applyRolePrerequisites(client, packageJson) {
  assert.equal(packageJson?.status, 'REVIEWED_EXACT_ROWS_BRANCH_ONLY_NO_PRODUCTION_MUTATION');
  assert.equal(packageJson?.rules?.production_mutation_authorized, false);
  for (const item of packageJson.roles || []) {
    const role = item.role;
    const existing = await client.query('select id::text from atlas_v2.roles where id=$1::uuid', [role.id]);
    assert.equal(existing.rowCount, 0, `reviewed P6 prerequisite role already exists: ${role.id}`);
    await client.query(
      `insert into atlas_v2.roles(id,code,category,source_label,is_active) values($1::uuid,$2,$3,$4,$5)`,
      [role.id, role.code, role.category, role.source_label, role.is_active]
    );
    for (const name of item.preferred_names || []) {
      await client.query(
        `insert into atlas_v2.role_names(id,role_id,locale,name,is_preferred) values($1::uuid,$2::uuid,$3,$4,$5)`,
        [name.id, name.role_id, name.locale, name.name, name.is_preferred]
      );
    }
  }
}

function validatePackage(plans, baseline) {
  assert.equal(plans.length, 18, 'P6 full rehearsal must contain golden Batch1 plus 17 materialized plans');
  const operations = plans.flatMap((plan) => plan.operations || []);
  assert.equal(operations.length, 54, 'P6 full rehearsal must cover exactly 54 Activity targets');
  const mutationIds = operations.map((operation) => String(operation.activity_id).toLowerCase());
  assert.equal(new Set(mutationIds).size, 54, 'P6 full rehearsal Activity targets must be UUID-unique');

  const mutationSet = new Set(mutationIds);
  const createdIds = [];
  for (const plan of plans) {
    assert.equal(plan?.baseline?.deployment_sha, BASELINE_SHA, `plan ${plan.batch_id} deployment baseline drift`);
    assert.equal(plan?.baseline?.baseline_digest, BASELINE_DIGEST, `plan ${plan.batch_id} digest baseline drift`);
    assert.equal(plan?.execution_rules?.production_executable, false, `plan ${plan.batch_id} prematurely executable`);
    assert.equal(plan?.execution_rules?.production_mutation_authorized, false, `plan ${plan.batch_id} prematurely authorizes Production`);
    for (const operation of plan.operations || []) {
      if (operation.type === 'retire_activity') {
        for (const replacementId of operation.replacement_activity_ids || []) {
          assert.equal(mutationSet.has(String(replacementId).toLowerCase()), false,
            `retire replacement is also a P6 mutation target: ${replacementId}`);
        }
      }
      if (operation.type === 'split_activity') {
        for (const fragment of operation.fragments || []) {
          if (fragment.survivor !== true) createdIds.push(String(fragment.activity_id).toLowerCase());
        }
      }
    }
  }
  assert.equal(new Set(createdIds).size, createdIds.length, 'split-created Activity UUID reused across P6 package');
  assert.equal(createdIds.some((id) => mutationSet.has(id)), false, 'split-created Activity collides with a Baseline A mutation target');

  const requiredIds = [...new Set(plans.flatMap((plan) => requiredSnapshotActivityIds(plan)))].sort();
  const baselineById = new Map(baseline.rows.map((row) => [String(row.activity_id).toLowerCase(), row]));
  for (const id of requiredIds) {
    const row = baselineById.get(id);
    assert.ok(row, `required Baseline A Activity missing from artifact: ${id}`);
    assert.equal(Number(row.source_count), 1, `artifact reconstruction requires exact single normalized Source link for ${id}`);
    assert.equal(Number(row.chronology_claim_count), 0, `artifact reconstruction child chronology unsupported for ${id}`);
    assert.equal(Number(row.description_count), 0, `artifact reconstruction child description unsupported for ${id}`);
  }
  return Object.freeze({ operations, mutationIds, createdIds, requiredIds, baselineById });
}

const baseline = readJson(baselinePath);
assert.equal(baseline?.marker, 'ATLAS_CORRECTION_BASELINE_A_V2');
assert.equal(baseline?.deployment_sha, BASELINE_SHA);
assert.equal(baseline?.baseline_digest, BASELINE_DIGEST);
assert.equal(Number(baseline?.counts?.activities), 338);
assert.equal(Number(baseline?.counts?.persons), 302);
assert.equal(Number(baseline?.counts?.polities), 212);
assert.equal(Number(baseline?.counts?.sources), 20);

const goldenPlan = readJson(goldenPlanPath);
const literalPackage = buildStage2P6LiteralExecutionPackage();
assert.equal(literalPackage?.result?.compiled_activity_targets, 45);
const plans = Object.freeze([goldenPlan, ...literalPackage.plans]);
const packageInfo = validatePackage(plans, baseline);
const sourceByTitle = new Map((baseline.catalogs.sources || []).map((row) => [row.title, row]));
assert.equal(sourceByTitle.size, baseline.catalogs.sources.length, 'Baseline A Source titles must be unique for legacy locator reconstruction');
const requiredBaselineRows = packageInfo.requiredIds.map((id) => packageInfo.baselineById.get(id));
const rolePrerequisites = readJson(rolePrerequisitePath);
const baselineSchema = fs.readFileSync(baselineSchemaPath, 'utf8');

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query('drop schema if exists atlas_v2 cascade');
  await client.query(baselineSchema);
  await seedIdentityCatalogs(client, baseline.catalogs);
  await seedRequiredActivities(client, requiredBaselineRows, sourceByTitle);

  const seeded = await client.query(`select
    (select count(*)::int from atlas_v2.persons) as persons,
    (select count(*)::int from atlas_v2.polities) as polities,
    (select count(*)::int from atlas_v2.roles) as roles,
    (select count(*)::int from atlas_v2.period_bases) as period_bases,
    (select count(*)::int from atlas_v2.sources) as sources,
    (select count(*)::int from atlas_v2.person_politics_v2) as activities,
    (select count(*)::int from atlas_v2.person_politics_sources) as activity_sources`);
  assert.deepEqual(seeded.rows[0], {
    persons: 302,
    polities: 212,
    roles: 149,
    period_bases: 8,
    sources: 20,
    activities: packageInfo.requiredIds.length,
    activity_sources: packageInfo.requiredIds.length
  });

  await applyAuthoringMigrations(client);
  await applyCorrectionMigrations(client);
  const release = await applyStage2SchemaRelease(client);
  assert.equal(release.applied.length, 6);
  assert.equal(release.skipped.length, 0);

  const p5 = await applyReviewedEntityAuthoring(client);
  assert.equal(p5.committed, true);
  assert.equal(p5.replay, false);
  assert.equal(p5.inserted.polities, 17);
  assert.equal(p5.inserted.polity_names, 17);
  assert.ok(p5.inserted.sources >= 9);
  await applyRolePrerequisites(client, rolePrerequisites);

  const service = createCorrectionManifestV2Service({ client });
  const relationIds = new Set();
  let dryRuns = 0;
  let applies = 0;
  let replays = 0;
  let manifestOperations = 0;
  let relationAssertions = 0;
  let retireOperations = 0;
  let splitOperations = 0;

  for (const plan of plans) {
    const snapshotIds = requiredSnapshotActivityIds(plan);
    const snapshot = await createCorrectionV2TargetSnapshot(client, snapshotIds);
    const manifest = synthesizeCorrectionV2Manifest(plan, snapshot);
    assert.equal(manifest.production_executable, true);
    assert.equal(manifest.review_status, 'approved');
    assert.equal(manifest.exact_live_snapshot_digest, snapshot.snapshot_digest);

    for (const operation of manifest.operations) {
      manifestOperations += 1;
      if (operation.type === 'assert_polity_relation') {
        relationAssertions += 1;
        const relationId = String(operation.exact_after?.relation?.id || '').toLowerCase();
        assert.ok(relationId, `relation assertion without literal UUID in ${plan.batch_id}`);
        assert.equal(relationIds.has(relationId), false, `relation assertion UUID reused across package: ${relationId}`);
        relationIds.add(relationId);
      } else if (operation.type === 'retire_activity') retireOperations += 1;
      else if (operation.type === 'split_activity') splitOperations += 1;
    }

    const beforeDryDigest = snapshot.snapshot_digest;
    const dryRun = await service.execute(manifest, { dryRun: true });
    assert.equal(dryRun.marker, MARKER_V2);
    assert.equal(dryRun.dry_run, true);
    assert.equal(dryRun.committed, false);
    assert.equal(dryRun.replay, false);
    dryRuns += 1;

    const afterDrySnapshot = await createCorrectionV2TargetSnapshot(client, snapshotIds);
    assert.equal(afterDrySnapshot.snapshot_digest, beforeDryDigest, `dry-run changed target snapshot for ${plan.batch_id}`);

    const applied = await service.execute(manifest);
    assert.equal(applied.marker, MARKER_V2);
    assert.equal(applied.dry_run, false);
    assert.equal(applied.committed, true);
    assert.equal(applied.replay, false);
    applies += 1;

    const replay = await service.execute(manifest);
    assert.equal(replay.marker, MARKER_V2);
    assert.equal(replay.committed, true);
    assert.equal(replay.replay, true);
    replays += 1;
  }

  const finalCounts = await client.query(`select
    (select count(*)::int from atlas_v2.person_politics_v2) as activities,
    (select count(*)::int from atlas_v2.correction_manifest_runs) as correction_runs,
    (select count(*)::int from atlas_v2.polity_relations) as polity_relations,
    (select count(*)::int from atlas_v2.person_politics_v2 where legacy_source_key is null) as native_fragments`);
  const expectedActivities = packageInfo.requiredIds.length + packageInfo.createdIds.length - retireOperations;
  assert.equal(finalCounts.rows[0].activities, expectedActivities);
  assert.equal(finalCounts.rows[0].correction_runs, plans.length);
  assert.equal(finalCounts.rows[0].polity_relations, relationAssertions);
  assert.equal(finalCounts.rows[0].native_fragments, packageInfo.createdIds.length);

  console.log(JSON.stringify({
    marker: 'ATLAS_STAGE2_P6_FULL_54_ARTIFACT_RECONSTRUCTION_REHEARSAL_OK',
    baseline: {
      deployment_sha: BASELINE_SHA,
      baseline_digest: BASELINE_DIGEST,
      captured_activity_rows: 338,
      exact_identity_catalogs_used: true,
      exact_activity_baseline_tuple_fields_used: true,
      required_target_and_dependency_rows: packageInfo.requiredIds.length,
      required_rows_single_normalized_source_link: true,
      normalized_source_uuid_and_locator_reconstructed_from_legacy_key_and_source_catalog: true,
      full_content_hash_value_available_in_baseline_artifact: false,
      content_hash_reconstruction_uses_captured_legacy_hash_prefix_only: true
    },
    plans_rehearsed: plans.length,
    activity_targets: packageInfo.mutationIds.length,
    golden_activity_targets: 9,
    materialized_activity_targets: literalPackage.result.compiled_activity_targets,
    split_created_activity_rows: packageInfo.createdIds.length,
    split_operations: splitOperations,
    retire_operations: retireOperations,
    relation_assertions: relationAssertions,
    synthesized_manifest_operations: manifestOperations,
    dry_runs_rolled_back: dryRuns,
    manifests_applied_atomically: applies,
    exact_replays_verified: replays,
    correction_ledger_rows: finalCounts.rows[0].correction_runs,
    production_mutation_authorized: false,
    production_or_vercel_contacted: false
  }, null, 2));
} finally {
  await client.end();
}
