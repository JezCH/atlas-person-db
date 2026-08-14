import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const workQueuesPath = path.resolve(root, arg('--work-queues', 'artifacts/stage2-baseline-a-work-queues.json'));
const frontierPath = path.resolve(root, arg('--frontier', 'artifacts/stage2-baseline-a-effective-p5p6-frontier.json'));
const relationCatalogPath = path.resolve(root, arg('--relation-catalog', 'stage2/catalogs/relation-types.v1.json'));
const explicitDecisionPaths = [
  path.resolve(root, 'stage2/integration/p7-explicit-person-relation-decisions-batch1.v1.json'),
  path.resolve(root, 'stage2/integration/p7-explicit-person-relation-decisions-batch2.v1.json'),
  path.resolve(root, 'stage2/integration/p7-explicit-person-relation-decisions-batch3.v1.json'),
  path.resolve(root, 'stage2/integration/p7-explicit-person-relation-decisions-batch8.v1.json')
];
const outPath = path.resolve(root, arg('--out', 'artifacts/stage2-p7p8-precutover-inventory.json'));
const relationOutPath = path.resolve(root, arg('--relation-out', 'artifacts/stage2-p7a-reviewed-relation-backfill.json'));

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, value) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, `${JSON.stringify(value, null, 2)}\n`); };
const work = readJson(workQueuesPath);
const frontier = readJson(frontierPath);
const catalog = readJson(relationCatalogPath);
const explicitDecisionPackages = explicitDecisionPaths.map(readJson);

const BASELINE_SHA = 'ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
const BASELINE_DIGEST = 'sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
if (work?.summary?.baseline?.deployment_sha !== BASELINE_SHA || frontier?.baseline?.deployment_sha !== BASELINE_SHA) throw new Error('P7P8_BASELINE_SHA_DRIFT');
if (work?.summary?.baseline?.baseline_digest !== BASELINE_DIGEST || frontier?.baseline?.baseline_digest !== BASELINE_DIGEST) throw new Error('P7P8_BASELINE_DIGEST_DRIFT');
for (const packageJson of explicitDecisionPackages) {
  if (packageJson?.baseline?.deployment_sha !== BASELINE_SHA || packageJson?.baseline?.baseline_digest !== BASELINE_DIGEST) throw new Error(`P7P8_EXPLICIT_DECISION_BASELINE_DRIFT:${packageJson?.batch_id}`);
  if (packageJson?.status !== 'REVIEWED_BRANCH_ONLY_NO_PRODUCTION_MUTATION' || packageJson?.rules?.production_mutation_authorized !== false) throw new Error(`P7P8_EXPLICIT_DECISION_STATUS_INVALID:${packageJson?.batch_id}`);
}

const p6Ids = new Set((frontier.effective_correction_activities || []).map((row) => String(row.activity_id).toLowerCase()));
if (p6Ids.size !== 54) throw new Error(`P7P8_P6_TARGET_COUNT_DRIFT:${p6Ids.size}`);

const dependencyNames = ['relation_type','chronology_correction','governance_context','sub_year_precision','provenance_backfill','entity_model_migration'];
const residualByDependency = {};
const residualActivityIds = new Set();
for (const dependency of dependencyNames) {
  const rows = (work?.by_dependency?.[dependency] || []).filter((row) => !p6Ids.has(String(row.activity_id).toLowerCase()));
  residualByDependency[dependency] = rows;
  rows.forEach((row) => residualActivityIds.add(String(row.activity_id).toLowerCase()));
}

const relationByCode = new Map((catalog.person_polity_relation_types || []).map((row) => [row.code, String(row.id).toLowerCase()]));
const allowedCodes = new Set(['rules','governs','serves','active_in','opposes','claims_rule']);
const explicitByActivity = new Map();
const explicitBatchByActivity = new Map();
for (const packageJson of explicitDecisionPackages) {
  for (const decision of packageJson.decisions || []) {
    const activityId = String(decision.activity_id || '').toLowerCase();
    const code = String(decision.relation_code || '');
    const relationTypeId = String(decision.relation_type_id || '').toLowerCase();
    if (!activityId || explicitByActivity.has(activityId)) throw new Error(`P7P8_EXPLICIT_DECISION_DUPLICATE:${activityId}`);
    if (!allowedCodes.has(code)) throw new Error(`P7P8_EXPLICIT_DECISION_CODE_INVALID:${activityId}:${code}`);
    if (relationByCode.get(code) !== relationTypeId) throw new Error(`P7P8_EXPLICIT_DECISION_UUID_DRIFT:${activityId}`);
    explicitByActivity.set(activityId, decision);
    explicitBatchByActivity.set(activityId, packageJson.batch_id);
  }
}
if (explicitByActivity.size !== 37) throw new Error(`P7P8_EXPLICIT_DECISION_COUNT_DRIFT:${explicitByActivity.size}`);

