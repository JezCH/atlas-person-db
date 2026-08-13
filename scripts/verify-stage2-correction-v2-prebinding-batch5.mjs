import fs from 'node:fs';
import { polityRelationCandidateCodes } from './stage2-domain-contract.mjs';

const intake=JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-intake.json','utf8'));
const ledger=JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-master-ledger.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-p5p6-execution-manifest.json','utf8'));
const batch1=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch1.v1.json','utf8'));
const batch2=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch2.v1.json','utf8'));
const batch3=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch3.v1.json','utf8'));
const batch4=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch4.v1.json','utf8'));
const plan=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch5.v1.json','utf8'));
const contract=JSON.parse(fs.readFileSync('stage2/contracts/correction-v2-current.v1.json','utf8'));
const catalog=JSON.parse(fs.readFileSync('stage2/catalogs/relation-types.v1.json','utf8'));
const structural=JSON.parse(fs.readFileSync('research/relations/stage2-structural-polity-relation-intervals.v1.json','utf8'));
const requirements=JSON.parse(fs.readFileSync('requirements/atlas-requirements.v1.json','utf8'));

const digest='sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const deployment='ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
if(intake?.schema!=='atlas-stage2-baseline-a-intake/v2'||intake.baseline_digest!==digest||intake.deployment_sha!==deployment) throw new Error('Baseline A intake drift');
if(ledger?.schema!=='atlas-stage2-baseline-a-master-ledger/v2'||ledger.baseline?.baseline_digest!==digest) throw new Error('Baseline A ledger drift');
if(manifest?.schema!=='atlas-stage2-baseline-a-p5p6-execution-manifest/v2'||Number(manifest.summary?.correction_v2_activity_count)!==57) throw new Error('Correction v2 frontier drift');
if(contract?.schema!=='atlas-stage2-correction-v2-contract/v1'||contract.status!=='P6_BRANCH_ONLY_CONTRACT_NO_PRODUCTION_MUTATION'||contract.release_boundary?.production_mutation_authorized!==false) throw new Error('Correction v2 contract drift');
if(contract.manifest_layers?.prebinding_plan?.exact_baseline_before_state_required!==true||contract.operation_types?.rewrite_activity?.same_activity_uuid_preserved!==true||contract.operation_types?.rewrite_activity?.exact_before_and_after_required!==true) throw new Error('Correction v2 prebinding/rewrite contract drift');
if(plan?.schema!=='atlas-stage2-correction-v2-prebinding-plan/v1'||plan.batch_id!=='p6_correction_v2_prebinding_batch5_existing_uuid_deferred_relation_and_constituent_handoff'||plan.status!=='PREBINDING_ONLY_NOT_PRODUCTION_EXECUTABLE') throw new Error('P6 Batch 5 plan drift');
if(plan.contract!=='stage2/contracts/correction-v2-current.v1.json'||plan.catalog!=='stage2/catalogs/relation-types.v1.json'||plan.structural_relation_research!=='research/relations/stage2-structural-polity-relation-intervals.v1.json'||plan.baseline?.deployment_sha!==deployment||plan.baseline?.baseline_digest!==digest) throw new Error('P6 Batch 5 linkage drift');

const scope=plan.scope_rules||{};
if(scope.existing_current_polity_uuid_only!==true||scope.merge_retire_split_new_polity_forbidden_in_this_batch!==true||scope.activity_uuid_preserved!==true||scope.activity_year_interval_preserved!==true||scope.unreviewed_person_relation_default_forbidden!==true||scope.structural_relation_uuid_fabrication_forbidden!==true||scope.production_mutation_authorized!==false) throw new Error('P6 Batch 5 scope safety drift');
const blockers=['P5_PRODUCTION_SCHEMA_NOT_APPLIED','REVIEWED_RELATION_BACKFILL_NOT_COMPLETE_WHERE_DEFERRED','NORMALIZED_REVIEWED_EVIDENCE_FOR_COMPANION_SEMANTICS_NOT_COMPLETE','PRODUCTION_RELEASE_NOT_AUTHORIZED'];
if(!blockers.every((b)=>(plan.common_execution_blockers||[]).includes(b))) throw new Error('P6 Batch 5 execution blockers incomplete');
if(plan.source_preservation_policy?.silent_source_drop_forbidden!==true||!String(plan.source_preservation_policy?.rewrite_activity||'').includes('PRESERVE_ALL_EXISTING_ACTIVITY_SOURCE_LINKS')||!String(plan.source_preservation_policy?.structural_relation_assertion||'').includes('EXACT_RELATION_TYPE_UUID')) throw new Error('P6 Batch 5 source/structural safety drift');

const reqById=new Map((requirements.requirements||[]).map((r)=>[r.id,r]));
if(reqById.get('ATLAS-RQ-0215')?.status!=='PENDING'||reqById.get('ATLAS-RQ-0216')?.status!=='PENDING') throw new Error('P5/P6 Production requirements must remain pending');

