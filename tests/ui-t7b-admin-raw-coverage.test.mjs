import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const inspectorService = require('../server/atlas-admin-inspector-service.js');
const inspectorServerSource = fs.readFileSync(new URL('../server/atlas-admin-inspector-service.js', import.meta.url), 'utf8');
const adminUi = fs.readFileSync(new URL('../atlas-admin-observability.js', import.meta.url), 'utf8');

test('UI-T7-B Admin Inspector supports every current raw object kind through server capabilities', () => {
  assert.deepEqual([...inspectorService.SUPPORTED_KINDS], [
    'person', 'activity', 'polity', 'role', 'period_basis', 'relation_type', 'source'
  ]);
  assert.match(adminUi, /Array\.isArray\(payload\.supported_kinds\) \? payload\.supported_kinds : \[\]/);
  assert.match(adminUi, /kinds\.map\(\(kind\) => `<option/);
});

test('UI-T7-B server returns the complete inspected row instead of a UI-specific field whitelist', () => {
  assert.match(inspectorServerSource, /object: Object\.freeze\(result\.rows\[0\]\)/);
  assert.doesNotMatch(inspectorServerSource, /pick\(|allowedFields|displayFields|uiFields/i);
});

test('UI-T7-B Admin UI recursively renders the complete payload.object as path/value rows', () => {
  assert.match(adminUi, /function flattenRows\(value, prefix = ""\)/);
  assert.match(adminUi, /Object\.entries\(value\)/);
  assert.match(adminUi, /value\.forEach\(\(item, index\) => rows\.push\(\.\.\.flattenRows\(item/);
  assert.match(adminUi, /renderKeyValueTable\(payload\.object, \{ pathLabel: "Field \/ path", valueLabel: "Raw value" \}\)/);
  assert.doesNotMatch(adminUi, /payload\.object\.(?:id|canonical_key|source_key|sha256|bytes)/);
});

test('UI-T7-B source identity and provenance diagnostics are present in the Inspector server contract', () => {
  for (const token of [
    'source_key', 'source_type', 'canonical_url', 'citation_text', 'sha256', 'bytes',
    'source_locator', 'source_locator_key', 'content_hash', 'legacy_source_key'
  ]) assert.ok(inspectorServerSource.includes(token), `Admin Inspector contract missing ${token}`);
});

test('UI-T7-B generic raw coverage remains read-only and session-protected', () => {
  assert.match(adminUi, /credentials: "same-origin"/);
  assert.match(adminUi, /method: "GET"/);
  assert.doesNotMatch(adminUi, /method:\s*"POST"|method:\s*"DELETE"|method:\s*"PUT"|ATLAS_MUTATION_TOKEN|SUPABASE_DB_URL/);
});
