import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(new URL('../db/migrations/20260821_human_authoring_external_reference_sync.sql', import.meta.url), 'utf8');
const migrationRegistry = fs.readFileSync(new URL('../server/atlas-authoring-migrations.js', import.meta.url), 'utf8');

test('human-authoring ledger writes synchronize first-class NamuWiki references', () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION atlas_v2\.sync_human_authoring_external_references\(\)/);
  assert.match(migration, /AFTER INSERT OR UPDATE OF person_id, result_snapshot/);
  assert.match(migration, /NEW\.result_snapshot->'external_references'->'namuwiki'/);
  assert.match(migration, /INSERT INTO atlas_v2\.person_external_references/);
  assert.match(migration, /ON CONFLICT \(person_id, provider\) DO UPDATE/);
  assert.match(migration, /EXCLUDED\.checked_at >= atlas_v2\.person_external_references\.checked_at/);
});

test('sync migration backfills pre-trigger immutable authoring snapshots', () => {
  assert.match(migration, /WITH latest_namuwiki AS/);
  assert.match(migration, /FROM atlas_v2\.authoring_manifest_runs amr/);
  assert.match(migration, /ORDER BY amr\.person_id, amr\.applied_at DESC, amr\.request_id DESC/);
  assert.match(migration, /url LIKE 'https:\/\/namu\.wiki\/w\/%'/);
});

test('authoring schema bootstrap includes the external-reference sync migration', () => {
  assert.match(migrationRegistry, /20260821_human_authoring_external_reference_sync\.sql/);
});
