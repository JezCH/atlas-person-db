import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import reviewService from '../server/atlas-duplicate-review-service.js';
import mergeInterlock from '../server/atlas-person-merge-interlock.js';

const { loadDetectorInput } = reviewService;
const { personMergeReadiness, PRE_P10_LIFECYCLE_VERSION } = mergeInterlock;

function tick() {
  return new Promise((resolve) => setImmediate(resolve));
}

test('detector input serializes queries on one pg client and loads the full semantic-v2 Activity contract', async () => {
  let executing = false;
  const calls = [];
  const client = {
    async query(sql) {
      assert.equal(executing, false, 'same pg client received overlapping query() calls');
      executing = true;
      calls.push(String(sql));
      await tick();
      executing = false;
      if (/from atlas_v2\.person_names/i.test(sql)) return { rows: [{ person_id: 'p', name: 'Name', locale: 'en', is_preferred: true }] };
      return { rows: [] };
    }
  };

  const input = await loadDetectorInput(client);
  assert.equal(calls.length, 2);
  assert.equal(input.names.length, 1);
  for (const field of [
    'relation_type_id', 'role_id', 'period_basis_id',
    'activity_start_month', 'activity_start_day', 'activity_start_granularity', 'activity_start_calendar', 'activity_start_certainty',
    'activity_end_month', 'activity_end_day', 'activity_end_granularity', 'activity_end_calendar', 'activity_end_certainty'
  ]) {
    assert.match(calls[1], new RegExp(`\\b${field}\\b`));
  }
});

test('P10 rebuild invalidates reviewed decisions on detector-version drift as well as evidence drift', () => {
  const source = fs.readFileSync(new URL('../server/atlas-duplicate-review-service.js', import.meta.url), 'utf8');
  assert.match(source, /detector_version is distinct from excluded\.detector_version/);
  assert.match(source, /decision_evidence_fingerprint is distinct from excluded\.evidence_fingerprint/);
  assert.match(source, /then 'REVIEW'/);
  assert.match(source, /reconciliation_semantic_version:\s*REVALIDATION_SEMANTIC_VERSION/);
});

test('P10-A does not unlock physical Person merge', () => {
  const readiness = personMergeReadiness({
    reconciliation_semantic_version: 'v2-relation-full-temporal',
    required_reconciliation_semantic_version: 'v2-relation-full-temporal',
    person_merge_lifecycle_version: PRE_P10_LIFECYCLE_VERSION,
    required_person_merge_lifecycle_version: 'p10-v2-revalidated'
  });
  assert.equal(readiness.allowed, false);
  assert.match(readiness.reasons.join(' '), /P10 v2 Person-merge lifecycle has not been revalidated/);
});
