import fs from 'node:fs';

const intake=JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-intake.json','utf8'));
const ledger=JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-master-ledger.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-p5p6-execution-manifest.json','utf8'));
const batch1=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch1.v1.json','utf8'));
const batch2=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch2.v1.json','utf8'));
const plan=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch3.v1.json','utf8'));
const contract=JSON.parse(fs.readFileSync('stage2/contracts/correction-v2-current.v1.json','utf8'));
const requirements=JSON.parse(fs.readFileSync('requirements/atlas-requirements.v1.json','utf8'));

const digest='sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const deployment='ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
if(intake?.schema!=='atlas-stage2-baseline-a-intake/v2'||intake.baseline_digest!==digest||intake.deployment_sha!==deployment) throw new Error('Baseline A intake drift');
if(ledger?.schema!=='atlas-stage2-baseline-a-master-ledger/v2'||ledger.baseline?.baseline_digest!==digest) throw new Error('Baseline A ledger drift');
if(manifest?.schema!=='atlas-stage2-baseline-a-p5p6-execution-manifest/v2'||Number(manifest.summary?.correction_v2_activity_count)!==57) throw new Error('Correction v2 frontier drift');
if(contract?.schema!=='atlas-stage2-correction-v2-contract/v1'||contract.status!=='P6_BRANCH_ONLY_CONTRACT_NO_PRODUCTION_MUTATION'||contract.release_boundary?.production_mutation_authorized!==false) throw new Error('Correction v2 contract drift');
if(contract.operation_types?.rewrite_activity?.same_activity_uuid_preserved!==true||contract.operation_types?.retire_activity?.exact_before_required!==true||contract.operation_types?.retire_activity?.dependent_source_and_description_handling_required!==true) throw new Error('Correction v2 rewrite/retire operation contract drift');
if(plan?.schema!=='atlas-stage2-correction-v2-prebinding-plan/v1'||plan.batch_id!=='p6_correction_v2_prebinding_batch3_polity_survivor_relinks_and_redundant_activity_retirements'||plan.status!=='PREBINDING_ONLY_NOT_PRODUCTION_EXECUTABLE') throw new Error('P6 Batch 3 plan drift');
if(plan.contract!=='stage2/contracts/correction-v2-current.v1.json'||plan.baseline?.deployment_sha!==deployment||plan.baseline?.baseline_digest!==digest) throw new Error('P6 Batch 3 contract/Baseline linkage drift');

const scope=plan.scope_rules||{};
if(scope.existing_survivor_uuid_only_for_relinks!==true||scope.new_polity_uuid_forbidden!==true||scope.new_activity_uuid_forbidden!==true||scope.split_activity_forbidden!==true||scope.physical_person_merge_forbidden!==true||scope.relation_assignment_not_invented!==true||scope.duplicate_polity_row_retirement_requires_reference_name_and_provenance_clearance!==true||scope.production_mutation_authorized!==false) throw new Error('P6 Batch 3 scope safety drift');
const blockers=['P5_PRODUCTION_SCHEMA_NOT_APPLIED','REVIEWED_RELATION_BACKFILL_NOT_COMPLETE_WHERE_REQUIRED','DUPLICATE_POLITY_REFERENCE_NAME_AND_PROVENANCE_CLEARANCE_NOT_PROVEN_IN_PRODUCTION','PRODUCTION_RELEASE_NOT_AUTHORIZED'];
if(!blockers.every((b)=>(plan.common_execution_blockers||[]).includes(b))) throw new Error('P6 Batch 3 execution blockers incomplete');
if(plan.source_preservation_policy?.silent_source_drop_forbidden!==true||!String(plan.source_preservation_policy?.rewrite_activity||'').includes('PRESERVE_ALL_EXISTING_ACTIVITY_SOURCE_LINKS')||!String(plan.source_preservation_policy?.retire_activity||'').includes('IMMUTABLE_CORRECTION_AUDIT')) throw new Error('P6 Batch 3 source preservation drift');

