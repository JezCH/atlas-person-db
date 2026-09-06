import path from 'node:path';
import { createRequire } from 'node:module';
import pg from 'pg';

const require = createRequire(import.meta.url);
const { RUNTIME_MIGRATION_PATHS, applyRuntimeMigrations } = require('../server/atlas-runtime-migrations.js');
const { compileRuntimeProjection } = require('../server/atlas-runtime-compile-service.js');
const { Client } = pg;

const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required for Runtime schema rehearsal');

const expectedMigrations = ['20260906_runtime_person_politics_projection_v1.sql'];
function same(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} mismatch\nactual=${JSON.stringify(actual)}\nexpected=${JSON.stringify(expected)}`);
  }
}

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  same(RUNTIME_MIGRATION_PATHS.map((item) => path.basename(item)), expectedMigrations, 'Runtime migration registry');

  const first = await applyRuntimeMigrations(client);
  const second = await applyRuntimeMigrations(client);
  same(first.applied, expectedMigrations, 'first Runtime migration apply');
  same(second.applied, expectedMigrations, 'second Runtime migration replay');

  const tables = await client.query(`
    select table_name
      from information_schema.tables
     where table_schema='atlas_v2'
       and table_name in ('runtime_compile_runs','runtime_person_politics_v1')
     order by table_name`);
  same(tables.rows.map((row) => row.table_name), ['runtime_compile_runs','runtime_person_politics_v1'], 'Runtime table set');

  const runtimeColumns = await client.query(`
    select column_name, is_nullable
      from information_schema.columns
     where table_schema='atlas_v2'
       and table_name='runtime_person_politics_v1'
       and column_name in ('activity_start','activity_end','compile_key','provenance_snapshot')
     order by column_name`);
  const byName = Object.fromEntries(runtimeColumns.rows.map((row) => [row.column_name, row.is_nullable]));
  if (byName.activity_start !== 'NO' || byName.compile_key !== 'NO' || byName.provenance_snapshot !== 'NO' || byName.activity_end !== 'YES') {
    throw new Error(`Runtime column nullability drift: ${JSON.stringify(byName)}`);
  }

  const compile = await compileRuntimeProjection(client);
  if (compile.marker !== 'ATLAS_RUNTIME_PERSON_POLITICS_COMPILE_V1' || !compile.committed) {
    throw new Error(`Runtime compile rehearsal failed: ${JSON.stringify(compile)}`);
  }
  if (compile.input_row_count !== 0 || compile.output_row_count !== 0 || compile.excluded_row_count !== 0) {
    throw new Error(`fresh-schema Runtime compile must be empty: ${JSON.stringify(compile)}`);
  }

  const replay = await compileRuntimeProjection(client);
  if (!replay.ledger_replay || replay.compile_key !== compile.compile_key || replay.output_fingerprint !== compile.output_fingerprint) {
    throw new Error(`Runtime deterministic replay failed: ${JSON.stringify(replay)}`);
  }

  const ledger = await client.query('select count(*)::int as count from atlas_v2.runtime_compile_runs');
  const runtimeRows = await client.query('select count(*)::int as count from atlas_v2.runtime_person_politics_v1');
  if (Number(ledger.rows[0]?.count) !== 1 || Number(runtimeRows.rows[0]?.count) !== 0) {
    throw new Error(`Runtime rehearsal postcondition failed: ledger=${ledger.rows[0]?.count} runtime=${runtimeRows.rows[0]?.count}`);
  }

  console.log(JSON.stringify({
    marker:'ATLAS_P13_RUNTIME_SCHEMA_REHEARSAL_V1',
    status:'PASS',
    runtime_migrations:first.applied,
    migration_replay:true,
    deterministic_compile_replay:true,
    compile_key:compile.compile_key,
    input_rows:compile.input_row_count,
    output_rows:compile.output_row_count
  }, null, 2));
} finally {
  await client.end();
}
