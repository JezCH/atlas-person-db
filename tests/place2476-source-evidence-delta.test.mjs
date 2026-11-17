import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const handoff = JSON.parse(readFileSync(new URL('../docs/places/PLACE2476_SOURCE_EVIDENCE_DELTA_20261117.json', import.meta.url), 'utf8'));

test('Place evidence delta retains the original immutable fact and Source identities', () => {
  assert.equal(handoff.schema, 'atlas-place-source-evidence-delta/v1');
  assert.equal(handoff.original_review.pr, 2617);
  assert.match(handoff.original_review.head_sha, /^[a-f0-9]{40}$/);
  const expected = new Map([
    [18, '9ed98162-dc7d-5a2f-89da-db4aac4694ae'],
    [4, 'c3af4db8-6c27-51da-af04-5f562cbd5cc2'],
    [17, '69e4362a-3589-52b4-9a32-5b8e83710552'],
    [1, '044aaa9d-e264-5449-bbe4-e380c3f02220'],
    [15, '0a3dc36b-9eb9-5536-ac23-5fe71cb9467b'],
  ]);
  assert.equal(handoff.cases.length, expected.size);
  for (const entry of handoff.cases) {
    assert.equal(entry.source_id, expected.get(entry.fact_index));
    assert.ok(entry.historical_claim.function_type === 'capital');
    assert.ok(Number.isInteger(entry.historical_claim.start_year));
    assert.ok(entry.historical_claim.end_year == null || entry.historical_claim.end_year >= entry.historical_claim.start_year);
    assert.match(entry.review_state, /^HOLD_/);
    assert.ok(entry.finding.length > 50);
    assert.ok(entry.next_action.length > 15);
    assert.ok(Array.isArray(entry.additional_evidence) && entry.additional_evidence.length > 0);
    for (const evidence of entry.additional_evidence) {
      assert.equal(new URL(evidence.url).protocol, 'https:');
      assert.ok(evidence.locator.length >= 16);
      assert.ok(evidence.supports.length >= 20);
    }
  }
});

test('Place evidence never turns bibliographic search or chronology ambiguity into authorized canonical writes', () => {
  assert.equal(handoff.production_executable, false);
  assert.equal(handoff.production_mutation_authorized, false);
  assert.deepEqual(handoff.operations, []);
  const kufa = handoff.cases.find(e => e.fact_index === 18);
  assert.equal(kufa.historical_claim.start_year, 656);
  assert.match(kufa.finding, /657/);
  const bursa = handoff.cases.find(e => e.fact_index === 17);
  assert.match(bursa.finding, /not independently established/);
  const ankara = handoff.cases.find(e => e.fact_index === 4);
  assert.match(ankara.original_access, /direct original open failed/);
  assert.ok(handoff.cases.every(e => e.next_action && e.review_state !== 'READY'));
});