const reqById=new Map((requirements.requirements||[]).map((r)=>[r.id,r]));
if(reqById.get('ATLAS-RQ-0215')?.status!=='PENDING'||reqById.get('ATLAS-RQ-0216')?.status!=='PENDING') throw new Error('P5/P6 Production requirements must remain pending');

const beforeFields=plan.before_tuple_fields||[];
const expectedFields=['person_id','polity_id','role_id','period_basis_id','activity_start','activity_end','confidence','chronology_status','legacy_source_key','source_count'];
if(JSON.stringify(beforeFields)!==JSON.stringify(expectedFields)) throw new Error('P6 Batch 3 before tuple field drift');
const intakeByActivity=new Map((intake.activity_rows||[]).map((r)=>[r.activity_id,r]));
const ledgerByActivity=new Map((ledger.rows||[]).map((r)=>[r.activity_id,r]));
const frontier=new Set((manifest.correction_activities||[]).map((r)=>r.activity_id));
const polityIds=new Set((intake.identity_catalogs?.polities||[]).map((r)=>r.id));
const batch1Ids=new Set((batch1.cases||[]).map((r)=>r.activity_id));
const batch2Ids=new Set((batch2.cases||[]).map((r)=>r.activity_id));
if(batch1Ids.size!==9||batch2Ids.size!==10||[...batch1Ids].some((id)=>batch2Ids.has(id))) throw new Error('P6 Batch 1/2 coverage drift');

const expectedRelinks=new Map([
 ['21174e2f-1e20-57b1-ad69-e846c684a09f',['shakya_duplicate_merge_to_survivor','80810807-0abb-5255-b40c-1945f4073eb1','6e2409ba-8361-5118-91af-3b6c66770fa5']],
 ['2f2a2dfe-12b3-52b7-957e-42d6f7b89f2a',['hiawatha_haudenosaunee_duplicate_merge','c591bebb-90a3-5a96-90c5-9870ddd7f637','1fa78018-e3af-55c3-8b8e-1bf7ad1c4b08']],
 ['b5e49aa2-44b9-5b1c-bc84-a2650d946ef5',['yongle_ming_lowercase_duplicate_merge','14113865-1569-521a-bae5-8ae070f4817d','756460ea-0f77-519e-9e91-43dfb694926a']],
 ['57cdefa5-9a5d-533c-b229-47e398f1d07a',['peter_tsardom_merge_to_stable_russia','8e0c3472-867d-5165-89c2-cb7866f6a5ed','dd07fc4c-b3ac-59ac-bdf2-9cc190893327']],
 ['68c203e5-ac61-59ed-853b-365bdf3ed340',['yuan_huizong_northern_yuan_merge','986380c3-cc31-50d5-bb0d-6cae5fae0660','d035cbd8-e7b1-5947-8542-c7dd356d52bb']],
 ['c5085fdb-379a-5710-bf14-c748b5b822da',['koke_temur_northern_yuan_merge','986380c3-cc31-50d5-bb0d-6cae5fae0660','d035cbd8-e7b1-5947-8542-c7dd356d52bb']],
 ['daf85f20-db1f-50c2-aff1-86830290da8e',['christina_swedish_empire_merge_to_stable_sweden','efc86adb-7fc7-5efe-9c4d-7cd8e224890f','93613017-b4c4-5f82-8e96-3ce6b2d3a61e']]
]);
const expectedRetirements=new Map([
 ['c778c8f8-9ae5-5d60-b04d-c5e002cf8bfa',['hypatia_spanning_roman_activity_retirement',['aa5f6b18-e362-5421-9547-5ed0161d3cb8','3f0af453-7e55-5bf0-a8d8-6092788e28a6']]],
 ['eda26b64-2f59-5f15-954a-73404ceed064',['peter_backprojected_russian_empire_activity_retirement',['57cdefa5-9a5d-533c-b229-47e398f1d07a','9ec53325-3a97-58a8-a7e7-81a496a47e57']]],
 ['fefe572f-95f7-5913-86ed-304c7c2ca679',['maria_overlapping_portugal_activity_retirement',['a5be2a19-2c82-519f-9a3c-6dcc5a1bf3b7','25fcca0f-9ca3-5bdd-a9c8-e11bf8e22b89']]]
]);

