import fs from 'node:fs';

const intake=JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-intake.json','utf8'));
const ledger=JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-master-ledger.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-p5p6-execution-manifest.json','utf8'));
const batch1=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch1.v1.json','utf8'));
const batch2=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch2.v1.json','utf8'));
const batch3=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch3.v1.json','utf8'));
const plan=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch4.v1.json','utf8'));
const contract=JSON.parse(fs.readFileSync('stage2/contracts/correction-v2-current.v1.json','utf8'));
const catalog=JSON.parse(fs.readFileSync('stage2/catalogs/relation-types.v1.json','utf8'));
const requirements=JSON.parse(fs.readFileSync('requirements/atlas-requirements.v1.json','utf8'));

const digest='sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const deployment='ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
if(intake?.schema!=='atlas-stage2-baseline-a-intake/v2'||intake.baseline_digest!==digest||intake.deployment_sha!==deployment) throw new Error('Baseline A intake drift');
if(ledger?.schema!=='atlas-stage2-baseline-a-master-ledger/v2'||ledger.baseline?.baseline_digest!==digest) throw new Error('Baseline A ledger drift');
if(manifest?.schema!=='atlas-stage2-baseline-a-p5p6-execution-manifest/v2'||Number(manifest.summary?.correction_v2_activity_count)!==57) throw new Error('Correction v2 frontier drift');
if(contract?.schema!=='atlas-stage2-correction-v2-contract/v1'||contract.status!=='P6_BRANCH_ONLY_CONTRACT_NO_PRODUCTION_MUTATION'||contract.release_boundary?.production_mutation_authorized!==false) throw new Error('Correction v2 contract drift');
if(contract.operation_types?.rewrite_activity?.same_activity_uuid_preserved!==true||contract.operation_types?.rewrite_activity?.exact_before_required!==true) throw new Error('Correction v2 rewrite contract drift');
if(plan?.schema!=='atlas-stage2-correction-v2-prebinding-plan/v1'||plan.batch_id!=='p6_correction_v2_prebinding_batch4_existing_uuid_semantic_normalization'||plan.status!=='PREBINDING_ONLY_NOT_PRODUCTION_EXECUTABLE') throw new Error('P6 Batch 4 plan drift');
if(plan.contract!=='stage2/contracts/correction-v2-current.v1.json'||plan.catalog!=='stage2/catalogs/relation-types.v1.json'||plan.baseline?.deployment_sha!==deployment||plan.baseline?.baseline_digest!==digest) throw new Error('P6 Batch 4 contract/Baseline linkage drift');

const scope=plan.scope_rules||{};
if(scope.existing_polity_uuid_only!==true||scope.merge_retire_split_new_polity_forbidden_in_this_batch!==true||scope.activity_uuid_preserved!==true||scope.activity_year_interval_preserved!==true||scope.companion_semantics_retained!==true||scope.unreviewed_relation_default_forbidden!==true||scope.production_mutation_authorized!==false) throw new Error('P6 Batch 4 scope safety drift');
const blockers=['P5_PRODUCTION_SCHEMA_NOT_APPLIED','NORMALIZED_REVIEWED_EVIDENCE_FOR_COMPANION_SEMANTICS_NOT_COMPLETE','REVIEWED_RELATION_BACKFILL_NOT_COMPLETE_WHERE_DEFERRED','PRODUCTION_RELEASE_NOT_AUTHORIZED'];
if(!blockers.every((b)=>(plan.common_execution_blockers||[]).includes(b))) throw new Error('P6 Batch 4 execution blockers incomplete');
if(plan.source_preservation_policy?.silent_source_drop_forbidden!==true||!String(plan.source_preservation_policy?.rewrite_activity||'').includes('PRESERVE_ALL_EXISTING_ACTIVITY_SOURCE_LINKS')) throw new Error('P6 Batch 4 source preservation drift');

