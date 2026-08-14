import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildStage2FullRelationCoverageV2 } from './build-stage2-full-relation-coverage-v2.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readJson=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const work=readJson(path.resolve(root,'artifacts/stage2-baseline-a-work-queues.json'));
const frontier=readJson(path.resolve(root,'artifacts/stage2-baseline-a-effective-p5p6-frontier.json'));
const integrationDir=path.resolve(root,'stage2/integration');
const closurePattern=/^p7p8-effective-nonrelation-closures(?:-batch\d+)?\.v1\.json$/;
const closurePaths=fs.readdirSync(integrationDir).filter((name)=>closurePattern.test(name)).sort().map((name)=>path.join(integrationDir,name));
const closurePackages=closurePaths.map(readJson);
const outPath=path.resolve(root,'artifacts/stage2-p7p8-effective-cutover-gate.json');
const BASELINE_SHA='ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
const BASELINE_DIGEST='sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const DEPS=['chronology_correction','governance_context','sub_year_precision','provenance_backfill','entity_model_migration'];
const EXPECTED_RAW={chronology_correction:35,governance_context:9,sub_year_precision:1,provenance_backfill:19,entity_model_migration:10};

if(work?.summary?.baseline?.deployment_sha!==BASELINE_SHA||frontier?.baseline?.deployment_sha!==BASELINE_SHA) throw new Error('P7P8_EFFECTIVE_BASELINE_SHA_DRIFT');
if(work?.summary?.baseline?.baseline_digest!==BASELINE_DIGEST||frontier?.baseline?.baseline_digest!==BASELINE_DIGEST) throw new Error('P7P8_EFFECTIVE_BASELINE_DIGEST_DRIFT');
if(closurePackages.length===0) throw new Error('P7P8_EFFECTIVE_CLOSURE_PACKAGES_REQUIRED');
const batchIds=new Set();
for(const pkg of closurePackages){
  if(pkg?.baseline?.deployment_sha!==BASELINE_SHA||pkg?.baseline?.baseline_digest!==BASELINE_DIGEST) throw new Error(`P7P8_EFFECTIVE_CLOSURE_BASELINE_DRIFT:${pkg?.batch_id||'base'}`);
  if(pkg?.status!=='REVIEWED_BRANCH_ONLY_EFFECTIVE_DEPENDENCY_CLOSURES_NO_PRODUCTION_MUTATION'||pkg?.rules?.production_mutation_authorized!==false) throw new Error(`P7P8_EFFECTIVE_CLOSURE_AUTHORITY_INVALID:${pkg?.batch_id||'base'}`);
  const batchId=String(pkg?.batch_id||path.basename(closurePaths[closurePackages.indexOf(pkg)]));
  if(batchIds.has(batchId)) throw new Error(`P7P8_EFFECTIVE_CLOSURE_BATCH_ID_DUPLICATE:${batchId}`);
  batchIds.add(batchId);
}

const p6Ids=new Set((frontier.effective_correction_activities||[]).map((row)=>String(row.activity_id).toLowerCase()));
if(p6Ids.size!==54) throw new Error(`P7P8_EFFECTIVE_P6_COUNT_DRIFT:${p6Ids.size}`);
const rawPairByKey=new Map(),rawActivityById=new Map(),rawCounts={};
for(const dep of DEPS){
  const rows=(work?.by_dependency?.[dep]||[]).filter((row)=>!p6Ids.has(String(row.activity_id).toLowerCase()));
  rawCounts[dep]=rows.length;
  for(const row of rows){const id=String(row.activity_id).toLowerCase(),key=`${id}|${dep}`;if(rawPairByKey.has(key)) throw new Error(`P7P8_EFFECTIVE_RAW_PAIR_DUPLICATE:${key}`);rawPairByKey.set(key,row);if(!rawActivityById.has(id)) rawActivityById.set(id,row);}
}
if(JSON.stringify(rawCounts)!==JSON.stringify(EXPECTED_RAW)) throw new Error(`P7P8_EFFECTIVE_RAW_COUNT_DRIFT:${JSON.stringify(rawCounts)}`);
if(rawActivityById.size!==51||rawPairByKey.size!==74) throw new Error(`P7P8_EFFECTIVE_RAW_CARDINALITY_DRIFT:${rawActivityById.size}:${rawPairByKey.size}`);

const closedPairs=new Map(),closureActivityIds=new Set();
let declaredActivities=0,declaredPairs=0;
for(const pkg of closurePackages){
  declaredActivities+=Number(pkg?.result?.closure_activity_count||0);declaredPairs+=Number(pkg?.result?.closed_dependency_pair_count||0);
  for(const closure of pkg.closures||[]){
    const id=String(closure.activity_id||'').toLowerCase();
    if(!id||!rawActivityById.has(id)) throw new Error(`P7P8_EFFECTIVE_CLOSURE_ACTIVITY_NOT_RAW:${id}`);
    if(!Array.isArray(closure.authority)||closure.authority.length===0||!String(closure.reason||'').trim()) throw new Error(`P7P8_EFFECTIVE_CLOSURE_AUTHORITY_REQUIRED:${id}`);
    closureActivityIds.add(id);
    for(const dep of closure.dependencies||[]){const key=`${id}|${dep}`;if(!DEPS.includes(dep)) throw new Error(`P7P8_EFFECTIVE_CLOSURE_DEP_INVALID:${key}`);if(!rawPairByKey.has(key)) throw new Error(`P7P8_EFFECTIVE_CLOSURE_PAIR_NOT_RAW:${key}`);if(closedPairs.has(key)) throw new Error(`P7P8_EFFECTIVE_CLOSURE_PAIR_DUPLICATE:${key}`);closedPairs.set(key,closure);}
  }
}
if(declaredActivities!==closureActivityIds.size||declaredPairs!==closedPairs.size) throw new Error(`P7P8_EFFECTIVE_DECLARED_CLOSURE_DRIFT:${declaredActivities}:${closureActivityIds.size}:${declaredPairs}:${closedPairs.size}`);

