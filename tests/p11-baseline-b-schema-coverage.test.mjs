import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import baselineB from '../server/atlas-baseline-b.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { BASELINE_B_SCHEMA, BASELINE_B_CANONICAL_TABLES, CORE_DATASET_QUERIES } = baselineB;
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

test('Baseline B v2 canonical dataset registry is unique and contains exactly 41 Stage 2 domain tables', () => {
  assert.equal(BASELINE_B_SCHEMA, 'atlas-stage2-baseline-b/v2');
  assert.equal(CORE_DATASET_QUERIES.length, 41);
  assert.equal(new Set(CORE_DATASET_QUERIES.map((item) => item.key)).size, 41);
  assert.equal(new Set(BASELINE_B_CANONICAL_TABLES).size, 41);
  for (const descriptor of CORE_DATASET_QUERIES) {
    assert.ok(descriptor.key);
    assert.ok(descriptor.table);
    assert.match(descriptor.sql, new RegExp(`^select \\* from atlas_v2\\.${descriptor.table} order by `, 'i'));
  }
});

test('Baseline B covers every canonical table created by the clean baseline and six-component Stage 2 release', () => {
  const baseSql = fs.readFileSync(path.join(root, 'db/schema/atlas_v2.current.sql'), 'utf8');
  const release = JSON.parse(fs.readFileSync(path.join(root, 'stage2/releases/p5-additive-schema-release.v1.json'), 'utf8'));
  const canonical = new Set(BASELINE_B_CANONICAL_TABLES);

  const required = new Set(
    createdAtlasTables(baseSql).filter((table) => !BASE_OPERATIONAL_TABLES.has(table))
  );
  for (const component of release.components) {
    const sql = fs.readFileSync(path.join(root, component.path), 'utf8');
    for (const table of createdAtlasTables(sql)) required.add(table);
  }

  const missing = [...required].filter((table) => !canonical.has(table)).sort();
  const unexpected = [...canonical].filter((table) => !required.has(table)).sort();
  assert.deepEqual(missing, [], `canonical Stage 2 tables missing from Baseline B: ${missing.join(',')}`);
  assert.deepEqual(unexpected, [], `Baseline B tables not in canonical Stage 2 schema: ${unexpected.join(',')}`);
  assert.equal(required.size, 41);
});
