import fs from 'node:fs';

const intake = JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-intake.json','utf8'));
const manifest = JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-p5p6-execution-manifest.json','utf8'));
const plan = JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch1.v1.json','utf8'));
const contract = JSON.parse(fs.readFileSync('stage2/contracts/correction-v2-current.v1.json','utf8'));
const catalog = JSON.parse(fs.readFileSync('stage2/catalogs/relation-types.v1.json','utf8'));
const sourcePackage = JSON.parse(fs.readFileSync('stage2/authoring/p5-polity-relation-sources.v1.json','utf8'));
const requirements = JSON.parse(fs.readFileSync('requirements/atlas-requirements.v1.json','utf8'));
const authoringPackages = [
  'stage2/authoring/p5-polity-authoring-batch1-late-han.v1.json',
  'stage2/authoring/p5-polity-authoring-batch2-reviewed-polities.v1.json',
  'stage2/authoring/p5-polity-authoring-batch3-community-boundaries.v1.json'
].map((p)=>JSON.parse(fs.readFileSync(p,'utf8')));

const digest='sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const deployment='ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
if(intake?.schema!=='atlas-stage2-baseline-a-intake/v2'||intake.baseline_digest!==digest||intake.deployment_sha!==deployment) throw new Error('Baseline A intake drift');
if(manifest?.schema!=='atlas-stage2-baseline-a-p5p6-execution-manifest/v2'||Number(manifest.summary?.correction_v2_activity_count)!==57) throw new Error('Correction v2 frontier drift');
if(contract?.schema!=='atlas-stage2-correction-v2-contract/v1'||contract.status!=='P6_BRANCH_ONLY_CONTRACT_NO_PRODUCTION_MUTATION') throw new Error('Correction v2 contract drift');
if(plan?.schema!=='atlas-stage2-correction-v2-prebinding-plan/v1'||plan.status!=='PREBINDING_ONLY_NOT_PRODUCTION_EXECUTABLE'||plan.contract!=='stage2/contracts/correction-v2-current.v1.json'||plan.catalog!=='stage2/catalogs/relation-types.v1.json') throw new Error('Correction v2 plan contract linkage drift');
if(plan.baseline?.deployment_sha!==deployment||plan.baseline?.baseline_digest!==digest) throw new Error('Correction v2 plan Baseline A drift');
if(contract.manifest_layers?.prebinding_plan?.production_executable!==false||contract.manifest_layers?.execution_manifest?.identity_class_or_source_key_resolution_at_execution_forbidden!==true||contract.release_boundary?.production_mutation_authorized!==false) throw new Error('Correction v2 execution boundary drift');
if(contract.transaction?.isolation!=='serializable'||contract.transaction?.dry_run_required_before_real_apply!==true||contract.transaction?.all_operations_atomic!==true||contract.transaction?.immutable_audit_snapshot_required!==true||contract.transaction?.partial_commit_forbidden!==true) throw new Error('Correction v2 transaction safety drift');
if(contract.semantic_safety?.no_generic_relation_default!==true||contract.semantic_safety?.new_polity_not_resolved_by_name!==true||contract.semantic_safety?.source_not_resolved_by_url_or_title!==true||contract.semantic_safety?.split_fragment_sources_must_not_be_silently_dropped!==true||contract.semantic_safety?.physical_person_merge_before_p10_forbidden!==true) throw new Error('Correction v2 semantic safety drift');

const reqById=new Map((requirements.requirements||[]).map((r)=>[r.id,r]));
if(reqById.get('ATLAS-RQ-0215')?.status!=='PENDING'||reqById.get('ATLAS-RQ-0216')?.status!=='PENDING') throw new Error('P5/P6 Production requirements must remain pending during prebinding');

const relationByCode=new Map();
for(const row of catalog.person_polity_relation_types||[]) relationByCode.set(`person:${row.code}`,row.id);
for(const row of catalog.polity_relation_types||[]) relationByCode.set(`polity:${row.code}`,row.id);
const exactRelations={
  'person:rules':'7ca4de8f-01d4-542c-acc1-a06848c6742c',
  'person:serves':'0fc4827f-8543-52f7-9e9a-3173b0c698a7',
  'polity:nominally_subordinate_to':'375da950-65bc-5b81-a338-6c705f515120',
  'polity:vassal_of':'b4982965-848a-5a2b-b690-daba1d092d02'
};
for(const [key,id] of Object.entries(exactRelations)) if(relationByCode.get(key)!==id) throw new Error(`relation UUID drift ${key}`);

