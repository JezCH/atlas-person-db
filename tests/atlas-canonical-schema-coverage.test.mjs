import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readinessModule from '../server/atlas-canonical-data-readiness.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { CANONICAL_DATA_READINESS_SCHEMA, CANONICAL_DATA_TABLES } = readinessModule;
const BASE_OPERATIONAL_TABLES = new Set([
  'migration_metadata',
  'person_duplicate_candidates',
  'person_duplicate_reviews',
  'person_merge_audits',
  'authoring_manifest_runs'
]);

function createdAtlasTables(sql) {
  return [...String(sql).matchAll(/\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?atlas_v2\.([a-z0-9_]+)/gi)]
    .map((match) => match[1]);
}

test('canonical readiness registry is unique and contains exactly 41 domain tables', () => {
  assert.equal(CANONICAL_DATA_READINESS_SCHEMA, 'atlas-canonical-data-readiness/v1');
  assert.equal(CANONICAL_DATA_TABLES.length, 41);
  assert.equal(new Set(CANONICAL_DATA_TABLES).size, 41);
});

test('canonical readiness registry covers the current clean schema plus applied additive schema components', () => {
  const baseSql = fs.readFileSync(path.join(root, 'db/schema/atlas_v2.current.sql'), 'utf8');
  const release = JSON.parse(fs.readFileSync(path.join(root, 'stage2/releases/p5-additive-schema-release.v1.json'), 'utf8'));
  const canonical = new Set(CANONICAL_DATA_TABLES);

  const required = new Set(createdAtlasTables(baseSql).filter((table) => !BASE_OPERATIONAL_TABLES.has(table)));
  for (const component of release.components) {
    const sql = fs.readFileSync(path.join(root, component.path), 'utf8');
    for (const table of createdAtlasTables(sql)) required.add(table);
  }

  const missing = [...required].filter((table) => !canonical.has(table)).sort();
  const unexpected = [...canonical].filter((table) => !required.has(table)).sort();
  assert.deepEqual(missing, [], `canonical tables missing from readiness registry: ${missing.join(',')}`);
  assert.deepEqual(unexpected, [], `readiness registry tables not in canonical schema: ${unexpected.join(',')}`);
  assert.equal(required.size, 41);
});