const beforeFields=plan.before_tuple_fields||[];
const expectedFields=['person_id','polity_id','role_id','period_basis_id','activity_start','activity_end','confidence','chronology_status','legacy_source_key','source_count'];
if(JSON.stringify(beforeFields)!==JSON.stringify(expectedFields)) throw new Error('P6 Batch 5 before tuple field drift');
const intakeByActivity=new Map((intake.activity_rows||[]).map((r)=>[r.activity_id,r]));
const ledgerByActivity=new Map((ledger.rows||[]).map((r)=>[r.activity_id,r]));
const frontier=new Set((manifest.correction_activities||[]).map((r)=>r.activity_id));
const earlierIds=new Set([
  ...(batch1.cases||[]).map((r)=>r.activity_id),
  ...(batch2.cases||[]).map((r)=>r.activity_id),
  ...(batch3.cases||[]).map((r)=>r.activity_id),
  ...(batch4.cases||[]).map((r)=>r.activity_id)
]);
if(earlierIds.size!==37) throw new Error(`P6 Batch 1-4 coverage drift ${earlierIds.size}`);

const expected=new Map([
 ['45c30e16-92ba-5e89-8ef1-68dad29129bc',['Nefertiti','new_kingdom_egypt_nefertiti','REUSE_CURRENT_UUID','0200ceec-534a-5604-88a8-e0520a3259a0',null]],
 ['9db8d593-a73c-5993-bfe6-b2b30ec71167',['Hiawatha','hiawatha_iroquois_survivor_reuse','REUSE_CURRENT_UUID','1fa78018-e3af-55c3-8b8e-1bf7ad1c4b08',null]],
 ['df9c8cb3-bbf4-5037-930c-342962a3b7d0',['Vladimir Lenin','lenin_soviet_russia_keep_distinct_constituent','KEEP_DISTINCT','09528a4d-4b32-5ca5-8a10-fbe9687679df','rsfsr_constituent_of_ussr']],
 ['e05c0337-8048-5695-901f-36c8fe2c6c1c',['Vladimir Lenin','lenin_soviet_union_keep_distinct_union','KEEP_DISTINCT','c7ddf754-0faa-576f-af97-9d322cf64f01','rsfsr_constituent_of_ussr']]
]);

const currentPolityRelationCodes=new Set((catalog.polity_relation_types||[]).map((r)=>r.code));
if(currentPolityRelationCodes.has('constituent_of')) throw new Error('Batch 5 assumption drift: constituent_of now has a current exact UUID catalog entry and handoff must be upgraded');
if(!polityRelationCandidateCodes.includes('constituent_of')) throw new Error('domain contract lost constituent_of candidate semantics');

const reviewedStructural=(structural.relations||[]).find((r)=>r.id==='rsfsr_constituent_of_ussr');
if(!reviewedStructural||reviewedStructural.relation_type!=='constituent_of'||reviewedStructural.semantic_status!=='resolved'||reviewedStructural.interval_status!=='resolved_against_union_cessation'||reviewedStructural.production_interval_approved!==false) throw new Error('reviewed RSFSR constituent relation research drift');
if(reviewedStructural.subject_polity_uuid!==null||reviewedStructural.object_polity_uuid!==null||structural.baseline_a_uuid_rebind_required!==true||structural.production_approved!==false) throw new Error('structural relation research must remain non-Production/name-unbound evidence');
const start=reviewedStructural.start||{},end=reviewedStructural.end||{};
if(start.year!==1922||start.month!==12||start.day!==30||start.granularity!=='day'||start.certainty!=='exact'||start.calendar!=='gregorian'||end.year!==1991||end.month!==12||end.day!==25||end.granularity!=='day'||end.certainty!=='exact'||end.calendar!=='gregorian') throw new Error('RSFSR constituent relation interval drift');

