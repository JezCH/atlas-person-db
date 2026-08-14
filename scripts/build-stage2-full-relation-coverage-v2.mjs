import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildStage2FullRelationCoverage } from './build-stage2-full-relation-coverage.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.resolve(root, 'artifacts/stage2-full-relation-coverage-v2.json');
const batch6Path = path.resolve(root, 'stage2/integration/p7-explicit-person-relation-decisions-batch6.v1.json');
const batch7Path = path.resolve(root, 'stage2/integration/p7-explicit-person-relation-decisions-batch7.v1.json');
const dispositionPath = path.resolve(root, 'stage2/integration/p7-full-relation-review-dispositions.v1.json');
const structuralExecutionClosurePath = path.resolve(root, 'stage2/integration/p7-structural-relation-execution-closures.v1.json');
const relationCatalogPath = path.resolve(root, 'stage2/catalogs/relation-types.v1.json');
const BASELINE_SHA = 'ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
const BASELINE_DIGEST = 'sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const VALID_RELATIONS = new Set(['rules','governs','serves','active_in','opposes','claims_rule']);
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const lower = (value) => String(value || '').toLowerCase();

export function buildStage2FullRelationCoverageV2({ writeOutput = true } = {}) {
  const base = buildStage2FullRelationCoverage({ writeOutput:false });
  const batch6 = readJson(batch6Path);
  const batch7 = readJson(batch7Path);
  const disposition = readJson(dispositionPath);
  const structuralExecutionClosures = readJson(structuralExecutionClosurePath);
  const relationCatalog = readJson(relationCatalogPath);
  for (const [label, packageJson] of [['batch6',batch6],['batch7',batch7],['structural_execution_closures',structuralExecutionClosures]]) {
    if (packageJson?.baseline?.deployment_sha !== BASELINE_SHA || packageJson?.baseline?.baseline_digest !== BASELINE_DIGEST) throw new Error(`FULL_RELATION_V2_${label.toUpperCase()}_BASELINE_DRIFT`);
  }
  if (disposition?.baseline?.deployment_sha !== BASELINE_SHA || disposition?.baseline?.baseline_digest !== BASELINE_DIGEST) throw new Error('FULL_RELATION_V2_DISPOSITION_BASELINE_DRIFT');
  if (batch6?.decisions?.length !== 1 || batch7?.decisions?.length !== 1 || disposition?.result?.classified_total !== 15) throw new Error('FULL_RELATION_V2_AUTHORITY_SHAPE_INVALID');
  if (structuralExecutionClosures?.status !== 'REVIEWED_BRANCH_ONLY_LITERAL_EXECUTION_AUTHORITY_NO_PRODUCTION_MUTATION' || structuralExecutionClosures?.rules?.production_mutation_authorized !== false) throw new Error('FULL_RELATION_V2_STRUCTURAL_EXECUTION_AUTHORITY_INVALID');

  const relationById = new Map();
  const relationIdByCode = new Map();
  for (const row of relationCatalog?.person_polity_relation_types || []) {
    const id = lower(row.id);
    if (!id || !VALID_RELATIONS.has(row.code) || relationById.has(id) || relationIdByCode.has(row.code)) throw new Error(`FULL_RELATION_V2_RELATION_CATALOG_INVALID:${id || row.code}`);
    relationById.set(id, row.code);
    relationIdByCode.set(row.code, id);
  }
  if (relationById.size !== 6 || relationIdByCode.size !== 6) throw new Error('FULL_RELATION_V2_RELATION_CATALOG_COUNT_DRIFT');

  const directById = new Map();
  for (const packageJson of [batch6,batch7]) {
    for (const decision of packageJson.decisions || []) {
      const id = lower(decision.activity_id);
      if (directById.has(id)) throw new Error(`FULL_RELATION_V2_DIRECT_DUPLICATE:${id}`);
      if (!VALID_RELATIONS.has(decision.relation_code)) throw new Error(`FULL_RELATION_V2_RELATION_INVALID:${id}`);
      if (relationIdByCode.get(decision.relation_code) !== lower(decision.relation_type_id)) throw new Error(`FULL_RELATION_V2_DIRECT_RELATION_UUID_DRIFT:${id}`);
      directById.set(id, decision);
    }
  }
  const retiredById = new Map((disposition.retire_or_migrate_before_relation || []).map((row) => [lower(row.activity_id), row]));
  const structuralById = new Map((disposition.structural_or_multiphase_correction_before_relation || []).map((row) => [lower(row.activity_id), row]));
  const remainingById = new Map((disposition.relation_review_remaining || []).map((row) => [lower(row.activity_id), row]));
  if (directById.size !== 2 || retiredById.size !== 8 || structuralById.size !== 5 || remainingById.size !== 0) throw new Error('FULL_RELATION_V2_DISPOSITION_COUNT_DRIFT');

  const executionClosedById = new Map();
  let executionOutputFragmentCount = 0;
  for (const closure of structuralExecutionClosures.closures || []) {
    const id = lower(closure.activity_id);
    if (!id || executionClosedById.has(id)) throw new Error(`FULL_RELATION_V2_STRUCTURAL_EXECUTION_DUPLICATE:${id}`);
    if (!structuralById.has(id)) throw new Error(`FULL_RELATION_V2_STRUCTURAL_EXECUTION_NOT_PRIOR_BLOCKER:${id}`);
    if (!VALID_RELATIONS.has(closure.survivor_relation_code) || relationIdByCode.get(closure.survivor_relation_code) !== lower(closure.survivor_relation_type_id)) throw new Error(`FULL_RELATION_V2_STRUCTURAL_EXECUTION_RELATION_INVALID:${id}`);
    if (!Number.isInteger(closure.verified_integrity_run) || closure.verified_integrity_run <= 0 || !String(closure.rehearsal || '').trim()) throw new Error(`FULL_RELATION_V2_STRUCTURAL_EXECUTION_REHEARSAL_REQUIRED:${id}`);
    const planPath = path.resolve(root, String(closure.execution_plan || ''));
    if (!planPath.startsWith(root + path.sep) || !fs.existsSync(planPath)) throw new Error(`FULL_RELATION_V2_STRUCTURAL_EXECUTION_PLAN_MISSING:${id}`);
    const plan = readJson(planPath);
    if (plan?.baseline?.deployment_sha !== BASELINE_SHA || plan?.baseline?.baseline_digest !== BASELINE_DIGEST || plan?.execution_rules?.production_mutation_authorized !== false || plan?.execution_rules?.production_executable !== false) throw new Error(`FULL_RELATION_V2_STRUCTURAL_EXECUTION_PLAN_AUTHORITY_INVALID:${id}`);
    const operation = (plan.operations || []).find((row) => lower(row.activity_id) === id);
    if (!operation || operation.type !== closure.operation_type) throw new Error(`FULL_RELATION_V2_STRUCTURAL_EXECUTION_OPERATION_INVALID:${id}`);
    let survivor;
    let outputs = [];
    if (operation.type === 'split_activity') {
      const survivors = (operation.fragments || []).filter((fragment) => fragment.survivor === true);
      if (survivors.length !== 1 || lower(survivors[0].activity_id) !== id) throw new Error(`FULL_RELATION_V2_STRUCTURAL_EXECUTION_SURVIVOR_INVALID:${id}`);
      survivor = survivors[0];
      outputs = (operation.fragments || []).filter((fragment) => fragment.survivor !== true);
    } else if (operation.type === 'rewrite_activity') {
      survivor = operation.after;
    } else {
      throw new Error(`FULL_RELATION_V2_STRUCTURAL_EXECUTION_OPERATION_UNSUPPORTED:${id}:${operation.type}`);
    }
    if (lower(survivor?.relation_type_id) !== lower(closure.survivor_relation_type_id)) throw new Error(`FULL_RELATION_V2_STRUCTURAL_EXECUTION_SURVIVOR_RELATION_DRIFT:${id}`);
    const declaredOutputs = closure.execution_output_fragments || [];
    if (declaredOutputs.length !== outputs.length) throw new Error(`FULL_RELATION_V2_STRUCTURAL_EXECUTION_OUTPUT_COUNT_DRIFT:${id}`);
    const outputById = new Map(outputs.map((fragment) => [lower(fragment.activity_id), fragment]));
    for (const declared of declaredOutputs) {
      const outputId = lower(declared.activity_id);
      const fragment = outputById.get(outputId);
      if (!fragment || !VALID_RELATIONS.has(declared.relation_code) || relationIdByCode.get(declared.relation_code) !== lower(declared.relation_type_id) || lower(fragment.relation_type_id) !== lower(declared.relation_type_id)) throw new Error(`FULL_RELATION_V2_STRUCTURAL_EXECUTION_OUTPUT_DRIFT:${id}:${outputId}`);
    }
    executionOutputFragmentCount += outputs.length;
    executionClosedById.set(id, { ...closure, plan_path:path.relative(root, planPath), prior:structuralById.get(id) });
  }
  if (Number(structuralExecutionClosures?.result?.closure_count) !== executionClosedById.size || Number(structuralExecutionClosures?.result?.baseline_relation_path_blockers_resolved_after_execution) !== executionClosedById.size || Number(structuralExecutionClosures?.result?.new_execution_output_fragments) !== executionOutputFragmentCount) throw new Error('FULL_RELATION_V2_STRUCTURAL_EXECUTION_RESULT_DRIFT');

  const resolvedById = new Map((disposition.relation_review_resolved || []).map((row) => [lower(row.activity_id), row]));
  if (resolvedById.size !== directById.size) throw new Error('FULL_RELATION_V2_RESOLVED_DISPOSITION_COUNT_DRIFT');
  for (const [id, decision] of directById) {
    const resolved = resolvedById.get(id);
    if (!resolved || resolved.relation_code !== decision.relation_code || lower(resolved.relation_type_id) !== lower(decision.relation_type_id)) throw new Error(`FULL_RELATION_V2_RESOLVED_DISPOSITION_DRIFT:${id}`);
  }

  const priorReviewIds = new Set(base.explicit_review_required.map((row)=>row.activity_id));
  const dispositionIds = new Set([...directById.keys(), ...retiredById.keys(), ...structuralById.keys(), ...remainingById.keys()]);
  if (priorReviewIds.size !== 15 || dispositionIds.size !== 15 || JSON.stringify([...priorReviewIds].sort()) !== JSON.stringify([...dispositionIds].sort())) throw new Error('FULL_RELATION_V2_DISPOSITION_DOES_NOT_EXACTLY_COVER_PRIOR_REVIEW');

  const rows = base.rows.map((row) => {
    const id = row.activity_id;
    if (directById.has(id)) {
      const decision = directById.get(id);
      return { ...row, status:'REVIEWED_P7_RELATION', relation_code:decision.relation_code, relation_type_id:decision.relation_type_id, authority:decision.authority, runtime_relation_ready_after_execution:true, correction_blocker:null };
    }
    if (executionClosedById.has(id)) {
      const closure = executionClosedById.get(id);
      return { ...row, status:'REVIEWED_P7_STRUCTURAL_EXECUTION', relation_code:closure.survivor_relation_code, relation_type_id:closure.survivor_relation_type_id, authority:[closure.plan_path,closure.rehearsal], runtime_relation_ready_after_execution:true, correction_blocker:null, correction_execution_plan:closure.plan_path, execution_output_fragments:closure.execution_output_fragments };
    }
    if (retiredById.has(id)) {
      const decision = retiredById.get(id);
      return { ...row, status:'REVIEWED_RETIRE_OR_MIGRATE_BEFORE_RELATION', relation_code:null, authority:decision.authority, runtime_relation_ready_after_execution:false, correction_blocker:decision.decision, correction_reason:decision.reason };
    }
    if (structuralById.has(id)) {
      const decision = structuralById.get(id);
      return { ...row, status:'REVIEWED_STRUCTURAL_CORRECTION_BEFORE_RELATION', relation_code:null, authority:decision.authority, runtime_relation_ready_after_execution:false, correction_blocker:decision.decision, correction_reason:decision.reason };
    }
    if (remainingById.has(id)) {
      const decision = remainingById.get(id);
      return { ...row, status:'EXPLICIT_RELATION_REVIEW_REQUIRED', relation_code:null, authority:decision.authority, runtime_relation_ready_after_execution:false, correction_blocker:decision.blocker };
    }
    return row;
  });

  const count = (status) => rows.filter((row)=>row.status===status).length;
  const summary = {
    baseline_activities:338,
    p6_delegated:count('COVERED_BY_P6_EXECUTION'),
    p7_reviewed_relation_rows:count('REVIEWED_P7_RELATION'),
    p7_reviewed_multiphase_rows:count('REVIEWED_P7_MULTIPHASE'),
    p7_reviewed_structural_execution_rows:count('REVIEWED_P7_STRUCTURAL_EXECUTION'),
    exact_role_policy_candidates:count('REVIEWED_EXACT_ROLE_POLICY_CANDIDATE'),
    retire_or_migrate_before_relation:count('REVIEWED_RETIRE_OR_MIGRATE_BEFORE_RELATION'),
    structural_correction_before_relation:count('REVIEWED_STRUCTURAL_CORRECTION_BEFORE_RELATION'),
    explicit_relation_review_required:count('EXPLICIT_RELATION_REVIEW_REQUIRED'),
    relation_semantic_decision_unresolved:count('EXPLICIT_RELATION_REVIEW_REQUIRED'),
    known_relation_path_correction_blockers:count('REVIEWED_RETIRE_OR_MIGRATE_BEFORE_RELATION') + count('REVIEWED_STRUCTURAL_CORRECTION_BEFORE_RELATION'),
    structural_execution_output_fragments:executionOutputFragmentCount,
    classified_total:rows.length,
    production_mutation_authorized:false
  };
  if (summary.p6_delegated !== 54 || summary.p7_reviewed_relation_rows !== 134 || summary.p7_reviewed_multiphase_rows !== 3 || summary.p7_reviewed_structural_execution_rows !== 1 || summary.exact_role_policy_candidates !== 134 || summary.retire_or_migrate_before_relation !== 8 || summary.structural_correction_before_relation !== 4 || summary.explicit_relation_review_required !== 0 || summary.known_relation_path_correction_blockers !== 12 || summary.structural_execution_output_fragments !== 1 || summary.classified_total !== 338) throw new Error(`FULL_RELATION_V2_COVERAGE_DRIFT:${JSON.stringify(summary)}`);

  const result = {
    schema:'atlas-stage2-full-relation-coverage/v2',
    as_of:'2026-08-14',
    status:'BRANCH_ONLY_FULL_RELATION_DECISION_AND_CORRECTION_GATE',
    baseline:{deployment_sha:BASELINE_SHA,baseline_digest:BASELINE_DIGEST,activities:338},
    summary,
    relation_review_remaining:rows.filter((row)=>row.status==='EXPLICIT_RELATION_REVIEW_REQUIRED'),
    correction_blockers:rows.filter((row)=>row.status==='REVIEWED_RETIRE_OR_MIGRATE_BEFORE_RELATION' || row.status==='REVIEWED_STRUCTURAL_CORRECTION_BEFORE_RELATION'),
    structural_execution_closures:rows.filter((row)=>row.status==='REVIEWED_P7_STRUCTURAL_EXECUTION'),
    rows,
    p8_relation_gate:{semantic_decision_status:summary.relation_semantic_decision_unresolved===0?'ZERO_UNDECIDED':'NOT_READY',correction_execution_status:summary.known_relation_path_correction_blockers===0?'ZERO_BLOCKERS':'NOT_READY',cutover_allowed:false},
    rules:{generic_relation_default_forbidden:true,retiring_or_migrating_rows_must_not_receive_fake_relation_backfill:true,structural_correction_precedes_relation_assignment:true,only_rehearsed_literal_execution_package_may_close_structural_relation_blocker:true,new_execution_fragments_are_not_baseline_338_rows:true,production_mutation_authorized:false}
  };
  if (writeOutput) { fs.mkdirSync(path.dirname(outPath),{recursive:true}); fs.writeFileSync(outPath,`${JSON.stringify(result,null,2)}\n`); }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result=buildStage2FullRelationCoverageV2();
  console.log(JSON.stringify({marker:'ATLAS_STAGE2_FULL_RELATION_COVERAGE_V2_BUILT',...result.summary,p8_relation_gate:result.p8_relation_gate,production_mutation_authorized:false},null,2));
}
