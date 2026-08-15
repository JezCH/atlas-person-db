"use strict";

const crypto = require("node:crypto");
const { inspectAuthoringReadiness } = require("./atlas-authoring-readiness.js");
const { inspectPersonDuplicateRevalidationReadiness } = require("./atlas-person-duplicate-revalidation-readiness.js");
const { personMergeExecutionState } = require("./atlas-person-merge-interlock.js");

const BASELINE_B_SCHEMA = "atlas-stage2-baseline-b/v1";
const BASELINE_B_SEMANTIC_VERSION = "v2-relation-full-temporal";

const CORE_DATASET_QUERIES = Object.freeze([
  Object.freeze({ key: "persons", sql: "select * from atlas_v2.persons order by id" }),
  Object.freeze({ key: "person_names", sql: "select * from atlas_v2.person_names order by person_id,locale,is_preferred desc,name,name_type,id" }),
  Object.freeze({ key: "person_descriptions", sql: "select * from atlas_v2.person_descriptions order by person_id,locale,id" }),
  Object.freeze({ key: "person_sources", sql: "select * from atlas_v2.person_sources order by person_id,source_id" }),
  Object.freeze({ key: "polities", sql: "select * from atlas_v2.polities order by id" }),
  Object.freeze({ key: "polity_names", sql: "select * from atlas_v2.polity_names order by polity_id,locale,is_preferred desc,name,name_type,id" }),
  Object.freeze({ key: "polity_descriptions", sql: "select * from atlas_v2.polity_descriptions order by polity_id,locale,id" }),
  Object.freeze({ key: "polity_sources", sql: "select * from atlas_v2.polity_sources order by polity_id,source_id" }),
  Object.freeze({ key: "activities", sql: "select * from atlas_v2.person_politics_v2 order by person_id,polity_id,relation_type_id,role_id nulls first,period_basis_id,activity_start,activity_start_month nulls first,activity_start_day nulls first,activity_end,activity_end_month nulls first,activity_end_day nulls first,id" }),
  Object.freeze({ key: "activity_sources", sql: "select * from atlas_v2.person_politics_sources order by person_politics_id,source_id,source_locator_key" }),
  Object.freeze({ key: "chronology_claims", sql: "select * from atlas_v2.chronology_claims order by person_politics_id,id" }),
  Object.freeze({ key: "relationship_descriptions", sql: "select * from atlas_v2.relationship_descriptions order by person_politics_id,locale,id" }),
  Object.freeze({ key: "sources", sql: "select * from atlas_v2.sources order by id" }),
  Object.freeze({ key: "roles", sql: "select * from atlas_v2.roles order by id" }),
  Object.freeze({ key: "role_names", sql: "select * from atlas_v2.role_names order by role_id,locale,is_preferred desc,name,id" }),
  Object.freeze({ key: "period_bases", sql: "select * from atlas_v2.period_bases order by id" }),
  Object.freeze({ key: "period_basis_names", sql: "select * from atlas_v2.period_basis_names order by period_basis_id,locale,is_preferred desc,name,id" }),
  Object.freeze({ key: "relation_types", sql: "select * from atlas_v2.person_polity_relation_types order by id" })
]);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function digest(value) {
  return `sha256:${crypto.createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex")}`;
}

function buildBaselineBDocument({ datasets, readiness }) {
  if (!datasets || typeof datasets !== "object") throw new Error("Baseline B datasets are required");
  if (!readiness?.ready) throw new Error("P11_BASELINE_B_NOT_READY");

  const orderedKeys = Object.keys(datasets).sort();
  const counts = {};
  const datasetDigests = {};
  for (const key of orderedKeys) {
    const rows = Array.isArray(datasets[key]) ? datasets[key] : [];
    counts[key] = rows.length;
    datasetDigests[key] = digest(rows);
  }
  const manifest = Object.freeze({
    schema: BASELINE_B_SCHEMA,
    semantic_version: BASELINE_B_SEMANTIC_VERSION,
    counts: Object.freeze(counts),
    dataset_digests: Object.freeze(datasetDigests)
  });
  return Object.freeze({
    ...manifest,
    baseline_digest: digest(manifest),
    readiness,
    datasets: Object.freeze(Object.fromEntries(orderedKeys.map((key) => [key, Object.freeze([...(datasets[key] || [])])]))),
    authority: Object.freeze({
      source: "live-atlas-v2-repeatable-read",
      production_mutation_authorized: false
    })
  });
}

