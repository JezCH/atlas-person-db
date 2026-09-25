"use strict";

const { inspectAuthoringReadiness } = require("./atlas-authoring-readiness.js");
const { inspectPersonDuplicateRevalidationReadiness } = require("./atlas-person-duplicate-revalidation-readiness.js");
const { personMergeExecutionState } = require("./atlas-person-merge-interlock.js");
const reviewedSemanticExceptions = require("../stage2/contracts/p11-reviewed-semantic-v2-exceptions.v1.json");

const CANONICAL_DATA_READINESS_SCHEMA = "atlas-canonical-data-readiness/v1";
const CANONICAL_SEMANTIC_VERSION = "v2-relation-full-temporal";
const REVIEWED_RELATION_EXCEPTION_IDS = Object.freeze(
  [...new Set((reviewedSemanticExceptions.exceptions || [])
    .map((item) => String(item.activity_id || "").trim().toLowerCase())
    .filter(Boolean))].sort()
);

if (
  reviewedSemanticExceptions.schema !== "atlas-p11-reviewed-semantic-v2-exceptions/v1"
  || reviewedSemanticExceptions.rules?.exception_scope !== "relation_type_id_only"
) {
  throw new Error("REVIEWED_SEMANTIC_EXCEPTION_CONTRACT_INVALID");
}

const CANONICAL_DATA_TABLES = Object.freeze([
  "persons",
  "person_names",
  "person_descriptions",
  "person_sources",
  "polities",
  "polity_names",
  "polity_descriptions",
  "polity_sources",
  "governance_contexts",
  "governance_context_names",
  "polity_governance_periods",
  "polity_governance_period_sources",
  "polity_relation_types",
  "polity_relations",
  "polity_relation_sources",
  "polity_designations",
  "polity_designation_names",
  "polity_designation_sources",
  "polity_identity_relation_types",
  "polity_identity_relations",
  "polity_identity_relation_sources",
  "people_groups",
  "people_group_names",
  "people_group_sources",
  "historical_events",
  "historical_event_names",
  "historical_event_sources",
  "person_people_affiliations",
  "person_people_affiliation_sources",
  "person_event_participations",
  "person_event_participation_sources",
  "person_politics_v2",
  "person_politics_sources",
  "chronology_claims",
  "relationship_descriptions",
  "sources",
  "roles",
  "role_names",
  "period_bases",
  "period_basis_names",
  "person_polity_relation_types"
]);

async function inspectCanonicalSchemaCoverage(client) {
  const result = await client.query(`
    select expected.table_name,
           to_regclass(format('atlas_v2.%I', expected.table_name))::text as relation_name
      from unnest($1::text[]) with ordinality as expected(table_name, ordinal_position)
     order by expected.ordinal_position`, [CANONICAL_DATA_TABLES]);
  const relationByTable = new Map((result.rows || []).map((row) => [String(row.table_name), row.relation_name]));
  const missing = CANONICAL_DATA_TABLES.filter((table) => !relationByTable.get(table)).sort();
  return Object.freeze({
    expected_table_count: CANONICAL_DATA_TABLES.length,
    present_table_count: CANONICAL_DATA_TABLES.length - missing.length,
    missing_tables: Object.freeze(missing),
    ready: missing.length === 0
  });
}

