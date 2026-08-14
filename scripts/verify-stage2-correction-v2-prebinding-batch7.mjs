import fs from 'node:fs';

const intake=JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-intake.json','utf8'));
const ledger=JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-master-ledger.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-p5p6-execution-manifest.json','utf8'));
const batch1=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch1.v1.json','utf8'));
const batch2=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch2.v1.json','utf8'));
const batch3=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch3.v1.json','utf8'));
const batch4=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch4.v1.json','utf8'));
const batch5=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch5.v1.json','utf8'));
const batch6=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch6.v1.json','utf8'));
const plan=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch7.v1.json','utf8'));
const contract=JSON.parse(fs.readFileSync('stage2/contracts/correction-v2-current.v1.json','utf8'));
const catalog=JSON.parse(fs.readFileSync('stage2/catalogs/relation-types.v1.json','utf8'));
const p5Polities=JSON.parse(fs.readFileSync('stage2/authoring/p5-polity-authoring-batch1-late-han.v1.json','utf8'));
const p5Sources=JSON.parse(fs.readFileSync('stage2/authoring/p5-polity-relation-sources.v1.json','utf8'));
const sourceResearch=JSON.parse(fs.readFileSync('research/residual/stage2-baseline-a-residual-22-resolution.v1.json','utf8'));
const requirements=JSON.parse(fs.readFileSync('requirements/atlas-requirements.v1.json','utf8'));

const digest='sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const deployment='ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
const activityId='f427a8d8-2e3f-5dbd-a00e-ff8585dc5ae4';
const hanzhongUuid='dba36ddf-d186-53b4-bba9-d0aff581eeda';
const yiClass='SOURCE_BACKED_YI_REGIONAL_POLITY';

if(intake?.schema!=='atlas-stage2-baseline-a-intake/v2'||intake.baseline_digest!==digest||intake.deployment_sha!==deployment) throw new Error('Baseline A intake drift');
if(ledger?.schema!=='atlas-stage2-baseline-a-master-ledger/v2'||ledger.baseline?.baseline_digest!==digest) throw new Error('Baseline A ledger drift');
if(manifest?.schema!=='atlas-stage2-baseline-a-p5p6-execution-manifest/v2'||Number(manifest.summary?.correction_v2_activity_count)!==57) throw new Error('Correction v2 frontier drift');
if(contract?.schema!=='atlas-stage2-correction-v2-contract/v1'||contract.status!=='P6_BRANCH_ONLY_CONTRACT_NO_PRODUCTION_MUTATION'||contract.release_boundary?.production_mutation_authorized!==false) throw new Error('Correction v2 contract drift');
if(contract.manifest_layers?.prebinding_plan?.exact_baseline_before_state_required!==true||contract.operation_types?.split_activity?.survivor_fragment_preserves_original_activity_uuid!==true||contract.operation_types?.split_activity?.new_fragment_activity_uuids_required_in_execution_manifest!==true||contract.operation_types?.split_activity?.existing_source_links_copy_policy_required!==true||contract.operation_types?.split_activity?.overlap_or_gap_requires_explicit_reviewed_policy!==true) throw new Error('Correction v2 split contract drift');
if(plan?.schema!=='atlas-stage2-correction-v2-prebinding-plan/v1'||plan.batch_id!=='p6_correction_v2_prebinding_batch7_zhang_lu_yi_service_hanzhong_rule_split'||plan.status!=='PREBINDING_ONLY_NOT_PRODUCTION_EXECUTABLE') throw new Error('P6 Batch 7 plan drift');
if(plan.contract!=='stage2/contracts/correction-v2-current.v1.json'||plan.catalog!=='stage2/catalogs/relation-types.v1.json'||plan.p5_polity_authoring!=='stage2/authoring/p5-polity-authoring-batch1-late-han.v1.json'||plan.p5_relation_sources!=='stage2/authoring/p5-polity-relation-sources.v1.json'||plan.source_research!=='research/residual/stage2-baseline-a-residual-22-resolution.v1.json'||plan.baseline?.deployment_sha!==deployment||plan.baseline?.baseline_digest!==digest) throw new Error('P6 Batch 7 linkage drift');

