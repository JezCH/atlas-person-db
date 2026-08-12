import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const proposalPath = path.join(root, 'db/proposals/stage2_provenance.rehearsal.sql');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required for Stage 2 provenance rehearsal');

const expectedTables = [
  'polity_designation_sources',
  'polity_governance_period_sources',
  'polity_identity_relation_sources',
  'polity_relation_sources'
].sort();
const expectedSourceIndexes = [
  'polity_designation_sources_source_idx',
  'polity_governance_period_sources_source_idx',
  'polity_identity_relation_sources_source_idx',
  'polity_relation_sources_source_idx'
].sort();

function same(actual, expected, label) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) throw new Error(`${label} mismatch\nactual=${JSON.stringify(left)}\nexpected=${JSON.stringify(right)}`);
}

const ddl = fs.readFileSync(proposalPath, 'utf8');
if (!/REHEARSAL ONLY/i.test(ddl)) throw new Error('provenance proposal must remain explicitly non-production');
if (/CREATE\s+TABLE\s+atlas_v2\.sources/i.test(ddl)) throw new Error('provenance proposal must reuse the existing normalized sources table');

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  const prerequisite = await client.query(`
    select
      to_regclass('atlas_v2.polity_governance_periods') as governance_periods,
      to_regclass('atlas_v2.polity_relations') as polity_relations,
      to_regclass('atlas_v2.polity_designations') as polity_designations,
      to_regclass('atlas_v2.polity_identity_relations') as identity_relations,
      to_regclass('atlas_v2.sources') as sources`);
  const prereq = prerequisite.rows[0] || {};
  if (Object.values(prereq).some((value) => !value)) throw new Error(`Stage 2 semantic rehearsal must run before provenance rehearsal: ${JSON.stringify(prereq)}`);

  await client.query(ddl);

  const tables = await client.query(`select table_name from information_schema.tables where table_schema='atlas_v2' and table_name = any($1::text[]) order by table_name`, [expectedTables]);
  same(tables.rows.map((row) => row.table_name), expectedTables, 'provenance tables');
  const indexes = await client.query(`select indexname from pg_indexes where schemaname='atlas_v2' and indexname = any($1::text[]) order by indexname`, [expectedSourceIndexes]);
  same(indexes.rows.map((row) => row.indexname), expectedSourceIndexes, 'source reverse-lookup indexes');

  const fkRows = await client.query(`
    select con.conname, confdeltype from pg_constraint con
    join pg_namespace n on n.oid=con.connamespace
    where n.nspname='atlas_v2' and con.conname = any($1::text[])
    order by con.conname`, [[
      'polity_governance_period_sources_period_id_fkey','polity_governance_period_sources_source_id_fkey',
      'polity_relation_sources_relation_id_fkey','polity_relation_sources_source_id_fkey',
      'polity_designation_sources_designation_id_fkey','polity_designation_sources_source_id_fkey',
      'polity_identity_relation_sources_relation_id_fkey','polity_identity_relation_sources_source_id_fkey'
    ]]);
  if (fkRows.rows.length !== 8) throw new Error(`provenance FK contract incomplete: ${fkRows.rows.length}`);
  for (const row of fkRows.rows) {
    const sourceFk = row.conname.endsWith('_source_id_fkey');
    const expectedDelete = sourceFk ? 'r' : 'c';
    if (row.confdeltype !== expectedDelete) throw new Error(`${row.conname} delete behavior drift: expected ${expectedDelete}, got ${row.confdeltype}`);
  }

  const primaryKeys = await client.query(`
    select tc.table_name, array_agg(kcu.column_name order by kcu.ordinal_position) as columns
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name=kcu.constraint_name and tc.constraint_schema=kcu.constraint_schema
     where tc.constraint_schema='atlas_v2'
       and tc.constraint_type='PRIMARY KEY'
       and tc.table_name = any($1::text[])
     group by tc.table_name`, [expectedTables]);
  if (primaryKeys.rows.length !== 4) throw new Error(`provenance primary-key contract incomplete: ${primaryKeys.rows.length}`);
  for (const row of primaryKeys.rows) {
    if (!Array.isArray(row.columns) || row.columns.length !== 3 || !row.columns.includes('source_id') || !row.columns.includes('source_locator_key')) {
      throw new Error(`provenance PK must permit multiple locators per source/assertion: ${row.table_name} ${JSON.stringify(row.columns)}`);
    }
  }

  const legacyActivitySources = await client.query(`select to_regclass('atlas_v2.person_politics_sources') as current_activity_sources`);
  if (!legacyActivitySources.rows[0]?.current_activity_sources) throw new Error('existing person_politics_sources disappeared');

  await client.query('BEGIN');
  try {
    const polityA = '00000000-0000-4000-8000-000000001001';
    const polityB = '00000000-0000-4000-8000-000000001002';
    const governance = '00000000-0000-4000-8000-000000001003';
    const relationType = '00000000-0000-4000-8000-000000001004';
    const identityRelationType = '00000000-0000-4000-8000-000000001005';
    const source = '00000000-0000-4000-8000-000000001006';
    const governancePeriod = '00000000-0000-4000-8000-000000001007';
    const polityRelation = '00000000-0000-4000-8000-000000001008';
    const designation = '00000000-0000-4000-8000-000000001009';
    const identityRelation = '00000000-0000-4000-8000-000000001010';

    await client.query(`insert into atlas_v2.polities(id,canonical_key,polity_type,historicity) values ($1,'prov-probe-a','state','historical'),($2,'prov-probe-b','state','historical')`, [polityA, polityB]);
    await client.query(`insert into atlas_v2.governance_contexts(id,canonical_key,governance_type,historicity) values ($1,'prov-probe-government','government','historical')`, [governance]);
    await client.query(`insert into atlas_v2.polity_relation_types(id,code,category,is_active) values ($1,'prov_probe_relation','dependency',true)`, [relationType]);
    await client.query(`insert into atlas_v2.polity_identity_relation_types(id,code,is_active) values ($1,'prov_probe_transition',true)`, [identityRelationType]);
    await client.query(`insert into atlas_v2.sources(id,source_key,source_type,title,sha256,bytes) values ($1,'prov-probe-source','test_fixture','Stage 2 provenance probe','probe-sha256',1)`, [source]);

    await client.query(`insert into atlas_v2.polity_governance_periods(id,polity_id,governance_context_id,confidence) values ($1,$2,$3,'unknown')`, [governancePeriod, polityA, governance]);
    await client.query(`insert into atlas_v2.polity_relations(id,subject_polity_id,object_polity_id,relation_type_id,confidence) values ($1,$2,$3,$4,'unknown')`, [polityRelation, polityA, polityB, relationType]);
    await client.query(`insert into atlas_v2.polity_designations(id,polity_id,designation_type,confidence) values ($1,$2,'state_form','unknown')`, [designation, polityA]);
    await client.query(`insert into atlas_v2.polity_identity_relations(id,predecessor_polity_id,successor_polity_id,relation_type_id,confidence) values ($1,$2,$3,$4,'unknown')`, [identityRelation, polityA, polityB, identityRelationType]);

    await client.query(`insert into atlas_v2.polity_governance_period_sources values ($1,$2,'section:governance')`, [governancePeriod, source]);
    await client.query(`insert into atlas_v2.polity_relation_sources values ($1,$2,'page:10'),($1,$2,'page:42')`, [polityRelation, source]);
    await client.query(`insert into atlas_v2.polity_designation_sources values ($1,$2,'section:designation')`, [designation, source]);
    await client.query(`insert into atlas_v2.polity_identity_relation_sources values ($1,$2,'section:transition')`, [identityRelation, source]);

    const linked = await client.query(`
      select
        (select count(*) from atlas_v2.polity_governance_period_sources)::int as governance_links,
        (select count(*) from atlas_v2.polity_relation_sources)::int as relation_links,
        (select count(*) from atlas_v2.polity_designation_sources)::int as designation_links,
        (select count(*) from atlas_v2.polity_identity_relation_sources)::int as identity_links`);
    const l = linked.rows[0];
    if (l.governance_links !== 1 || l.relation_links !== 2 || l.designation_links !== 1 || l.identity_links !== 1) throw new Error(`provenance multi-locator insert probe failed: ${JSON.stringify(l)}`);

    await client.query('SAVEPOINT blank_locator_probe');
    let blankRejected = false;
    try {
      await client.query(`insert into atlas_v2.polity_relation_sources values ($1,$2,'   ')`, [polityRelation, source]);
    } catch (error) {
      blankRejected = /polity_relation_sources_locator_check/i.test(String(error?.message || error));
      await client.query('ROLLBACK TO SAVEPOINT blank_locator_probe');
    }
    if (!blankRejected) throw new Error('blank source locator was not rejected');

    await client.query('SAVEPOINT source_delete_probe');
    let sourceDeleteRejected = false;
    try {
      await client.query(`delete from atlas_v2.sources where id=$1`, [source]);
    } catch (error) {
      sourceDeleteRejected = /foreign key constraint/i.test(String(error?.message || error));
      await client.query('ROLLBACK TO SAVEPOINT source_delete_probe');
    }
    if (!sourceDeleteRejected) throw new Error('deleting a cited Source was not rejected');

    await client.query(`delete from atlas_v2.polity_relations where id=$1`, [polityRelation]);
    const afterDelete = await client.query(`select count(*)::int as n from atlas_v2.polity_relation_sources where polity_relation_id=$1`, [polityRelation]);
    if (afterDelete.rows[0]?.n !== 0) throw new Error('assertion delete did not cascade all provenance locators');
  } finally {
    await client.query('ROLLBACK');
  }

  console.log(JSON.stringify({
    marker: 'ATLAS_STAGE2_PROVENANCE_REHEARSAL_CURRENT_V1',
    status: 'PASS',
    production_migration_registered: false,
    provenance_tables: expectedTables.length,
    shared_source_identity: true,
    mandatory_nonblank_locator: true,
    multiple_locators_per_source_assertion: true,
    assertion_delete_cascades_links: true,
    cited_source_delete_restricted: true,
    existing_activity_source_contract_preserved: true
  }, null, 2));
} finally {
  await client.end();
}
