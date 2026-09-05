import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { EXPECTED_RELATIONSHIP_FKS } = require('../server/atlas-person-merge-reference-readiness.js');

test('person merge readiness reviews context-polity relationship FK with its live CASCADE contract', () => {
  const rule = EXPECTED_RELATIONSHIP_FKS.find(
    (item) => item.key === 'atlas_v2.person_politics_context_polities.person_politics_id'
  );
  assert.deepEqual(rule, {
    key: 'atlas_v2.person_politics_context_polities.person_politics_id',
    delete_action: 'CASCADE'
  });
});
