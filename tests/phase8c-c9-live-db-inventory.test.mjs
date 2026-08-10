import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const inventory = fs.readFileSync(new URL('../migration/phase-8/scripts/phase8c-c9-live-db-inventory.mjs', import.meta.url), 'utf8');
const c8 = fs.readFileSync(new URL('./phase8c-c8-runtime-retirement.test.mjs', import.meta.url), 'utf8');

test('C9 inventory is structurally read-only', () => {
  assert.doesNotMatch(inventory, /drop\s+(?:table|view|schema)/i);
  assert.doesNotMatch(inventory, /alter\s+(?:table|view|schema)/i);
  assert.doesNotMatch(inventory, /insert\s+into/i);
  assert.doesNotMatch(inventory, /delete\s+from/i);
  assert.doesNotMatch(inventory, /update\s+[A-Za-z0-9_."']+\s+set/i);
  assert.doesNotMatch(inventory, /truncate\s+/i);
  assert.doesNotMatch(inventory, /create\s+(?:table|view|schema|function|trigger)/i);
});

test('C9 inventory checks both retirement targets and normalized coverage', () => {
  assert.match(inventory, /public', 'person_politics/);
  assert.match(inventory, /public', 'atlas_person_politics_compat_v1/);
  assert.match(inventory, /atlas_v2', 'person_politics_v2/);
  assert.match(inventory, /legacy_rows_missing_from_v2/);
  assert.match(inventory, /compatibility_rows_missing_from_direct/);
  assert.match(inventory, /direct_rows_missing_from_compatibility/);
  assert.match(inventory, /inbound_legacy_foreign_keys/);
  assert.match(inventory, /textual_function_references/);
  assert.match(inventory, /textual_view_references/);
  assert.match(inventory, /retirement_ready/);
  assert.match(inventory, /destructive_action_performed:\s*false/);
});

test('C8 contract explicitly permits only C9 successor workflows beyond C7/C8', () => {
  assert.match(c8, /startsWith\('phase-8c-c9-'\)/);
});
