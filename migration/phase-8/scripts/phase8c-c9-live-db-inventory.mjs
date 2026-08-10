import { Client } from 'pg';

const databaseUrl = process.env.SUPABASE_DB_URL;
if (!databaseUrl) throw new Error('SUPABASE_DB_URL is required');

const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

const exactLegacyRef = /(^|[^A-Za-z0-9_])(?:public\.)?person_politics([^A-Za-z0-9_]|$)/;
const exactCompatRef = /(^|[^A-Za-z0-9_])(?:public\.)?atlas_person_politics_compat_v1([^A-Za-z0-9_]|$)/;

async function rows(sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows || [];
}

async function objectInfo(schema, name) {
  const result = await rows(`
    select c.oid::text as oid,
           n.nspname as schema_name,
           c.relname as object_name,
           c.relkind,
           c.relrowsecurity,
           pg_get_userbyid(c.relowner) as owner
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = $1 and c.relname = $2
  `, [schema, name]);
  return result[0] || null;
}

async function relationDependents(oid) {
  if (!oid) return [];
  return rows(`
    select distinct n.nspname as schema_name,
           c.relname as object_name,
           c.relkind
      from pg_depend d
      join pg_rewrite r on r.oid = d.objid
      join pg_class c on c.oid = r.ev_class
      join pg_namespace n on n.oid = c.relnamespace
     where d.refobjid = $1::oid
       and c.oid <> $1::oid
     order by 1,2
  `, [oid]);
}

async function functionDependents(oid) {
  if (!oid) return [];
  return rows(`
    select distinct n.nspname as schema_name,
           p.proname as function_name,
           pg_get_function_identity_arguments(p.oid) as arguments
      from pg_depend d
      join pg_proc p on p.oid = d.objid
      join pg_namespace n on n.oid = p.pronamespace
     where d.refobjid = $1::oid
       and n.nspname not in ('pg_catalog','information_schema')
     order by 1,2,3
  `, [oid]);
}

async function textualFunctionRefs() {
  const definitions = await rows(`
    select n.nspname as schema_name,
           p.proname as function_name,
           pg_get_function_identity_arguments(p.oid) as arguments,
           pg_get_functiondef(p.oid) as definition
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname not in ('pg_catalog','information_schema')
       and p.prokind in ('f','p')
  `);
  return definitions
    .map((entry) => ({
      schema_name: entry.schema_name,
      function_name: entry.function_name,
      arguments: entry.arguments,
      legacy_ref: exactLegacyRef.test(entry.definition || ''),
      compatibility_ref: exactCompatRef.test(entry.definition || '')
    }))
    .filter((entry) => entry.legacy_ref || entry.compatibility_ref)
    .sort((a,b) => `${a.schema_name}.${a.function_name}`.localeCompare(`${b.schema_name}.${b.function_name}`));
}

async function textualViewRefs() {
  const definitions = await rows(`
    select schemaname as schema_name, viewname as view_name, definition
      from pg_views
     where schemaname not in ('pg_catalog','information_schema')
  `);
  return definitions
    .map((entry) => ({
      schema_name: entry.schema_name,
      view_name: entry.view_name,
      legacy_ref: exactLegacyRef.test(entry.definition || ''),
      compatibility_ref: exactCompatRef.test(entry.definition || '')
    }))
    .filter((entry) => entry.legacy_ref || entry.compatibility_ref)
    .filter((entry) => !(entry.schema_name === 'public' && entry.view_name === 'atlas_person_politics_compat_v1'))
    .sort((a,b) => `${a.schema_name}.${a.view_name}`.localeCompare(`${b.schema_name}.${b.view_name}`));
}

const legacy = await objectInfo('public', 'person_politics');
const compatibility = await objectInfo('public', 'atlas_person_politics_compat_v1');
const normalized = await objectInfo('atlas_v2', 'person_politics_v2');

