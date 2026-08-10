import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../migration/phase-9/scripts/phase9c-live-candidate-preview.mjs', import.meta.url), 'utf8');

test('Phase 9C candidate preview is live-data, detector-backed, and read only', () => {
  assert.match(source, /begin transaction isolation level repeatable read read only/i);
  assert.match(source, /detectPersonDuplicateCandidates/);
  assert.match(source, /PHASE9C_LIVE_CANDIDATE_PREVIEW/);
  assert.match(source, /detected_candidates/);
  assert.match(source, /evidence_fingerprint/);
  assert.match(source, /display_ko/);
  assert.match(source, /display_en/);
  assert.doesNotMatch(source, /\binsert\s+into\b/i);
  assert.doesNotMatch(source, /\bupdate\s+atlas_v2\b/i);
  assert.doesNotMatch(source, /\bdelete\s+from\b/i);
  assert.doesNotMatch(source, /\bdrop\s+(table|view)\b/i);
  assert.doesNotMatch(source, /\balter\s+table\b/i);
});