const preparedPolities=new Set();
for(const pkg of authoringPackages) for(const target of pkg.targets||[]) preparedPolities.add(target.identity_class);
if(preparedPolities.size!==24) throw new Error(`prepared Polity class drift ${preparedPolities.size}`);
const sourceCandidates=new Set((sourcePackage.sources||[]).map((s)=>s.candidate_key));
const sourceLinksByDecision=new Map();
for(const link of sourcePackage.links||[]){const arr=sourceLinksByDecision.get(link.relation_decision_id)||[];arr.push(link);sourceLinksByDecision.set(link.relation_decision_id,arr);}
const frontier=new Set((manifest.correction_activities||[]).map((row)=>row.activity_id));
const assertionByDecision=new Map((manifest.polity_relation_assertions||[]).map((row)=>[row.decision_id,row]));
const intakeByActivity=new Map((intake.activity_rows||[]).map((row)=>[row.activity_id,row]));

const beforeFields=plan.before_tuple_fields||[];
const expectedFields=['person_id','polity_id','role_id','period_basis_id','activity_start','activity_end','confidence','chronology_status','legacy_source_key','source_count'];
if(JSON.stringify(beforeFields)!==JSON.stringify(expectedFields)) throw new Error('Correction v2 exact before tuple contract drift');
const blockers=['P5_PRODUCTION_SCHEMA_NOT_APPLIED','P5_NEW_POLITY_UUIDS_NOT_ASSIGNED','NORMALIZED_ACTIVITY_SOURCE_UUID_BINDINGS_NOT_COMPLETE','NEW_SPLIT_FRAGMENT_ACTIVITY_UUIDS_NOT_ASSIGNED','PRODUCTION_RELEASE_NOT_AUTHORIZED'];
if(!blockers.every((b)=>(plan.common_execution_blockers||[]).includes(b))) throw new Error('Correction v2 execution blockers incomplete');
if(plan.source_preservation_policy?.silent_source_drop_forbidden!==true||!String(plan.source_preservation_policy?.split_activity||'').includes('COPY_ALL_EXISTING_ACTIVITY_SOURCE_LINKS')) throw new Error('Correction v2 source preservation policy drift');

const expectedTargets=new Map([
 ['15777776-b739-5988-9a04-472b2d6629c7','SOURCE_BACKED_YI_REGIONAL_POLITY'],
 ['d22767c7-4e64-5c59-a5d9-60e32d146a4c','SOURCE_BACKED_XU_TAO_QIAN_REGIONAL_POLITY'],
 ['b449d90d-783f-598b-aaeb-67cf37ea549a','SOURCE_BACKED_YOU_LIU_YU_REGIONAL_POLITY'],
 ['583d7e8d-ed63-5a7e-947a-2a3c43f8dfad','SOURCE_BACKED_JING_REGIONAL_POLITY'],
 ['c5481afc-4cf2-5516-aceb-254c5c95c58b','GONGSUN_ZAN_REGIONAL_POLITICAL_ACTOR'],
 ['a77a000e-2fec-5983-afb9-5d7dbc829223','HUAINAN_POLITICAL_ACTOR_UNDER_YING_BU'],
 ['d250fe38-6fa2-50f2-a902-0f4370022324','LI_KEYONG_POST907_JIN_POLITICAL_ACTOR'],
 ['2b566bc6-600a-5a75-bf32-60fe3e558bcd','ODA_NOBUNAGA_SOURCE_BACKED_TERRITORIAL_POLITICAL_ACTOR'],
 ['110c080c-b891-50a7-950c-1c80d3ef75b8','UESUGI_KENSHIN_SOURCE_BACKED_TERRITORIAL_POLITICAL_ACTOR']
]);
const splitIntervals=new Map([
 ['15777776-b739-5988-9a04-472b2d6629c7',[[188,190],[191,194]]],
 ['c5481afc-4cf2-5516-aceb-254c5c95c58b',[[191,192],[193,199]]],
 ['d250fe38-6fa2-50f2-a902-0f4370022324',[[881,907],[908,908]]]
]);