const coverage = (legacy && compatibility && normalized) ? (await rows(`
  with direct_v2 as (
    select pp.id,
           pn.name::text as person_name,
           ptn.name::text as politic_name,
           pp.activity_start,
           pp.activity_end,
           r.source_label::text as role,
           pb.code::text as period_basis,
           pp.notes
      from atlas_v2.person_politics_v2 pp
      join atlas_v2.person_names pn
        on pn.person_id = pp.person_id
       and pn.locale = 'en'
       and pn.is_preferred = true
      join atlas_v2.polity_names ptn
        on ptn.polity_id = pp.polity_id
       and ptn.locale = 'en'
       and ptn.is_preferred = true
      left join atlas_v2.roles r on r.id = pp.role_id
      join atlas_v2.period_bases pb on pb.id = pp.period_basis_id
  )
  select
    (select count(*)::int from public.person_politics) as legacy_rows,
    (select count(*)::int from public.atlas_person_politics_compat_v1) as compatibility_rows,
    (select count(*)::int from atlas_v2.person_politics_v2) as normalized_rows,
    (select count(*)::int from direct_v2) as direct_projection_rows,
    (select count(*)::int from (
      select person_name,politic_name,activity_start,activity_end,role,period_basis,notes
        from public.person_politics
      except all
      select person_name,politic_name,activity_start,activity_end,role,period_basis,notes
        from direct_v2
    ) q) as legacy_rows_missing_from_v2,
    (select count(*)::int from (
      select id,person_name,politic_name,activity_start,activity_end,role,period_basis,notes
        from public.atlas_person_politics_compat_v1
      except all
      select id,person_name,politic_name,activity_start,activity_end,role,period_basis,notes
        from direct_v2
    ) q) as compatibility_rows_missing_from_direct,
    (select count(*)::int from (
      select id,person_name,politic_name,activity_start,activity_end,role,period_basis,notes
        from direct_v2
      except all
      select id,person_name,politic_name,activity_start,activity_end,role,period_basis,notes
        from public.atlas_person_politics_compat_v1
    ) q) as direct_rows_missing_from_compatibility
`))[0] : null;

const foreignKeys = legacy ? await rows(`
  select conname,
         conrelid::regclass::text as from_relation,
         confrelid::regclass::text as to_relation
    from pg_constraint
   where contype = 'f'
     and (conrelid = $1::oid or confrelid = $1::oid)
   order by 2,1
`, [legacy.oid]) : [];

const triggers = legacy ? await rows(`
  select tgname as trigger_name,
         pg_get_triggerdef(oid, true) as definition
    from pg_trigger
   where tgrelid = $1::oid
     and not tgisinternal
   order by tgname
`, [legacy.oid]) : [];

const policies = await rows(`
  select schemaname as schema_name, tablename as table_name, policyname as policy_name,
         permissive, roles, cmd, qual, with_check
    from pg_policies
   where schemaname = 'public' and tablename = 'person_politics'
   order by policyname
`);

const grants = await rows(`
  select table_schema as schema_name, table_name, grantee, privilege_type
    from information_schema.role_table_grants
   where table_schema = 'public'
     and table_name in ('person_politics','atlas_person_politics_compat_v1')
   order by table_name,grantee,privilege_type
`);

const publications = await rows(`
  select pubname, schemaname as schema_name, tablename as table_name
    from pg_publication_tables
   where schemaname = 'public'
     and tablename in ('person_politics','atlas_person_politics_compat_v1')
   order by pubname,tablename
`);

const compatibilityDefinition = compatibility ? (await rows(`
  select definition
    from pg_views
   where schemaname = 'public' and viewname = 'atlas_person_politics_compat_v1'
`))[0]?.definition || null : null;

const legacyRelationDependents = await relationDependents(legacy?.oid);
const compatibilityRelationDependents = await relationDependents(compatibility?.oid);
const legacyFunctionDependents = await functionDependents(legacy?.oid);
const compatibilityFunctionDependents = await functionDependents(compatibility?.oid);
const textualFunctions = await textualFunctionRefs();
const textualViews = await textualViewRefs();

