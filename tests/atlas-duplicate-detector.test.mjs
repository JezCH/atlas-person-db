import assert from 'node:assert/strict';
import test from 'node:test';
import detector from '../server/atlas-duplicate-detector.js';

const {
  DETECTOR_VERSION,
  REVALIDATION_SEMANTIC_VERSION,
  strictName,
  foldedName,
  tokenSetName,
  detectPersonDuplicateCandidates
} = detector;

const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';
const C = '00000000-0000-4000-8000-000000000003';
const P1 = '10000000-0000-4000-8000-000000000001';
const P2 = '10000000-0000-4000-8000-000000000002';
const REL1 = '20000000-0000-4000-8000-000000000001';
const REL2 = '20000000-0000-4000-8000-000000000002';
const ROLE1 = '30000000-0000-4000-8000-000000000001';
const ROLE2 = '30000000-0000-4000-8000-000000000002';
const BASIS1 = '40000000-0000-4000-8000-000000000001';
const BASIS2 = '40000000-0000-4000-8000-000000000002';

function activity(personId, overrides = {}) {
  return {
    id: personId === A ? '50000000-0000-4000-8000-000000000001' : '50000000-0000-4000-8000-000000000002',
    person_id: personId,
    polity_id: P1,
    relation_type_id: REL1,
    role_id: ROLE1,
    period_basis_id: BASIS1,
    activity_start: 1516,
    activity_start_month: null,
    activity_start_day: null,
    activity_start_granularity: 'year',
    activity_start_calendar: 'unspecified_historical',
    activity_start_certainty: 'exact',
    activity_end: 1556,
    activity_end_month: null,
    activity_end_day: null,
    activity_end_granularity: 'year',
    activity_end_calendar: 'unspecified_historical',
    activity_end_certainty: 'exact',
    ...overrides
  };
}

function sameNameRows(name = 'Charles V') {
  return [
    { person_id: A, name, locale: 'en', is_preferred: true },
    { person_id: B, name, locale: 'en', is_preferred: true }
  ];
}

test('name normalization is deterministic but does not become an identity key', () => {
  assert.equal(strictName('  Charles   V '), 'charles v');
  assert.equal(foldedName('Abd al-Málik'), 'abd al malik');
  assert.equal(tokenSetName('Malik Abd al'), 'abd al malik');
});

test('P10 exact semantic context is explicit review evidence, never an automatic merge', () => {
  const candidates = detectPersonDuplicateCandidates({
    names: sameNameRows(),
    activities: [activity(A), activity(B)]
  });
  assert.equal(candidates.length, 1);
  const candidate = candidates[0];
  assert.equal(candidate.person_low_id, A);
  assert.equal(candidate.person_high_id, B);
  assert.ok(candidate.confidence >= 0.95);
  assert.equal(candidate.detector_version, DETECTOR_VERSION);
  assert.equal(candidate.reconciliation_semantic_version, REVALIDATION_SEMANTIC_VERSION);
  assert.match(candidate.semantic_key_version, /v2$/);
  assert.ok(candidate.evidence.some((item) => item.kind === 'EXACT_NAME'));
  assert.ok(candidate.evidence.some((item) => item.kind === 'P10_SEMANTIC_PROFILE'));
  assert.ok(candidate.evidence.some((item) => item.kind === 'P10_EXACT_ACTIVITY_SEMANTIC_CONTEXT'));
  assert.equal(Object.hasOwn(candidate, 'decision'), false);
});

test('folded/token evidence can nominate a pair without pretending it is certain', () => {
  const candidates = detectPersonDuplicateCandidates({
    names: [
      { person_id: A, name: 'Abd al-Málik', locale: 'en', is_preferred: true },
      { person_id: B, name: 'Malik Abd al', locale: 'en', is_preferred: true }
    ]
  });
  assert.equal(candidates.length, 1);
  assert.ok(candidates[0].confidence < 0.9);
  assert.ok(candidates[0].evidence.some((item) => item.kind === 'TOKEN_SET_NAME'));
});

