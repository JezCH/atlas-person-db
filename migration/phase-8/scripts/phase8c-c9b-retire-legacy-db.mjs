import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const EXPECTED_INVENTORY = Object.freeze({
  sha: '17f6af54fcb01a884e44b55c4e1ac2cad9d23faa',
  run_id: '31362547973',
  artifact_id: '9052889263',
  digest: 'sha256:3c31babe79115cf7f96b62eab1ea2ab5238ba5287beeb07386c65bb237c481a4',
  legacy_rows: 319
});

const databaseUrl = process.env.SUPABASE_DB_URL;
if (!databaseUrl) throw new Error('SUPABASE_DB_URL is required');

const outputDir = process.env.C9_OUTPUT_DIR || 'migration/phase-8/tmp/c9b-retirement';
fs.mkdirSync(outputDir, { recursive: true });

function assertPinnedEvidence() {
  const actual = {
    sha: process.env.C9_INVENTORY_SHA,
    run_id: process.env.C9_INVENTORY_RUN_ID,
    artifact_id: process.env.C9_INVENTORY_ARTIFACT_ID,
    digest: process.env.C9_INVENTORY_DIGEST
  };
  for (const [key, expected] of Object.entries(EXPECTED_INVENTORY)) {
    if (key === 'legacy_rows') continue;
    if (String(actual[key] || '') !== String(expected)) {
      throw new Error(`C9 inventory evidence mismatch for ${key}`);
    }
  }
}

const exactLegacyRef = /(^|[^A-Za-z0-9_])(?:public\.)?person_politics([^A-Za-z0-9_]|$)/;
const exactCompatRef = /(^|[^A-Za-z0-9_])(?:public\.)?atlas_person_politics_compat_v1([^A-Za-z0-9_]|$)/;

const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

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

async function coverage() {
  return (await rows(`
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
  `))[0];
}

async function preflight() {
  const legacy = await objectInfo('public', 'person_politics');
  const compatibility = await objectInfo('public', 'atlas_person_politics_compat_v1');
  const normalized = await objectInfo('atlas_v2', 'person_politics_v2');
  const blockers = [];

  if (!legacy) blockers.push('LEGACY_TABLE_MISSING_UNEXPECTEDLY');
  if (!compatibility) blockers.push('COMPATIBILITY_VIEW_MISSING_UNEXPECTEDLY');
  if (!normalized) blockers.push('NORMALIZED_TABLE_MISSING');
  if (legacy && legacy.relkind !== 'r') blockers.push(`LEGACY_OBJECT_KIND_${legacy.relkind}`);
  if (compatibility && compatibility.relkind !== 'v') blockers.push(`COMPATIBILITY_OBJECT_KIND_${compatibility.relkind}`);
  if (!legacy || !compatibility || !normalized) return { legacy, compatibility, normalized, blockers };

  const currentCoverage = await coverage();
  if (Number(currentCoverage.legacy_rows) !== EXPECTED_INVENTORY.legacy_rows) blockers.push('LEGACY_ROW_COUNT_CHANGED_SINCE_C9A');
  if (Number(currentCoverage.compatibility_rows) !== Number(currentCoverage.normalized_rows)) blockers.push('COMPATIBILITY_COUNT_DIFFERS_FROM_NORMALIZED');
  if (Number(currentCoverage.direct_projection_rows) !== Number(currentCoverage.normalized_rows)) blockers.push('DIRECT_PROJECTION_NOT_ROW_COMPLETE');
  if (Number(currentCoverage.legacy_rows_missing_from_v2) !== 0) blockers.push('LEGACY_ROWS_MISSING_FROM_V2');
  if (Number(currentCoverage.compatibility_rows_missing_from_direct) !== 0) blockers.push('COMPATIBILITY_DIFFERS_FROM_DIRECT');
  if (Number(currentCoverage.direct_rows_missing_from_compatibility) !== 0) blockers.push('DIRECT_DIFFERS_FROM_COMPATIBILITY');

  const legacyRelationDependents = await relationDependents(legacy.oid);
  const compatibilityRelationDependents = await relationDependents(compatibility.oid);
  const legacyFunctionDependents = await functionDependents(legacy.oid);
  const compatibilityFunctionDependents = await functionDependents(compatibility.oid);
  const textualFunctions = await textualFunctionRefs();
  const textualViews = await textualViewRefs();
  const foreignKeys = await rows(`
    select conname,
           conrelid::regclass::text as from_relation,
           confrelid::regclass::text as to_relation
      from pg_constraint
     where contype = 'f'
       and (conrelid = $1::oid or confrelid = $1::oid)
     order by 2,1
  `, [legacy.oid]);
  const inboundLegacyForeignKeys = foreignKeys
    .filter((entry) => entry.to_relation === 'person_politics' || entry.to_relation === 'public.person_politics')
    .filter((entry) => entry.from_relation !== 'person_politics' && entry.from_relation !== 'public.person_politics');
  const publications = await rows(`
    select pubname, schemaname as schema_name, tablename as table_name
      from pg_publication_tables
     where schemaname = 'public'
       and tablename in ('person_politics','atlas_person_politics_compat_v1')
     order by pubname,tablename
  `);
  const compatibilityDefinition = (await rows(`
    select definition
      from pg_views
     where schemaname = 'public' and viewname = 'atlas_person_politics_compat_v1'
  `))[0]?.definition || null;

  if (legacyRelationDependents.length) blockers.push('LEGACY_RELATION_DEPENDENTS_PRESENT');
  if (compatibilityRelationDependents.length) blockers.push('COMPATIBILITY_RELATION_DEPENDENTS_PRESENT');
  if (legacyFunctionDependents.length) blockers.push('LEGACY_FUNCTION_DEPENDENTS_PRESENT');
  if (compatibilityFunctionDependents.length) blockers.push('COMPATIBILITY_FUNCTION_DEPENDENTS_PRESENT');
  if (textualFunctions.length) blockers.push('TEXTUAL_FUNCTION_REFERENCES_PRESENT');
  if (textualViews.length) blockers.push('TEXTUAL_VIEW_REFERENCES_PRESENT');
  if (inboundLegacyForeignKeys.length) blockers.push('INBOUND_LEGACY_FOREIGN_KEYS_PRESENT');
  if (publications.length) blockers.push('RETIREMENT_TARGET_IN_PUBLICATION');
  if (compatibilityDefinition && exactLegacyRef.test(compatibilityDefinition)) blockers.push('COMPATIBILITY_VIEW_STILL_READS_LEGACY');

  return {
    legacy,
    compatibility,
    normalized,
    coverage: currentCoverage,
    dependencies: {
      legacy_relation_dependents: legacyRelationDependents,
      compatibility_relation_dependents: compatibilityRelationDependents,
      legacy_function_dependents: legacyFunctionDependents,
      compatibility_function_dependents: compatibilityFunctionDependents,
      textual_function_references: textualFunctions,
      textual_view_references: textualViews,
      foreign_keys: foreignKeys,
      inbound_legacy_foreign_keys: inboundLegacyForeignKeys,
      publications
    },
    compatibility_view_definition: compatibilityDefinition,
    blockers
  };
}