const relationResidual = residualByDependency.relation_type;
const relationResidualIds = new Set(relationResidual.map((row) => String(row.activity_id).toLowerCase()));
for (const activityId of explicitByActivity.keys()) {
  if (!relationResidualIds.has(activityId)) throw new Error(`P7P8_EXPLICIT_DECISION_NOT_IN_RESIDUAL:${activityId}`);
  if (p6Ids.has(activityId)) throw new Error(`P7P8_EXPLICIT_DECISION_COLLIDES_P6:${activityId}`);
}

const relationReady = [];
const relationReviewRequired = [];
let explicitOverlayCount = 0;
for (const row of relationResidual) {
  const activityId = String(row.activity_id).toLowerCase();
  const hint = row.relation_hint == null ? null : String(row.relation_hint).trim();
  const explicit = explicitByActivity.get(activityId) || null;
  let code = null;
  let relationTypeId = null;
  let authority = null;
  let resolutionMode = null;
  let explicitBatch = null;
  if (hint && allowedCodes.has(hint)) {
    if (explicit?.supersedes_stale_relation_hint === true) {
      code = explicit.relation_code;
      relationTypeId = String(explicit.relation_type_id).toLowerCase();
      authority = explicit.authority;
      explicitBatch = explicitBatchByActivity.get(activityId);
      resolutionMode = 'EXPLICIT_REVIEWED_SUPERSEDING_STALE_HINT';
      explicitOverlayCount += 1;
    } else {
      code = hint;
      relationTypeId = relationByCode.get(hint);
      resolutionMode = 'EXISTING_REVIEWED_RELATION_HINT';
      if (explicit && (explicit.relation_code !== code || String(explicit.relation_type_id).toLowerCase() !== relationTypeId)) throw new Error(`P7P8_EXPLICIT_DECISION_CONFLICTS_HINT:${activityId}`);
    }
  } else if (explicit) {
    if (explicit.supersedes_stale_relation_hint === true) throw new Error(`P7P8_STALE_HINT_SUPERSESSION_TARGET_MISSING:${activityId}`);
    code = explicit.relation_code;
    relationTypeId = String(explicit.relation_type_id).toLowerCase();
    authority = explicit.authority;
    explicitBatch = explicitBatchByActivity.get(activityId);
    resolutionMode = 'EXPLICIT_REVIEWED_AUDIT_DECISION';
    explicitOverlayCount += 1;
  }

  if (code) {
    relationReady.push({
      activity_id: activityId,
      person_id: String(row.person_id).toLowerCase(),
      person: row.person,
      polity_id: String(row.polity_id).toLowerCase(),
      polity: row.polity,
      start_year: row.start_year,
      end_year: row.end_year,
      role: row.role,
      reviewed_relation_code: code,
      relation_type_id: relationTypeId,
      resolution_mode: resolutionMode,
      explicit_decision_batch: explicitBatch,
      authority,
      decision: row.decision,
      decision_source: row.decision_source,
      execution_class: row.execution_class
    });
  } else {
    relationReviewRequired.push({
      activity_id: activityId,
      person_id: String(row.person_id).toLowerCase(),
      person: row.person,
      polity_id: String(row.polity_id).toLowerCase(),
      polity: row.polity,
      start_year: row.start_year,
      end_year: row.end_year,
      role: row.role,
      current_relation_hint: hint,
      decision: row.decision,
      decision_source: row.decision_source,
      execution_class: row.execution_class,
      blocker: 'EXPLICIT_REVIEWED_PERSON_POLITY_RELATION_DECISION_REQUIRED'
    });
  }
}
relationReady.sort((a,b) => a.activity_id.localeCompare(b.activity_id));
relationReviewRequired.sort((a,b) => a.activity_id.localeCompare(b.activity_id));
if (explicitOverlayCount !== 37) throw new Error(`P7P8_EXPLICIT_OVERLAY_NOT_CONSUMED:${explicitOverlayCount}`);

