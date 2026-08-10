import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../migration/phase-9/scripts/phase9b-live-person-reference-inventory.mjs', import.meta.url),'utf8');

test('Phase 9B live inventory is explicitly read-only and evidence-bearing', () => {
  assert.match(source, /begin transaction isolation level repeatable read read only/i);
  for (const token of [
    'direct_fks_to_persons','direct_fks_to_relationships','non_fk_person_uuid_columns',
    'table_columns','relevant_constraints','relevant_indexes','relation_definitions',
    'function_definitions','person_reference_counts','relationship_reference_counts'
  ]) assert.match(source, new RegExp(token));
  assert.match(source, /status:\s*'PASS'/);
  assert.doesNotMatch(source, /\binsert\s+into\b/i);
  assert.doesNotMatch(source, /\bupdate\s+atlas_v2\b/i);
  assert.doesNotMatch(source, /\bdelete\s+from\b/i);
  assert.doesNotMatch(source, /\bdrop\s+(table|view)\b/i);
  assert.doesNotMatch(source, /\balter\s+table\b/i);
});

test('inventory covers direct person and relationship dependency surfaces', () => {
  for (const token of [
    'persons','person_names','person_sources','person_descriptions','person_politics_v2',
    'chronology_claims','person_politics_sources','relationship_descriptions',
    'person_duplicate_candidates','person_duplicate_reviews'
  ]) assert.match(source, new RegExp(token));
  assert.match(source, /foreignKeysTo\('atlas_v2\.persons'\)/);
  assert.match(source, /foreignKeysTo\('atlas_v2\.person_politics_v2'\)/);
  assert.match(source, /json_agg\(att\.attname order by u\.ord\)/);
  assert.match(source, /p\.prokind in \('f','p'\)/);
  assert.match(source, /pg_indexes/);
  assert.match(source, /pg_get_functiondef/);
  assert.match(source, /pg_get_triggerdef/);
});
