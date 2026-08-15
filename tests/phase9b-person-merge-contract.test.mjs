import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mergeModule = require('../server/atlas-person-merge-service.js');
const mergeService = fs.readFileSync(new URL('../server/atlas-person-merge-service.js', import.meta.url),'utf8');
const mergeReadiness = fs.readFileSync(new URL('../server/atlas-person-merge-reference-readiness.js', import.meta.url),'utf8');
const mergeSchema = fs.readFileSync(new URL('../migration/phase-9/phase9b-person-merge-schema.sql', import.meta.url),'utf8');
const applyScript = fs.readFileSync(new URL('../migration/phase-9/scripts/phase9b-apply-person-merge-schema.mjs', import.meta.url),'utf8');
const handler = fs.readFileSync(new URL('../server/atlas-duplicate-review-handler.js', import.meta.url),'utf8');
const client = fs.readFileSync(new URL('../atlas-admin-duplicate-review.js', import.meta.url),'utf8');
const admin = fs.readFileSync(new URL('../admin.js', import.meta.url),'utf8');

const LOW = '11111111-1111-4111-8111-111111111111';
const HIGH = '22222222-2222-4222-8222-222222222222';

test('merge side resolution requires an explicit survivor from the approved pair', () => {
  assert.deepEqual(mergeModule.resolveMergeSides({ person_low_id: LOW, person_high_id: HIGH }, LOW), {
    survivor_person_id: LOW,
    source_person_id: HIGH
  });
  assert.deepEqual(mergeModule.resolveMergeSides({ person_low_id: LOW, person_high_id: HIGH }, HIGH), {
    survivor_person_id: HIGH,
    source_person_id: LOW
  });
  assert.throws(() => mergeModule.resolveMergeSides({ person_low_id: LOW, person_high_id: HIGH }, '33333333-3333-4333-8333-333333333333'), /must be one of/);
});

test('merge audit schema uses snapshot UUIDs and required-name/type validation, not raw column counts', () => {
  assert.match(mergeSchema, /DROP CONSTRAINT IF EXISTS person_duplicate_candidates_person_low_id_fkey/);
  assert.match(mergeSchema, /DROP CONSTRAINT IF EXISTS person_duplicate_candidates_person_high_id_fkey/);
  assert.match(mergeSchema, /CREATE TABLE IF NOT EXISTS atlas_v2\.person_merge_audits/);
  for (const column of ['request_id','candidate_id','review_id','survivor_person_id','source_person_id','evidence_fingerprint','survivor_before','source_before','mutation_summary','merged_at']) {
    assert.match(mergeSchema, new RegExp(`\\('${column}',\\s*'`));
  }
  assert.doesNotMatch(mergeSchema, /audit_columns\s*<>\s*\d+/);
  assert.doesNotMatch(mergeSchema, /REFERENCES atlas_v2\.persons\(id\)/);
});

test('protected merge schema apply preserves all authoritative data cardinality', () => {
  assert.match(applyScript, /before_relationships/);
  assert.match(applyScript, /after_relationships/);
  assert.match(applyScript, /before_counts/);
  assert.match(applyScript, /after_counts/);
  assert.match(applyScript, /identity_and_review_counts_unchanged/);
  assert.match(applyScript, /status = 'FAIL'/);
  assert.doesNotMatch(applyScript, /delete\s+from\s+atlas_v2\.persons/i);
  assert.doesNotMatch(applyScript, /update\s+atlas_v2\.person_politics_v2\s+set\s+person_id/i);
});

