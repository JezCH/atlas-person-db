import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertPersonFactProfileOutput,
  formatPersonFactProfile,
  validatePersonFactProfileOutput,
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

test('formatter emits the canonical fact profile with no scalar total', () => {
  const output = formatPersonFactProfile(base);
  assert.doesNotMatch(output, /VERIFIED_TOTAL/);
  assert.doesNotMatch(output, /\/36/);
  assert.match(output, /^E E1=1 E2=1 E3=1 E4=1 E5=1 E6=\?/);
  assert.match(output, /STATUS HOLD$/);
  const validated = assertPersonFactProfileOutput(output);
  assert.equal(validated.standard, 'ATLAS-PHFP-4.0');
  assert.equal(validated.status, 'HOLD');
  assert.deepEqual(validated.unresolved, ['E6','T5','S4','D.culture','G:France reception classification']);
});

test('validator rejects prose before the profile block', () => {
  const output = '설명부터 시작\n' + formatPersonFactProfile(base);
  assert.equal(validatePersonFactProfileOutput(output).ok, false);
});

test('validator rejects legacy aggregate output', () => {
  const output = formatPersonFactProfile(base) + '\nVERIFIED_TOTAL 25/36';
  const result = validatePersonFactProfileOutput(output);
  assert.equal(result.ok, false);
  assert.match(result.error, /aggregate scalar output is forbidden/);
});

test('formatter derives COMPLETE only when every unresolved item is cleared', () => {
  const complete = structuredClone(base);
  complete.E[5] = '0';
  complete.T[4] = '1';
  complete.D.culture = '0';
  complete.G.unresolved = [];
  complete.S[3] = '0';
  const output = formatPersonFactProfile(complete);
  assert.match(output, /UNRESOLVED \[\]\nSTATUS COMPLETE$/);
  assert.equal(validatePersonFactProfileOutput(output).ok, true);
});

test('formatter rejects malformed state and geographic overlap', () => {
  const badState = structuredClone(base);
  badState.E[0] = '2';
  assert.throws(() => formatPersonFactProfile(badState), /must be 1, 0, or \?/);

  const overlap = structuredClone(base);
  overlap.G.externalReceptionSet.push('Germany');
  assert.throws(() => formatPersonFactProfile(overlap), /overlaps ORIGIN_SET/);
});
