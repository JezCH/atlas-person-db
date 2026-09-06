import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const auditPath = arg('--audit');
const repairPath = arg('--repair');
const outDir = arg('--out-dir', 'artifacts/p11-semantic-v2-backfill');
const chunkSize = Number(arg('--chunk-size', '100'));
if (!auditPath || !repairPath) throw new Error('--audit and --repair are required');
if (!Number.isInteger(chunkSize) || chunkSize < 1 || chunkSize > 200) throw new Error('chunk size must be an integer from 1 to 200');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const audit = readJson(auditPath);
const repair = readJson(repairPath);
const exceptionContract = readJson(path.join(root, 'stage2/contracts/p11-reviewed-semantic-v2-exceptions.v1.json'));
const relationCatalog = readJson(path.join(root, 'stage2/catalogs/relation-types.v1.json'));

if (audit.marker !== 'ATLAS_AUDIT_INVENTORY_V1' || audit.mode !== 'full_stage2_baseline' || audit.read_only !== true || audit.committed !== false) throw new Error('P11_BACKFILL_AUDIT_INVALID');
if (repair.schema !== 'atlas-stage2-p9-completeness-repair-plan/v1' || repair.status !== 'READ_ONLY_PLANNER_NO_PRODUCTION_MUTATION') throw new Error('P11_BACKFILL_REPAIR_PLAN_INVALID');
if (exceptionContract.schema !== 'atlas-p11-reviewed-semantic-v2-exceptions/v1' || exceptionContract.rules?.exception_scope !== 'relation_type_id_only') throw new Error('P11_BACKFILL_EXCEPTION_CONTRACT_INVALID');
if (relationCatalog.schema !== 'atlas-stage2-relation-type-catalog/v1') throw new Error('P11_BACKFILL_RELATION_CATALOG_INVALID');

const baselineDigest = String(audit.baseline_digest || '').trim();
if (!baselineDigest) throw new Error('P11_BACKFILL_BASELINE_DIGEST_REQUIRED');
const executionScope = createHash('sha256').update(baselineDigest, 'utf8').digest('hex').slice(0, 20);

const relationIdByCode = new Map((relationCatalog.person_polity_relation_types || []).map((row) => [String(row.code), String(row.id).toLowerCase()]));
const validRelationIds = new Set(relationIdByCode.values());
const exceptionIds = new Set((exceptionContract.exceptions || []).map((row) => String(row.activity_id).toLowerCase()));
const repairById = new Map((repair.rows || []).map((row) => [String(row.activity_id).toLowerCase(), row]));
const detailById = new Map((audit.rows || []).map((row) => [String(row.activity_id).toLowerCase(), row]));
const auditIncomplete = [...(audit.semantic_v2_breakdown?.incomplete_rows || [])].sort((a, b) => String(a.activity_id).localeCompare(String(b.activity_id)));

const field = (incompleteRow, detail, key) => Object.prototype.hasOwnProperty.call(incompleteRow || {}, key)
  ? incompleteRow[key]
  : detail?.[key];

function isBaselineBIncomplete(incompleteRow, detail) {
  const ongoingOpenEnd = detail?.chronology_status === 'ongoing' && field(incompleteRow, detail, 'activity_end') == null;
  return field(incompleteRow, detail, 'relation_type_id') == null
    || field(incompleteRow, detail, 'period_basis_id') == null
    || field(incompleteRow, detail, 'activity_start_granularity') == null
    || field(incompleteRow, detail, 'activity_start_calendar') == null
    || ((field(incompleteRow, detail, 'activity_end_granularity') == null
      || field(incompleteRow, detail, 'activity_end_calendar') == null) && !ongoingOpenEnd);
}

function isLiveReviewedRelationException(incompleteRow, detail) {
  const activityId = String(incompleteRow.activity_id).toLowerCase();
  if (!exceptionIds.has(activityId)) return false;
  return field(incompleteRow, detail, 'relation_type_id') == null
    && field(incompleteRow, detail, 'period_basis_id') != null
    && field(incompleteRow, detail, 'activity_start_granularity') != null
    && field(incompleteRow, detail, 'activity_start_certainty') != null
    && field(incompleteRow, detail, 'activity_start_calendar') != null
    && field(incompleteRow, detail, 'activity_end_granularity') != null
    && field(incompleteRow, detail, 'activity_end_certainty') != null
    && field(incompleteRow, detail, 'activity_end_calendar') != null;
}