test('merge executor is serializable, approval-gated, full-evidence-pinned and reference-drift-guarded', () => {
  assert.match(mergeService, /BEGIN ISOLATION LEVEL SERIALIZABLE/);
  assert.match(mergeService, /pg_advisory_xact_lock/);
  assert.match(mergeService, /candidate_state !== "ACTIVE"/);
  assert.match(mergeService, /current_decision !== "MERGE"/);
  assert.match(mergeService, /decision_evidence_fingerprint !== candidateRow\.evidence_fingerprint/);
  assert.match(mergeService, /latestReview\.rows\[0\]\.decision !== "MERGE"/);
  assert.match(mergeService, /stableFingerprint\(candidateRow\.evidence/);
  assert.match(mergeService, /LIVE_EVIDENCE_CHANGED/);
  assert.match(mergeService, /person metadata conflict/);
  assert.match(mergeService, /assertPersonMergeReferenceReadiness/);
  assert.match(mergeReadiness, /P10_PERSON_MERGE_REFERENCE_SURFACE_DRIFT/);
});

test('relationship coalescing is explicit and normal relationship UUIDs are otherwise remapped in place', () => {
  assert.match(mergeService, /buildReconciliationPlan/);
  assert.match(mergeService, /coalesceRelationship/);
  assert.match(mergeService, /delete from atlas_v2\.person_politics_v2 where id=\$1 returning id/);
  assert.match(mergeService, /update atlas_v2\.person_politics_v2 set person_id=\$2 where person_id=\$1 returning id/);
  assert.match(mergeService, /relationship count changed outside the approved reconciliation plan/);
});

test('source person deletion occurs only after every authoritative Person reference remap', () => {
  const reconciliation = mergeService.indexOf('for (const item of reconciliationPlan.coalesces)');
  const nameMove = mergeService.indexOf('const names = await moveNames');
  const sourceMove = mergeService.indexOf('const sources = await moveSources');
  const descriptionMove = mergeService.indexOf('update atlas_v2.person_descriptions set person_id=$2');
  const relationshipMove = mergeService.indexOf('update atlas_v2.person_politics_v2 set person_id=$2');
  const peopleMove = mergeService.indexOf('update atlas_v2.person_people_affiliations set person_id=$2');
  const eventMove = mergeService.indexOf('update atlas_v2.person_event_participations set person_id=$2');
  const deleteSource = mergeService.indexOf('delete from atlas_v2.persons where id=$1 returning id');
  assert.ok(
    reconciliation >= 0
      && nameMove > reconciliation
      && sourceMove > nameMove
      && descriptionMove > sourceMove
      && relationshipMove > descriptionMove
      && peopleMove > relationshipMove
      && eventMove > peopleMove
      && deleteSource > eventMove
  );
  assert.match(mergeService, /source person references remain after merge/);
  assert.match(mergeService, /authoring_person_pointers/);
  assert.match(mergeService, /people_affiliations/);
  assert.match(mergeService, /event_participations/);
  assert.match(mergeService, /person count did not decrease by exactly one/);
});

test('People/Event assertion UUIDs and provenance cardinality are preserved across the dormant merge plan', () => {
  assert.match(mergeService, /people affiliation count changed during person merge/);
  assert.match(mergeService, /people affiliation provenance count changed during person merge/);
  assert.match(mergeService, /event participation count changed during person merge/);
  assert.match(mergeService, /event participation provenance count changed during person merge/);
  assert.match(mergeService, /people_affiliations_moved/);
  assert.match(mergeService, /event_participations_moved/);
  assert.doesNotMatch(mergeService, /delete from atlas_v2\.person_people_affiliations/i);
  assert.doesNotMatch(mergeService, /delete from atlas_v2\.person_event_participations/i);
});

test('merge creates immutable before-state audit and keeps idempotent request replay', () => {
  assert.match(mergeService, /from atlas_v2\.person_merge_audits where request_id=\$1/);
  assert.match(mergeService, /stableJson\(previousResolutions\) !== stableJson\(normalizedResolutions\)/);
  assert.match(mergeService, /survivorBefore = await snapshotPerson/);
  assert.match(mergeService, /sourceBefore = await snapshotPerson/);
  assert.match(mergeService, /insert into atlas_v2\.person_merge_audits/);
  assert.match(mergeService, /people_affiliations/);
  assert.match(mergeService, /people_affiliation_sources/);
  assert.match(mergeService, /event_participations/);
  assert.match(mergeService, /event_participation_sources/);
  assert.match(mergeService, /reference_readiness/);
  assert.match(mergeService, /relationship_reconciliation/);
  assert.match(mergeService, /mutationSummary/);
  assert.doesNotMatch(mergeService, /public\.person_politics|atlas_person_politics_compat_v1/);
});

test('admin transport exposes execution only as a separately named approved operation with explicit survivor and relationship choices', () => {
  assert.match(handler, /EXECUTE_APPROVED_MERGE/);
  assert.match(handler, /executeApprovedPersonMerge/);
  assert.match(handler, /relationshipResolutions:\s*body\.relationship_resolutions/);
  assert.match(client, /executeApprovedMerge/);
  assert.match(client, /survivor_person_id/);
  assert.match(client, /relationship_resolutions/);
  assert.match(admin, /왼쪽 인물 유지/);
  assert.match(admin, /오른쪽 인물 유지/);
  assert.match(admin, /처리 방법 선택/);
  assert.match(admin, /대표 관계 선택/);
  assert.match(admin, /globalThis\.confirm/);
  assert.doesNotMatch(admin, /survivorPersonId\s*=\s*candidate\.low\.id/);
});
