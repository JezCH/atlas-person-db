import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const preflight = fs.readFileSync(new URL('../server/atlas-person-merge-preflight.js', import.meta.url), 'utf8');
const handler = fs.readFileSync(new URL('../server/atlas-duplicate-review-handler.js', import.meta.url), 'utf8');

test('merge preflight treats same context with a different role as reconciliation-required', () => {
  assert.match(preflight, /h\.polity_id=l\.polity_id/);
  assert.match(preflight, /h\.period_basis_id=l\.period_basis_id/);
  assert.match(preflight, /h\.activity_start=l\.activity_start/);
  assert.match(preflight, /h\.activity_end=l\.activity_end/);
  assert.match(preflight, /SAME_CONTEXT_ROLE_VARIANT/);
  assert.match(preflight, /EXACT_RELATIONSHIP/);
  assert.match(preflight, /RELATIONSHIP_RECONCILIATION_REQUIRED/);
});

test('public duplicate-review mutation path executes merge only through the preflighted orchestrator', () => {
  assert.match(handler, /executePreflightedApprovedPersonMerge/);
  assert.doesNotMatch(handler, /require\("\.\/atlas-person-merge-service\.js"\)/);
  assert.match(handler, /RELATIONSHIP_RECONCILIATION_REQUIRED/);
});
