import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const v11 = fs.readFileSync(path.join(root, 'db/migrations/20260812_correction_manifest_v1_1.sql'), 'utf8');
const v2 = fs.readFileSync(path.join(root, 'db/migrations/20260813_correction_manifest_v2.sql'), 'utf8');

function allowedSchemas(sql) {
  return [...sql.matchAll(/'atlas-correction-manifest\/v(?:1(?:\.1)?|2)'/g)].map((match) => match[0].slice(1, -1));
}

test('correction migrations are replay-monotonic once v2 ledger rows may exist', () => {
  assert.deepEqual(allowedSchemas(v11), [
    'atlas-correction-manifest/v1',
    'atlas-correction-manifest/v1.1',
    'atlas-correction-manifest/v2'
  ]);
  assert.deepEqual(allowedSchemas(v2), [
    'atlas-correction-manifest/v1',
    'atlas-correction-manifest/v1.1',
    'atlas-correction-manifest/v2'
  ]);
  assert.match(v11, /Never narrow the discriminator during replay/);
});