const incomplete = [];
const baselineBTransportExempt = [];
for (const incompleteRow of auditIncomplete) {
  const activityId = String(incompleteRow.activity_id).toLowerCase();
  const detail = detailById.get(activityId);
  if (!detail) throw new Error(`P11_BACKFILL_ACTIVITY_EVIDENCE_MISSING:${activityId}`);
  if (isBaselineBIncomplete(incompleteRow, detail)) incomplete.push(incompleteRow);
  else baselineBTransportExempt.push(incompleteRow);
}

const reviewedRelationExceptionsLive = [];
const blockingIncomplete = [];
for (const incompleteRow of incomplete) {
  const activityId = String(incompleteRow.activity_id).toLowerCase();
  const detail = detailById.get(activityId);
  if (!detail) throw new Error(`P11_BACKFILL_ACTIVITY_EVIDENCE_MISSING:${activityId}`);
  if (isLiveReviewedRelationException(incompleteRow, detail)) reviewedRelationExceptionsLive.push(incompleteRow);
  else blockingIncomplete.push(incompleteRow);
}

function relationIdFor(activityId, repairRow, incompleteRow) {
  if (exceptionIds.has(activityId)) return null;
  if (incompleteRow.relation_type_id != null) {
    const id = String(incompleteRow.relation_type_id).toLowerCase();
    if (!validRelationIds.has(id)) throw new Error(`P11_BACKFILL_EXISTING_RELATION_NOT_IN_CATALOG:${activityId}`);
    return id;
  }
  if (repairRow?.disposition !== 'SEMANTIC_BACKFILL_READY' || repairRow?.relation?.ready !== true) throw new Error(`P11_BACKFILL_UNREVIEWED_RELATION:${activityId}`);
  const literal = repairRow.relation.relation_type_id ? String(repairRow.relation.relation_type_id).toLowerCase() : null;
  const byCode = repairRow.relation.relation_code ? relationIdByCode.get(String(repairRow.relation.relation_code)) || null : null;
  const id = literal || byCode;
  if (!id || !validRelationIds.has(id)) throw new Error(`P11_BACKFILL_RELATION_BINDING_MISSING:${activityId}`);
  if (literal && byCode && literal !== byCode) throw new Error(`P11_BACKFILL_RELATION_BINDING_DRIFT:${activityId}`);
  return id;
}

function temporalDetailFor(activityId, repairRow, boundary) {
  if (repairRow?.temporal?.ready !== true) throw new Error(`P11_BACKFILL_TEMPORAL_UNREVIEWED:${activityId}`);
  if (repairRow.temporal.class === 'ALREADY_COMPLETE') return null;
  const prefix = boundary === 'start' ? 'activity_start' : 'activity_end';
  if (repairRow.temporal[`${prefix}_granularity`] !== 'year') throw new Error(`P11_BACKFILL_TEMPORAL_GRANULARITY_DRIFT:${activityId}:${boundary}`);
  if (repairRow.temporal[`${prefix}_month`] != null || repairRow.temporal[`${prefix}_day`] != null) throw new Error(`P11_BACKFILL_TEMPORAL_PRECISION_FABRICATION:${activityId}:${boundary}`);
  if (!['exact','uncertain'].includes(repairRow.temporal[`${prefix}_certainty`])) throw new Error(`P11_BACKFILL_TEMPORAL_CERTAINTY_INVALID:${activityId}:${boundary}`);
  if (repairRow.temporal[`${prefix}_calendar`] !== 'unspecified_historical') throw new Error(`P11_BACKFILL_RUNTIME_CALENDAR_WRITEBACK_FORBIDDEN:${activityId}:${boundary}`);
  return {
    month: null,
    day: null,
    granularity: 'year',
    certainty: repairRow.temporal[`${prefix}_certainty`],
    calendar: 'unspecified_historical'
  };
}

