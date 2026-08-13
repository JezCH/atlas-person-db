import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import pg from 'pg';
import { buildReviewedIdentitySourceAuthoring } from './build-stage2-p5-reviewed-identity-source-authoring.mjs';

const require = createRequire(import.meta.url);
const { applyAuthoringMigrations } = require('../server/atlas-authoring-migrations.js');
const { applyCorrectionMigrations } = require('../server/atlas-correction-migrations.js');
const { applyStage2SchemaRelease } = require('../server/atlas-stage2-schema-release.js');
const { applyReviewedEntityAuthoring } = require('../server/atlas-stage2-reviewed-entity-authoring.js');
const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required');

function normalizeManifestRows(value) {
  return {
    ...value,
    polities: [...value.polities].sort((a, b) => a.identity_class < b.identity_class ? -1 : a.identity_class > b.identity_class ? 1 : 0),
    sources: [...value.sources].sort((a, b) => a.candidate_key < b.candidate_key ? -1 : a.candidate_key > b.candidate_key ? 1 : 0)
  };
}

const committed = JSON.parse(fs.readFileSync(path.join(root, 'stage2/execution/p5-reviewed-identity-source-authoring.v1.json'), 'utf8'));
const generated = buildReviewedIdentitySourceAuthoring();
assert.deepEqual(normalizeManifestRows(committed), normalizeManifestRows(generated), 'committed exact authoring manifest drifted from reviewed packages + UUID allocation');

const baselineSchema = fs.readFileSync(path.join(root, 'db/schema/atlas_v2.current.sql'), 'utf8');
const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query('DROP SCHEMA IF EXISTS atlas_v2 CASCADE');
  await client.query(baselineSchema);
  await applyAuthoringMigrations(client);
  await applyCorrectionMigrations(client);
  const schemaRelease = await applyStage2SchemaRelease(client);
  if (schemaRelease.applied.length !== 5 || schemaRelease.skipped.length !== 0) throw new Error(`P5 schema release prerequisite drift ${JSON.stringify(schemaRelease)}`);

  const before = await client.query(`
    select
      (select count(*)::int from atlas_v2.polities) as polities,
      (select count(*)::int from atlas_v2.polity_names) as polity_names,
      (select count(*)::int from atlas_v2.sources) as sources,
      (select count(*)::int from atlas_v2.person_politics_v2) as activities`);

  const dryRun = await applyReviewedEntityAuthoring(client, { dryRun: true });
  if (!dryRun.dry_run || dryRun.committed || dryRun.replay) throw new Error(`entity authoring dry-run contract drift ${JSON.stringify(dryRun)}`);
  if (dryRun.inserted.polities !== 17 || dryRun.inserted.polity_names !== 17 || dryRun.inserted.sources !== 9) throw new Error(`entity authoring dry-run cardinality drift ${JSON.stringify(dryRun.inserted)}`);

  const afterDryRun = await client.query(`
    select
      (select count(*)::int from atlas_v2.polities) as polities,
      (select count(*)::int from atlas_v2.polity_names) as polity_names,
      (select count(*)::int from atlas_v2.sources) as sources,
      (select count(*)::int from atlas_v2.person_politics_v2) as activities`);
  assert.deepEqual(afterDryRun.rows[0], before.rows[0], 'dry-run must leave database unchanged');

  const first = await applyReviewedEntityAuthoring(client);
  if (first.dry_run || !first.committed || first.replay) throw new Error(`entity authoring first apply contract drift ${JSON.stringify(first)}`);
  if (first.inserted.polities !== 17 || first.inserted.polity_names !== 17 || first.inserted.sources !== 9) throw new Error(`entity authoring first apply cardinality drift ${JSON.stringify(first.inserted)}`);

  const after = await client.query(`
    select
      (select count(*)::int from atlas_v2.polities) as polities,
      (select count(*)::int from atlas_v2.polity_names) as polity_names,
      (select count(*)::int from atlas_v2.sources) as sources,
      (select count(*)::int from atlas_v2.person_politics_v2) as activities`);
  const b = before.rows[0];
  const a = after.rows[0];
  if (a.polities !== b.polities + 17 || a.polity_names !== b.polity_names + 17 || a.sources !== b.sources + 9 || a.activities !== b.activities) {
    throw new Error(`entity authoring post-count drift before=${JSON.stringify(b)} after=${JSON.stringify(a)}`);
  }
  if (first.activity_fingerprint_before.fingerprint !== first.activity_fingerprint_after.fingerprint || first.activity_fingerprint_before.row_count !== first.activity_fingerprint_after.row_count) {
    throw new Error('entity authoring changed Activity fingerprint');
  }

  const replay = await applyReviewedEntityAuthoring(client);
  if (!replay.committed || !replay.replay || replay.inserted.polities !== 0 || replay.inserted.polity_names !== 0 || replay.inserted.sources !== 0) {
    throw new Error(`entity authoring replay drift ${JSON.stringify(replay)}`);
  }

  const exactPolities = await client.query(`select count(*)::int as n from atlas_v2.polities where id = any($1::uuid[])`, [committed.polities.map((row) => row.polity.id)]);
  const exactNames = await client.query(`select count(*)::int as n from atlas_v2.polity_names where id = any($1::uuid[])`, [committed.polities.map((row) => row.preferred_name.id)]);
  const exactSources = await client.query(`select count(*)::int as n from atlas_v2.sources where id = any($1::uuid[])`, [committed.sources.map((row) => row.row.id)]);
  if (exactPolities.rows[0].n !== 17 || exactNames.rows[0].n !== 17 || exactSources.rows[0].n !== 9) throw new Error('literal UUID materialization incomplete');

  const semanticKinds = await client.query(`select semantic_name_kind,count(*)::int as n from atlas_v2.polity_names where id = any($1::uuid[]) group by semantic_name_kind order by semantic_name_kind`, [committed.polities.map((row) => row.preferred_name.id)]);
  const semanticCounts = Object.fromEntries(semanticKinds.rows.map((row) => [row.semantic_name_kind, row.n]));
  assert.deepEqual(semanticCounts, { editorial_catalog_label: 14, historical_attested: 1, historiographic_conventional: 2 });

  const materializedSources = await client.query(`select count(*)::int as n from atlas_v2.sources where id = any($1::uuid[]) and (sha256 is not null or bytes is not null)`, [committed.sources.map((row) => row.row.id)]);
  if (materializedSources.rows[0].n !== 0) throw new Error('bibliographic Sources must not receive fake sha256/bytes');

  const driftTarget = committed.polities[0];
  await client.query(`update atlas_v2.polities set canonical_key=canonical_key || ':drift' where id=$1::uuid`, [driftTarget.polity.id]);
  let driftRejected = false;
  try {
    await applyReviewedEntityAuthoring(client);
  } catch (error) {
    driftRejected = /P5_POLITY_UUID_DRIFT/.test(String(error?.message || error));
  }
  if (!driftRejected) throw new Error('exact UUID replay failed to reject polity row drift');

  console.log(JSON.stringify({
    marker: 'ATLAS_STAGE2_P5_REVIEWED_ENTITY_AUTHORING_REHEARSAL_OK',
    generated_manifest_matches_committed_semantically: true,
    array_order_is_not_identity: true,
    schema_release_components: 5,
    dry_run_rolled_back: true,
    first_apply: { polities: 17, polity_names: 17, sources: 9 },
    exact_replay: true,
    exact_uuid_rows: 43,
    activity_rows_changed: 0,
    fake_source_materialization_rows: 0,
    drift_rejected: true,
    production_mutation_authorized: false
  }, null, 2));
} finally {
  await client.end();
}
