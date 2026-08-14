import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildStage2FullRelationCoverageV2 } from './build-stage2-full-relation-coverage-v2.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workPath = path.resolve(root, 'artifacts/stage2-baseline-a-work-queues.json');
const frontierPath = path.resolve(root, 'artifacts/stage2-baseline-a-effective-p5p6-frontier.json');
const closuresPath = path.resolve(root, 'stage2/integration/p7p8-effective-nonrelation-closures.v1.json');
const outPath = path.resolve(root, 'artifacts/stage2-p7p8-effective-cutover-gate.json');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const BASELINE_SHA = 'ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
const BASELINE_DIGEST = 'sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const NONRELATION_DEPENDENCIES = ['chronology_correction','governance_context','sub_year_precision','provenance_backfill','entity_model_migration'];

const work = readJson(workPath);
const frontier = readJson(frontierPath);
const closures = readJson(closuresPath);
if (work?.summary?.baseline?.deployment_sha !== BASELINE_SHA || frontier?.baseline?.deployment_sha !== BASELINE_SHA || closures?.baseline?.deployment_sha !== BASELINE_SHA) throw new Error('P7P8_EFFECTIVE_BASELINE_SHA_DRIFT');
if (work?.summary?.baseline?.baseline_digest !== BASELINE_DIGEST || frontier?.baseline?.baseline_digest !== BASELINE_DIGEST || closures?.baseline?.baseline_digest !== BASELINE_DIGEST) throw new Error('P7P8_EFFECTIVE_BASELINE_DIGEST_DRIFT');
if (closures?.status !== 'REVIEWED_BRANCH_ONLY_EFFECTIVE_DEPENDENCY_CLOSURES_NO_PRODUCTION_MUTATION' || closures?.rules?.production_mutation_authorized !== false) throw new Error('P7P8_EFFECTIVE_CLOSURE_AUTHORITY_INVALID');

const p6Ids = new Set((frontier.effective_correction_activities || []).map((row) => String(row.activity_id).toLowerCase()));
if (p6Ids.size !== 54) throw new Error(`P7P8_EFFECTIVE_P6_COUNT_DRIFT:${p6Ids.size}`);
const rawPairByKey = new Map();
const rawActivityById = new Map();
const rawCounts = {};
for (const dependency of NONRELATION_DEPENDENCIES) {
  const rows = (work?.by_dependency?.[dependency] || []).filter((row) => !p6Ids.has(String(row.activity_id).toLowerCase()));
  rawCounts[dependency] = rows.length;
  for (const row of rows) {
    const activityId = String(row.activity_id).toLowerCase();
    const key = `${activityId}|${dependency}`;
    if (rawPairByKey.has(key)) throw new Error(`P7P8_EFFECTIVE_RAW_PAIR_DUPLICATE:${key}`);
    rawPairByKey.set(key, row);
    if (!rawActivityById.has(activityId)) rawActivityById.set(activityId, row);
  }
}
const expectedRawCounts = {chronology_correction:35,governance_context:9,sub_year_precision:1,provenance_backfill:19,entity_model_migration:10};
if (JSON.stringify(rawCounts) !== JSON.stringify(expectedRawCounts)) throw new Error(`P7P8_EFFECTIVE_RAW_COUNT_DRIFT:${JSON.stringify(rawCounts)}`);
if (rawActivityById.size !== 51) throw new Error(`P7P8_EFFECTIVE_RAW_ACTIVITY_COUNT_DRIFT:${rawActivityById.size}`);

const closedPairs = new Map();
const closureActivityIds = new Set();
for (const closure of closures.closures || []) {
  const activityId = String(closure.activity_id || '').toLowerCase();
  if (!activityId || !rawActivityById.has(activityId)) throw new Error(`P7P8_EFFECTIVE_CLOSURE_ACTIVITY_NOT_RAW:${activityId}`);
  if (!Array.isArray(closure.authority) || closure.authority.length === 0 || !String(closure.reason || '').trim()) throw new Error(`P7P8_EFFECTIVE_CLOSURE_AUTHORITY_REQUIRED:${activityId}`);
  closureActivityIds.add(activityId);
  for (const dependency of closure.dependencies || []) {
    if (!NONRELATION_DEPENDENCIES.includes(dependency)) throw new Error(`P7P8_EFFECTIVE_CLOSURE_DEP_INVALID:${activityId}:${dependency}`);
    const key = `${activityId}|${dependency}`;
    if (!rawPairByKey.has(key)) throw new Error(`P7P8_EFFECTIVE_CLOSURE_PAIR_NOT_RAW:${key}`);
    if (closedPairs.has(key)) throw new Error(`P7P8_EFFECTIVE_CLOSURE_PAIR_DUPLICATE:${key}`);
    closedPairs.set(key, closure);
  }
}
if (closureActivityIds.size !== 15 || closedPairs.size !== 19 || closures?.result?.closure_activity_count !== 15 || closures?.result?.closed_dependency_pair_count !== 19) throw new Error('P7P8_EFFECTIVE_CLOSURE_COUNT_DRIFT');