const pendingPairs=[...rawPairByKey.entries()].filter(([key])=>!closedPairs.has(key));
const pendingByDependency=Object.fromEntries(DEPS.map((dep)=>[dep,pendingPairs.filter(([key])=>key.endsWith(`|${dep}`)).length]));
for(const dep of DEPS){const closedForDep=[...closedPairs.keys()].filter((key)=>key.endsWith(`|${dep}`)).length;if(pendingByDependency[dep]+closedForDep!==rawCounts[dep]) throw new Error(`P7P8_EFFECTIVE_DEP_ACCOUNTING_DRIFT:${dep}`);}
if(pendingPairs.length+closedPairs.size!==rawPairByKey.size) throw new Error('P7P8_EFFECTIVE_PAIR_ACCOUNTING_DRIFT');
const pendingIds=new Set(pendingPairs.map(([key])=>key.slice(0,36)));
const pendingRows=[...pendingIds].sort().map((id)=>{const row=rawActivityById.get(id);return{activity_id:id,person:row.person,polity:row.polity,start_year:row.start_year,end_year:row.end_year,decision:row.decision,decision_source:row.decision_source,pending_dependencies:DEPS.filter((dep)=>rawPairByKey.has(`${id}|${dep}`)&&!closedPairs.has(`${id}|${dep}`))};});

const relationCoverage=buildStage2FullRelationCoverageV2({writeOutput:true});
if(relationCoverage?.summary?.relation_semantic_decision_unresolved!==0||relationCoverage?.relation_review_remaining?.length!==0) throw new Error('P7P8_EFFECTIVE_RELATION_SEMANTIC_DECISION_NOT_CLOSED');
const relationBlockerIds=new Set((relationCoverage.correction_blockers||[]).map((row)=>String(row.activity_id).toLowerCase()));
const relationOnlyBlockerIds=[...relationBlockerIds].filter((id)=>!pendingIds.has(id)).sort();
const effectiveIds=new Set([...pendingIds,...relationBlockerIds]);
const relationById=new Map((relationCoverage.correction_blockers||[]).map((row)=>[String(row.activity_id).toLowerCase(),row]));
const blockers=[...effectiveIds].sort().map((id)=>{const raw=rawActivityById.get(id)||null,rel=relationById.get(id)||null;return{activity_id:id,person:raw?.person??rel?.person??null,polity:raw?.polity??rel?.polity??null,pending_nonrelation_dependencies:raw?DEPS.filter((dep)=>rawPairByKey.has(`${id}|${dep}`)&&!closedPairs.has(`${id}|${dep}`)):[],relation_path_correction_blocker:rel?.correction_blocker??null,relation_path_status:rel?.status??null};});
const zero=effectiveIds.size===0;
const result={schema:'atlas-stage2-p7p8-effective-cutover-gate/v1',as_of:'2026-08-14',status:zero?'BRANCH_ONLY_EFFECTIVE_ZERO_KNOWN_BLOCKERS':'BRANCH_ONLY_EFFECTIVE_ZERO_KNOWN_BLOCKER_GATE_NOT_READY',baseline:{deployment_sha:BASELINE_SHA,baseline_digest:BASELINE_DIGEST,activities:338},raw_audit_input:{post_p6_nonrelation_unique_activities:rawActivityById.size,dependency_counts:rawCounts,raw_dependency_pairs:rawPairByKey.size},reviewed_closures:{closure_batches:closurePaths.map((p)=>path.relative(root,p)),closure_activities:closureActivityIds.size,closed_dependency_pairs:closedPairs.size},effective_nonrelation:{pending_unique_activities:pendingIds.size,pending_dependency_counts:pendingByDependency,pending_dependency_pairs:pendingPairs.length,rows:pendingRows},relation_gate:{semantic_decisions_unresolved:0,correction_blocker_activities:relationBlockerIds.size,relation_only_blocker_activities:relationOnlyBlockerIds},p8_zero_known_blocker_gate:{status:zero?'ZERO_KNOWN_BLOCKERS':'NOT_READY',known_runtime_semantic_blockers:effectiveIds.size,blockers,cutover_allowed:zero},rules:{raw_dependency_presence_is_not_itself_a_current_blocker:true,only_explicit_reviewed_closure_may_remove_raw_dependency:true,relation_semantic_decision_zero_is_required_but_not_sufficient:true,production_mutation_authorized:false}};
fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.writeFileSync(outPath,`${JSON.stringify(result,null,2)}\n`);
console.log(JSON.stringify({marker:'ATLAS_STAGE2_P7P8_EFFECTIVE_CUTOVER_GATE_BUILT',closure_batches:closurePaths.length,raw_nonrelation_activities:rawActivityById.size,closed_dependency_pairs:closedPairs.size,effective_nonrelation_activities:pendingIds.size,relation_correction_blockers:relationBlockerIds.size,effective_known_blockers:effectiveIds.size,p8_status:result.p8_zero_known_blocker_gate.status,production_mutation_authorized:false},null,2));