const operations = blockingIncomplete.map((incompleteRow) => {
  const activityId = String(incompleteRow.activity_id).toLowerCase();
  const detail = detailById.get(activityId);
  const repairRow = repairById.get(activityId);
  if (!detail || !repairRow) throw new Error(`P11_BACKFILL_ACTIVITY_EVIDENCE_MISSING:${activityId}`);
  if (!detail.person_id || !detail.polity_id || !detail.period_basis_id) throw new Error(`P11_BACKFILL_IDENTITY_EVIDENCE_INCOMPLETE:${activityId}`);
  if (repairRow.disposition !== 'SEMANTIC_BACKFILL_READY' && !exceptionIds.has(activityId)) throw new Error(`P11_BACKFILL_BLOCKER_NOT_REVIEWED_READY:${activityId}`);

  const relationTypeId = relationIdFor(activityId, repairRow, incompleteRow);
  const startDetail = temporalDetailFor(activityId, repairRow, 'start');
  const endDetail = temporalDetailFor(activityId, repairRow, 'end');
  const existingStartDetail = {
    year: detail.activity_start,
    month: detail.activity_start_month ?? null,
    day: detail.activity_start_day ?? null,
    granularity: detail.activity_start_granularity ?? null,
    certainty: detail.activity_start_certainty ?? null,
    calendar: detail.activity_start_calendar ?? null
  };
  const existingEndDetail = {
    year: detail.activity_end,
    month: detail.activity_end_month ?? null,
    day: detail.activity_end_day ?? null,
    granularity: detail.activity_end_granularity ?? null,
    certainty: detail.activity_end_certainty ?? null,
    calendar: detail.activity_end_calendar ?? null
  };
  return {
    case_id: `p11_${activityId}`,
    type: 'rewrite_activity',
    activity_id: activityId,
    baseline_before: {
      person_id: detail.person_id,
      polity_id: detail.polity_id,
      role_id: detail.role_id,
      period_basis_id: detail.period_basis_id,
      activity_start: detail.activity_start,
      activity_end: detail.activity_end,
      confidence: detail.confidence,
      chronology_status: detail.chronology_status,
      legacy_source_key: detail.legacy_source_key,
      source_count: Number(detail.source_count || 0)
    },
    after: {
      activity_id: activityId,
      person_id: detail.person_id,
      polity_id: detail.polity_id,
      relation_type_id: relationTypeId,
      role_id: detail.role_id,
      period_basis_id: detail.period_basis_id,
      activity_start: detail.activity_start,
      activity_end: detail.activity_end,
      activity_start_detail: startDetail ? { year: detail.activity_start, ...startDetail } : existingStartDetail,
      activity_end_detail: endDetail ? { year: detail.activity_end, ...endDetail } : existingEndDetail,
      confidence: detail.confidence,
      chronology_status: detail.chronology_status,
      legacy_source_key: detail.legacy_source_key,
      notes_policy: 'PRESERVE_EXACT_LIVE_NOTES'
    }
  };
});

const reviewedRelationExceptionIdsLiveBefore = reviewedRelationExceptionsLive.map((row) => String(row.activity_id).toLowerCase()).sort();
const baselineBTransportExemptIdsBefore = baselineBTransportExempt.map((row) => String(row.activity_id).toLowerCase()).sort();
const operationIds = new Set(operations.map((operation) => operation.activity_id));
const exceptionMutationOverlap = reviewedRelationExceptionIdsLiveBefore.filter((id) => operationIds.has(id));
if (exceptionMutationOverlap.length) throw new Error(`P11_BACKFILL_REVIEWED_EXCEPTION_MUTATION_FORBIDDEN:${exceptionMutationOverlap.join(',')}`);

const nullRelationOperations = operations.filter((operation) => operation.after.relation_type_id == null).map((operation) => operation.activity_id).sort();
const undeclaredNull = nullRelationOperations.filter((id) => !exceptionIds.has(id));
if (undeclaredNull.length) throw new Error(`P11_BACKFILL_UNDECLARED_RELATION_EXCEPTION:${undeclaredNull.join(',')}`);
if (operations.some((operation) => !exceptionIds.has(operation.activity_id) && operation.after.relation_type_id == null)) throw new Error('P11_BACKFILL_GENERIC_NULL_RELATION_FORBIDDEN');

