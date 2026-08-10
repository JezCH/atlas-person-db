import assert from 'node:assert/strict';
import test from 'node:test';
import detector from '../server/atlas-duplicate-detector.js';

const { strictName, foldedName, tokenSetName, detectPersonDuplicateCandidates } = detector;

const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';
const C = '00000000-0000-4000-8000-000000000003';

test('name normalization is deterministic but does not become an identity key', () => {
  assert.equal(strictName('  Charles   V '), 'charles v');
  assert.equal(foldedName('Abd al-Málik'), 'abd al malik');
  assert.equal(tokenSetName('Malik Abd al'), 'abd al malik');
});

test('exact preferred name produces a high-confidence review candidate, never a merge result', () => {
  const candidates = detectPersonDuplicateCandidates({
    names: [
      { person_id: A, name: 'Charles V', locale: 'en', is_preferred: true },
      { person_id: B, name: 'Charles V', locale: 'en', is_preferred: true }
    ],
    activities: [
      { person_id: A, polity_id: 'p1', activity_start: 1516, activity_end: 1556 },
      { person_id: B, polity_id: 'p1', activity_start: 1519, activity_end: 1556 }
    ]
  });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].person_low_id, A);
  assert.equal(candidates[0].person_high_id, B);
  assert.ok(candidates[0].confidence >= 0.95);
  assert.ok(candidates[0].evidence.some((item) => item.kind === 'EXACT_NAME'));
  assert.ok(candidates[0].evidence.some((item) => item.kind === 'SAME_POLITY_OVERLAP'));
  assert.equal(Object.hasOwn(candidates[0], 'decision'), false);
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

test('large chronology separation lowers confidence and is visible as evidence', () => {
  const candidates = detectPersonDuplicateCandidates({
    names: [
      { person_id: A, name: 'John Smith', locale: 'en', is_preferred: true },
      { person_id: B, name: 'John Smith', locale: 'en', is_preferred: true }
    ],
    activities: [
      { person_id: A, polity_id: 'p1', activity_start: 1000, activity_end: 1010 },
      { person_id: B, polity_id: 'p2', activity_start: 1300, activity_end: 1310 }
    ]
  });
  assert.equal(candidates.length, 1);
  assert.ok(candidates[0].confidence < 0.8);
  assert.ok(candidates[0].evidence.some((item) => item.kind === 'CHRONOLOGY_SEPARATION'));
});

test('different names with no supported signal are not invented as candidates', () => {
  const candidates = detectPersonDuplicateCandidates({
    names: [
      { person_id: A, name: 'Alice', locale: 'en', is_preferred: true },
      { person_id: C, name: 'Bob', locale: 'en', is_preferred: true }
    ]
  });
  assert.deepEqual(candidates, []);
});
