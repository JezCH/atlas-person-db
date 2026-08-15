import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const historical = require('../scripts/lib/stage2-baseline-a-historical-duplicate-detector.cjs');
const current = require('../server/atlas-duplicate-detector.js');
const builder = fs.readFileSync(new URL('../scripts/build-stage2-baseline-a-person-duplicate-candidates.mjs', import.meta.url), 'utf8');
const historicalSource = fs.readFileSync(new URL('../scripts/lib/stage2-baseline-a-historical-duplicate-detector.cjs', import.meta.url), 'utf8');

const names = [
  { person_id: '11111111-1111-4111-8111-111111111111', name: 'Replay Person', locale: 'en', is_preferred: true },
  { person_id: '22222222-2222-4222-8222-222222222222', name: 'Replay Person', locale: 'en', is_preferred: true }
];
const legacyActivities = [
  { person_id: names[0].person_id, polity_id: '33333333-3333-4333-8333-333333333333', activity_start: 100, activity_end: 110 },
  { person_id: names[1].person_id, polity_id: '33333333-3333-4333-8333-333333333333', activity_start: 100, activity_end: 110 }
];

test('historical Baseline A replay is frozen outside runtime P10 authority', () => {
  assert.equal(historical.DETECTOR_SCOPE, 'HISTORICAL_BASELINE_A_REPLAY_ONLY');
  assert.equal(historical.FROZEN_FROM_COMMIT, '32744c711d3588986e5e475143bf9feec0a0994a');
  assert.equal(historical.DETECTOR_VERSION, 'phase9-v2-full-evidence');
  assert.match(historicalSource, /Historical replay only/);
  assert.match(builder, /stage2-baseline-a-historical-duplicate-detector\.cjs/);
  assert.doesNotMatch(builder, /server\/atlas-duplicate-detector\.js/);
  assert.match(builder, /exact_current_detector_reused:\s*false/);
  assert.match(builder, /historical_detector_is_not_p10_authority:\s*true/);
});

test('historical replay accepts legacy Baseline A projection while current P10 remains fail-closed', () => {
  const historicalCandidates = historical.detectPersonDuplicateCandidates({ names, activities: legacyActivities });
  assert.equal(historicalCandidates.length, 1);
  assert.equal(historicalCandidates[0].confidence, 0.98);
  assert.throws(
    () => current.detectPersonDuplicateCandidates({ names, activities: legacyActivities }),
    /P10_ACTIVITY_NOT_SEMANTIC_V2_READY/
  );
});
