import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  AUTHORING_MIGRATION_PATHS,
  readAuthoringMigrations
} = require('../server/atlas-authoring-migrations.js');

const root = path.resolve(new URL('..', import.meta.url).pathname);
const baseline = fs.readFileSync(path.join(root, 'db/schema/atlas_v2.current.sql'), 'utf8');

test('authoring migration registry is ordered and contains durable lifecycle-safe ledger references', () => {
  assert.equal(AUTHORING_MIGRATION_PATHS.length, 3);
  assert.match(AUTHORING_MIGRATION_PATHS[0], /20260811_authoring_manifest_runs\.sql$/);
  assert.match(AUTHORING_MIGRATION_PATHS[1], /20260811_authoring_result_snapshot\.sql$/);
  assert.match(AUTHORING_MIGRATION_PATHS[2], /20260814_authoring_ledger_live_reference_lifecycle\.sql$/);
  const migrations = readAuthoringMigrations();
  assert.match(migrations[1].sql, /ADD COLUMN IF NOT EXISTS manifest_schema text/i);
  assert.match(migrations[1].sql, /ADD COLUMN IF NOT EXISTS result_snapshot jsonb/i);
  assert.match(migrations[1].sql, /authoring_manifest_runs_result_snapshot_check/i);

  const lifecycle = migrations[2].sql;
  assert.match(lifecycle, /pg_advisory_xact_lock/i);
  assert.match(lifecycle, /pg_constraint/i);
  assert.match(lifecycle, /confdeltype/i);
  assert.match(lifecycle, /authoring_manifest_runs_person_id_fkey/i);
  assert.match(lifecycle, /authoring_manifest_runs_relationship_id_fkey/i);
  assert.equal((lifecycle.match(/ON DELETE SET NULL/gi) || []).length, 2);
});

test('current clean schema baseline remains the measured pre-lifecycle Production shape', () => {
  assert.match(baseline, /manifest_schema text/);
  assert.match(baseline, /result_snapshot jsonb/);
  assert.match(baseline, /authoring_manifest_runs_manifest_schema_check/);
  assert.match(baseline, /authoring_manifest_runs_result_snapshot_check/);
  assert.match(baseline, /CONSTRAINT authoring_manifest_runs_person_id_fkey[\s\S]*?ON DELETE RESTRICT/i);
  assert.match(baseline, /CONSTRAINT authoring_manifest_runs_relationship_id_fkey[\s\S]*?ON DELETE RESTRICT/i);
});
