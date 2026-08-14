import assert from 'node:assert/strict';
import test from 'node:test';

test('P9 semantic-key v2 global cutover contract is internally consistent', async () => {
  const { result } = await import('../scripts/verify-stage2-p9-semantic-key-v2-cutover.mjs');
  assert.equal(result.status,'P9_COMPLETE_BRANCH_ONLY');
  assert.equal(result.semantic_key_version,'atlas-activity-semantic-key/v2');
  assert.equal(result.p8_effective_blockers,0);
  assert.equal(result.production_mutation_authorized,false);
});
