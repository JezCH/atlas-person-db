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
const release = require('../server/atlas-p10-production-release-service.js');

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required');

const GORGO_SURVIVOR = '5136407a-9792-5103-be6f-54c947b255a5';
const GORGO_DUPLICATE = 'a3367f19-e901-5213-aba6-76c4aef1b730';
const baselineSchema = fs.readFileSync(path.join(root, 'db/schema/atlas_v2.current.sql'), 'utf8');

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query('drop schema if exists atlas_v2 cascade');
  await client.query(baselineSchema);
  await applyAuthoringMigrations(client);
  await applyCorrectionMigrations(client);
  const schemaRelease = await applyStage2SchemaRelease(client);
  assert.equal(schemaRelease.applied.length, 6);

  let state = await release.inspectP10ProductionState(client);
  assert.equal(state.requirement_ledger.table_present, false);
  assert.equal(state.merge_execution_state.lifecycle_code_ready, true);
  assert.equal(state.merge_execution_state.revalidation_ready, false);
  assert.ok(state.revalidation_readiness.blockers.includes('P10_REVALIDATION_REQUIREMENT_SCHEMA_MISSING'));

  const dry = await release.applyRequirementMigration(client, { dryRun: true });
  assert.equal(dry.committed, false);
  assert.equal(dry.dry_run, true);
  assert.equal(dry.during.requirement_ledger.table_present, true);
  assert.equal(dry.during.requirement_ledger.gorgo_requirement_present, true);
  state = await release.inspectP10ProductionState(client);
  assert.equal(state.requirement_ledger.table_present, false, 'dry-run must roll back the P10 requirement schema');

  const applied = await release.applyRequirementMigration(client, { dryRun: false });
  assert.equal(applied.committed, true);
  assert.equal(applied.after.requirement_ledger.table_present, true);
  assert.equal(applied.after.requirement_ledger.gorgo_requirement_present, true);
  assert.equal(applied.after.requirement_ledger.gorgo_requirement_state, 'ACTIVE');

  await client.query(`insert into atlas_v2.persons(id,canonical_key,person_type,historicity) values
    ($1::uuid,'p10-release-gorgo-of-sparta','historical','historical'),
    ($2::uuid,'p10-release-gorgo','historical','historical')`, [GORGO_SURVIVOR, GORGO_DUPLICATE]);
  await client.query(`insert into atlas_v2.person_names(id,person_id,locale,name,name_type,is_preferred) values
    (gen_random_uuid(),$1::uuid,'en','Gorgo of Sparta','preferred',true),
    (gen_random_uuid(),$2::uuid,'en','Gorgo','preferred',true)`, [GORGO_SURVIVOR, GORGO_DUPLICATE]);

  const rebuilt = await release.rebuildP10CandidateFrontier(client);
  assert.equal(rebuilt.review_decision_written, false);
  assert.equal(rebuilt.physical_person_merge_executed, false);
  assert.equal(rebuilt.rebuild.detected, 1);
  assert.equal(rebuilt.after.revalidation_readiness.ready, false);
  assert.equal(rebuilt.after.revalidation_readiness.summary.pending_candidates, 1);
  assert.equal(rebuilt.after.merge_execution_state.allowed, false);

  await client.query(`update atlas_v2.person_duplicate_revalidation_requirements
    set requirement_state='RETIRED',updated_at=now() where requirement_key=$1`, [release.GORGO_REQUIREMENT_KEY]);
  state = await release.inspectP10ProductionState(client);
  assert.equal(state.requirement_ledger.gorgo_requirement_state, 'RETIRED');

  const replay = await release.applyRequirementMigration(client, { dryRun: false });
  assert.equal(replay.committed, true);
  assert.equal(replay.after.requirement_ledger.gorgo_requirement_state, 'RETIRED', 'migration replay must not reactivate a retired requirement');

  const retiredRow = await client.query(`select requirement_state,count(*) over()::int as row_count
    from atlas_v2.person_duplicate_revalidation_requirements where requirement_key=$1`, [release.GORGO_REQUIREMENT_KEY]);
  assert.equal(retiredRow.rowCount, 1);
  assert.equal(retiredRow.rows[0].requirement_state, 'RETIRED');
  assert.equal(retiredRow.rows[0].row_count, 1);

  console.log(JSON.stringify({
    marker: 'ATLAS_P10_PRODUCTION_REVALIDATION_RELEASE_REHEARSAL_OK',
    migration_dry_run_rolled_back: true,
    migration_apply_committed: true,
    candidate_rebuild_wrote_review_decision: false,
    candidate_rebuild_executed_person_merge: false,
    pending_review_blocks_merge: true,
    retired_requirement_replay_monotonic: true,
    production_mutation_authorized: false
  }, null, 2));
} catch (error) {
  try { await client.query('rollback'); } catch {}
  throw error;
} finally {
  await client.end();
}