const relationPackage = {
  schema: 'atlas-stage2-p7a-reviewed-relation-backfill/v1',
  as_of: '2026-08-14',
  status: 'BRANCH_ONLY_REVIEWED_RELATION_LITERALIZATION_NO_PRODUCTION_MUTATION',
  baseline: { deployment_sha: BASELINE_SHA, baseline_digest: BASELINE_DIGEST },
  authority: {
    work_queues: path.relative(root, workQueuesPath),
    p6_effective_frontier: path.relative(root, frontierPath),
    relation_catalog: path.relative(root, relationCatalogPath),
    explicit_relation_decisions: explicitDecisionPaths.map((p) => path.relative(root, p))
  },
  rules: {
    p6_activity_targets_excluded: true,
    generic_relation_default_forbidden: true,
    only_existing_reviewed_hint_or_explicit_reviewed_audit_decision_may_be_literalized: true,
    stale_relation_hint_may_be_superseded_only_by_explicit_reviewed_flag: true,
    runtime_relation_code_lookup_forbidden: true,
    literal_relation_type_uuid_required: true,
    production_mutation_authorized: false
  },
  rows: relationReady,
  result: {
    residual_relation_dependency_rows: relationResidual.length,
    directly_literalizable_reviewed_relation_rows: relationReady.length,
    existing_reviewed_hint_rows: relationReady.length - explicitOverlayCount,
    explicit_reviewed_overlay_rows: explicitOverlayCount,
    explicit_relation_review_rows_remaining: relationReviewRequired.length,
    production_mutation_authorized: false
  }
};

const inventory = {
  schema: 'atlas-stage2-p7p8-precutover-inventory/v1',
  as_of: '2026-08-14',
  status: 'BRANCH_ONLY_CURRENT_RESIDUAL_INVENTORY_NO_PRODUCTION_MUTATION',
  baseline: { deployment_sha: BASELINE_SHA, baseline_digest: BASELINE_DIGEST, activities: 338 },
  p6: { effective_activity_targets_closed: p6Ids.size, production_mutation_authorized: false },
  residual_dependency_counts_after_p6_targets: Object.fromEntries(dependencyNames.map((name) => [name, residualByDependency[name].length])),
  residual_unique_activity_count: residualActivityIds.size,
  relation_backfill: {
    residual_rows: relationResidual.length,
    reviewed_relation_literalizable_rows: relationReady.length,
    existing_reviewed_hint_rows: relationReady.length - explicitOverlayCount,
    explicit_reviewed_overlay_rows: explicitOverlayCount,
    explicit_relation_review_required_rows: relationReviewRequired.length,
    review_required: relationReviewRequired
  },
  p8_zero_known_blocker_gate: {
    status: relationReviewRequired.length === 0 && residualActivityIds.size === 0 ? 'ZERO_KNOWN_BLOCKERS' : 'NOT_READY',
    known_runtime_semantic_blocker_floor: relationReviewRequired.length,
    note: 'Lower bound only; non-Relation residual dependencies still require P7 execution/closure classification.'
  },
  rules: {
    raw_work_queue_is_audit_input_not_current_execution_truth: true,
    p6_closed_targets_must_be_removed_before_residual_counting: true,
    unresolved_authoring_may_remain_but_runtime_required_semantics_must_be_computable_before_p8: true,
    production_mutation_authorized: false
  }
};

writeJson(relationOutPath, relationPackage);
writeJson(outPath, inventory);
console.log(JSON.stringify({
  marker: 'ATLAS_STAGE2_P7P8_PRECUTOVER_INVENTORY_BUILT',
  p6_closed_targets: p6Ids.size,
  residual_unique_activities: residualActivityIds.size,
  residual_relation_rows: relationResidual.length,
  p7_reviewed_relation_literalizable: relationReady.length,
  p7_explicit_reviewed_overlay: explicitOverlayCount,
  p7_explicit_relation_review_required: relationReviewRequired.length,
  p8_status: inventory.p8_zero_known_blocker_gate.status,
  production_mutation_authorized: false
}, null, 2));