const pendingPairs = [...rawPairByKey.entries()].filter(([key]) => !closedPairs.has(key));
const pendingByDependency = Object.fromEntries(NONRELATION_DEPENDENCIES.map((dependency) => [dependency, pendingPairs.filter(([key]) => key.endsWith(`|${dependency}`)).length]));
const pendingIds = new Set(pendingPairs.map(([key]) => key.slice(0, 36)));
const pendingRows = [...pendingIds].sort().map((activityId) => {
  const row = rawActivityById.get(activityId);
  return {
    activity_id: activityId,
    person: row.person,
    polity: row.polity,
    start_year: row.start_year,
    end_year: row.end_year,
    decision: row.decision,
    decision_source: row.decision_source,
    pending_dependencies: NONRELATION_DEPENDENCIES.filter((dependency) => rawPairByKey.has(`${activityId}|${dependency}`) && !closedPairs.has(`${activityId}|${dependency}`))
  };
});
if (pendingIds.size !== 37) throw new Error(`P7P8_EFFECTIVE_PENDING_NONRELATION_ACTIVITY_DRIFT:${pendingIds.size}`);
const expectedPendingCounts = {chronology_correction:28,governance_context:7,sub_year_precision:1,provenance_backfill:11,entity_model_migration:8};
if (JSON.stringify(pendingByDependency) !== JSON.stringify(expectedPendingCounts)) throw new Error(`P7P8_EFFECTIVE_PENDING_DEP_COUNT_DRIFT:${JSON.stringify(pendingByDependency)}`);

const relationCoverage = buildStage2FullRelationCoverageV2({ writeOutput:true });
if (relationCoverage?.summary?.relation_semantic_decision_unresolved !== 0 || relationCoverage?.relation_review_remaining?.length !== 0) throw new Error('P7P8_EFFECTIVE_RELATION_SEMANTIC_DECISION_NOT_CLOSED');
const relationBlockerIds = new Set((relationCoverage.correction_blockers || []).map((row) => String(row.activity_id).toLowerCase()));
if (relationBlockerIds.size !== 13) throw new Error(`P7P8_EFFECTIVE_RELATION_BLOCKER_COUNT_DRIFT:${relationBlockerIds.size}`);
const relationOnlyBlockerIds = [...relationBlockerIds].filter((id) => !pendingIds.has(id)).sort();
if (relationOnlyBlockerIds.length !== 1) throw new Error(`P7P8_EFFECTIVE_RELATION_ONLY_BLOCKER_DRIFT:${relationOnlyBlockerIds.length}`);

const effectiveBlockerIds = new Set([...pendingIds, ...relationBlockerIds]);
if (effectiveBlockerIds.size !== 38) throw new Error(`P7P8_EFFECTIVE_BLOCKER_COUNT_DRIFT:${effectiveBlockerIds.size}`);
const relationBlockerById = new Map((relationCoverage.correction_blockers || []).map((row) => [String(row.activity_id).toLowerCase(), row]));
const blockers = [...effectiveBlockerIds].sort().map((activityId) => {
  const raw = rawActivityById.get(activityId) || null;
  const relation = relationBlockerById.get(activityId) || null;
  return {
    activity_id: activityId,
    person: raw?.person ?? relation?.person ?? null,
    polity: raw?.polity ?? relation?.polity ?? null,
    pending_nonrelation_dependencies: raw ? NONRELATION_DEPENDENCIES.filter((dependency) => rawPairByKey.has(`${activityId}|${dependency}`) && !closedPairs.has(`${activityId}|${dependency}`)) : [],
    relation_path_correction_blocker: relation?.correction_blocker ?? null,
    relation_path_status: relation?.status ?? null
  };
});

const result = {
  schema:'atlas-stage2-p7p8-effective-cutover-gate/v1',
  as_of:'2026-08-14',
  status:'BRANCH_ONLY_EFFECTIVE_ZERO_KNOWN_BLOCKER_GATE_NOT_READY',
  baseline:{deployment_sha:BASELINE_SHA,baseline_digest:BASELINE_DIGEST,activities:338},
  raw_audit_input:{post_p6_nonrelation_unique_activities:rawActivityById.size,dependency_counts:rawCounts,raw_dependency_pairs:rawPairByKey.size},
  reviewed_closures:{closure_activities:closureActivityIds.size,closed_dependency_pairs:closedPairs.size,authority:'stage2/integration/p7p8-effective-nonrelation-closures.v1.json'},
  effective_nonrelation:{pending_unique_activities:pendingIds.size,pending_dependency_counts:pendingByDependency,pending_dependency_pairs:pendingPairs.length,rows:pendingRows},
  relation_gate:{semantic_decisions_unresolved:0,correction_blocker_activities:relationBlockerIds.size,relation_only_blocker_activities:relationOnlyBlockerIds},
  p8_zero_known_blocker_gate:{status:'NOT_READY',known_runtime_semantic_blockers:effectiveBlockerIds.size,blockers,cutover_allowed:false},
  rules:{raw_dependency_presence_is_not_itself_a_current_blocker:true,only_explicit_reviewed_closure_may_remove_raw_dependency:true,relation_semantic_decision_zero_is_required_but_not_sufficient:true,production_mutation_authorized:false}
};
fs.mkdirSync(path.dirname(outPath),{recursive:true});
fs.writeFileSync(outPath,`${JSON.stringify(result,null,2)}\n`);
console.log(JSON.stringify({marker:'ATLAS_STAGE2_P7P8_EFFECTIVE_CUTOVER_GATE_BUILT',raw_nonrelation_activities:51,closed_dependency_pairs:19,effective_nonrelation_activities:37,relation_correction_blockers:13,effective_known_blockers:38,p8_status:'NOT_READY',production_mutation_authorized:false},null,2));