const scope=plan.scope_rules||{};
if(scope.existing_hanzhong_uuid_survivor_required!==true||scope.prepared_yi_identity_class_may_be_referenced_with_null_uuid!==true||scope.new_polity_uuid_assignment_forbidden_in_this_batch!==true||scope.survivor_fragment_preserves_original_activity_uuid!==true||scope.new_split_fragment_activity_uuid_must_remain_null!==true||scope.reviewed_person_relation_uuid_required!==true||scope.reviewed_polity_relation_uuid_may_be_prebound_but_assertion_requires_object_and_source_uuid!==true||scope.later_superior_relation_default_forbidden!==true||scope.production_mutation_authorized!==false) throw new Error('P6 Batch 7 scope safety drift');
const blockers=['P5_PRODUCTION_SCHEMA_NOT_APPLIED','P5_YI_POLITY_UUID_NOT_ASSIGNED','NEW_SPLIT_FRAGMENT_ACTIVITY_UUID_NOT_ASSIGNED','NORMALIZED_ACTIVITY_SOURCE_UUID_BINDINGS_NOT_COMPLETE','P5_RELATION_SOURCE_UUID_NOT_ASSIGNED','POLITY_RELATION_ASSERTION_DEFERRED_UNTIL_EXACT_OBJECT_AND_SOURCE_UUIDS_EXIST','PRODUCTION_RELEASE_NOT_AUTHORIZED'];
if(!blockers.every((b)=>(plan.common_execution_blockers||[]).includes(b))) throw new Error('P6 Batch 7 execution blockers incomplete');
if(plan.source_preservation_policy?.silent_source_drop_forbidden!==true||!String(plan.source_preservation_policy?.split_activity||'').includes('COPY_ALL_EXISTING_ACTIVITY_SOURCE_LINKS')||!String(plan.source_preservation_policy?.polity_relation_assertion||'').includes('REQUIRE_ASSIGNED_SOURCE_UUID')) throw new Error('P6 Batch 7 source preservation drift');

const reqById=new Map((requirements.requirements||[]).map((r)=>[r.id,r]));
if(reqById.get('ATLAS-RQ-0215')?.status!=='PENDING'||reqById.get('ATLAS-RQ-0216')?.status!=='PENDING') throw new Error('P5/P6 Production requirements must remain pending');

const beforeFields=plan.before_tuple_fields||[];
const expectedFields=['person_id','polity_id','role_id','period_basis_id','activity_start','activity_end','confidence','chronology_status','legacy_source_key','source_count'];
if(JSON.stringify(beforeFields)!==JSON.stringify(expectedFields)) throw new Error('P6 Batch 7 before tuple field drift');
const intakeByActivity=new Map((intake.activity_rows||[]).map((r)=>[r.activity_id,r]));
const ledgerByActivity=new Map((ledger.rows||[]).map((r)=>[r.activity_id,r]));
const frontier=new Set((manifest.correction_activities||[]).map((r)=>r.activity_id));
const earlierIds=new Set([...(batch1.cases||[]).map((r)=>r.activity_id),...(batch2.cases||[]).map((r)=>r.activity_id),...(batch3.cases||[]).map((r)=>r.activity_id),...(batch4.cases||[]).map((r)=>r.activity_id),...(batch5.cases||[]).map((r)=>r.activity_id),...(batch6.cases||[]).map((r)=>r.activity_id)]);
if(earlierIds.size!==42) throw new Error(`P6 Batch 1-6 coverage drift ${earlierIds.size}`);

