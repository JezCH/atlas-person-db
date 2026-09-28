import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertPersonFactCountOutput,
  formatPersonFactCountResult,
  validatePersonFactCountOutput,
} from '../server/person-fact-count-output.mjs';

test('formatter always emits the canonical result block with arithmetic total', () => {
  const output = formatPersonFactCountResult({
    E: 5, R: 4, T: 3, D: 2, G: 6, S: 1, unresolved: 4,
  });

  assert.equal(output, [
    'E 5/6',
    'R 4/6',
    'T 3/6',
    'D 2/6',
    'G 6/6',
    'S 1/6',
    'VERIFIED_TOTAL 21/36',
    'UNRESOLVED 4',
  ].join('\n'));

  assert.deepEqual(assertPersonFactCountOutput(output), {
    ok: true,
    counts: { E: 5, R: 4, T: 3, D: 2, G: 6, S: 1 },
    verifiedTotal: 21,
    unresolved: 4,
  });
});

test('validator rejects prose before the result block', () => {
  const output = [
    '먼저 근거를 설명한다.',
    'E 1/6', 'R 1/6', 'T 1/6', 'D 1/6', 'G 1/6', 'S 1/6',
    'VERIFIED_TOTAL 6/36', 'UNRESOLVED 0',
  ].join('\n');
  assert.equal(validatePersonFactCountOutput(output).ok, false);
});

test('validator accepts an optional opening code fence but no prose preamble', () => {
  const output = [
    '```text',
    'E 1/6', 'R 2/6', 'T 3/6', 'D 4/6', 'G 5/6', 'S 6/6',
    'VERIFIED_TOTAL 21/36', 'UNRESOLVED 2',
    '```', '', '근거 설명은 이 뒤에 온다.',
  ].join('\n');
  assert.equal(validatePersonFactCountOutput(output).ok, true);
});

test('validator rejects missing total and arithmetic mismatch', () => {
  const missingTotal = [
    'E 1/6', 'R 1/6', 'T 1/6', 'D 1/6', 'G 1/6', 'S 1/6',
    'UNRESOLVED 0',
  ].join('\n');
  assert.equal(validatePersonFactCountOutput(missingTotal).ok, false);

  const mismatch = [
    'E 1/6', 'R 1/6', 'T 1/6', 'D 1/6', 'G 1/6', 'S 1/6',
    'VERIFIED_TOTAL 5/36', 'UNRESOLVED 0',
  ].join('\n');
  assert.match(validatePersonFactCountOutput(mismatch).error, /arithmetic mismatch/);
});

test('formatter refuses invalid values', () => {
  assert.throws(
    () => formatPersonFactCountResult({ E: 7, R: 0, T: 0, D: 0, G: 0, S: 0, unresolved: 0 }),
    /E must be an integer from 0 to 6/,
  );
  assert.throws(
    () => formatPersonFactCountResult({ E: 0, R: 0, T: 0, D: 0, G: 0, S: 0, unresolved: -1 }),
    /unresolved must be a non-negative integer/,
  );
});
