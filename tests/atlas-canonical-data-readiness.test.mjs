import assert from 'node:assert/strict';
import test from 'node:test';
import readinessModule from '../server/atlas-canonical-data-readiness.js';

const {
  CANONICAL_DATA_READINESS_SCHEMA,
  CANONICAL_SEMANTIC_VERSION,
  CANONICAL_DATA_TABLES,
  REVIEWED_RELATION_EXCEPTION_IDS,
  inspectCanonicalDataReadiness
} = readinessModule;

function readinessDependencies({ authoringReady = true, revalidationReady = true, mergeAllowed = true } = {}) {
  return {
    inspectAuthoring: async () => ({ ready: authoringReady }),
    inspectRevalidation: async () => ({ ready: revalidationReady }),
    mergeExecutionState: () => ({
      allowed: mergeAllowed,
      reconciliation_semantic_version: CANONICAL_SEMANTIC_VERSION
    })
  };
}

function readinessClient({
  semanticIncomplete = 0,
  reviewedRelationExceptions = 0,
  blockingSemanticIncomplete = semanticIncomplete,
  yearZeroRows = 0,
  reversedRanges = 0,
  activeCandidates = 0,
  approvedMergesPending = 0,
  keepSeparate = 0,
  unresolved = 0,
  audits = 0,
  mergedSourcePersonStillLive = 0,
  mergeAuditSchemaReady = true,
  missingCanonicalTables = []
} = {}) {
  const missing = new Set(missingCanonicalTables);
  return {
    async query(sql) {
      const text = String(sql);
      if (/unnest\(\$1::text\[\]\)/i.test(text)) {
        return {
          rows: CANONICAL_DATA_TABLES.map((table) => ({
            table_name: table,
            relation_name: missing.has(table) ? null : `atlas_v2.${table}`
          }))
        };
      }
      if (/to_regclass\('atlas_v2\.person_merge_audits'\)/i.test(text)) {
        return { rows: [{ merge_audits: mergeAuditSchemaReady ? 'atlas_v2.person_merge_audits' : null }] };
      }
      if (/semantic_v2_incomplete/i.test(text)) {
        return { rows: [{
          activities: 12,
          semantic_v2_incomplete: semanticIncomplete,
          reviewed_relation_exceptions: reviewedRelationExceptions,
          semantic_v2_blocking_incomplete: blockingSemanticIncomplete,
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

test('canonical readiness is blocked while an approved physical Person merge is pending', async () => {
  const readiness = await inspectCanonicalDataReadiness(
    readinessClient({ activeCandidates: 1, approvedMergesPending: 1 }),
    readinessDependencies()
  );
  assert.equal(readiness.ready, false);
  assert.ok(readiness.blockers.includes('APPROVED_PERSON_MERGES_PENDING:1'));
  assert.equal(readiness.duplicate_frontier.approved_merges_pending, 1);
});

test('canonical readiness permits only declared reviewed relation exceptions', async () => {
  const readiness = await inspectCanonicalDataReadiness(
    readinessClient({
      semanticIncomplete: 3,
      reviewedRelationExceptions: 3,
      blockingSemanticIncomplete: 0,
      activeCandidates: 2,
      keepSeparate: 2,
      audits: 1
    }),
    readinessDependencies()
  );
  assert.equal(readiness.ready, true);
  assert.deepEqual(readiness.blockers, []);
  assert.equal(readiness.schema, CANONICAL_DATA_READINESS_SCHEMA);
  assert.equal(readiness.activity.semantic_v2_incomplete, 3);
  assert.equal(readiness.activity.reviewed_relation_exceptions, 3);
  assert.equal(readiness.activity.semantic_v2_blocking_incomplete, 0);
  assert.equal(readiness.reviewed_semantic_exception_contract.declared_exception_ids, REVIEWED_RELATION_EXCEPTION_IDS.length);
  assert.ok(REVIEWED_RELATION_EXCEPTION_IDS.length >= 20);
});

test('canonical readiness opens only when schema, duplicate frontier and merge audit are clean', async () => {
  const readiness = await inspectCanonicalDataReadiness(
    readinessClient({ activeCandidates: 2, keepSeparate: 2, audits: 1 }),
    readinessDependencies()
  );
  assert.equal(readiness.ready, true);
  assert.equal(readiness.canonical_schema.expected_table_count, 41);
  assert.equal(readiness.canonical_schema.present_table_count, 41);
  assert.deepEqual(readiness.canonical_schema.missing_tables, []);
  assert.equal(readiness.duplicate_frontier.keep_separate, 2);
  assert.equal(readiness.merge_audit.merged_source_person_still_live, 0);
});

test('canonical readiness fails closed when a canonical table is missing', async () => {
  const readiness = await inspectCanonicalDataReadiness(
    readinessClient({ missingCanonicalTables: ['person_event_participation_sources'] }),
    readinessDependencies()
  );
  assert.equal(readiness.ready, false);
  assert.deepEqual(readiness.canonical_schema.missing_tables, ['person_event_participation_sources']);
  assert.ok(readiness.blockers.includes('CANONICAL_SCHEMA_MISSING:person_event_participation_sources'));
});

test('canonical readiness fails closed on semantic, chronology, frontier or merge-audit drift', async () => {
  const readiness = await inspectCanonicalDataReadiness(
    readinessClient({
      semanticIncomplete: 4,
      reviewedRelationExceptions: 2,
      blockingSemanticIncomplete: 2,
      yearZeroRows: 1,
      reversedRanges: 1,
      activeCandidates: 1,
      unresolved: 1,
      audits: 1,
      mergedSourcePersonStillLive: 1
    }),
    readinessDependencies()
  );
  assert.equal(readiness.ready, false);
  for (const blocker of [
    'ACTIVITY_SEMANTIC_V2_BLOCKING_INCOMPLETE:2',
    'ACTIVITY_YEAR_ZERO:1',
    'ACTIVITY_REVERSED_RANGE:1',
    'PERSON_DUPLICATE_FRONTIER_UNRESOLVED:1',
    'MERGED_SOURCE_PERSON_REAPPEARED:1'
  ]) assert.ok(readiness.blockers.includes(blocker), blocker);
});

test('canonical readiness exposes current dependency failures without phase-specific blocker names', async () => {
  const authoring = await inspectCanonicalDataReadiness(readinessClient(), readinessDependencies({ authoringReady: false }));
  assert.ok(authoring.blockers.includes('AUTHORING_NOT_READY'));

  const revalidation = await inspectCanonicalDataReadiness(readinessClient(), readinessDependencies({ revalidationReady: false }));
  assert.ok(revalidation.blockers.includes('PERSON_DUPLICATE_REVALIDATION_NOT_READY'));

  const merge = await inspectCanonicalDataReadiness(readinessClient(), readinessDependencies({ mergeAllowed: false }));
  assert.ok(merge.blockers.includes('PERSON_MERGE_LIFECYCLE_NOT_READY'));
});
