import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const proposalPath = path.join(root, 'db/proposals/stage2_semantic_extensions.rehearsal.sql');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required for Stage 2 schema rehearsal');

const expectedNewTables = [
  'governance_context_names',
  'governance_contexts',
  'person_polity_relation_types',
  'polity_designation_names',
  'polity_designations',
  'polity_governance_periods',
  'polity_identity_relation_types',
  'polity_identity_relations',
  'polity_relation_types',
  'polity_relations'
].sort();
const expectedActivityColumns = [
  'relation_type_id','activity_start_month','activity_start_day','activity_start_granularity','activity_start_certainty','activity_start_calendar',
  'activity_end_month','activity_end_day','activity_end_granularity','activity_end_certainty','activity_end_calendar'
].sort();
const intervalDetailColumns = [
  'valid_from_year','valid_from_month','valid_from_day','valid_from_granularity','valid_from_certainty','valid_from_calendar',
  'valid_to_year','valid_to_month','valid_to_day','valid_to_granularity','valid_to_certainty','valid_to_calendar'
].sort();

function same(actual, expected, label) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) throw new Error(`${label} mismatch\nactual=${JSON.stringify(left)}\nexpected=${JSON.stringify(right)}`);
}

async function columns(client, table, expected) {
  const result = await client.query(`
    select column_name from information_schema.columns
     where table_schema='atlas_v2' and table_name=$1 and column_name = any($2::text[])
     order by column_name`, [table, expected]);
  same(result.rows.map((row) => row.column_name), expected, `${table} columns`);
}