const reqById=new Map((requirements.requirements||[]).map((r)=>[r.id,r]));
if(reqById.get('ATLAS-RQ-0215')?.status!=='PENDING'||reqById.get('ATLAS-RQ-0216')?.status!=='PENDING') throw new Error('P5/P6 Production requirements must remain pending');
const relationByCode=new Map((catalog.person_polity_relation_types||[]).map((r)=>[r.code,r.id]));
if(relationByCode.get('active_in')!=='f33d2789-2e65-50c1-af3e-91335bcbd3ca'||relationByCode.get('serves')!=='0fc4827f-8543-52f7-9e9a-3173b0c698a7') throw new Error('P6 Batch 4 Relation Type UUID drift');

const beforeFields=plan.before_tuple_fields||[];
const expectedFields=['person_id','polity_id','role_id','period_basis_id','activity_start','activity_end','confidence','chronology_status','legacy_source_key','source_count'];
if(JSON.stringify(beforeFields)!==JSON.stringify(expectedFields)) throw new Error('P6 Batch 4 before tuple field drift');
const intakeByActivity=new Map((intake.activity_rows||[]).map((r)=>[r.activity_id,r]));
const ledgerByActivity=new Map((ledger.rows||[]).map((r)=>[r.activity_id,r]));
const frontier=new Set((manifest.correction_activities||[]).map((r)=>r.activity_id));
const earlierIds=new Set([
  ...(batch1.cases||[]).map((r)=>r.activity_id),
  ...(batch2.cases||[]).map((r)=>r.activity_id),
  ...(batch3.cases||[]).map((r)=>r.activity_id)
]);
if(earlierIds.size!==29) throw new Error(`P6 Batch 1-3 coverage drift ${earlierIds.size}`);

const expected=new Map([
 ['11969191-7ede-5c61-b911-5290d3b95f29',['shakya_survivor_buddha_origin','active_in','f33d2789-2e65-50c1-af3e-91335bcbd3ca']],
 ['1fa109e2-38d4-54f2-bc52-ce10e1a8dac3',['osman_early_ottoman_polity_reuse',null,null]],
 ['418d957a-1658-51a6-8b35-71757f712760',['kublai_stable_yuan_identity_from_1260',null,null]],
 ['486ce4c6-cb60-530f-8d88-03f7cc75a4bf',['meiji_empire_of_japan_stable_japan_survivor',null,null]],
 ['59559235-3a54-5985-b83d-bbc16ac01467',['yuan_huizong_pre1368_survivor',null,null]],
 ['5b0d8256-c64d-507d-8590-6492d6691920',['moctezuma_aztec_triple_alliance_identity_reuse',null,null]],
 ['d1630b88-d82b-5c5e-a7a1-195bf9661465',['yongle_ming_survivor_reuse',null,null]],
 ['df6cc626-135e-5abc-ae54-6dc1f64ac2aa',['guan_yu_continuous_liu_bei_polity','serves','0fc4827f-8543-52f7-9e9a-3173b0c698a7']]
]);

