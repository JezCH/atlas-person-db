import assert from 'node:assert/strict';
import test from 'node:test';
import baselineB from '../server/atlas-baseline-b.js';

const {
  BASELINE_B_SCHEMA,
  BASELINE_B_SEMANTIC_VERSION,
  buildBaselineBDocument,
  inspectBaselineBReadiness,
  captureBaselineB
} = baselineB;

function readinessDependencies({ authoringReady = true, revalidationReady = true, mergeAllowed = true } = {}) {
  return {
    inspectAuthoring: async () => ({ ready: authoringReady }),
    inspectRevalidation: async () => ({ ready: revalidationReady }),
    mergeExecutionState: () => ({
      allowed: mergeAllowed,
      reconciliation_semantic_version: BASELINE_B_SEMANTIC_VERSION
    })
  };
}

function readinessClient({
  semanticIncomplete = 0,
  yearZeroRows = 0,
  reversedRanges = 0,
  activeCandidates = 0,
  approvedMergesPending = 0,
  keepSeparate = 0,
  unresolved = 0,
  audits = 0,
  mergedSourcePersonStillLive = 0,
  mergeAuditSchemaReady = true
} = {}) {
  const calls = [];
  return {
    calls,
    async query(sql) {
      const text = String(sql);
      calls.push(text);
      if (/to_regclass\('atlas_v2\.person_merge_audits'\)/i.test(text)) {
        return { rows: [{ merge_audits: mergeAuditSchemaReady ? 'atlas_v2.person_merge_audits' : null }] };
      }
      if (/semantic_v2_incomplete/i.test(text)) {
        return { rows: [{
          activities: 12,
          semantic_v2_incomplete: semanticIncomplete,
          year_zero_rows: yearZeroRows,
          reversed_ranges: reversedRanges
        }] };
      }
      if (/approved_merges_pending/i.test(text)) {
        return { rows: [{
          active_candidates: activeCandidates,
          approved_merges_pending: approvedMergesPending,
          keep_separate: keepSeparate,
          unresolved
        }] };
      }
      if (/merged_source_person_still_live/i.test(text)) {
        return { rows: [{ audits, merged_source_person_still_live: mergedSourcePersonStillLive }] };
      }
      throw new Error(`unexpected SQL: ${text}`);
    }
  };
}

test('Baseline B document is deterministic across object key insertion order and never authorizes Production mutation', () => {
  const readiness = Object.freeze({ ready: true, schema: BASELINE_B_SCHEMA });
  const first = buildBaselineBDocument({
    readiness,
    datasets: {
      persons: [{ id: 'p1', canonical_key: 'alpha', historicity: 'historical' }],
      activities: [{ person_id: 'p1', polity_id: 'x', relation_type_id: 'r' }]
    }
  });
  const second = buildBaselineBDocument({
    readiness,
    datasets: {
      activities: [{ relation_type_id: 'r', polity_id: 'x', person_id: 'p1' }],
      persons: [{ historicity: 'historical', canonical_key: 'alpha', id: 'p1' }]
    }
  });

  assert.equal(first.schema, BASELINE_B_SCHEMA);
  assert.equal(first.semantic_version, BASELINE_B_SEMANTIC_VERSION);
  assert.equal(first.baseline_digest, second.baseline_digest);
  assert.deepEqual(first.dataset_digests, second.dataset_digests);
  assert.equal(first.authority.production_mutation_authorized, false);

  const changed = buildBaselineBDocument({
    readiness,
    datasets: {
      persons: [{ id: 'p1', canonical_key: 'beta', historicity: 'historical' }],
      activities: [{ person_id: 'p1', polity_id: 'x', relation_type_id: 'r' }]
    }
  });
  assert.notEqual(first.baseline_digest, changed.baseline_digest);
});

