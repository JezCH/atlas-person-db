import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = path.join(root, 'db/schema/atlas_v2.current.sql');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required for schema baseline verification');

const expectedTables = [
  'chronology_claims','migration_metadata','period_bases','period_basis_names','person_descriptions',
  'person_duplicate_candidates','person_duplicate_reviews','person_merge_audits','person_names',
  'person_politics_sources','person_politics_v2','person_sources','persons','polities','polity_descriptions',
  'polity_names','polity_sources','relationship_descriptions','role_names','roles','sources'
].sort();

const expectedConstraints = [
  'chronology_claims_pkey','migration_metadata_phase_check','migration_metadata_pkey','period_bases_pkey','period_bases_code_key',
  'period_basis_names_pkey','person_descriptions_pkey','person_duplicate_candidates_candidate_state_check',
  'person_duplicate_candidates_check','person_duplicate_candidates_confidence_check','person_duplicate_candidates_current_decision_check',
  'person_duplicate_candidates_review_count_check','person_duplicate_candidates_pkey',
  'person_duplicate_candidates_person_low_id_person_high_id_key','person_duplicate_reviews_decision_check',
  'person_duplicate_reviews_reviewer_kind_check','person_duplicate_reviews_pkey','person_duplicate_reviews_request_id_key',
  'person_merge_audits_check','person_merge_audits_reviewer_kind_check','person_merge_audits_pkey','person_merge_audits_request_id_key',
  'person_names_pkey','person_politics_sources_pkey','person_politics_v2_activity_end_check',
  'person_politics_v2_activity_start_check','person_politics_v2_check','person_politics_v2_pkey',
  'person_politics_v2_legacy_source_key_key','person_sources_pkey','persons_pkey','persons_canonical_key_key',
  'polities_pkey','polities_canonical_key_key','polity_descriptions_pkey','polity_names_pkey','polity_sources_pkey',
  'relationship_descriptions_pkey','role_names_pkey','roles_pkey','roles_code_key','sources_bytes_check','sources_pkey',
  'sources_source_key_key','chronology_claims_person_politics_id_fkey','period_basis_names_period_basis_id_fkey',
  'person_descriptions_person_id_fkey','person_duplicate_reviews_candidate_id_fkey','person_names_person_id_fkey',
  'person_politics_sources_person_politics_id_fkey','person_politics_sources_source_id_fkey',
  'person_politics_v2_period_basis_id_fkey','person_politics_v2_person_id_fkey','person_politics_v2_polity_id_fkey',
  'person_politics_v2_role_id_fkey','person_sources_person_id_fkey','person_sources_source_id_fkey',
  'polity_descriptions_polity_id_fkey','polity_names_polity_id_fkey','polity_sources_polity_id_fkey',
  'polity_sources_source_id_fkey','relationship_descriptions_person_politics_id_fkey','role_names_role_id_fkey'
].sort();

const expectedIndexes = [
  'person_duplicate_candidates_queue_idx','person_duplicate_reviews_candidate_idx','person_merge_audits_candidate_idx',
  'person_merge_audits_source_idx','person_merge_audits_survivor_idx','person_names_preferred_locale_uq',
  'person_politics_v2_null_role_semantic_uidx','polity_names_preferred_locale_uq'
].sort();

function same(actual, expected, label) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw new Error(`${label} mismatch\nactual=${JSON.stringify(left)}\nexpected=${JSON.stringify(right)}`);
  }
}

const source = fs.readFileSync(baselinePath, 'utf8');
if (/public\.person_politics|atlas_person_politics_compat_v1/i.test(source)) {
  throw new Error('current baseline must not recreate legacy person-politics objects');
}

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query(source);

  const tables = await client.query(`
    select table_name
      from information_schema.tables
     where table_schema='atlas_v2' and table_type='BASE TABLE'
     order by table_name`);
  same(tables.rows.map((row) => row.table_name), expectedTables, 'table set');

  const constraints = await client.query(`
    select con.conname
      from pg_constraint con
      join pg_namespace n on n.oid=con.connamespace
     where n.nspname='atlas_v2'
     order by con.conname`);
  same(constraints.rows.map((row) => row.conname), expectedConstraints, 'constraint set');

  const indexes = await client.query(`
    select indexname
      from pg_indexes
     where schemaname='atlas_v2' and indexname = any($1::text[])
     order by indexname`, [expectedIndexes]);
  same(indexes.rows.map((row) => row.indexname), expectedIndexes, 'maintenance index set');

  const nullRole = await client.query(`
    select indexdef
      from pg_indexes
     where schemaname='atlas_v2' and indexname='person_politics_v2_null_role_semantic_uidx'`);
  const nullRoleDef = String(nullRole.rows[0]?.indexdef || '');
  if (!/NULLS NOT DISTINCT/i.test(nullRoleDef) || !/WHERE \(role_id IS NULL\)/i.test(nullRoleDef)) {
    throw new Error(`null-role semantic index definition drift: ${nullRoleDef}`);
  }

  const legacy = await client.query(`
    select to_regclass('public.person_politics') as legacy_table,
           to_regclass('public.atlas_person_politics_compat_v1') as legacy_compat`);
  if (legacy.rows[0]?.legacy_table || legacy.rows[0]?.legacy_compat) {
    throw new Error('legacy person-politics objects exist after baseline apply');
  }

  let secondApplyRejected = false;
  try {
    await client.query(source);
  } catch (error) {
    secondApplyRejected = /already exists|clean target/i.test(String(error?.message || error));
    try { await client.query('rollback'); } catch {}
  }
  if (!secondApplyRejected) throw new Error('baseline must reject a non-clean atlas_v2 target');

  console.log(JSON.stringify({
    marker: 'ATLAS_SCHEMA_BASELINE_V1',
    status: 'PASS',
    tables: expectedTables.length,
    constraints: expectedConstraints.length,
    maintenance_indexes: expectedIndexes.length,
    clean_target_guard: true,
    legacy_objects: 0
  }, null, 2));
} finally {
  await client.end();
}