if(!Array.isArray(plan.cases)||plan.cases.length!==1) throw new Error('P6 Batch 7 case count drift');
const item=plan.cases[0];
if(item.activity_id!==activityId||item.person!=='Zhang Lu'||earlierIds.has(activityId)||!frontier.has(activityId)) throw new Error('Zhang Lu Batch 7 scope drift');
if(item.type!=='split_activity'||item.mode!=='existing_uuid_survivor_plus_prepared_null_uuid_service_fragment') throw new Error('Zhang Lu Batch 7 operation drift');
const live=intakeByActivity.get(activityId);const row=ledgerByActivity.get(activityId);
if(!live||!row||row.person?.canonical!=='Zhang Lu'||row.polity?.uuid!==hanzhongUuid) throw new Error('Zhang Lu Baseline A row missing/drifted');
if(!Array.isArray(item.expected_before)||item.expected_before.length!==beforeFields.length) throw new Error('Zhang Lu before tuple shape drift');
for(let i=0;i<beforeFields.length;i++){const field=beforeFields[i];if(item.expected_before[i]!==live[field]) throw new Error(`Zhang Lu exact before-state drift ${field}`);}

const p4=row.audit?.polity_identity_decision;
if(!p4||p4.id!=='zhang_lu_hanzhong_identity_normalization'||item.p4_decision_id!==p4.id||p4.status!=='P4_IDENTITY_DECIDED_IMPLEMENTATION_PENDING'||p4.target_disposition!=='REUSE_CURRENT_UUID'||p4.target_polity_uuid!==hanzhongUuid||p4.target_identity_class!=='ZHANG_LU_HANZHONG_POLITICAL_ACTOR'||p4.production_mutation_authorized!==false) throw new Error('Zhang Lu P4 identity overlay drift');
if(JSON.stringify(item.p4_companion_actions||[])!==JSON.stringify(p4.required_later_actions||[])) throw new Error('Zhang Lu P4 companion actions drift');

const p3=row.audit?.polity_relation_decision;
if(!p3||p3.id!=='zhang_lu_initial_yi_subordination_policy'||item.p3_relation_decision_id!==p3.id||p3.status!=='P3_POLITY_RELATION_MODEL_DECIDED_IMPLEMENTATION_PENDING'||p3.model_decision!=='INITIAL_HANZHONG_POLITY_SUBORDINATION_TO_LIU_YAN_YI_AUTHORITY_THEN_NO_CONTINUOUS_DEFAULT'||p3.production_mutation_authorized!==false) throw new Error('Zhang Lu P3 relation policy drift');
if(JSON.stringify(item.p3_companion_actions||[])!==JSON.stringify(p3.required_later_actions||[])) throw new Error('Zhang Lu P3 companion actions drift');
if((p3.relation_assertions||[]).length!==1) throw new Error('Zhang Lu reviewed Polity relation assertion count drift');
const reviewedAssertion=p3.relation_assertions[0];
if(reviewedAssertion.relation_type!=='nominally_subordinate_to'||reviewedAssertion.subject?.kind!=='existing_polity'||reviewedAssertion.subject?.polity_uuid!==hanzhongUuid||reviewedAssertion.object?.kind!=='new_polity'||reviewedAssertion.object?.identity_class!==yiClass||reviewedAssertion.object?.polity_uuid!==null||reviewedAssertion.start?.year!==191||reviewedAssertion.start?.granularity!=='year'||reviewedAssertion.start?.certainty!=='exact'||reviewedAssertion.end?.year!==194||reviewedAssertion.end?.granularity!=='year'||reviewedAssertion.end?.certainty!=='exact'||reviewedAssertion.source_normalization_status!=='P5_P7_SOURCE_AUTHORING_REQUIRED') throw new Error('Zhang Lu reviewed initial Yi relation drift');
if(p3.relation_policy!=='NO_CONTINUOUS_LIU_ZHANG_OR_EASTERN_HAN_SUPERIOR_RELATION_AFTER_REVIEWED_INITIAL_PHASE_WITHOUT_SEPARATE_EVIDENCE') throw new Error('Zhang Lu later superior relation policy drift');

