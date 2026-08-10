import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const script = fs.readFileSync(new URL('../migration/phase-8/scripts/phase8c-c4e-bounded-production-observation.mjs', import.meta.url), 'utf8');
const workflow = fs.readFileSync(new URL('../.github/workflows/phase-8c-c4e-bounded-production-observation.yml', import.meta.url), 'utf8');

test('bounded observation uses committed handler path and not rollback-only mode', () => {
  assert.match(script, /createVercelMutationHandler/);
  assert.match(script, /rollback_only: false/);
  assert.doesNotMatch(script, /rollbackOnly:\s*true/);
  assert.match(script, /outcome\?\.committed, true/);
  assert.match(script, /outcome\?\.rollback, false/);
  assert.match(script, /outcome\?\.parity\?\.match, true/);
});

test('observation covers null-role runtime transitions and mixed import', () => {
  assert.match(script, /role: null/);
  assert.match(script, /update-null/);
  assert.match(script, /update-role/);
  assert.match(script, /mixed_import_null_and_role: true/);
  assert.match(script, /importPayload/);
});

test('observation requires public write lockdown and preserves read policy', () => {
  assert.match(script, /baseline\.write_policies, 0/);
  assert.match(script, /baseline\.read_policies >= 1/);
  assert.match(script, /finalState\.write_policies, 0/);
  assert.match(script, /finalState\.read_policies >= 1/);
});

test('synthetic rows must be deleted and baseline restored exactly', () => {
  assert.match(script, /legacy row count did not return to baseline/);
  assert.match(script, /compatibility row count did not return to baseline/);
  assert.match(script, /normalized row count did not return to baseline/);
  assert.match(script, /legacy_residue: 0/);
  assert.match(script, /normalized_residue: 0/);
  assert.match(script, /compatibility_residue: 0/);
  assert.match(script, /cleanup_fallback_used: false/);
});

test('workflow is protected by exact SHA and explicit confirmation', () => {
  assert.match(workflow, /PHASE8C_C4E_COMMITTED_DUALWRITE_OBSERVATION/);
  assert.match(workflow, /inputs\.approved_sha/);
  assert.match(workflow, /github\.sha/);
  assert.match(workflow, /environment: phase-5-shadow/);
  assert.match(workflow, /SUPABASE_DB_URL: \$\{\{ secrets\.SUPABASE_DB_URL \}\}/);
});
