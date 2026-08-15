import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const detector = fs.readFileSync(new URL('../server/atlas-duplicate-detector.js', import.meta.url), 'utf8');
const reviewService = fs.readFileSync(new URL('../server/atlas-duplicate-review-service.js', import.meta.url), 'utf8');
const mergeService = fs.readFileSync(new URL('../server/atlas-person-merge-service.js', import.meta.url), 'utf8');
const reconciliation = fs.readFileSync(new URL('../server/atlas-relationship-reconciliation.js', import.meta.url), 'utf8');
const handler = fs.readFileSync(new URL('../server/atlas-duplicate-review-handler.js', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../atlas-admin-duplicate-review.js', import.meta.url), 'utf8');
const admin = fs.readFileSync(new URL('../admin.js', import.meta.url), 'utf8');

test('candidate approval fingerprint covers the complete canonical evidence contract', () => {
  assert.match(detector, /p10-v2-person-revalidation\/v2/);
  assert.match(detector, /REVALIDATION_SEMANTIC_VERSION = "v2-relation-full-temporal"/);
  assert.match(detector, /SEMANTIC_KEY_VERSION/);
  assert.match(detector, /P10_SEMANTIC_PROFILE/);
  assert.match(detector, /P10_REVALIDATION_REQUIREMENT/);
  assert.match(detector, /evidence_fingerprint: stableFingerprint\(evidence\)/);
  assert.match(detector, /canonicalJson/);
  assert.match(mergeService, /stableFingerprint\(candidateRow\.evidence \|\| \[\]\)/);
  assert.match(mergeService, /current\.evidence_fingerprint !== candidateRow\.evidence_fingerprint/);
  assert.match(mergeService, /LIVE_EVIDENCE_CHANGED/);
});

test('relationship resolution is planned from locked requirement-aware live state inside the serializable person merge transaction', () => {
  const executeStart = mergeService.indexOf('async function executeApprovedPersonMerge');
  assert.ok(executeStart >= 0);
  const executeBody = mergeService.slice(executeStart);
  const begin = executeBody.indexOf('BEGIN ISOLATION LEVEL SERIALIZABLE');
  const requirements = executeBody.indexOf('const requirements = await lockPairRevalidationRequirements');
  const lock = executeBody.indexOf('const liveState = await lockLiveMergeState');
  const evidence = executeBody.indexOf('assertLiveCandidateEvidence(candidateRow, liveState, requirements)');
  const groups = executeBody.indexOf('const groups = buildRelationshipReconciliationGroups');
  const plan = executeBody.indexOf('const reconciliationPlan = buildReconciliationPlan');
  const mutation = executeBody.indexOf('for (const item of reconciliationPlan.coalesces)');
  assert.ok(begin >= 0 && requirements > begin && lock > requirements && evidence > lock && groups > evidence && plan > groups && mutation > plan);
});

test('relationship coalesce preserves dependent facts before deleting the redundant relationship', () => {
  const coalesceStart = mergeService.indexOf('async function coalesceRelationship');
  assert.ok(coalesceStart >= 0);
  const coalesceBody = mergeService.slice(coalesceStart, mergeService.indexOf('async function executeApprovedPersonMerge'));
  const sourceRead = coalesceBody.indexOf('from atlas_v2.person_politics_sources');
  const sourceInsert = coalesceBody.indexOf('insert into atlas_v2.person_politics_sources');
  const chronologyMove = coalesceBody.indexOf('update atlas_v2.chronology_claims set person_politics_id=$1');
  const descriptionMove = coalesceBody.indexOf('update atlas_v2.relationship_descriptions set person_politics_id=$1');
  const relationshipDelete = coalesceBody.indexOf('delete from atlas_v2.person_politics_v2 where id=$1 returning id');
  assert.ok(sourceRead >= 0 && sourceInsert > sourceRead && chronologyMove > sourceInsert && descriptionMove > chronologyMove && relationshipDelete > descriptionMove);
  assert.match(mergeService, /RELATIONSHIP_SOURCE_LOCATOR_CONFLICT/);
  assert.match(mergeService, /duplicate_source_links_collapsed/);
  assert.match(mergeService, /chronology_claims count changed during person merge/);
  assert.match(mergeService, /relationship_descriptions count changed during person merge/);
});

test('KEEP_DISTINCT_ROLES cannot silently select an exact duplicate representative', () => {
  assert.match(reconciliation, /KEEP_DISTINCT_ROLES requires exactly one explicit representative for every duplicated role/);
  assert.match(reconciliation, /keep_relationship_ids/);
  assert.doesNotMatch(reconciliation, /choosePreferredRelationship/);
  assert.match(admin, /대표 관계 선택/);
  assert.match(admin, /exact-role-representative/);
  assert.match(admin, /keep_relationship_ids: keepRelationshipIds/);
});

test('admin review queue exposes notes and provenance before a relationship is selected for removal', () => {
  assert.match(reviewService, /pp\.notes/);
  assert.match(reviewService, /pp\.source_locator/);
  assert.match(admin, /provenanceLabel/);
  assert.match(admin, /row\.notes/);
  assert.match(admin, /원본 위치 정보 없음/);
});

test('same authenticated endpoint carries explicit survivor and resolution plan into the atomic service', () => {
  assert.match(handler, /relationshipResolutions:body\.relationship_resolutions/);
  assert.match(client, /relationship_resolutions: relationshipResolutions/);
  assert.match(admin, /collectRelationshipResolutions/);
  assert.match(admin, /처리 방법 선택/);
  assert.doesNotMatch(admin, /<option value="KEEP_DISTINCT_ROLES" selected/);
});
