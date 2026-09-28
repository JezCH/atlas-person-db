import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertPersonFactCountOutput,
  derivePersonFactCounts,
  formatPersonFactCountResult,
  validatePersonFactCountOutput,
} from '../server/person-fact-count-output.mjs';

const base = {
  E: ['1','1','1','1','1','?'],
  R: ['1','1','1','0','1','1'],
  T: ['1','1','1','1','?','0'],
  D: {
    governance: '1',
    military: '1',
    knowledge: '0',
    technology: '0',
    commerce: '0',
    culture: '?',
    religion: '0',
    exploration: '0',
  },
  G: {
    originSet: ['Germany'],
    modes: {
      institutional_adoption: { state: '1', units: ['Netherlands'] },
      formal_teaching: { state: '0', units: [] },
      documented_imitation: { state: '1', units: ['Sweden'] },
      operative_application: { state: '0', units: [] },
      movement_reception: { state: '?', units: [] },
      documented_circulation: { state: '1', units: ['United Kingdom'] },
    },
  },
  S: ['0','1','1','?','1','0'],
  zeroReviewClosed: [
    'R4',
    'T6',
    'D.knowledge',
    'D.technology',
    'D.commerce',
    'D.religion',
    'D.exploration',
    'G2',
    'G4',
    'S1',
    'S6',
  ],
};

test('deriver computes PHFC v4.2 from fixed factual cells', () => {
  const r = derivePersonFactCounts(base);
  assert.deepEqual(r.counts, { E: 5, R: 5, T: 4, D: 2, G: 3, S: 3 });
  assert.equal(r.verifiedCount, 22);
  assert.equal(r.status, 'HOLD');
  assert.deepEqual(r.unresolved, ['E6','T5','D.culture','G5','S4']);
});

test('formatter emits the count block first and round-trips', () => {
  const output = formatPersonFactCountResult(base);
  assert.match(
    output,
    /^E_COUNT 5\/6\nR_COUNT 5\/6\nT_COUNT 4\/6\nD_COUNT 2\/6\nG_COUNT 3\/6\nS_COUNT 3\/6\nVERIFIED_COUNT 22\/36\nUNRESOLVED 5\nSTATUS HOLD\n/,
  );
  assert.match(output, /G G1=1 G2=0 G3=1 G4=0 G5=\? G6=1/);
  assert.match(output, /ZERO_REVIEW_CLOSED /);
  const validated = assertPersonFactCountOutput(output);
  assert.equal(validated.standard, 'ATLAS-PHFC-4.2');
  assert.equal(validated.verifiedCount, 22);
});

test('G counts fixed reception modes, not number of countries found', () => {
  const expanded = structuredClone(base);
  expanded.G.modes.institutional_adoption.units.push('United States','France','Japan');
  expanded.G.modes.documented_imitation.units.push('Italy','Brazil');
  const r = derivePersonFactCounts(expanded);
  assert.equal(r.counts.G, 3);
  assert.equal(r.verifiedCount, 22);
  assert.equal(r.profile.G.modes.institutional_adoption.units.length, 4);
});

test('a new verified G mode changes G_COUNT by one regardless of its country count', () => {
  const expanded = structuredClone(base);
  expanded.G.modes.formal_teaching = { state: '1', units: ['United States','Canada','Australia'] };
  expanded.zeroReviewClosed = expanded.zeroReviewClosed.filter((id) => id !== 'G2');
  const r = derivePersonFactCounts(expanded);
  assert.equal(r.counts.G, 4);
  assert.equal(r.verifiedCount, 23);
});

test('zero states require exact bounded-review closure', () => {
  const missing = structuredClone(base);
  missing.zeroReviewClosed = missing.zeroReviewClosed.filter((id) => id !== 'R4');
  assert.throws(() => derivePersonFactCounts(missing), /zeroReviewClosed must exactly match every 0-state cell/);

  const extra = structuredClone(base);
  extra.zeroReviewClosed.push('E1');
  assert.throws(() => derivePersonFactCounts(extra), /zeroReviewClosed must exactly match every 0-state cell/);
});

test('unresolved cannot silently become zero without closure', () => {
  const unresolvedToZero = structuredClone(base);
  unresolvedToZero.G.modes.movement_reception.state = '0';
  assert.throws(
    () => derivePersonFactCounts(unresolvedToZero),
    /zeroReviewClosed must exactly match every 0-state cell/,
  );

  unresolvedToZero.zeroReviewClosed.push('G5');
  const r = derivePersonFactCounts(unresolvedToZero);
  assert.equal(r.counts.G, 3);
  assert.deepEqual(r.unresolved, ['E6','T5','D.culture','S4']);
});

test('D retains eight raw domains while contribution remains capped at six', () => {
  const expanded = structuredClone(base);
  for (const key of Object.keys(expanded.D)) expanded.D[key] = '1';
  expanded.zeroReviewClosed = expanded.zeroReviewClosed.filter((id) => !id.startsWith('D.'));
  const r = derivePersonFactCounts(expanded);
  assert.equal(r.counts.D, 6);
  assert.equal(Object.keys(r.profile.D).length, 8);
});

test('counting input cannot branch on Person type metadata', () => {
  const withRoleMetadata = { ...structuredClone(base), personType: 'public-office-holder' };
  assert.throws(
    () => derivePersonFactCounts(withRoleMetadata),
    /profile input must contain exactly/,
  );
});

test('validator rejects prose before the count block', () => {
  const output = '설명부터 시작\n' + formatPersonFactCountResult(base);
  assert.equal(validatePersonFactCountOutput(output).ok, false);
});

test('validator rejects tampered arithmetic and count/profile mismatch', () => {
  const output = formatPersonFactCountResult(base);
  const badTotal = output.replace('VERIFIED_COUNT 22/36', 'VERIFIED_COUNT 21/36');
  assert.match(validatePersonFactCountOutput(badTotal).error, /VERIFIED_COUNT arithmetic mismatch/);

  const badGroup = output.replace('G_COUNT 3/6', 'G_COUNT 2/6');
  assert.match(validatePersonFactCountOutput(badGroup).error, /G_COUNT does not match raw profile/);
});

test('G rejects origin overlap and verified units on non-verified modes', () => {
  const overlap = structuredClone(base);
  overlap.G.modes.institutional_adoption.units.push('Germany');
  assert.throws(() => derivePersonFactCounts(overlap), /overlaps ORIGIN_SET/);

  const invalidUnits = structuredClone(base);
  invalidUnits.G.modes.formal_teaching.units.push('France');
  assert.throws(() => derivePersonFactCounts(invalidUnits), /non-VERIFIED state must not store verified units/);
});

test('COMPLETE is derived only after every unresolved cell is resolved and closed when zero', () => {
  const complete = structuredClone(base);
  complete.E[5] = '0';
  complete.zeroReviewClosed.push('E6');

  complete.T[4] = '1';

  complete.D.culture = '0';
  complete.zeroReviewClosed.push('D.culture');

  complete.G.modes.movement_reception.state = '0';
  complete.zeroReviewClosed.push('G5');

  complete.S[3] = '0';
  complete.zeroReviewClosed.push('S4');

  const output = formatPersonFactCountResult(complete);
  assert.match(output, /UNRESOLVED 0\nSTATUS COMPLETE\n/);
  assert.equal(validatePersonFactCountOutput(output).ok, true);
});