if(item.source_contract!==p4.source_contract||item.source_contract!==p3.source_contract||!fs.existsSync(item.source_contract)) throw new Error('Zhang Lu source contract linkage drift');
if(sourceResearch?.schema!=='atlas-stage2-baseline-a-residual-research-resolution/v1'||sourceResearch.status!=='P3_HISTORICAL_RESEARCH_CLOSED_NO_PRODUCTION_MUTATION'||sourceResearch.baseline_digest!==digest||sourceResearch.rules?.production_mutation_authorized!==false) throw new Error('Zhang Lu source research drift');
const sourceCase=(sourceResearch.cases||[]).find((c)=>c.activity_id===activityId);
if(!sourceCase||sourceCase.person!=='Zhang Lu'||sourceCase.current_polity_uuid!==hanzhongUuid||sourceCase.decision!=='NORMALIZE_HANZHONG_POLITICAL_ACTOR_AND_PHASE_INITIAL_SERVICE'||sourceCase.relation_hint!=='serves→rules'||sourceCase.target_polity_uuid!==hanzhongUuid||sourceCase.target_class!=='ZHANG_LU_HANZHONG_POLITICAL_ACTOR'||sourceCase.temporal_action!=='split_initial_commission_from_independent_rule') throw new Error('Zhang Lu reviewed source case drift');

if(p5Polities?.schema!=='atlas-stage2-p5-polity-authoring-package/v1'||p5Polities.status!=='REVIEWED_AUTHORING_PREP_NO_UUID_NO_PRODUCTION_MUTATION'||p5Polities.rules?.production_mutation_authorized!==false) throw new Error('P5 late-Han authoring package drift');
const yiTarget=(p5Polities.targets||[]).find((t)=>t.identity_class===yiClass);
if(!yiTarget||yiTarget.polity_uuid!==null||yiTarget.baseline_absence_verified!==true||yiTarget.proposed_catalog_label!=='Liu Yan Yi authority'||yiTarget.semantic_name_kind!=='editorial_catalog_label'||yiTarget.historical_name_claim!==false||yiTarget.relation_decision_id!=='liu_yan_yi_nominal_han_relation'||yiTarget.territory_geometry_status!=='P14_DEFERRED') throw new Error('P5 Yi authority target drift');

const relationByCode=new Map((catalog.person_polity_relation_types||[]).map((r)=>[r.code,r.id]));
const polityRelationByCode=new Map((catalog.polity_relation_types||[]).map((r)=>[r.code,r.id]));
if(relationByCode.get('serves')!=='0fc4827f-8543-52f7-9e9a-3173b0c698a7'||relationByCode.get('rules')!=='7ca4de8f-01d4-542c-acc1-a06848c6742c'||polityRelationByCode.get('nominally_subordinate_to')!=='375da950-65bc-5b81-a338-6c705f515120') throw new Error('Zhang Lu exact relation UUID drift');

const sourceCandidate=(p5Sources.sources||[]).find((s)=>s.candidate_key==='bibliographic:ctext:zhang-lu-primary-passage');
const sourceLink=(p5Sources.links||[]).find((l)=>l.relation_decision_id==='zhang_lu_initial_yi_subordination_policy');
if(!sourceCandidate||sourceCandidate.source_uuid!==null||sourceCandidate.canonical_url!=='https://ctext.org/text.pl?if=gb&node=602325&show=parallel'||sourceCandidate.sha256!==null||sourceCandidate.bytes!==null) throw new Error('Zhang Lu P5 relation Source candidate drift');
if(!sourceLink||sourceLink.relation_type!=='nominally_subordinate_to'||sourceLink.source_candidate_key!==sourceCandidate.candidate_key||sourceLink.source_locator_key!=='Reviewed Zhang Lu passage: Liu Yan commission into Hanzhong and subsequent independent rule') throw new Error('Zhang Lu P5 relation Source link drift');