let transactionStarted = false;
let destructiveStatementsAttempted = false;
let before = null;
let after = null;

try {
  assertPinnedEvidence();
  await client.connect();
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
  transactionStarted = true;
  await client.query("SET LOCAL lock_timeout = '15s'");
  await client.query("SET LOCAL statement_timeout = '120s'");
  await client.query("SELECT pg_advisory_xact_lock(hashtext('atlas:phase8c:c9b:legacy-db-retirement'))");
  await client.query('LOCK TABLE public.person_politics IN ACCESS EXCLUSIVE MODE');
  await client.query('LOCK TABLE atlas_v2.person_politics_v2 IN SHARE MODE');

  before = await preflight();
  fs.writeFileSync(path.join(outputDir, 'before.json'), JSON.stringify(before, null, 2));

  if (before.blockers.length) throw new Error(`C9B blocked: ${JSON.stringify(before.blockers)}`);

  const legacySnapshot = await rows('select * from public.person_politics order by id');
  fs.writeFileSync(path.join(outputDir, 'legacy-snapshot.json'), JSON.stringify(legacySnapshot, null, 2));

  destructiveStatementsAttempted = true;
  await client.query('DROP VIEW public.atlas_person_politics_compat_v1');
  await client.query('DROP TABLE public.person_politics');

  const legacyAfter = await objectInfo('public', 'person_politics');
  const compatibilityAfter = await objectInfo('public', 'atlas_person_politics_compat_v1');
  const normalizedAfter = await objectInfo('atlas_v2', 'person_politics_v2');
  const normalizedRowsAfter = Number((await rows('select count(*)::int as count from atlas_v2.person_politics_v2'))[0]?.count || 0);

  if (legacyAfter) throw new Error('legacy table still exists after DROP');
  if (compatibilityAfter) throw new Error('compatibility view still exists after DROP');
  if (!normalizedAfter || normalizedAfter.relkind !== 'r') throw new Error('normalized relationship table missing after DROP');
  if (normalizedRowsAfter !== Number(before.coverage.normalized_rows)) throw new Error('normalized row count changed inside retirement transaction');

  after = {
    legacy: legacyAfter,
    compatibility: compatibilityAfter,
    normalized: normalizedAfter,
    normalized_rows: normalizedRowsAfter
  };
  fs.writeFileSync(path.join(outputDir, 'after.json'), JSON.stringify(after, null, 2));

  await client.query('COMMIT');
  transactionStarted = false;

  const report = {
    marker: 'PHASE8C_C9B_LEGACY_DB_RETIREMENT',
    applied_at: new Date().toISOString(),
    github_sha: process.env.GITHUB_SHA || null,
    pinned_inventory: EXPECTED_INVENTORY,
    retirement_order: ['public.atlas_person_politics_compat_v1', 'public.person_politics'],
    before,
    after,
    destructive_statements_attempted: true,
    destructive_action_committed: true,
    rollback_performed: false
  };
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  if (transactionStarted) {
    try { await client.query('ROLLBACK'); } catch {}
  }
  const failure = {
    marker: 'PHASE8C_C9B_LEGACY_DB_RETIREMENT',
    failed_at: new Date().toISOString(),
    github_sha: process.env.GITHUB_SHA || null,
    pinned_inventory: EXPECTED_INVENTORY,
    before,
    after,
    error: error?.message || String(error),
    destructive_statements_attempted: destructiveStatementsAttempted,
    destructive_action_committed: false,
    rollback_performed: transactionStarted
  };
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(failure, null, 2));
  console.error(JSON.stringify(failure, null, 2));
  process.exitCode = 1;
} finally {
  try { await client.end(); } catch {}
}
