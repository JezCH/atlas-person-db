import fs from 'node:fs';
import path from 'node:path';
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

const relationIdByCode = new Map((relationCatalog.person_polity_relation_types || []).map((row) => [String(row.code), String(row.id).toLowerCase()]));
const validRelationIds = new Set(relationIdByCode.values());
const exceptionIds = new Set((exceptionContract.exceptions || []).map((row) => String(row.activity_id).toLowerCase()));
const repairById = new Map((repair.rows || []).map((row) => [String(row.activity_id).toLowerCase(), row]));
const detailById = new Map((audit.rows || []).map((row) => [String(row.activity_id).toLowerCase(), row]));
const incomplete = [...(audit.semantic_v2_breakdown?.incomplete_rows || [])].sort((a, b) => String(a.activity_id).localeCompare(String(b.activity_id)));
const incById = new Map(incomplete.map((row) => [String(row.activity_id).toLowerCase(), row]));

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

const operations = incomplete.map((incompleteRow) => {
  const activityId = String(incompleteRow.activity_id).toLowerCase();
  const detail = detailById.get(activityId);
  const repairRow = repairById.get(activityId);
  if (!detail || !repairRow) throw new Error(`P11_BACKFILL_ACTIVITY_EVIDENCE_MISSING:${activityId}`);
  if (!detail.person_id || !detail.polity_id || !detail.period_basis_id) throw new Error(`P11_BACKFILL_IDENTITY_EVIDENCE_INCOMPLETE:${activityId}`);
  const relationTypeId = relationIdFor(activityId, repairRow, incompleteRow);
  const startDetail = temporalDetailFor(activityId, repairRow, 'start');
  const endDetail = temporalDetailFor(activityId, repairRow, 'end');
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
      activity_start_detail: { year: detail.activity_start, ...startDetail },
      activity_end_detail: { year: detail.activity_end, ...endDetail },
      confidence: detail.confidence,
      chronology_status: detail.chronology_status,
      legacy_source_key: detail.legacy_source_key,
      notes_policy: 'PRESERVE_EXACT_LIVE_NOTES'
    }
  };
});

const liveExceptionIds = operations.filter((operation) => operation.after.relation_type_id == null).map((operation) => operation.activity_id).sort();
const undeclaredNull = liveExceptionIds.filter((id) => !exceptionIds.has(id));
if (undeclaredNull.length) throw new Error(`P11_BACKFILL_UNDECLARED_RELATION_EXCEPTION:${undeclaredNull.join(',')}`);
if (operations.some((operation) => !exceptionIds.has(operation.activity_id) && operation.after.relation_type_id == null)) throw new Error('P11_BACKFILL_GENERIC_NULL_RELATION_FORBIDDEN');

fs.mkdirSync(outDir, { recursive: true });
const planFiles = [];
for (let offset = 0, part = 1; offset < operations.length; offset += chunkSize, part += 1) {
  const chunk = operations.slice(offset, offset + chunkSize);
  const plan = {
    schema: 'atlas-stage2-correction-v2-execution-plan/v1',
    batch_id: `p11_semantic_v2_legacy_backfill_batch${part}_20260817`,
    as_of: '2026-08-17',
    status: 'REVIEWED_P11_LEGACY_SEMANTIC_V2_BACKFILL',
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

function incRelationWasNull(activityId) {
  return incById.get(activityId)?.relation_type_id == null;
}

const summary = {
  schema: 'atlas-p11-semantic-v2-backfill-execution-summary/v1',
  production_sha: audit.deployment_sha,
  baseline_digest: audit.baseline_digest,
  activity_count: Number(audit.counts?.activities || audit.row_count || 0),
  semantic_v2_incomplete_before: operations.length,
  relation_backfill_rows: operations.filter((operation) => operation.after.relation_type_id != null && incRelationWasNull(operation.activity_id)).length,
  temporal_backfill_rows: operations.length,
  reviewed_relation_exceptions_live: liveExceptionIds.length,
  reviewed_relation_exception_ids_live: liveExceptionIds,
  plan_count: planFiles.length,
  chunk_size: chunkSize,
  production_mutation_authorized: false
};
fs.writeFileSync(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
