import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const mergeService = fs.readFileSync(new URL('../server/atlas-person-merge-service.js', import.meta.url), 'utf8');
const handler = fs.readFileSync(new URL('../server/atlas-duplicate-review-handler.js', import.meta.url), 'utf8');

test('core merge transaction treats same context with a different role as reconciliation-required', () => {
  assert.match(mergeService, /BEGIN ISOLATION LEVEL SERIALIZABLE/);
  assert.match(mergeService, /d\.polity_id=s\.polity_id/);
  assert.match(mergeService, /d\.period_basis_id=s\.period_basis_id/);
  assert.match(mergeService, /d\.activity_start=s\.activity_start/);
  assert.match(mergeService, /d\.activity_end=s\.activity_end/);
  assert.match(mergeService, /SAME_CONTEXT_ROLE_VARIANT/);
  assert.match(mergeService, /EXACT_RELATIONSHIP/);
  assert.match(mergeService, /RELATIONSHIP_RECONCILIATION_REQUIRED/);

  const begin = mergeService.indexOf('BEGIN ISOLATION LEVEL SERIALIZABLE');
  const relationshipGuard = mergeService.indexOf('const conflicts = await relationshipReconciliationConflicts');
  const relationshipMove = mergeService.indexOf('update atlas_v2.person_politics_v2 set person_id=$2');
  assert.ok(begin >= 0 && relationshipGuard > begin && relationshipMove > relationshipGuard);
});

test('public duplicate-review mutation path invokes only the atomic merge service', () => {
  assert.match(handler, /executeApprovedPersonMerge/);
  assert.match(handler, /require\("\.\/atlas-person-merge-service\.js"\)/);
  assert.doesNotMatch(handler, /atlas-person-merge-preflight/);
  assert.match(handler, /RELATIONSHIP_RECONCILIATION_REQUIRED/);
});
