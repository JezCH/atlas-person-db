import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { requireOperation, requireManifest, createCorrectionSourceCitationV2Service } = require('../server/atlas-correction-source-citation-v2-service.js');
const manifest = JSON.parse(fs.readFileSync(new URL('../corrections/requests/gracchi-shared-source-citation-20260912.v2.json', import.meta.url), 'utf8'));

test('citation-only operation rejects unsupported before/after guard fields instead of dropping them', () => {
  for (const field of ['expected_title', 'replacement_title', 'replacement_publisher', 'replacement_canonical_url', 'replacement_citation']) {
    const operation = { ...manifest.operations[0], [field]: 'Unsupported bibliographic assertion' };
    assert.throws(() => requireOperation(operation, 1), { message: `CORRECTION_SOURCE_CITATION_OP1_FIELD_UNSUPPORTED:${field}` });
  }
});

test('unsupported bibliographic rewrite fails before transaction or database access in dry-run and apply', async () => {
  let queries = 0;
  const service = createCorrectionSourceCitationV2Service({ client: { async query() { queries++; throw Error('database must not be reached'); } } });
  const raw = structuredClone(manifest);
  raw.operations[0].replacement_title = 'Corrected title requiring a separate reviewed writer';
  const before = JSON.stringify(raw);
  for (const dryRun of [true, false]) {
    await assert.rejects(service.execute(raw, { dryRun }), { message: 'CORRECTION_SOURCE_CITATION_OP1_FIELD_UNSUPPORTED:replacement_title' });
  }
  assert.equal(queries, 0);
  assert.equal(JSON.stringify(raw), before);
});

test('existing exact citation manifest and nonmutation review evidence remain compatible and unchanged', () => {
  const before = JSON.stringify(manifest);
  const expected = requireManifest(manifest);
  assert.equal(expected.operations.length, 1);
  assert.equal(expected.operations[0].replacement_citation_text, manifest.operations[0].replacement_citation_text);
  const withReview = structuredClone(manifest);
  withReview.operations[0].evidence = { locator: 'Reviewed evidence metadata', title: 'Evidence title, not a mutation' };
  assert.deepEqual(requireManifest(withReview), expected);
  assert.equal(JSON.stringify(manifest), before);
});