if(!Array.isArray(plan.cases)||plan.cases.length!==10) throw new Error('P6 Batch 3 case count drift');
const seen=new Set();const relinkIds=new Set();const retireIds=new Set();let relinks=0,retirements=0;
for(const item of plan.cases){
  if(seen.has(item.activity_id)||batch1Ids.has(item.activity_id)||batch2Ids.has(item.activity_id)) throw new Error(`unexpected duplicate/overlap P6 Batch 3 Activity ${item.activity_id}`);
  seen.add(item.activity_id);
  if(!frontier.has(item.activity_id)) throw new Error(`${item.activity_id}: outside authoritative 57-Activity frontier`);
  const live=intakeByActivity.get(item.activity_id);const row=ledgerByActivity.get(item.activity_id);
  if(!live||!row) throw new Error(`${item.activity_id}: missing Baseline A row`);
  if(item.person!==row.person?.canonical) throw new Error(`${item.activity_id}: person drift`);
  if(!Array.isArray(item.expected_before)||item.expected_before.length!==beforeFields.length) throw new Error(`${item.activity_id}: before tuple shape drift`);
  for(let i=0;i<beforeFields.length;i++){const field=beforeFields[i];if(item.expected_before[i]!==live[field]) throw new Error(`${item.activity_id}: exact before-state drift ${field}`);}
  const p4=row.audit?.polity_identity_decision;
  if(!p4||p4.id!==item.p4_decision_id||p4.status!=='P4_IDENTITY_DECIDED_IMPLEMENTATION_PENDING'||p4.production_mutation_authorized!==false) throw new Error(`${item.activity_id}: P4 decision overlay drift`);

  if(item.type==='rewrite_activity'&&item.mode==='polity_survivor_relink'){
    relinks++;relinkIds.add(item.activity_id);
    const expected=expectedRelinks.get(item.activity_id);if(!expected) throw new Error(`${item.activity_id}: unexpected survivor relink`);
    const [decisionId,fromUuid,targetUuid]=expected;
    if(item.p4_decision_id!==decisionId||item.from_polity_uuid!==fromUuid||live.polity_id!==fromUuid||item.target_polity_uuid!==targetUuid) throw new Error(`${item.activity_id}: survivor relink binding drift`);
    if(p4.target_disposition!=='MERGE_TO_EXISTING_SURVIVOR'||p4.target_polity_uuid!==targetUuid||fromUuid===targetUuid||!polityIds.has(targetUuid)) throw new Error(`${item.activity_id}: reviewed survivor target drift`);
    if(item.activity_uuid_preserved!==true||item.relation_assignment_status!=='DEFER_TO_REVIEWED_RELATION_BACKFILL'||item.duplicate_polity_retirement_status!=='AFTER_ALL_REFERENCES_NAMES_AND_PROVENANCE_RECONCILED') throw new Error(`${item.activity_id}: relink safety marker drift`);
  } else if(item.type==='retire_activity'&&item.mode==='redundant_reviewed_activity_retirement'){
    retirements++;retireIds.add(item.activity_id);
    const expected=expectedRetirements.get(item.activity_id);if(!expected) throw new Error(`${item.activity_id}: unexpected retirement`);
    const [decisionId,replacements]=expected;
    if(item.p4_decision_id!==decisionId||!String(p4.reviewed_decision||'').startsWith('RETIRE_')||p4.target_disposition!=='REUSE_CURRENT_UUID') throw new Error(`${item.activity_id}: reviewed retirement decision drift`);
    if(!Array.isArray(item.replacement_activity_ids)||JSON.stringify(item.replacement_activity_ids)!==JSON.stringify(replacements)) throw new Error(`${item.activity_id}: replacement Activity set drift`);
    for(const replacementId of replacements){
      const replacement=intakeByActivity.get(replacementId);if(!replacement) throw new Error(`${item.activity_id}: replacement Activity missing ${replacementId}`);
      if(replacement.person_id!==live.person_id) throw new Error(`${item.activity_id}: replacement Person mismatch ${replacementId}`);
      if(replacementId===item.activity_id||retireIds.has(replacementId)) throw new Error(`${item.activity_id}: invalid replacement retirement cycle`);
    }
    if(!(p4.required_later_actions||[]).some((action)=>String(action).startsWith('RETIRE_'))) throw new Error(`${item.activity_id}: P4 retirement action missing`);
    if(item.relation_assignment_status!=='NOT_APPLICABLE_RETIRED_ACTIVITY'||!String(item.evidence_preservation||'').includes('IMMUTABLE_CORRECTION_AUDIT')) throw new Error(`${item.activity_id}: retirement evidence safety drift`);
  } else throw new Error(`${item.activity_id}: unsupported Batch 3 operation`);
}
if(seen.size!==10||relinks!==7||retirements!==3) throw new Error(`P6 Batch 3 aggregate drift cases=${seen.size} relinks=${relinks} retirements=${retirements}`);

