import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../migration/phase-9/scripts/phase9b-live-person-reference-inventory.mjs', import.meta.url),'utf8');

test('Phase 9B live inventory is explicitly read-only and evidence-bearing', () => {
  assert.match(source, /begin transaction isolation level repeatable read read only/i);
  assert.match(source, /direct_fks_to_persons/);
  assert.match(source, /non_fk_person_uuid_columns/);
  assert.match(source, /relation_definitions/);
  assert.match(source, /function_definitions/);
  assert.match(source, /relevant_constraints/);
  assert.match(source, /reference_counts/);
  assert.match(source, /status:\s*'PASS'/);
  assert.doesNotMatch(source, /\binsert\s+into\b/i);
  assert.doesNotMatch(source, /\bupdate\s+atlas_v2\b/i);
  assert.doesNotMatch(source, /\bdelete\s+from\b/i);
  assert.doesNotMatch(source, /\bdrop\s+(table|view)\b/i);
  assert.doesNotMatch(source, /\balter\s+table\b/i);
});

test('inventory covers the merge-critical person surfaces with deterministic JSON FK decoding', () => {
  for (const token of ['persons','person_names','person_politics_v2','person_duplicate_candidates','person_duplicate_reviews']) {
    assert.match(source, new RegExp(token));
  }
  assert.match(source, /pg_constraint/);
  assert.match(source, /json_agg\(att\.attname order by u\.ord\)/);
  assert.match(source, /pg_get_functiondef/);
  assert.match(source, /pg_get_triggerdef/);
});