const inboundLegacyForeignKeys = foreignKeys.filter((entry) => entry.to_relation === 'person_politics' || entry.to_relation === 'public.person_politics')
  .filter((entry) => entry.from_relation !== 'person_politics' && entry.from_relation !== 'public.person_politics');

const blockers = [];
if (!legacy) blockers.push('LEGACY_TABLE_MISSING_UNEXPECTEDLY');
if (!compatibility) blockers.push('COMPATIBILITY_VIEW_MISSING_UNEXPECTEDLY');
if (!normalized) blockers.push('NORMALIZED_TABLE_MISSING');
if (legacy && legacy.relkind !== 'r') blockers.push(`LEGACY_OBJECT_KIND_${legacy.relkind}`);
if (compatibility && compatibility.relkind !== 'v') blockers.push(`COMPATIBILITY_OBJECT_KIND_${compatibility.relkind}`);
if (coverage) {
  if (Number(coverage.compatibility_rows) !== Number(coverage.normalized_rows)) blockers.push('COMPATIBILITY_COUNT_DIFFERS_FROM_NORMALIZED');
  if (Number(coverage.direct_projection_rows) !== Number(coverage.normalized_rows)) blockers.push('DIRECT_PROJECTION_NOT_ROW_COMPLETE');
  if (Number(coverage.legacy_rows_missing_from_v2) !== 0) blockers.push('LEGACY_ROWS_MISSING_FROM_V2');
  if (Number(coverage.compatibility_rows_missing_from_direct) !== 0) blockers.push('COMPATIBILITY_DIFFERS_FROM_DIRECT');
  if (Number(coverage.direct_rows_missing_from_compatibility) !== 0) blockers.push('DIRECT_DIFFERS_FROM_COMPATIBILITY');
}
if (legacyRelationDependents.length) blockers.push('LEGACY_RELATION_DEPENDENTS_PRESENT');
if (compatibilityRelationDependents.length) blockers.push('COMPATIBILITY_RELATION_DEPENDENTS_PRESENT');
if (legacyFunctionDependents.length) blockers.push('LEGACY_FUNCTION_DEPENDENTS_PRESENT');
if (compatibilityFunctionDependents.length) blockers.push('COMPATIBILITY_FUNCTION_DEPENDENTS_PRESENT');
if (textualFunctions.some((entry) => entry.legacy_ref || entry.compatibility_ref)) blockers.push('TEXTUAL_FUNCTION_REFERENCES_PRESENT');
if (textualViews.some((entry) => entry.legacy_ref || entry.compatibility_ref)) blockers.push('TEXTUAL_VIEW_REFERENCES_PRESENT');
if (inboundLegacyForeignKeys.length) blockers.push('INBOUND_LEGACY_FOREIGN_KEYS_PRESENT');
if (compatibilityDefinition && exactLegacyRef.test(compatibilityDefinition)) blockers.push('COMPATIBILITY_VIEW_STILL_READS_LEGACY');

const report = {
  marker: 'PHASE8C_C9_LIVE_DB_RETIREMENT_INVENTORY',
  checked_at: new Date().toISOString(),
  github_sha: process.env.GITHUB_SHA || null,
  objects: { legacy, compatibility, normalized },
  coverage,
  dependencies: {
    legacy_relation_dependents: legacyRelationDependents,
    compatibility_relation_dependents: compatibilityRelationDependents,
    legacy_function_dependents: legacyFunctionDependents,
    compatibility_function_dependents: compatibilityFunctionDependents,
    textual_function_references: textualFunctions,
    textual_view_references: textualViews,
    foreign_keys: foreignKeys,
    inbound_legacy_foreign_keys: inboundLegacyForeignKeys,
    triggers,
    publications
  },
  access: { policies, grants },
  compatibility_view_definition: compatibilityDefinition,
  blockers,
  retirement_ready: blockers.length === 0,
  retirement_order: ['public.atlas_person_politics_compat_v1', 'public.person_politics'],
  destructive_action_performed: false
};

console.log(JSON.stringify(report, null, 2));
await client.end();