test('large chronology separation remains negative evidence after v2 validation', () => {
  const candidates = detectPersonDuplicateCandidates({
    names: sameNameRows('John Smith'),
    activities: [
      activity(A, { activity_start: 1000, activity_end: 1010 }),
      activity(B, { polity_id: P2, activity_start: 1300, activity_end: 1310 })
    ]
  });
  assert.equal(candidates.length, 1);
  assert.ok(candidates[0].confidence < 0.8);
  assert.ok(candidates[0].evidence.some((item) => item.kind === 'CHRONOLOGY_SEPARATION'));
});

test('role differences are visible as role-variant context and change the evidence fingerprint', () => {
  const names = sameNameRows();
  const exact = detectPersonDuplicateCandidates({ names, activities: [activity(A), activity(B)] })[0];
  const variant = detectPersonDuplicateCandidates({ names, activities: [activity(A), activity(B, { role_id: ROLE2 })] })[0];
  assert.ok(exact.evidence.some((item) => item.kind === 'P10_EXACT_ACTIVITY_SEMANTIC_CONTEXT'));
  assert.ok(variant.evidence.some((item) => item.kind === 'P10_ROLE_VARIANT_ACTIVITY_CONTEXT'));
  assert.ok(!variant.evidence.some((item) => item.kind === 'P10_EXACT_ACTIVITY_SEMANTIC_CONTEXT'));
  assert.notEqual(exact.evidence_fingerprint, variant.evidence_fingerprint);
});

test('relation and period-basis differences cannot masquerade as exact semantic matches', () => {
  const names = sameNameRows();
  const exact = detectPersonDuplicateCandidates({ names, activities: [activity(A), activity(B)] })[0];
  const relationChanged = detectPersonDuplicateCandidates({ names, activities: [activity(A), activity(B, { relation_type_id: REL2 })] })[0];
  const periodChanged = detectPersonDuplicateCandidates({ names, activities: [activity(A), activity(B, { period_basis_id: BASIS2 })] })[0];
  for (const candidate of [relationChanged, periodChanged]) {
    assert.ok(!candidate.evidence.some((item) => item.kind === 'P10_EXACT_ACTIVITY_SEMANTIC_CONTEXT'));
    assert.notEqual(candidate.evidence_fingerprint, exact.evidence_fingerprint);
  }
});

test('full temporal month/day/calendar/granularity participates in the P10 profile', () => {
  const names = sameNameRows();
  const yearOnly = detectPersonDuplicateCandidates({ names, activities: [activity(A), activity(B)] })[0];
  const dayPrecise = detectPersonDuplicateCandidates({
    names,
    activities: [
      activity(A),
      activity(B, {
        activity_start_month: 1,
        activity_start_day: 2,
        activity_start_granularity: 'day',
        activity_start_calendar: 'gregorian',
        activity_end_month: 9,
        activity_end_day: 30,
        activity_end_granularity: 'day',
        activity_end_calendar: 'gregorian'
      })
    ]
  })[0];
  assert.ok(!dayPrecise.evidence.some((item) => item.kind === 'P10_EXACT_ACTIVITY_SEMANTIC_CONTEXT'));
  assert.notEqual(dayPrecise.evidence_fingerprint, yearOnly.evidence_fingerprint);
});

test('P10 fails closed when any detector Activity is not semantic-key v2 ready', () => {
  assert.throws(() => detectPersonDuplicateCandidates({
    names: sameNameRows(),
    activities: [activity(A), activity(B, { relation_type_id: null })]
  }), /P10_ACTIVITY_NOT_SEMANTIC_V2_READY/);
});

test('different names with no supported signal are not invented as candidates', () => {
  const candidates = detectPersonDuplicateCandidates({
    names: [
      { person_id: A, name: 'Alice', locale: 'en', is_preferred: true },
      { person_id: C, name: 'Bob', locale: 'en', is_preferred: true }
    ],
    activities: [activity(A), activity(C)]
  });
  assert.deepEqual(candidates, []);
});