test('P11 stays blocked after terminal P10 review while an approved physical Person merge is still pending', async () => {
  const client = readinessClient({
    activeCandidates: 1,
    approvedMergesPending: 1
  });
  const readiness = await inspectBaselineBReadiness(client, readinessDependencies());

  assert.equal(readiness.ready, false);
  assert.ok(readiness.blockers.includes('APPROVED_PERSON_MERGES_PENDING:1'));
  assert.equal(readiness.duplicate_frontier.approved_merges_pending, 1);
  assert.equal(readiness.activity.semantic_v2_incomplete, 0);
});

test('P11 readiness opens only when semantic-v2 data, P10 frontier, and merge audit state are clean', async () => {
  const client = readinessClient({
    activeCandidates: 2,
    keepSeparate: 2,
    audits: 1
  });
  const readiness = await inspectBaselineBReadiness(client, readinessDependencies());

  assert.equal(readiness.ready, true);
  assert.deepEqual(readiness.blockers, []);
  assert.equal(readiness.duplicate_frontier.keep_separate, 2);
  assert.equal(readiness.merge_audit.merged_source_person_still_live, 0);
});

test('P11 readiness fails closed on incomplete temporal semantics, year zero, unresolved frontier, or resurrected merged source UUID', async () => {
  const client = readinessClient({
    semanticIncomplete: 2,
    yearZeroRows: 1,
    reversedRanges: 1,
    activeCandidates: 1,
    unresolved: 1,
    audits: 1,
    mergedSourcePersonStillLive: 1
  });
  const readiness = await inspectBaselineBReadiness(client, readinessDependencies());

  assert.equal(readiness.ready, false);
  for (const blocker of [
    'ACTIVITY_SEMANTIC_V2_INCOMPLETE:2',
    'ACTIVITY_YEAR_ZERO:1',
    'ACTIVITY_REVERSED_RANGE:1',
    'PERSON_DUPLICATE_FRONTIER_UNRESOLVED:1',
    'MERGED_SOURCE_PERSON_REAPPEARED:1'
  ]) assert.ok(readiness.blockers.includes(blocker), blocker);
});

test('Baseline B capture runs in one repeatable-read read-only transaction with sequential SELECTs', async () => {
  const calls = [];
  let executing = false;
  const client = {
    async query(sql) {
      assert.equal(executing, false, 'one pg client must never receive overlapping query() calls');
      executing = true;
      try {
        const text = String(sql);
        calls.push(text);
        await new Promise((resolve) => setImmediate(resolve));
        if (/select persons_fixture/i.test(text)) return { rows: [{ id: 'p1', canonical_key: 'alpha' }] };
        if (/select activities_fixture/i.test(text)) return { rows: [{ id: 'a1', activity_start: -10, activity_end: -1 }] };
        return { rows: [] };
      } finally {
        executing = false;
      }
    }
  };

  const document = await captureBaselineB(client, {
    readinessInspector: async () => ({ ready: true, blockers: [] }),
    datasetQueries: [
      { key: 'persons', sql: 'select persons_fixture' },
      { key: 'activities', sql: 'select activities_fixture' }
    ]
  });

  assert.equal(calls[0], 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  assert.equal(calls.at(-1), 'COMMIT');
  assert.equal(calls.includes('ROLLBACK'), false);
  assert.deepEqual(document.counts, { activities: 1, persons: 1 });
  assert.match(document.baseline_digest, /^sha256:[0-9a-f]{64}$/);
});

test('blocked Baseline B capture rolls back before reading any canonical dataset', async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(String(sql));
      return { rows: [] };
    }
  };

  await assert.rejects(
    captureBaselineB(client, {
      readinessInspector: async () => ({ ready: false, blockers: ['APPROVED_PERSON_MERGES_PENDING:1'] }),
      datasetQueries: [{ key: 'persons', sql: 'select forbidden_dataset_read' }]
    }),
    (error) => {
      assert.equal(error.code, 'P11_BASELINE_B_NOT_READY');
      return true;
    }
  );

  assert.deepEqual(calls, [
    'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY',
    'ROLLBACK'
  ]);
});
