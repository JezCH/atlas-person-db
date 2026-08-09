import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const applySql = fs.readFileSync(new URL('../migration/phase-8/phase8c-c4d-optional-role-contract.sql', import.meta.url), 'utf8');
const rollbackSql = fs.readFileSync(new URL('../migration/phase-8/phase8c-c4d-optional-role-rollback.sql', import.meta.url), 'utf8');
const probeSql = fs.readFileSync(new URL('../migration/phase-8/phase8c-c4d-null-role-probe.sql', import.meta.url), 'utf8');

test('optional-role apply loosens only role_id and keeps compatibility projection row-complete', () => {
  assert.match(applySql, /ALTER COLUMN role_id DROP NOT NULL/i);
  assert.match(applySql, /LEFT JOIN atlas_v2\.roles r/i);
  assert.match(applySql, /NULLS NOT DISTINCT/i);
  assert.match(applySql, /person_politics_v2_semantic_nullsafe_uidx/);
  assert.match(applySql, /normalized_rows <> compat_rows/);
  assert.doesNotMatch(applySql, /unspecified/i);
  assert.doesNotMatch(applySql, /insert into atlas_v2\.roles/i);
});

test('rollback is guarded against discarding real null-role data', () => {
  assert.match(rollbackSql, /WHERE role_id IS NULL/i);
  assert.match(rollbackSql, /cannot restore role_id NOT NULL/i);
  assert.match(rollbackSql, /ALTER COLUMN role_id SET NOT NULL/i);
  assert.match(rollbackSql, /JOIN atlas_v2\.roles r/i);
  assert.doesNotMatch(rollbackSql, /LEFT JOIN atlas_v2\.roles r/i);
});

test('live probe exercises legacy and normalized null role then rolls back', () => {
  assert.match(probeSql, /INSERT INTO public\.person_politics/i);
  assert.match(probeSql, /INSERT INTO atlas_v2\.person_politics_v2/i);
  assert.match(probeSql, /role_id[\s\S]*NULL/i);
  assert.match(probeSql, /compat_role_null/);
  assert.match(probeSql, /legacy_role_null/);
  assert.match(probeSql, /ROLLBACK;/i);
  assert.doesNotMatch(probeSql, /COMMIT;/i);
});