if(!Array.isArray(plan.cases)||plan.cases.length!==4) throw new Error('P6 Batch 5 case count drift');
const seen=new Set();let deferred=0,structuralHandoffs=0,reuse=0,keepDistinct=0;
for(const item of plan.cases){
  const exp=expected.get(item.activity_id);
  if(!exp||seen.has(item.activity_id)||earlierIds.has(item.activity_id)) throw new Error(`unexpected/duplicate/overlap P6 Batch 5 Activity ${item.activity_id}`);
  seen.add(item.activity_id);
  if(!frontier.has(item.activity_id)) throw new Error(`${item.activity_id}: outside authoritative 57-Activity frontier`);
  if(item.type!=='rewrite_activity'||item.mode!=='existing_uuid_semantic_with_deferred_relation') throw new Error(`${item.activity_id}: unsupported Batch 5 operation`);
  const live=intakeByActivity.get(item.activity_id);const row=ledgerByActivity.get(item.activity_id);
  if(!live||!row) throw new Error(`${item.activity_id}: missing Baseline A row`);
  const [person,decisionId,disposition,targetUuid,structuralId]=exp;
  if(item.person!==person||row.person?.canonical!==person) throw new Error(`${item.activity_id}: person drift`);
  if(!Array.isArray(item.expected_before)||item.expected_before.length!==beforeFields.length) throw new Error(`${item.activity_id}: before tuple shape drift`);
  for(let i=0;i<beforeFields.length;i++){const field=beforeFields[i];if(item.expected_before[i]!==live[field]) throw new Error(`${item.activity_id}: exact before-state drift ${field}`);}
  const p4=row.audit?.polity_identity_decision;
  if(!p4||p4.id!==decisionId||item.p4_decision_id!==decisionId||p4.status!=='P4_IDENTITY_DECIDED_IMPLEMENTATION_PENDING'||p4.production_mutation_authorized!==false) throw new Error(`${item.activity_id}: P4 decision overlay drift`);
  if(p4.target_disposition!==disposition||item.target_disposition!==disposition||p4.target_polity_uuid!==targetUuid||item.target_polity_uuid!==targetUuid||live.polity_id!==targetUuid||item.target_identity_class!==p4.target_identity_class) throw new Error(`${item.activity_id}: existing Polity identity boundary drift`);
  if(disposition==='REUSE_CURRENT_UUID') reuse++; else if(disposition==='KEEP_DISTINCT') keepDistinct++; else throw new Error(`${item.activity_id}: unexpected target disposition`);
  if(item.activity_uuid_preserved!==true||item.activity_year_interval_preserved!==true) throw new Error(`${item.activity_id}: Activity identity/interval preservation drift`);
  if(!item.source_contract||item.source_contract!==p4.source_contract||!fs.existsSync(item.source_contract)) throw new Error(`${item.activity_id}: reviewed source contract drift`);
  if(JSON.stringify(item.companion_actions||[])!==JSON.stringify(p4.required_later_actions||[])) throw new Error(`${item.activity_id}: companion semantic actions drift`);
  const reviewedHint=row.audit?.relation_hint ?? null;
  if(reviewedHint!==null||item.relation!==null||item.relation_assignment_status!=='DEFER_TO_REVIEWED_RELATION_BACKFILL') throw new Error(`${item.activity_id}: unreviewed Person relation must remain deferred`);
  deferred++;

  if(structuralId===null){
    if(item.structural_relation_handoff!==null) throw new Error(`${item.activity_id}: unexpected structural relation handoff`);
  }else{
    structuralHandoffs++;
    const handoff=item.structural_relation_handoff;
    if(!handoff||handoff.research_relation_id!==structuralId||handoff.relation_type_code!=='constituent_of'||handoff.relation_type_uuid!==null||handoff.status!=='REVIEWED_SEMANTICS_PENDING_EXACT_UUID_CATALOG_BINDING') throw new Error(`${item.activity_id}: constituent relation handoff drift`);
    if(handoff.subject_polity_uuid!=='09528a4d-4b32-5ca5-8a10-fbe9687679df'||handoff.object_polity_uuid!=='c7ddf754-0faa-576f-af97-9d322cf64f01') throw new Error(`${item.activity_id}: constituent subject/object UUID rebind drift`);
    const needed=['CONSTITUENT_OF_RELATION_TYPE_UUID_CATALOG_EXTENSION_REQUIRED','NORMALIZED_SOURCE_UUID_LINKS_REQUIRED_BEFORE_ASSERTION'];
    if(!needed.every((b)=>(handoff.execution_blockers||[]).includes(b))) throw new Error(`${item.activity_id}: constituent handoff blockers incomplete`);
  }
}
if(seen.size!==4||deferred!==4||structuralHandoffs!==2||reuse!==2||keepDistinct!==2) throw new Error(`P6 Batch 5 aggregate drift cases=${seen.size} deferred=${deferred} structural=${structuralHandoffs} reuse=${reuse} keep_distinct=${keepDistinct}`);

const combined=new Set([...earlierIds,...seen]);
if(combined.size!==41||57-combined.size!==16) throw new Error(`P6 cumulative prebinding coverage drift total=${combined.size} remaining=${57-combined.size}`);
const result=plan.result||{};
if(Number(result.case_count)!==4||Number(result.rewrite_activity_count)!==4||Number(result.existing_polity_uuid_reuses_or_keeps)!==4||Number(result.deferred_person_relation_bindings)!==4||Number(result.structural_relation_handoff_cases)!==2||Number(result.constituent_of_uuid_assignments)!==0||Number(result.new_polity_uuid_bindings)!==0||Number(result.new_activity_uuid_assignments)!==0||Number(result.merge_operations)!==0||Number(result.retire_operations)!==0||Number(result.split_operations)!==0||Number(result.cumulative_prebinding_activities)!==41||Number(result.remaining_correction_v2_frontier)!==16||result.production_executable!==false||result.production_mutation_authorized!==false) throw new Error('P6 Batch 5 result summary drift');

console.log(JSON.stringify({marker:'ATLAS_STAGE2_CORRECTION_V2_PREBINDING_BATCH5_OK',batch5_cases:4,batch5_rewrites:4,existing_polity_uuid_reuses_or_keeps:4,deferred_person_relations:4,structural_relation_handoffs:2,constituent_of_uuid_assignments:0,cumulative_prebinding_activities:41,remaining_correction_v2_frontier:16,new_uuid_assignments:0,production_executable:false,production_mutation_authorized:false},null,2));
