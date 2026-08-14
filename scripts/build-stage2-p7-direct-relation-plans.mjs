import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : fallback; };
const relationPath = path.resolve(root, arg('--relations', 'artifacts/stage2-p7a-reviewed-relation-backfill.json'));
const workQueuesPath = path.resolve(root, arg('--work-queues', 'artifacts/stage2-baseline-a-work-queues.json'));
const intakePath = path.resolve(root, arg('--intake', 'artifacts/stage2-baseline-a-intake.json'));
const outPath = path.resolve(root, arg('--out', 'artifacts/stage2-p7-direct-relation-execution-package.json'));
const BASELINE_SHA = 'ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
const BASELINE_DIGEST = 'sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const MAX_PLAN_TARGETS = 80;
const NON_RELATION_DEPENDENCIES = ['chronology_correction','governance_context','sub_year_precision','provenance_backfill','entity_model_migration'];
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

export function buildStage2P7DirectRelationPlans({ writeOutput = true } = {}) {
  const relations = readJson(relationPath);
  const workQueues = readJson(workQueuesPath);
  const intake = readJson(intakePath);
  if (relations?.baseline?.deployment_sha !== BASELINE_SHA || relations?.baseline?.baseline_digest !== BASELINE_DIGEST) throw new Error('P7_DIRECT_RELATION_BASELINE_DRIFT');
  if (workQueues?.summary?.baseline?.deployment_sha !== BASELINE_SHA || workQueues?.summary?.baseline?.baseline_digest !== BASELINE_DIGEST) throw new Error('P7_DIRECT_RELATION_WORK_QUEUE_BASELINE_DRIFT');
  if (intake?.deployment_sha !== BASELINE_SHA || intake?.baseline_digest !== BASELINE_DIGEST) throw new Error('P7_DIRECT_RELATION_INTAKE_BASELINE_DRIFT');

  const overlap = new Map();
  for (const dependency of NON_RELATION_DEPENDENCIES) for (const row of workQueues?.by_dependency?.[dependency] || []) {
    const id = String(row.activity_id).toLowerCase();
    if (!overlap.has(id)) overlap.set(id, []);
    overlap.get(id).push(dependency);
  }
  const intakeById = new Map((intake.activity_rows || []).map((row) => [String(row.activity_id).toLowerCase(), row]));
  const safe = [], deferred = [];
  for (const relation of relations.rows || []) {
    const id = String(relation.activity_id).toLowerCase();
    const baseline = intakeById.get(id);
    if (!baseline) throw new Error(`P7_DIRECT_RELATION_BASELINE_ACTIVITY_MISSING:${id}`);
    if (overlap.has(id)) {
      deferred.push({ activity_id:id, person:relation.person, polity:relation.polity, reviewed_relation_code:relation.reviewed_relation_code, relation_type_id:relation.relation_type_id, blocking_dependencies:[...overlap.get(id)].sort() });
      continue;
    }
    if (baseline.chronology_claim_count !== 0 || baseline.description_count !== 0) throw new Error(`P7_DIRECT_RELATION_CHILD_ROWS_UNSUPPORTED:${id}`);
    safe.push({ relation, baseline });
  }
  safe.sort((a,b)=>a.relation.activity_id.localeCompare(b.relation.activity_id));
  deferred.sort((a,b)=>a.activity_id.localeCompare(b.activity_id));
  if (safe.length !== 104 || deferred.length !== 19) throw new Error(`P7_DIRECT_RELATION_SCOPE_DRIFT:${safe.length}:${deferred.length}`);

  const operations = safe.map(({ relation, baseline }) => ({
    case_id:`p7_direct_relation_${relation.activity_id}`,
    type:'rewrite_activity',
    activity_id:relation.activity_id,
    baseline_before:{ person_id:baseline.person_id, polity_id:baseline.polity_id, role_id:baseline.role_id, period_basis_id:baseline.period_basis_id, activity_start:baseline.activity_start, activity_end:baseline.activity_end, confidence:baseline.confidence, chronology_status:baseline.chronology_status, legacy_source_key:baseline.legacy_source_key, source_count:baseline.source_count },
    live_before:'SYNTHESIZE_FROM_EXACT_SAME_SHA_SNAPSHOT_BEFORE_DRY_RUN',
    after:{ activity_id:relation.activity_id, person_id:baseline.person_id, polity_id:baseline.polity_id, relation_type_id:relation.relation_type_id, role_id:baseline.role_id, period_basis_id:baseline.period_basis_id, activity_start:baseline.activity_start, activity_end:baseline.activity_end, activity_start_detail:null, activity_end_detail:null, confidence:baseline.confidence, chronology_status:baseline.chronology_status, legacy_source_key:baseline.legacy_source_key, notes_policy:'PRESERVE_EXACT_LIVE_NOTES', source_links_policy:'PRESERVE_ALL_EXISTING_NORMALIZED_SOURCE_LINKS_AND_LOCATORS', add_source_links:[] },
    reviewed_relation_code:relation.reviewed_relation_code,
    relation_decision_authority:relation.resolution_mode === 'EXPLICIT_REVIEWED_AUDIT_DECISION' ? relation.authority : relation.decision_source
  }));

  const plans = [];
  for (let offset=0; offset<operations.length; offset+=MAX_PLAN_TARGETS) {
    const wave = String(plans.length + 1).padStart(2, '0');
    plans.push({ schema:'atlas-stage2-correction-v2-execution-plan/v1', batch_id:`p7_direct_relation_backfill_wave${wave}_v1`, as_of:'2026-08-14', status:'LITERAL_OPERANDS_COMPLETE_LIVE_BEFORE_SNAPSHOT_REQUIRED', contract:'stage2/contracts/correction-v2-current.v1.json', baseline:{deployment_sha:BASELINE_SHA,baseline_digest:BASELINE_DIGEST}, execution_rules:{ relation_only_scope:true, no_chronology_governance_subyear_provenance_or_entity_migration_dependency:true, all_person_polity_relation_role_period_operands_are_literal_uuid:true, exact_live_before_snapshot_required:true, preserve_all_existing_normalized_source_links_and_locators:true, preserve_exact_live_notes:true, territory_geometry_mutation_forbidden:true, physical_person_merge_forbidden:true, production_executable:false, production_mutation_authorized:false }, operations:operations.slice(offset, offset+MAX_PLAN_TARGETS), polity_relation_assertions:[] });
  }
  if (plans.length !== 2 || plans[0].operations.length !== 80 || plans[1].operations.length !== 24) throw new Error('P7_DIRECT_RELATION_WAVE_SHAPE_DRIFT');

  const multiSource = safe.filter(({baseline})=>Number(baseline.source_count)!==1).map(({relation,baseline})=>({ activity_id:relation.activity_id, person:relation.person, polity:relation.polity, source_count:baseline.source_count, branch_exact_locator_reconstruction:false, execution_requirement:'EXACT_SAME_SHA_LIVE_SNAPSHOT_PRESERVES_ALL_EXISTING_LINKS' }));
  const result = { schema:'atlas-stage2-p7-direct-relation-execution-package/v1', as_of:'2026-08-14', status:'BRANCH_ONLY_LITERAL_RELATION_PLANS_NO_PRODUCTION_MUTATION', baseline:{deployment_sha:BASELINE_SHA,baseline_digest:BASELINE_DIGEST}, plans, deferred_overlap_rows:deferred, multi_source_live_snapshot_rows:multiSource, result:{ reviewed_relation_rows_input:relations.rows.length, safe_relation_only_rows:safe.length, deferred_rows_with_other_dependencies:deferred.length, execution_plan_count:plans.length, exact_single_source_artifact_rehearsable_rows:safe.length-multiSource.length, multi_source_live_snapshot_rows:multiSource.length, unresolved_relation_semantic_decisions:0, production_mutation_authorized:false } };
  if (writeOutput) { fs.mkdirSync(path.dirname(outPath), {recursive:true}); fs.writeFileSync(outPath, `${JSON.stringify(result,null,2)}\n`); }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = buildStage2P7DirectRelationPlans();
  console.log(JSON.stringify({ marker:'ATLAS_STAGE2_P7_DIRECT_RELATION_PLANS_BUILT', safe_relation_only_rows:result.result.safe_relation_only_rows, deferred_overlap_rows:result.result.deferred_rows_with_other_dependencies, execution_plan_count:result.result.execution_plan_count, multi_source_live_snapshot_rows:result.result.multi_source_live_snapshot_rows, production_mutation_authorized:false }, null, 2));
}