if(!Array.isArray(plan.cases)||plan.cases.length!==9) throw new Error('P6 Batch 1 case count drift');
const seen=new Set();let rewrites=0,splits=0,newFragments=0,assertions=0;const usedTargets=new Set(),usedSources=new Set();
for(const item of plan.cases){
  if(!expectedTargets.has(item.activity_id)||seen.has(item.activity_id)) throw new Error(`unexpected/duplicate P6 Activity ${item.activity_id}`);
  seen.add(item.activity_id);
  if(!frontier.has(item.activity_id)) throw new Error(`${item.activity_id}: outside 57-Activity frontier`);
  const live=intakeByActivity.get(item.activity_id);if(!live) throw new Error(`${item.activity_id}: missing Baseline A Activity`);
  if(!Array.isArray(item.expected_before)||item.expected_before.length!==beforeFields.length) throw new Error(`${item.activity_id}: before tuple shape drift`);
  for(let i=0;i<beforeFields.length;i++){const field=beforeFields[i];if(item.expected_before[i]!==live[field]) throw new Error(`${item.activity_id}: exact before-state drift ${field}`);}
  const targetClass=expectedTargets.get(item.activity_id);if(item.target_class!==targetClass||!preparedPolities.has(targetClass)) throw new Error(`${item.activity_id}: target class drift`);usedTargets.add(targetClass);

  if(item.type==='rewrite_activity'){
    rewrites++;
    if(!Array.isArray(item.relation)||item.relation[0]!=='rules'||item.relation[1]!==relationByCode.get('person:rules')) throw new Error(`${item.activity_id}: rewrite relation UUID drift`);
  } else if(item.type==='split_activity'){
    splits++;const fr=item.fragments||[];const expected=splitIntervals.get(item.activity_id);if(fr.length!==2||!expected) throw new Error(`${item.activity_id}: split shape drift`);
    if(fr[0][0]!=='existing_uuid'||fr[0][1]!==live.polity_id||fr[0][2]!=='serves'||fr[0][3]!==relationByCode.get('person:serves')||fr[0][4]!==expected[0][0]||fr[0][5]!==expected[0][1]||fr[0][6]!==item.activity_id) throw new Error(`${item.activity_id}: survivor fragment drift`);
    if(fr[1][0]!=='p5_identity_class'||fr[1][1]!==targetClass||fr[1][2]!=='rules'||fr[1][3]!==relationByCode.get('person:rules')||fr[1][4]!==expected[1][0]||fr[1][5]!==expected[1][1]||fr[1][6]!==null) throw new Error(`${item.activity_id}: new fragment drift`);
    if(fr[0][4]!==live.activity_start||fr[1][5]!==live.activity_end||fr[1][4]!==fr[0][5]+1) throw new Error(`${item.activity_id}: split coverage gap/overlap`);
    newFragments++;
  } else throw new Error(`${item.activity_id}: unsupported operation ${item.type}`);

  if(item.polity_relation){
    assertions++;const [decisionId,subjectClass,objectUuid,code,typeId,start,end,sourceKey]=item.polity_relation;
    const authoritative=assertionByDecision.get(decisionId);if(!authoritative) throw new Error(`${item.activity_id}: relation decision absent`);
    if(subjectClass!==targetClass||objectUuid!==authoritative.object?.polity_uuid||code!==authoritative.relation_type||typeId!==relationByCode.get(`polity:${code}`)||start!==authoritative.start?.year||end!==authoritative.end?.year) throw new Error(`${item.activity_id}: relation assertion drift`);
    if(!sourceCandidates.has(sourceKey)||!(sourceLinksByDecision.get(decisionId)||[]).some((link)=>link.source_candidate_key===sourceKey)) throw new Error(`${item.activity_id}: prepared relation Source linkage missing`);
    usedSources.add(sourceKey);
  }
}
if(seen.size!==9||rewrites!==6||splits!==3||newFragments!==3||assertions!==6||usedTargets.size!==9||usedSources.size!==4) throw new Error(`P6 Batch 1 aggregate drift cases=${seen.size} rewrites=${rewrites} splits=${splits} assertions=${assertions} targets=${usedTargets.size} sources=${usedSources.size}`);
const result=plan.result||{};
if(Number(result.case_count)!==9||Number(result.rewrite_activity_count)!==6||Number(result.split_activity_count)!==3||Number(result.new_activity_fragment_uuid_assignments)!==0||Number(result.new_polity_classes_referenced)!==9||Number(result.new_polity_uuid_bindings)!==0||Number(result.polity_relation_assertion_count)!==6||Number(result.polity_relation_uuid_assignments)!==0||Number(result.relation_source_candidate_keys_used)!==4||result.production_executable!==false||result.production_mutation_authorized!==false) throw new Error('P6 Batch 1 result summary drift');

console.log(JSON.stringify({marker:'ATLAS_STAGE2_CORRECTION_V2_PREBINDING_BATCH1_OK',cases:9,rewrite_activities:6,split_activities:3,new_activity_uuid_assignments:0,new_polity_classes:9,new_polity_uuid_bindings:0,polity_relation_assertions:6,relation_source_candidates_used:4,exact_relation_type_uuid_bindings:true,production_executable:false,production_mutation_authorized:false},null,2));