if(!Array.isArray(plan.cases)||plan.cases.length!==8) throw new Error('P6 Batch 4 case count drift');
const seen=new Set();let reviewedRelations=0,deferredRelations=0,activeIn=0,serves=0;
for(const item of plan.cases){
  const exp=expected.get(item.activity_id);
  if(!exp||seen.has(item.activity_id)||earlierIds.has(item.activity_id)) throw new Error(`unexpected/duplicate/overlap P6 Batch 4 Activity ${item.activity_id}`);
  seen.add(item.activity_id);
  if(!frontier.has(item.activity_id)) throw new Error(`${item.activity_id}: outside authoritative 57-Activity frontier`);
  if(item.type!=='rewrite_activity'||item.mode!=='existing_uuid_semantic_normalization') throw new Error(`${item.activity_id}: unsupported Batch 4 operation`);
  const live=intakeByActivity.get(item.activity_id);const row=ledgerByActivity.get(item.activity_id);
  if(!live||!row) throw new Error(`${item.activity_id}: missing Baseline A row`);
  if(item.person!==row.person?.canonical) throw new Error(`${item.activity_id}: person drift`);
  if(!Array.isArray(item.expected_before)||item.expected_before.length!==beforeFields.length) throw new Error(`${item.activity_id}: before tuple shape drift`);
  for(let i=0;i<beforeFields.length;i++){const field=beforeFields[i];if(item.expected_before[i]!==live[field]) throw new Error(`${item.activity_id}: exact before-state drift ${field}`);}
  const p4=row.audit?.polity_identity_decision;
  if(!p4||p4.id!==item.p4_decision_id||p4.id!==exp[0]||p4.status!=='P4_IDENTITY_DECIDED_IMPLEMENTATION_PENDING'||p4.production_mutation_authorized!==false) throw new Error(`${item.activity_id}: P4 decision overlay drift`);
  if(p4.target_disposition!=='REUSE_CURRENT_UUID'||p4.target_polity_uuid!==live.polity_id||item.target_polity_uuid!==live.polity_id||item.target_polity_uuid!==p4.target_polity_uuid||item.target_identity_class!==p4.target_identity_class) throw new Error(`${item.activity_id}: existing Polity UUID reuse boundary drift`);
  if(item.activity_uuid_preserved!==true||item.activity_year_interval_preserved!==true) throw new Error(`${item.activity_id}: Activity identity/interval preservation drift`);
  if(!item.source_contract||item.source_contract!==p4.source_contract||!fs.existsSync(item.source_contract)) throw new Error(`${item.activity_id}: reviewed source contract drift`);
  const expectedCompanion=(p4.required_later_actions||[]).filter((action)=>action!=='RELATION_SET');
  if(JSON.stringify(item.companion_actions||[])!==JSON.stringify(expectedCompanion)) throw new Error(`${item.activity_id}: companion semantic actions drift`);

  const [expectedCode,expectedId]=[exp[1],exp[2]];
  const reviewedHint=row.audit?.relation_hint ?? null;
  if(expectedCode){
    reviewedRelations++;
    if(reviewedHint!==expectedCode||!Array.isArray(item.relation)||item.relation[0]!==expectedCode||item.relation[1]!==expectedId||relationByCode.get(expectedCode)!==expectedId||item.relation_assignment_status!=='REVIEWED_EXACT_BINDING') throw new Error(`${item.activity_id}: reviewed relation binding drift`);
    if(expectedCode==='active_in') activeIn++; else if(expectedCode==='serves') serves++;
  }else{
    deferredRelations++;
    if(reviewedHint!==null||item.relation!==null||item.relation_assignment_status!=='DEFER_TO_REVIEWED_RELATION_BACKFILL') throw new Error(`${item.activity_id}: unreviewed relation must remain deferred`);
  }
}
if(seen.size!==8||reviewedRelations!==2||deferredRelations!==6||activeIn!==1||serves!==1) throw new Error(`P6 Batch 4 aggregate drift cases=${seen.size} reviewed=${reviewedRelations} deferred=${deferredRelations} active_in=${activeIn} serves=${serves}`);

const combined=new Set([...earlierIds,...seen]);
if(combined.size!==37||57-combined.size!==20) throw new Error(`P6 cumulative prebinding coverage drift total=${combined.size} remaining=${57-combined.size}`);
const result=plan.result||{};
if(Number(result.case_count)!==8||Number(result.rewrite_activity_count)!==8||Number(result.existing_polity_uuid_reuses)!==8||Number(result.reviewed_exact_relation_bindings)!==2||Number(result.deferred_relation_bindings)!==6||Number(result.active_in_relation_count)!==1||Number(result.serves_relation_count)!==1||Number(result.new_polity_uuid_bindings)!==0||Number(result.new_activity_uuid_assignments)!==0||Number(result.merge_operations)!==0||Number(result.retire_operations)!==0||Number(result.split_operations)!==0||Number(result.cumulative_prebinding_activities)!==37||Number(result.remaining_correction_v2_frontier)!==20||result.production_executable!==false||result.production_mutation_authorized!==false) throw new Error('P6 Batch 4 result summary drift');

console.log(JSON.stringify({marker:'ATLAS_STAGE2_CORRECTION_V2_PREBINDING_BATCH4_OK',batch4_cases:8,batch4_rewrites:8,existing_polity_uuid_reuses:8,reviewed_exact_relations:2,deferred_relations:6,active_in:1,serves:1,cumulative_prebinding_activities:37,remaining_correction_v2_frontier:20,new_uuid_assignments:0,production_executable:false,production_mutation_authorized:false},null,2));
