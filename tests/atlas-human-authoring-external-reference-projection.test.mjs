import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  new URL('../db/migrations/20260821_person_external_references_authoring_projection.sql', import.meta.url),
  'utf8'
);

test('human-authoring ledger inserts atomically project explicit NamuWiki decisions', () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION atlas_v2\.project_authoring_namuwiki_reference\(\)/);
  assert.match(migration, /AFTER INSERT ON atlas_v2\.authoring_manifest_runs/);
  assert.match(migration, /INSERT INTO atlas_v2\.person_external_references/);
  assert.match(migration, /NEW\.result_snapshot->'external_references'->'namuwiki'/);
  assert.match(migration, /'linked', 'not_found'/);
});

test('projection preserves a newer reviewed Person profile state', () => {
  assert.match(migration, /ON CONFLICT \(person_id, provider\) DO UPDATE/);
  assert.match(migration, /EXCLUDED\.checked_at > atlas_v2\.person_external_references\.checked_at/);
});

test('projection migration backfills pre-trigger reviewed ledger decisions', () => {
  assert.match(migration, /SELECT DISTINCT ON \(amr\.person_id\)/);
  assert.match(migration, /ORDER BY amr\.person_id, amr\.applied_at DESC, amr\.request_id DESC/);
  assert.match(migration, /status = 'not_found'/);
  assert.match(migration, /status = 'linked' AND document_title IS NOT NULL AND url IS NOT NULL/);
});
