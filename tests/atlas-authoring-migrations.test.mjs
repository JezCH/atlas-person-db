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

test('authoring migration registry is ordered and contains durable result snapshot migration', () => {
  assert.equal(AUTHORING_MIGRATION_PATHS.length, 2);
  assert.match(AUTHORING_MIGRATION_PATHS[0], /20260811_authoring_manifest_runs\.sql$/);
  assert.match(AUTHORING_MIGRATION_PATHS[1], /20260811_authoring_result_snapshot\.sql$/);
  const migrations = readAuthoringMigrations();
  assert.match(migrations[1].sql, /ADD COLUMN IF NOT EXISTS manifest_schema text/i);
  assert.match(migrations[1].sql, /ADD COLUMN IF NOT EXISTS result_snapshot jsonb/i);
  assert.match(migrations[1].sql, /authoring_manifest_runs_result_snapshot_check/i);
});

test('current clean schema baseline includes the authoring execution provenance columns and constraints', () => {
  assert.match(baseline, /manifest_schema text/);
  assert.match(baseline, /result_snapshot jsonb/);
  assert.match(baseline, /authoring_manifest_runs_manifest_schema_check/);
  assert.match(baseline, /authoring_manifest_runs_result_snapshot_check/);
});