async function inspectCanonicalDataReadiness(client, {
  inspectAuthoring = inspectAuthoringReadiness,
  inspectRevalidation = inspectPersonDuplicateRevalidationReadiness,
  mergeExecutionState = personMergeExecutionState
} = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");

  const canonicalSchema = await inspectCanonicalSchemaCoverage(client);
  const authoring = await inspectAuthoring(client);
  const revalidation = await inspectRevalidation(client);
  const merge = mergeExecutionState();
  const schemaResult = await client.query(`select to_regclass('atlas_v2.person_merge_audits')::text as merge_audits`);
  const mergeAuditSchemaReady = Boolean(schemaResult.rows[0]?.merge_audits);

  const activityResult = await client.query(`
    select
      count(*)::int as activities,
      count(*) filter (where relation_type_id is null
        or period_basis_id is null
        or activity_start_granularity is null
        or activity_start_calendar is null
        or ((activity_end_granularity is null or activity_end_calendar is null)
          and not (chronology_status='ongoing' and activity_end is null)))::int as semantic_v2_incomplete,
      count(*) filter (where relation_type_id is null
        and id = any($1::uuid[])
        and period_basis_id is not null
        and activity_start_granularity is not null
        and activity_start_certainty is not null
        and activity_start_calendar is not null
        and activity_end_granularity is not null
        and activity_end_certainty is not null
        and activity_end_calendar is not null)::int as reviewed_relation_exceptions,
      count(*) filter (where (relation_type_id is null
        or period_basis_id is null
        or activity_start_granularity is null
        or activity_start_calendar is null
        or ((activity_end_granularity is null or activity_end_calendar is null)
          and not (chronology_status='ongoing' and activity_end is null)))
        and not (relation_type_id is null
          and id = any($1::uuid[])
          and period_basis_id is not null
          and activity_start_granularity is not null
          and activity_start_certainty is not null
          and activity_start_calendar is not null
          and activity_end_granularity is not null
          and activity_end_certainty is not null
          and activity_end_calendar is not null))::int as semantic_v2_blocking_incomplete,
      count(*) filter (where activity_start=0 or activity_end=0)::int as year_zero_rows,
      count(*) filter (where activity_start>activity_end)::int as reversed_ranges
      from atlas_v2.person_politics_v2`, [REVIEWED_RELATION_EXCEPTION_IDS]);
  const activity = activityResult.rows[0] || {};

  const frontierResult = await client.query(`
    select
      count(*) filter (where candidate_state='ACTIVE')::int as active_candidates,
      count(*) filter (where candidate_state='ACTIVE' and current_decision='MERGE')::int as approved_merges_pending,
      count(*) filter (where candidate_state='ACTIVE' and current_decision='KEEP_SEPARATE')::int as keep_separate,
      count(*) filter (where candidate_state='ACTIVE' and (current_decision is null or current_decision='REVIEW'))::int as unresolved
      from atlas_v2.person_duplicate_candidates`);
  const frontier = frontierResult.rows[0] || {};

  let mergeAudit = Object.freeze({ audits: 0, merged_source_person_still_live: 0 });
  if (mergeAuditSchemaReady) {
    const auditResult = await client.query(`
      select
        count(*)::int as audits,
        count(*) filter (where p.id is not null)::int as merged_source_person_still_live
        from atlas_v2.person_merge_audits a
        left join atlas_v2.persons p on p.id=a.source_person_id`);
    mergeAudit = Object.freeze(auditResult.rows[0] || { audits: 0, merged_source_person_still_live: 0 });
  }

  const blockers = [];
  if (!canonicalSchema.ready) blockers.push(`CANONICAL_SCHEMA_MISSING:${canonicalSchema.missing_tables.join(",")}`);
  if (!authoring?.ready) blockers.push("AUTHORING_NOT_READY");
  if (!revalidation?.ready) blockers.push("PERSON_DUPLICATE_REVALIDATION_NOT_READY");
  if (!merge?.allowed) blockers.push("PERSON_MERGE_LIFECYCLE_NOT_READY");
  if (String(merge?.reconciliation_semantic_version || "") !== CANONICAL_SEMANTIC_VERSION) blockers.push("SEMANTIC_VERSION_DRIFT");
  if (!mergeAuditSchemaReady) blockers.push("PERSON_MERGE_AUDIT_SCHEMA_MISSING");
  if (Number(activity.semantic_v2_blocking_incomplete || 0) !== 0) blockers.push(`ACTIVITY_SEMANTIC_V2_BLOCKING_INCOMPLETE:${Number(activity.semantic_v2_blocking_incomplete || 0)}`);
  if (Number(activity.year_zero_rows || 0) !== 0) blockers.push(`ACTIVITY_YEAR_ZERO:${Number(activity.year_zero_rows || 0)}`);
  if (Number(activity.reversed_ranges || 0) !== 0) blockers.push(`ACTIVITY_REVERSED_RANGE:${Number(activity.reversed_ranges || 0)}`);
  if (Number(frontier.approved_merges_pending || 0) !== 0) blockers.push(`APPROVED_PERSON_MERGES_PENDING:${Number(frontier.approved_merges_pending || 0)}`);
  if (Number(frontier.unresolved || 0) !== 0) blockers.push(`PERSON_DUPLICATE_FRONTIER_UNRESOLVED:${Number(frontier.unresolved || 0)}`);
  if (Number(mergeAudit.merged_source_person_still_live || 0) !== 0) blockers.push(`MERGED_SOURCE_PERSON_REAPPEARED:${Number(mergeAudit.merged_source_person_still_live || 0)}`);

  const uniqueBlockers = Object.freeze([...new Set(blockers)].sort());
  return Object.freeze({
    ready: uniqueBlockers.length === 0,
    schema: CANONICAL_DATA_READINESS_SCHEMA,
    semantic_version: CANONICAL_SEMANTIC_VERSION,
    blockers: uniqueBlockers,
    canonical_schema: canonicalSchema,
    authoring,
    duplicate_revalidation: revalidation,
    person_merge: merge,
    activity: Object.freeze({
      activities: Number(activity.activities || 0),
      semantic_v2_incomplete: Number(activity.semantic_v2_incomplete || 0),
      reviewed_relation_exceptions: Number(activity.reviewed_relation_exceptions || 0),
      semantic_v2_blocking_incomplete: Number(activity.semantic_v2_blocking_incomplete || 0),
      year_zero_rows: Number(activity.year_zero_rows || 0),
      reversed_ranges: Number(activity.reversed_ranges || 0)
    }),
    reviewed_semantic_exception_contract: Object.freeze({
      schema: reviewedSemanticExceptions.schema,
      declared_exception_ids: REVIEWED_RELATION_EXCEPTION_IDS.length
    }),
    duplicate_frontier: Object.freeze({
      active_candidates: Number(frontier.active_candidates || 0),
      approved_merges_pending: Number(frontier.approved_merges_pending || 0),
      keep_separate: Number(frontier.keep_separate || 0),
      unresolved: Number(frontier.unresolved || 0)
    }),
    merge_audit_schema_ready: mergeAuditSchemaReady,
    merge_audit: mergeAudit
  });
}

async function assertCanonicalDataReadiness(client, options) {
  const readiness = await inspectCanonicalDataReadiness(client, options);
  if (!readiness.ready) {
    const error = new Error(`CANONICAL_DATA_NOT_READY:${readiness.blockers.join(";")}`);
    error.code = "CANONICAL_DATA_NOT_READY";
    error.readiness = readiness;
    throw error;
  }
  return readiness;
}

module.exports = Object.freeze({
  CANONICAL_DATA_READINESS_SCHEMA,
  CANONICAL_SEMANTIC_VERSION,
  CANONICAL_DATA_TABLES,
  REVIEWED_RELATION_EXCEPTION_IDS,
  inspectCanonicalSchemaCoverage,
  inspectCanonicalDataReadiness,
  assertCanonicalDataReadiness
});
