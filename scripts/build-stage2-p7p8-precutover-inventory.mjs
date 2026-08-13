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
const outPath = path.resolve(root, arg('--out', 'artifacts/stage2-p7p8-precutover-inventory.json'));
const relationOutPath = path.resolve(root, arg('--relation-out', 'artifacts/stage2-p7a-reviewed-relation-backfill.json'));

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, value) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, `${JSON.stringify(value, null, 2)}\n`); };
const work = readJson(workQueuesPath);
const frontier = readJson(frontierPath);
const catalog = readJson(relationCatalogPath);

const BASELINE_SHA = 'ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
const BASELINE_DIGEST = 'sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
if (work?.summary?.baseline?.deployment_sha !== BASELINE_SHA || frontier?.baseline?.deployment_sha !== BASELINE_SHA) throw new Error('P7P8_BASELINE_SHA_DRIFT');
if (work?.summary?.baseline?.baseline_digest !== BASELINE_DIGEST || frontier?.baseline?.baseline_digest !== BASELINE_DIGEST) throw new Error('P7P8_BASELINE_DIGEST_DRIFT');

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

const relationByCode = new Map((catalog.person_polity_relation_types || []).map((row) => [row.code, row.id]));
const allowedCodes = new Set(['rules','governs','serves','active_in','opposes','claims_rule']);
const relationResidual = residualByDependency.relation_type;
const relationReady = [];
const relationReviewRequired = [];
for (const row of relationResidual) {
  const hint = row.relation_hint == null ? null : String(row.relation_hint).trim();
  if (hint && allowedCodes.has(hint)) {
    const relationTypeId = relationByCode.get(hint);
    if (!relationTypeId) throw new Error(`P7A_RELATION_UUID_MISSING:${hint}`);
    relationReady.push({
      activity_id: String(row.activity_id).toLowerCase(),
      person_id: String(row.person_id).toLowerCase(),
      person: row.person,
      polity_id: String(row.polity_id).toLowerCase(),
      polity: row.polity,
      start_year: row.start_year,
      end_year: row.end_year,
      role: row.role,
      reviewed_relation_code: hint,
      relation_type_id: relationTypeId,
      decision: row.decision,
      decision_source: row.decision_source,
      execution_class: row.execution_class
    });
  } else {
    relationReviewRequired.push({
      activity_id: String(row.activity_id).toLowerCase(),
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

const relationPackage = {
  schema: 'atlas-stage2-p7a-reviewed-relation-backfill/v1',
  as_of: '2026-08-14',
  status: 'BRANCH_ONLY_REVIEWED_HINT_LITERALIZATION_NO_PRODUCTION_MUTATION',
  baseline: { deployment_sha: BASELINE_SHA, baseline_digest: BASELINE_DIGEST },
  rules: {
    p6_activity_targets_excluded: true,
    generic_relation_default_forbidden: true,
    only_existing_reviewed_relation_hint_may_be_literalized: true,
    runtime_relation_code_lookup_forbidden: true,
    literal_relation_type_uuid_required: true,
    production_mutation_authorized: false
  },
  rows: relationReady,
  result: {
    residual_relation_dependency_rows: relationResidual.length,
    directly_literalizable_reviewed_relation_rows: relationReady.length,
    explicit_relation_review_rows: relationReviewRequired.length,
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
    reviewed_hint_literalizable_rows: relationReady.length,
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
  p7a_reviewed_relation_literalizable: relationReady.length,
  p7b_explicit_relation_review_required: relationReviewRequired.length,
  p8_status: inventory.p8_zero_known_blocker_gate.status,
  production_mutation_authorized: false
}, null, 2));