const duplicateRefExpectations=new Map([
 ['80810807-0abb-5255-b40c-1945f4073eb1',1],
 ['c591bebb-90a3-5a96-90c5-9870ddd7f637',1],
 ['14113865-1569-521a-bae5-8ae070f4817d',1],
 ['8e0c3472-867d-5165-89c2-cb7866f6a5ed',1],
 ['986380c3-cc31-50d5-bb0d-6cae5fae0660',2],
 ['efc86adb-7fc7-5efe-9c4d-7cd8e224890f',1]
]);
let duplicateRefs=0;
for(const [polityId,expectedCount] of duplicateRefExpectations){
  const refs=(intake.activity_rows||[]).filter((r)=>r.polity_id===polityId).map((r)=>r.activity_id);
  if(refs.length!==expectedCount||refs.some((id)=>!relinkIds.has(id))) throw new Error(`duplicate Polity reference clearance frontier drift ${polityId}: ${JSON.stringify(refs)}`);
  duplicateRefs+=refs.length;
}
if(duplicateRefs!==7) throw new Error(`duplicate Polity Activity reference count drift ${duplicateRefs}`);

const combined=new Set([...batch1Ids,...batch2Ids,...seen]);
if(combined.size!==29||57-combined.size!==28) throw new Error(`P6 cumulative prebinding coverage drift total=${combined.size} remaining=${57-combined.size}`);
const result=plan.result||{};
if(Number(result.case_count)!==10||Number(result.polity_survivor_relink_count)!==7||Number(result.redundant_activity_retirement_count)!==3||Number(result.duplicate_polity_uuid_count)!==6||Number(result.duplicate_polity_activity_references_covered)!==7||Number(result.new_polity_uuid_bindings)!==0||Number(result.new_activity_uuid_assignments)!==0||Number(result.split_operations)!==0||Number(result.physical_person_merges)!==0||Number(result.cumulative_prebinding_activities)!==29||Number(result.remaining_correction_v2_frontier)!==28||result.production_executable!==false||result.production_mutation_authorized!==false) throw new Error('P6 Batch 3 result summary drift');

console.log(JSON.stringify({marker:'ATLAS_STAGE2_CORRECTION_V2_PREBINDING_BATCH3_OK',batch3_cases:10,polity_survivor_relinks:7,redundant_activity_retirements:3,duplicate_polity_uuids:6,duplicate_polity_activity_refs_covered:7,cumulative_prebinding_activities:29,remaining_correction_v2_frontier:28,new_uuid_assignments:0,physical_person_merges:0,production_executable:false,production_mutation_authorized:false},null,2));