if(item.survivor_fragment_id!=='zhang_lu_195_215_hanzhong_rule'||!Array.isArray(item.fragments)||item.fragments.length!==2) throw new Error('Zhang Lu fragment declaration drift');
const [service,rule]=item.fragments;
if(service.id!=='zhang_lu_191_194_yi_service'||service.activity_uuid!==null||service.target_polity_uuid!==null||service.target_identity_class!==yiClass||JSON.stringify(service.relation)!==JSON.stringify(['serves','0fc4827f-8543-52f7-9e9a-3173b0c698a7'])||service.start_year!==191||service.end_year!==194||service.temporal_policy!=='REVIEWED_INITIAL_COMMISSION_PHASE_191_194_YEAR_LEVEL') throw new Error('Zhang Lu initial Yi service fragment drift');
if(rule.id!=='zhang_lu_195_215_hanzhong_rule'||rule.activity_uuid!==activityId||rule.target_polity_uuid!==hanzhongUuid||rule.target_identity_class!=='ZHANG_LU_HANZHONG_POLITICAL_ACTOR'||JSON.stringify(rule.relation)!==JSON.stringify(['rules','7ca4de8f-01d4-542c-acc1-a06848c6742c'])||rule.start_year!==195||rule.end_year!==215||rule.temporal_policy!=='REVIEWED_COMPLEMENT_AFTER_INITIAL_SUBORDINATION_PHASE_YEAR_LEVEL') throw new Error('Zhang Lu Hanzhong rule survivor fragment drift');
if(item.overlap_gap_policy!=='NO_YEAR_GAP_OR_OVERLAP; 191_194_INITIAL_SERVICE_AND_195_215_HANZHONG_RULE ARE YEAR_LEVEL PHASES') throw new Error('Zhang Lu overlap/gap policy drift');

const handoff=item.polity_relation_handoff||{};
if(handoff.relation_decision_id!=='zhang_lu_initial_yi_subordination_policy'||handoff.status!=='REVIEWED_ASSERTION_PREBOUND_PENDING_EXACT_YI_AND_SOURCE_UUIDS'||handoff.subject_polity_uuid!==hanzhongUuid||handoff.object_identity_class!==yiClass||handoff.object_polity_uuid!==null||handoff.relation_type_code!=='nominally_subordinate_to'||handoff.relation_type_uuid!=='375da950-65bc-5b81-a338-6c705f515120'||handoff.start_year!==191||handoff.end_year!==194||handoff.source_candidate_key!==sourceCandidate.candidate_key||handoff.source_uuid!==null||handoff.source_locator_key!==sourceLink.source_locator_key||handoff.later_relation_policy!==p3.relation_policy) throw new Error('Zhang Lu Polity relation handoff drift');
for(const blocker of ['P5_YI_POLITY_UUID_NOT_ASSIGNED','P5_RELATION_SOURCE_UUID_NOT_ASSIGNED']) if(!(handoff.execution_blockers||[]).includes(blocker)) throw new Error(`Zhang Lu relation handoff missing blocker ${blocker}`);

const combined=new Set([...earlierIds,activityId]);
if(combined.size!==43||57-combined.size!==14) throw new Error(`P6 cumulative prebinding coverage drift total=${combined.size} remaining=${57-combined.size}`);
const result=plan.result||{};
if(Number(result.case_count)!==1||Number(result.split_activity_count)!==1||Number(result.existing_polity_uuid_survivor_targets)!==1||Number(result.prepared_null_uuid_polity_fragments)!==1||Number(result.reviewed_exact_person_relation_bindings)!==2||Number(result.reviewed_polity_relation_handoffs)!==1||Number(result.polity_relation_assertions_executable_in_batch)!==0||Number(result.new_polity_uuid_bindings)!==0||Number(result.new_activity_fragment_uuid_assignments)!==0||Number(result.cumulative_prebinding_activities)!==43||Number(result.remaining_correction_v2_frontier)!==14||result.production_executable!==false||result.production_mutation_authorized!==false) throw new Error('P6 Batch 7 result summary drift');

console.log(JSON.stringify({marker:'ATLAS_STAGE2_CORRECTION_V2_PREBINDING_BATCH7_OK',batch7_cases:1,batch7_splits:1,existing_hanzhong_uuid_survivors:1,prepared_null_uuid_yi_fragments:1,reviewed_exact_person_relations:2,reviewed_polity_relation_handoffs:1,polity_relation_assertions_executable_in_batch:0,new_activity_fragment_uuid_assignments:0,cumulative_prebinding_activities:43,remaining_correction_v2_frontier:14,production_executable:false,production_mutation_authorized:false},null,2));
