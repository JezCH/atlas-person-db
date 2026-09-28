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
    governance: '1', military: '1', knowledge: '0', technology: '0',
    commerce: '0', culture: '?', religion: '0', exploration: '0',
  },
  G: {
    originSet: ['Germany'],
    externalReceptionSet: ['Netherlands','Sweden'],
    unresolved: ['France reception classification'],
  },
  S: ['0','1','1','?','1','0'],
};

test('deriver computes the deterministic factual coverage count', () => {
  const r = derivePersonFactCounts(base);
  assert.deepEqual(r.counts, { E: 5, R: 5, T: 4, D: 2, G: 2, S: 3 });
  assert.equal(r.verifiedCount, 21);
  assert.equal(r.status, 'HOLD');
  assert.deepEqual(r.unresolved, ['E6','T5','S4','D.culture','G:France reception classification']);
});

test('formatter emits count block first and validator round-trips it', () => {
  const output = formatPersonFactCountResult(base);
  assert.match(output, /^E_COUNT 5\/6\nR_COUNT 5\/6\nT_COUNT 4\/6\nD_COUNT 2\/6\nG_COUNT 2\/6\nS_COUNT 3\/6\nVERIFIED_COUNT 21\/36\nUNRESOLVED 5\nSTATUS HOLD\n/);
  const validated = assertPersonFactCountOutput(output);
  assert.equal(validated.standard, 'ATLAS-PHFC-4.1');
  assert.equal(validated.verifiedCount, 21);
});

test('D and G retain raw evidence while count contribution caps at six', () => {
  const expanded = structuredClone(base);
  for (const key of Object.keys(expanded.D)) expanded.D[key] = '1';
  expanded.G.externalReceptionSet = ['A','B','C','D','E','F','G','H'];
  expanded.G.unresolved = [];
  const r = derivePersonFactCounts(expanded);
  assert.equal(r.counts.D, 6);
  assert.equal(r.counts.G, 6);
  assert.equal(r.profile.G.externalReceptionSet.length, 8);
});

test('validator rejects prose before count block', () => {
  const output = '설명부터 시작\n' + formatPersonFactCountResult(base);
  assert.equal(validatePersonFactCountOutput(output).ok, false);
});

test('validator rejects tampered arithmetic and count/profile mismatch', () => {
  const output = formatPersonFactCountResult(base);
  const badTotal = output.replace('VERIFIED_COUNT 21/36', 'VERIFIED_COUNT 20/36');
  assert.match(validatePersonFactCountOutput(badTotal).error, /VERIFIED_COUNT arithmetic mismatch/);
  const badGroup = output.replace('E_COUNT 5/6', 'E_COUNT 4/6');
  assert.match(validatePersonFactCountOutput(badGroup).error, /E_COUNT does not match raw profile/);
});

test('COMPLETE is derived only when all unresolved facts are cleared', () => {
  const complete = structuredClone(base);
  complete.E[5] = '0';
  complete.T[4] = '1';
  complete.D.culture = '0';
  complete.G.unresolved = [];
  complete.S[3] = '0';
  const output = formatPersonFactCountResult(complete);
  assert.match(output, /UNRESOLVED 0\nSTATUS COMPLETE\n/);
  assert.equal(validatePersonFactCountOutput(output).ok, true);
});

test('formatter rejects malformed state and geographic overlap', () => {
  const badState = structuredClone(base);
  badState.E[0] = '2';
  assert.throws(() => formatPersonFactCountResult(badState), /must be 1, 0, or \?/);
  const overlap = structuredClone(base);
  overlap.G.externalReceptionSet.push('Germany');
  assert.throws(() => formatPersonFactCountResult(overlap), /overlaps ORIGIN_SET/);
});
