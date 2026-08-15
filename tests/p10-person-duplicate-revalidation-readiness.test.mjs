import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import detector from '../server/atlas-duplicate-detector.js';
import readiness from '../server/atlas-person-duplicate-revalidation-readiness.js';
import interlock from '../server/atlas-person-merge-interlock.js';

const migration = fs.readFileSync(new URL('../migration/phase-10/p10-person-duplicate-revalidation-requirements.sql', import.meta.url), 'utf8');
const reviewService = fs.readFileSync(new URL('../server/atlas-duplicate-review-service.js', import.meta.url), 'utf8');
const handler = fs.readFileSync(new URL('../server/atlas-duplicate-review-handler.js', import.meta.url), 'utf8');
const readinessSource = fs.readFileSync(new URL('../server/atlas-person-duplicate-revalidation-readiness.js', import.meta.url), 'utf8');

const A = '5136407a-9792-5103-be6f-54c947b255a5';
const B = 'a3367f19-e901-5213-aba6-76c4aef1b730';

function requirement(overrides = {}) {
  return {
    requirement_key: 'fixture:gorgo-required-pair',
    person_low_id: A,
    person_high_id: B,
    requirement_version: 'p10-revalidation-requirement/v1',
    prior_outcome: 'MERGE',
    source_artifact: 'fixture.json',
    source_decision_id: 'fixture_same_person',
    evidence_snapshot: { reviewed: true },
    ...overrides
  };
}

test('P10 durable requirement ledger preserves the reviewed Gorgo pair as historical UUID snapshots without Person FKs', () => {
  assert.match(migration, /person_duplicate_revalidation_requirements/);
  assert.match(migration, /5136407a-9792-5103-be6f-54c947b255a5/);
  assert.match(migration, /a3367f19-e901-5213-aba6-76c4aef1b730/);
  assert.match(migration, /gorgo_sparta_same_person/);
  assert.match(migration, /prior_outcome[\s\S]*MERGE/);
  assert.doesNotMatch(migration, /person_low_id uuid[^\n]*REFERENCES/i);
  assert.doesNotMatch(migration, /person_high_id uuid[^\n]*REFERENCES/i);
  assert.match(migration, /Applying this migration does NOT authorize or execute a Person merge/);
});

test('reviewed requirement nominates a pair even when the heuristic names do not overlap', () => {
  const candidates = detector.detectPersonDuplicateCandidates({
    names: [
      { person_id: A, name: 'Gorgo of Sparta', locale: 'en', is_preferred: true },
      { person_id: B, name: 'Gorgo', locale: 'en', is_preferred: true }
    ],
    requirements: [requirement()]
  });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].detector_version, 'p10-v2-person-revalidation/v2');
  assert.ok(candidates[0].evidence.some((item) => item.kind === 'P10_REVALIDATION_REQUIREMENT'));
  assert.ok(!candidates[0].evidence.some((item) => item.kind === 'EXACT_NAME'));
  assert.equal(Object.hasOwn(candidates[0], 'decision'), false);
});

test('required revalidation pair fails closed if either reviewed Person UUID is no longer live', () => {
  assert.throws(() => detector.detectPersonDuplicateCandidates({
    names: [{ person_id: A, name: 'Gorgo of Sparta', locale: 'en', is_preferred: true }],
    requirements: [requirement()]
  }), /P10_REQUIRED_REVALIDATION_PERSON_MISSING/);
});

test('candidate rebuild loads durable requirements and current review cannot approve a stale detector version', () => {
  assert.match(reviewService, /loadRevalidationRequirements/);
  assert.match(reviewService, /requirements_schema_ready/);
  assert.match(reviewService, /active_requirements/);
  assert.match(reviewService, /inspectPersonDuplicateRevalidationReadiness/);
  assert.match(reviewService, /candidate detector version is stale; rebuild before review/);
});

test('completion readiness requires every requirement, current detector, terminal decision and exact latest review evidence', () => {
  assert.equal(readiness.REVALIDATION_REQUIREMENT_VERSION, 'p10-revalidation-requirement/v1');
  for (const token of [
    'REQUIREMENT_CANDIDATE_MISSING',
    'REQUIREMENT_EVIDENCE_MISSING',
    'REQUIREMENT_PERSON_MISSING',
    'CANDIDATE_DETECTOR_VERSION_STALE',
    'CANDIDATE_UNREVIEWED',
    'CANDIDATE_REVIEW_PENDING',
    'CANDIDATE_DECISION_EVIDENCE_STALE',
    'CANDIDATE_LATEST_REVIEW_MISSING',
    'CANDIDATE_LATEST_REVIEW_DECISION_MISMATCH',
    'CANDIDATE_LATEST_REVIEW_EVIDENCE_STALE'
  ]) assert.match(readinessSource, new RegExp(token));
  assert.match(readinessSource, /REQUIREMENT_PRIOR_OUTCOME_OVERRIDE_WITHOUT_RATIONALE/);
});

test('duplicate review GET combines current P10 lifecycle with live revalidation readiness', () => {
  assert.match(handler, /revalidation_readiness:revalidationReadiness/);
  assert.match(handler, /mergeExecutionStateWithReadiness\(revalidationReadiness\)/);
  assert.match(handler, /allowed:\s*lifecycle\.allowed && revalidationReady/);
  const state = interlock.personMergeExecutionState();
  assert.equal(state.person_merge_lifecycle_version, 'p10-v2-revalidated');
  assert.equal(state.allowed, true);
});