async function inspectBaselineBReadiness(client, {
  inspectAuthoring = inspectAuthoringReadiness,
  inspectRevalidation = inspectPersonDuplicateRevalidationReadiness,
  mergeExecutionState = personMergeExecutionState
} = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");

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
        or activity_end_granularity is null
        or activity_end_calendar is null)::int as semantic_v2_incomplete,
      count(*) filter (where activity_start=0 or activity_end=0)::int as year_zero_rows,
      count(*) filter (where activity_start>activity_end)::int as reversed_ranges
      from atlas_v2.person_politics_v2`);
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
  if (!authoring?.ready) blockers.push("AUTHORING_NOT_READY");
  if (!revalidation?.ready) blockers.push("P10_REVALIDATION_NOT_READY");
  if (!merge?.allowed) blockers.push("P10_PERSON_MERGE_LIFECYCLE_NOT_READY");
  if (String(merge?.reconciliation_semantic_version || "") !== BASELINE_B_SEMANTIC_VERSION) blockers.push("SEMANTIC_VERSION_DRIFT");
  if (!mergeAuditSchemaReady) blockers.push("PERSON_MERGE_AUDIT_SCHEMA_MISSING");
  if (Number(activity.semantic_v2_incomplete || 0) !== 0) blockers.push(`ACTIVITY_SEMANTIC_V2_INCOMPLETE:${Number(activity.semantic_v2_incomplete || 0)}`);
  if (Number(activity.year_zero_rows || 0) !== 0) blockers.push(`ACTIVITY_YEAR_ZERO:${Number(activity.year_zero_rows || 0)}`);
  if (Number(activity.reversed_ranges || 0) !== 0) blockers.push(`ACTIVITY_REVERSED_RANGE:${Number(activity.reversed_ranges || 0)}`);
  if (Number(frontier.approved_merges_pending || 0) !== 0) blockers.push(`APPROVED_PERSON_MERGES_PENDING:${Number(frontier.approved_merges_pending || 0)}`);
  if (Number(frontier.unresolved || 0) !== 0) blockers.push(`PERSON_DUPLICATE_FRONTIER_UNRESOLVED:${Number(frontier.unresolved || 0)}`);
  if (Number(mergeAudit.merged_source_person_still_live || 0) !== 0) blockers.push(`MERGED_SOURCE_PERSON_REAPPEARED:${Number(mergeAudit.merged_source_person_still_live || 0)}`);

  const uniqueBlockers = Object.freeze([...new Set(blockers)].sort());
  return Object.freeze({
    ready: uniqueBlockers.length === 0,
    schema: BASELINE_B_SCHEMA,
    semantic_version: BASELINE_B_SEMANTIC_VERSION,
    blockers: uniqueBlockers,
    authoring,
    p10_revalidation: revalidation,
    person_merge: merge,
    activity: Object.freeze({
      activities: Number(activity.activities || 0),
      semantic_v2_incomplete: Number(activity.semantic_v2_incomplete || 0),
      year_zero_rows: Number(activity.year_zero_rows || 0),
      reversed_ranges: Number(activity.reversed_ranges || 0)
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

async function assertBaselineBReadiness(client, options) {
  const readiness = await inspectBaselineBReadiness(client, options);
  if (!readiness.ready) {
    const error = new Error(`P11_BASELINE_B_NOT_READY:${readiness.blockers.join(";")}`);
    error.code = "P11_BASELINE_B_NOT_READY";
    error.readiness = readiness;
    throw error;
  }
  return readiness;
}

async function captureBaselineB(client, {
  readinessInspector = inspectBaselineBReadiness,
  readinessOptions,
  datasetQueries = CORE_DATASET_QUERIES
} = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    const readiness = await readinessInspector(client, readinessOptions);
    if (!readiness?.ready) {
      const error = new Error(`P11_BASELINE_B_NOT_READY:${(readiness?.blockers || []).join(";")}`);
      error.code = "P11_BASELINE_B_NOT_READY";
      error.readiness = readiness;
      throw error;
    }
    const datasets = {};
    for (const descriptor of datasetQueries) {
      if (!descriptor?.key || !/^select\b/i.test(String(descriptor?.sql || "").trim())) throw new Error("P11_BASELINE_B_DATASET_QUERY_INVALID");
      const result = await client.query(descriptor.sql);
      datasets[descriptor.key] = result.rows || [];
    }
    const document = buildBaselineBDocument({ datasets, readiness });
    await client.query("COMMIT");
    return document;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    throw error;
  }
}

module.exports = Object.freeze({
  BASELINE_B_SCHEMA,
  BASELINE_B_SEMANTIC_VERSION,
  CORE_DATASET_QUERIES,
  canonicalize,
  digest,
  buildBaselineBDocument,
  inspectBaselineBReadiness,
  assertBaselineBReadiness,
  captureBaselineB
});
