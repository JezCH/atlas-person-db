import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const connectionString = String(process.env.SUPABASE_DB_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(connectionString)) throw new Error('SUPABASE_DB_URL is required');
const outputDir = path.resolve(process.env.PHASE9B_OUTPUT_DIR || 'migration/phase-9/tmp/person-reference-inventory');
fs.mkdirSync(outputDir, { recursive: true });
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

async function q(text, params = []) { return (await client.query(text, params)).rows; }

try {
  await client.query('begin transaction isolation level repeatable read read only');

  const directFks = await q(`
    select ns.nspname as table_schema,
           cls.relname as table_name,
           con.conname as constraint_name,
           array_agg(att.attname order by u.ord) as columns,
           con.confupdtype as update_action_code,
           con.confdeltype as delete_action_code
      from pg_constraint con
      join pg_class cls on cls.oid=con.conrelid
      join pg_namespace ns on ns.oid=cls.relnamespace
      join unnest(con.conkey) with ordinality u(attnum,ord) on true
      join pg_attribute att on att.attrelid=con.conrelid and att.attnum=u.attnum
     where con.contype='f'
       and con.confrelid='atlas_v2.persons'::regclass
     group by ns.nspname,cls.relname,con.conname,con.confupdtype,con.confdeltype
     order by ns.nspname,cls.relname,con.conname`);

  const personUuidColumns = await q(`
    select table_schema,table_name,column_name,is_nullable
      from information_schema.columns
     where table_schema='atlas_v2'
       and data_type='uuid'
       and column_name ~* '(^|_)person(_|$)|person_(low|high)_id'
     order by table_name,ordinal_position`);

  const fkColumns = new Set(directFks.flatMap((fk) => fk.columns.map((column) => `${fk.table_schema}.${fk.table_name}.${column}`)));
  const nonFkPersonUuidColumns = personUuidColumns.filter((row) => !fkColumns.has(`${row.table_schema}.${row.table_name}.${row.column_name}`));

  const relationDefinitions = await q(`
    select schemaname as schema_name,viewname as object_name,'view'::text as object_type
      from pg_views
     where schemaname not in ('pg_catalog','information_schema')
       and (definition ilike '%atlas_v2.persons%' or definition ilike '%person_id%')
    union all
    select schemaname,matviewname,'materialized_view'::text
      from pg_matviews
     where schemaname not in ('pg_catalog','information_schema')
       and (definition ilike '%atlas_v2.persons%' or definition ilike '%person_id%')
     order by schema_name,object_type,object_name`);

  const functionDefinitions = await q(`
    select n.nspname as schema_name,p.proname as object_name,pg_get_function_identity_arguments(p.oid) as arguments
      from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
     where n.nspname not in ('pg_catalog','information_schema')
       and (pg_get_functiondef(p.oid) ilike '%atlas_v2.persons%' or pg_get_functiondef(p.oid) ilike '%person_id%')
     order by n.nspname,p.proname,arguments`);

  const triggers = await q(`
    select n.nspname as schema_name,c.relname as table_name,t.tgname as trigger_name,pg_get_triggerdef(t.oid,true) as definition
      from pg_trigger t
      join pg_class c on c.oid=t.tgrelid
      join pg_namespace n on n.oid=c.relnamespace
     where not t.tgisinternal
       and n.nspname='atlas_v2'
       and (c.relname in ('persons','person_names','person_politics_v2','person_duplicate_candidates','person_duplicate_reviews')
            or pg_get_triggerdef(t.oid,true) ilike '%person%')
     order by n.nspname,c.relname,t.tgname`);

  const relevantConstraints = await q(`
    select n.nspname as schema_name,c.relname as table_name,con.conname as constraint_name,con.contype as constraint_type,pg_get_constraintdef(con.oid,true) as definition
      from pg_constraint con
      join pg_class c on c.oid=con.conrelid
      join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='atlas_v2'
       and c.relname in ('persons','person_names','person_politics_v2','person_duplicate_candidates','person_duplicate_reviews')
     order by c.relname,con.conname`);

  const counts = (await q(`
    select
      (select count(*)::int from atlas_v2.persons) as persons,
      (select count(distinct person_id)::int from atlas_v2.person_politics_v2) as active_persons,
      (select count(*)::int from atlas_v2.person_names) as person_names,
      (select count(*)::int from atlas_v2.person_politics_v2) as relationships,
      (select count(*)::int from atlas_v2.person_duplicate_candidates) as duplicate_candidates,
      (select count(*)::int from atlas_v2.person_duplicate_reviews) as duplicate_reviews
  `))[0];

  const referenceCounts = {};
  for (const fk of directFks) {
    if (fk.columns.length !== 1) continue;
    const key = `${fk.table_schema}.${fk.table_name}.${fk.columns[0]}`;
    const rows = await q(`select count(*)::int as count from ${fk.table_schema}.${fk.table_name} where ${fk.columns[0]} is not null`);
    referenceCounts[key] = rows[0].count;
  }

  const report = {
    marker: 'PHASE9B_LIVE_PERSON_REFERENCE_INVENTORY',
    read_only: true,
    counts,
    direct_fks_to_persons: directFks,
    person_like_uuid_columns: personUuidColumns,
    non_fk_person_uuid_columns: nonFkPersonUuidColumns,
    relation_definitions: relationDefinitions,
    function_definitions: functionDefinitions,
    triggers,
    relevant_constraints: relevantConstraints,
    reference_counts: referenceCounts
  };

  await client.query('commit');
  fs.writeFileSync(path.join(outputDir,'report.json'), `${JSON.stringify(report,null,2)}\n`);
  console.log(JSON.stringify(report,null,2));
} catch (error) {
  try { await client.query('rollback'); } catch {}
  const report = { marker:'PHASE9B_LIVE_PERSON_REFERENCE_INVENTORY', read_only:true, status:'FAIL', error:error?.message || String(error) };
  fs.writeFileSync(path.join(outputDir,'report.json'), `${JSON.stringify(report,null,2)}\n`);
  throw error;
} finally {
  await client.end();
}
