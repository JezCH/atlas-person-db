import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import reviewService from '../server/atlas-duplicate-review-service.js';
import mergeInterlock from '../server/atlas-person-merge-interlock.js';

const {
  loadDetectorInput,
  reviewCandidate,
  DUPLICATE_REVIEW_REQUEST_ID_COLLISION
} = reviewService;
const {
  PERSON_MERGE_LIFECYCLE_VERSION,
  REQUIRED_PERSON_MERGE_LIFECYCLE_VERSION,
  personMergeExecutionState
} = mergeInterlock;

function tick() {
  return new Promise((resolve) => setImmediate(resolve));
}

function replayClient({ candidateId, decision }) {
  const calls = [];
  return {
    calls,
    async query(sql) {
      const text = String(sql);
      calls.push(text);
      if (/from atlas_v2\.person_duplicate_reviews where request_id=\$1/i.test(text)) {
        return { rowCount: 1, rows: [{ candidate_id: candidateId, decision }] };
      }
      return { rowCount: 0, rows: [] };
    }
  };
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
  const activityQuery = calls.find((sql) => /from atlas_v2\.person_politics_v2/i.test(sql));
  assert.ok(activityQuery, 'detector must load authoritative Activity rows');
  assert.ok(calls.some((sql) => /from atlas_v2\.person_names/i.test(sql)), 'detector must load Person names');
  assert.ok(calls.some((sql) => /person_duplicate_revalidation_requirements/i.test(sql)), 'detector must inspect the durable revalidation requirement ledger');
  assert.equal(input.names.length, 1);
  assert.deepEqual(input.requirements, []);
  assert.equal(input.requirements_schema_ready, false);
  for (const field of [
    'relation_type_id', 'role_id', 'period_basis_id',
    'activity_start_month', 'activity_start_day', 'activity_start_granularity', 'activity_start_calendar', 'activity_start_certainty',
    'activity_end_month', 'activity_end_day', 'activity_end_granularity', 'activity_end_calendar', 'activity_end_certainty'
  ]) {
    assert.match(activityQuery, new RegExp(`\\b${field}\\b`));
  }
});

test('duplicate review request_id replays only the same candidate and decision', async () => {
  const candidateId = '11111111-1111-4111-8111-111111111111';
  const client = replayClient({ candidateId, decision: 'MERGE' });
  const outcome = await reviewCandidate({
    client,
    candidateId,
    decision: 'merge',
    rationale: 'retry may carry different non-semantic rationale text',
    requestId: 'review-replay-1'
  });

  assert.deepEqual(outcome, { replayed: true, candidate_id: candidateId, decision: 'MERGE' });
  assert.ok(client.calls.some((sql) => sql === 'COMMIT'));
  assert.equal(client.calls.some((sql) => sql === 'ROLLBACK'), false);
  assert.equal(client.calls.some((sql) => /person_duplicate_candidates where id=\$1 for update/i.test(sql)), false);
});

test('duplicate review request_id fails closed when reused for another candidate', async () => {
  const storedCandidateId = '11111111-1111-4111-8111-111111111111';
  const incomingCandidateId = '22222222-2222-4222-8222-222222222222';
  const client = replayClient({ candidateId: storedCandidateId, decision: 'MERGE' });

  await assert.rejects(
    reviewCandidate({
      client,
      candidateId: incomingCandidateId,
      decision: 'MERGE',
      requestId: 'review-collision-candidate-1'
    }),
    (error) => {
      assert.equal(error.code, DUPLICATE_REVIEW_REQUEST_ID_COLLISION);
      assert.match(error.message, /request_id collision with different payload/);
      return true;
    }
  );
  assert.ok(client.calls.some((sql) => sql === 'ROLLBACK'));
  assert.equal(client.calls.some((sql) => sql === 'COMMIT'), false);
});

test('duplicate review request_id fails closed when reused for another decision', async () => {
  const candidateId = '11111111-1111-4111-8111-111111111111';
  const client = replayClient({ candidateId, decision: 'MERGE' });

  await assert.rejects(
    reviewCandidate({
      client,
      candidateId,
      decision: 'KEEP_SEPARATE',
      requestId: 'review-collision-decision-1'
    }),
    (error) => {
      assert.equal(error.code, DUPLICATE_REVIEW_REQUEST_ID_COLLISION);
      assert.match(error.message, /request_id collision with different payload/);
      return true;
    }
  );
  assert.ok(client.calls.some((sql) => sql === 'ROLLBACK'));
  assert.equal(client.calls.some((sql) => sql === 'COMMIT'), false);
});

test('P10 rebuild invalidates reviewed decisions on detector-version drift as well as evidence drift', () => {
  const source = fs.readFileSync(new URL('../server/atlas-duplicate-review-service.js', import.meta.url), 'utf8');
  assert.match(source, /detector_version is distinct from excluded\.detector_version/);
  assert.match(source, /decision_evidence_fingerprint is distinct from excluded\.evidence_fingerprint/);
  assert.match(source, /then 'REVIEW'/);
  assert.match(source, /reconciliation_semantic_version:\s*REVALIDATION_SEMANTIC_VERSION/);
  assert.match(source, /await client\.query\("BEGIN"\);[\s\S]*lockPersonDuplicateFrontier\(client\)[\s\S]*refreshCandidateFrontier\(client\)/);
});

test('P10-D code lifecycle is current only after full semantic-v2 reconciliation', () => {
  const state = personMergeExecutionState();
  assert.equal(PERSON_MERGE_LIFECYCLE_VERSION, 'p10-v2-revalidated');
  assert.equal(REQUIRED_PERSON_MERGE_LIFECYCLE_VERSION, 'p10-v2-revalidated');
  assert.equal(state.reconciliation_semantic_version, 'v2-relation-full-temporal');
  assert.equal(state.allowed, true);
});

test('physical Person merge is transactionally gated by global revalidation and refreshes the frontier after mutation', () => {
  const source = fs.readFileSync(new URL('../server/atlas-person-merge-service.js', import.meta.url), 'utf8');
  const readiness = source.indexOf('await assertPersonDuplicateRevalidationReadiness(client)');
  const liveEvidence = source.indexOf('assertLiveCandidateEvidence(candidateRow, liveState, requirements)');
  const deletePerson = source.indexOf('delete from atlas_v2.persons where id=$1 returning id');
  const retireRequirement = source.indexOf("set requirement_state='RETIRED'");
  const refresh = source.indexOf('await refreshCandidateFrontier(client)');
  assert.ok(readiness >= 0 && liveEvidence > readiness && retireRequirement > liveEvidence && deletePerson > retireRequirement && refresh > deletePerson);
  assert.match(source, /detectPersonDuplicateCandidates\(\{ names: liveState\.names, activities: liveState\.relationships, requirements \}\)/);
  assert.match(source, /P10_OVERLAPPING_REVALIDATION_REQUIREMENT_REQUIRES_REBIND/);
  assert.match(source, /pre_merge_revalidation_readiness/);
  assert.match(source, /post_merge_revalidation_readiness/);
});

test('Person merge snapshotting does not issue concurrent queries on one pg Client', () => {
  const source = fs.readFileSync(new URL('../server/atlas-person-merge-service.js', import.meta.url), 'utf8');
  const start = source.indexOf('async function snapshotPerson');
  const end = source.indexOf('async function globalCounts');
  const snapshot = source.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(snapshot, /Promise\.all/);
});