fs.mkdirSync(outDir, { recursive: true });
const planFiles = [];
for (let offset = 0, part = 1; offset < operations.length; offset += chunkSize, part += 1) {
  const chunk = operations.slice(offset, offset + chunkSize);
  const plan = {
    schema: 'atlas-stage2-correction-v2-execution-plan/v1',
    batch_id: `p11_semantic_v2_current_delta_${executionScope}_batch${part}_20260906`,
    as_of: '2026-09-06',
    status: 'REVIEWED_P11_CURRENT_DELTA_SEMANTIC_V2_BACKFILL',
    release_order: 649 + part,
    contract: 'stage2/contracts/correction-v2-current.v1.json',
    decision_authority: [
      'scripts/build-p9-completeness-repair-plan.mjs',
      'stage2/integration/p7-explicit-person-relation-decisions-batch*.v1.json',
      'stage2/integration/p7-runtime-readiness-dispositions.v1.json',
      'stage2/contracts/p11-reviewed-semantic-v2-exceptions.v1.json',
      'stage2/integration/p9-legacy-temporal-metadata-migration.v1.json'
    ],
    baseline: { deployment_sha: audit.deployment_sha, baseline_digest: audit.baseline_digest },
    execution_rules: {
      exact_live_before_snapshot_required: true,
      current_blocking_delta_only: true,
      baseline_scoped_idempotency: true,
      baseline_b_readiness_predicate_is_authoritative: true,
      reviewed_relation_exceptions_are_not_mutation_targets_when_temporally_complete: true,
      reviewed_legacy_temporal_metadata_materialization_only: true,
      runtime_compile_override_writeback_forbidden: true,
      generic_relation_default_forbidden: true,
      reviewed_relation_exceptions_may_remain_null: true,
      preserve_all_existing_normalized_source_links_and_locators: true,
      territory_geometry_mutation_forbidden: true,
      physical_person_merge_forbidden: true,
      production_executable: false,
      production_mutation_authorized: false
    },
    operations: chunk
  };
  const file = path.join(outDir, `p11-semantic-v2-backfill-batch${part}.json`);
  fs.writeFileSync(file, `${JSON.stringify(plan)}\n`);
  planFiles.push(file);
}

const temporalBackfillRows = operations.filter((operation) => {
  const repairRow = repairById.get(operation.activity_id);
  return repairRow?.temporal?.class !== 'ALREADY_COMPLETE';
}).length;
const expectedReviewedExceptionsAfter = [...new Set([...reviewedRelationExceptionIdsLiveBefore, ...nullRelationOperations])].sort();
const summary = {
  schema: 'atlas-p11-semantic-v2-backfill-execution-summary/v1',
  production_sha: audit.deployment_sha,
  baseline_digest: audit.baseline_digest,
  execution_scope: executionScope,
  activity_count: Number(audit.counts?.activities || audit.row_count || 0),
  audit_semantic_v2_incomplete_before: auditIncomplete.length,
  semantic_v2_incomplete_before: incomplete.length,
  baseline_b_transport_exempt_before: baselineBTransportExemptIdsBefore.length,
  baseline_b_transport_exempt_ids_before: baselineBTransportExemptIdsBefore,
  reviewed_relation_exceptions_live_before: reviewedRelationExceptionIdsLiveBefore.length,
  reviewed_relation_exception_ids_live_before: reviewedRelationExceptionIdsLiveBefore,
  blocking_semantic_v2_incomplete_before: operations.length,
  operation_count: operations.length,
  relation_backfill_rows: operations.filter((operation) => operation.after.relation_type_id != null && field(incomplete.find((row) => String(row.activity_id).toLowerCase() === operation.activity_id), detailById.get(operation.activity_id), 'relation_type_id') == null).length,
  temporal_backfill_rows: temporalBackfillRows,
  reviewed_relation_exceptions_expected_after: expectedReviewedExceptionsAfter.length,
  reviewed_relation_exception_ids_expected_after: expectedReviewedExceptionsAfter,
  plan_count: planFiles.length,
  chunk_size: chunkSize,
  production_mutation_authorized: false
};
fs.writeFileSync(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));