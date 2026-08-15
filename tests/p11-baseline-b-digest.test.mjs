import assert from 'node:assert/strict';
import test from 'node:test';
import baselineB from '../server/atlas-baseline-b.js';

const { digest, canonicalize } = baselineB;

test('Baseline B digest survives PostgreSQL Date to JSON artifact round-trip', () => {
  const liveRow = [{ id: 'audit-1', applied_at: new Date('2026-08-15T12:34:56.789Z') }];
  const serializedRow = JSON.parse(JSON.stringify(liveRow));

  assert.equal(digest(liveRow), digest(serializedRow));
  assert.equal(canonicalize(liveRow)[0].applied_at, '2026-08-15T12:34:56.789Z');
});

test('Baseline B digest preserves Buffer values through JSON artifact round-trip', () => {
  const liveRow = [{ payload: Buffer.from([0, 1, 2, 255]) }];
  const serializedRow = JSON.parse(JSON.stringify(liveRow));

  assert.equal(digest(liveRow), digest(serializedRow));
});

test('Baseline B canonicalization rejects invalid Date values rather than silently erasing them', () => {
  assert.throws(() => canonicalize({ at: new Date('not-a-date') }), /P11_BASELINE_B_INVALID_DATE/);
});