const ddl = fs.readFileSync(proposalPath, 'utf8');
if (!/REHEARSAL ONLY/i.test(ddl)) throw new Error('proposal must remain explicitly non-production');
if (/public\.person_politics/i.test(ddl.replace(/^\s*--.*$/gm, ''))) throw new Error('proposal must not recreate legacy person_politics');

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  const baseline = await client.query(`select count(*)::int as n from information_schema.tables where table_schema='atlas_v2'`);
  if ((baseline.rows[0]?.n ?? 0) < 23) throw new Error('current atlas_v2 baseline must be applied before Stage 2 rehearsal');

  await client.query(ddl);

  const tableRows = await client.query(`
    select table_name from information_schema.tables
     where table_schema='atlas_v2' and table_name = any($1::text[])
     order by table_name`, [expectedNewTables]);
  same(tableRows.rows.map((row) => row.table_name), expectedNewTables, 'Stage 2 table set');

  await columns(client, 'person_politics_v2', expectedActivityColumns);
  await columns(client, 'polity_governance_periods', intervalDetailColumns);
  await columns(client, 'polity_relations', intervalDetailColumns);
  await columns(client, 'polity_designations', intervalDetailColumns);

  const functionRows = await client.query(`
    select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='atlas_v2' and p.proname in ('temporal_boundary_detail_valid','temporal_boundary_or_unresolved_valid')
     order by p.proname`);
  same(functionRows.rows.map((row) => row.proname), ['temporal_boundary_detail_valid','temporal_boundary_or_unresolved_valid'], 'shared temporal validators');

  const boundaryProbe = await client.query(`
    select
      atlas_v2.temporal_boundary_detail_valid(null::smallint,null::smallint,'year','exact','gregorian') as year_ok,
      atlas_v2.temporal_boundary_detail_valid(5::smallint,null::smallint,'month','approximate','julian') as month_ok,
      atlas_v2.temporal_boundary_detail_valid(10::smallint,15::smallint,'day','exact','gregorian') as day_ok,
      atlas_v2.temporal_boundary_detail_valid(5::smallint,null::smallint,'year','exact','gregorian') as invalid_year_shape,
      atlas_v2.temporal_boundary_or_unresolved_valid(null,null::smallint,null::smallint,null,null,null) as unresolved_ok,
      atlas_v2.temporal_boundary_or_unresolved_valid(null,5::smallint,null::smallint,null,null,null) as partial_unresolved_bad,
      atlas_v2.temporal_boundary_or_unresolved_valid(0,null::smallint,null::smallint,'year','exact','gregorian') as year_zero_bad`);
  const bp = boundaryProbe.rows[0];
  if (!bp?.year_ok || !bp?.month_ok || !bp?.day_ok || bp?.invalid_year_shape || !bp?.unresolved_ok || bp?.partial_unresolved_bad || bp?.year_zero_bad) {
    throw new Error(`shared temporal boundary behavior invalid: ${JSON.stringify(bp)}`);
  }

  const indexes = await client.query(`
    select indexname from pg_indexes
     where schemaname='atlas_v2' and indexname in ('governance_context_names_preferred_locale_uq','polity_designation_names_preferred_locale_uq')
     order by indexname`);
  same(indexes.rows.map((row) => row.indexname), ['governance_context_names_preferred_locale_uq','polity_designation_names_preferred_locale_uq'], 'preferred-name indexes');

  await client.query('BEGIN');
  try {
    const p1 = '00000000-0000-4000-8000-000000000101';
    const p2 = '00000000-0000-4000-8000-000000000102';
    const rt = '00000000-0000-4000-8000-000000000201';
    const gc = '00000000-0000-4000-8000-000000000301';
    await client.query(`insert into atlas_v2.polities(id,canonical_key,polity_type,historicity) values ($1,'stage2-probe-a','state','historical'),($2,'stage2-probe-b','state','historical')`, [p1, p2]);
    await client.query(`insert into atlas_v2.polity_relation_types(id,code,category,is_active) values ($1,'probe_constituent_of','constituent',true)`, [rt]);
    await client.query(`insert into atlas_v2.governance_contexts(id,canonical_key,governance_type,historicity) values ($1,'stage2-probe-government','government','historical')`, [gc]);

    // Unresolved relation boundaries are valid Authoring state and must not be fabricated.
    await client.query(`insert into atlas_v2.polity_relations(id,subject_polity_id,object_polity_id,relation_type_id,confidence) values ('00000000-0000-4000-8000-000000000401',$1,$2,$3,'unknown')`, [p1, p2, rt]);

    await client.query(`
      insert into atlas_v2.polity_governance_periods(
        id,polity_id,governance_context_id,
        valid_from_year,valid_from_month,valid_from_day,valid_from_granularity,valid_from_certainty,valid_from_calendar,
        valid_to_year,valid_to_month,valid_to_day,valid_to_granularity,valid_to_certainty,valid_to_calendar,confidence
      ) values (
        '00000000-0000-4000-8000-000000000402',$1,$2,
        1947,8,15,'day','exact','gregorian',
        null,null,null,null,null,null,'well_established'
      )`, [p1, gc]);

    await client.query('SAVEPOINT self_relation_probe');
    let selfRejected = false;
    try {
      await client.query(`insert into atlas_v2.polity_relations(id,subject_polity_id,object_polity_id,relation_type_id,confidence) values ('00000000-0000-4000-8000-000000000403',$1,$1,$2,'unknown')`, [p1, rt]);
    } catch (error) {
      selfRejected = /polity_relations_distinct_polities_check/i.test(String(error?.message || error));
      await client.query('ROLLBACK TO SAVEPOINT self_relation_probe');
    }
    if (!selfRejected) throw new Error('self Polity relation was not rejected');

    await client.query('SAVEPOINT partial_boundary_probe');
    let partialRejected = false;
    try {
      await client.query(`insert into atlas_v2.polity_designations(id,polity_id,designation_type,valid_from_year,valid_from_month,confidence) values ('00000000-0000-4000-8000-000000000404',$1,'state_form',1800,5,'unknown')`, [p1]);
    } catch (error) {
      partialRejected = /polity_designations_from_boundary_check/i.test(String(error?.message || error));
      await client.query('ROLLBACK TO SAVEPOINT partial_boundary_probe');
    }
    if (!partialRejected) throw new Error('partial unresolved temporal tuple was not rejected');

    await client.query('SAVEPOINT year_zero_probe');
    let yearZeroRejected = false;
    try {
      await client.query(`insert into atlas_v2.polity_designations(id,polity_id,designation_type,valid_from_year,valid_from_granularity,valid_from_certainty,valid_from_calendar,confidence) values ('00000000-0000-4000-8000-000000000405',$1,'state_form',0,'year','exact','gregorian','unknown')`, [p1]);
    } catch (error) {
      yearZeroRejected = /polity_designations_from_boundary_check/i.test(String(error?.message || error));
      await client.query('ROLLBACK TO SAVEPOINT year_zero_probe');
    }
    if (!yearZeroRejected) throw new Error('historical year zero was not rejected');
  } finally {
    await client.query('ROLLBACK');
  }

  const legacy = await client.query(`select to_regclass('public.person_politics') as legacy_table, to_regclass('public.atlas_person_politics_compat_v1') as legacy_compat`);
  if (legacy.rows[0]?.legacy_table || legacy.rows[0]?.legacy_compat) throw new Error('legacy objects appeared during Stage 2 rehearsal');

  console.log(JSON.stringify({
    marker: 'ATLAS_STAGE2_SCHEMA_REHEARSAL_CURRENT_V1',
    status: 'PASS',
    production_migration_registered: false,
    new_tables: expectedNewTables.length,
    activity_extension_columns: expectedActivityColumns.length,
    shared_temporal_validators: 2,
    unresolved_boundaries_supported: true,
    partial_boundary_tuples_rejected: true,
    self_relation_guard: true,
    year_zero_guard: true,
    legacy_objects: 0
  }, null, 2));
} finally {
  await client.end();
}
