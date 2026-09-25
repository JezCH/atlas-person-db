import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const currentMigrationService = fs.readFileSync(path.join(root, 'server/atlas-correction-migrations.js'), 'utf8');
const v11 = fs.readFileSync(path.join(root, 'db/migrations/20260812_correction_manifest_v1_1.sql'), 'utf8');
const v2 = fs.readFileSync(path.join(root, 'db/migrations/20260813_correction_manifest_v2.sql'), 'utf8');
const v12 = fs.readFileSync(path.join(root, 'db/migrations/20260815_correction_manifest_v1_2.sql'), 'utf8');
const v13 = fs.readFileSync(path.join(root, 'db/migrations/20260821_correction_manifest_v1_3.sql'), 'utf8');
const v14 = fs.readFileSync(path.join(root, 'db/migrations/20260827_correction_manifest_v1_4.sql'), 'utf8');

function allowedSchemas(sql) {
  return [...sql.matchAll(/'atlas-correction-manifest\/v(?:1(?:\.[1234])?|2)'/g)].map((match) => match[0].slice(1, -1));
}
const expected = [
  'atlas-correction-manifest/v1','atlas-correction-manifest/v1.1','atlas-correction-manifest/v1.2',
  'atlas-correction-manifest/v1.3','atlas-correction-manifest/v1.4','atlas-correction-manifest/v2'
];
test('correction migrations remain replay-monotonic across every registered ledger schema', () => {
  for (const sql of [v11, v2, v12, v13, v14]) assert.deepEqual(allowedSchemas(sql), expected);
  assert.match(v11, /Never narrow the discriminator during replay/);
});

test('retired Stage2 correction-ledger compatibility writer stays absent', () => {
  assert.equal(fs.existsSync(path.join(root, 'server/atlas-stage2-correction-ledger-compat.js')), false);
  assert.equal(fs.existsSync(path.join(root, 'tests/stage2-correction-ledger-compat.test.mjs')), false);
  assert.doesNotMatch(currentMigrationService, /atlas-stage2-correction-ledger-compat/);
  for (const migration of [
    '20260811_correction_manifest_runs.sql',
    '20260812_correction_manifest_v1_1.sql',
    '20260813_correction_manifest_v2.sql',
    '20260815_correction_manifest_v1_2.sql',
    '20260821_correction_manifest_v1_3.sql',
    '20260827_correction_manifest_v1_4.sql'
  ]) {
    assert.match(currentMigrationService, new RegExp(migration.replaceAll('.', '\\.')));
  }
});
