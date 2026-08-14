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
const batch7=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch7.v1.json','utf8'));
const plan=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch8.v1.json','utf8'));
const contract=JSON.parse(fs.readFileSync('stage2/contracts/correction-v2-current.v1.json','utf8'));
const catalog=JSON.parse(fs.readFileSync('stage2/catalogs/relation-types.v1.json','utf8'));
const p5Polities=JSON.parse(fs.readFileSync('stage2/authoring/p5-polity-authoring-batch1-late-han.v1.json','utf8'));
const p5Sources=JSON.parse(fs.readFileSync('stage2/authoring/p5-polity-relation-sources.v1.json','utf8'));
const sourceResearch=JSON.parse(fs.readFileSync('research/china/stage2-regional-authority-target-phase-decisions.v1.json','utf8'));
const requirements=JSON.parse(fs.readFileSync('requirements/atlas-requirements.v1.json','utf8'));

const digest='sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const deployment='ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
const activityId='36a3ade9-b108-5358-8732-be7b3f6637f9';
const easternHanUuid='3a29a08a-d111-50d5-916f-f5c11b5eabaf';
const jiClass='SOURCE_BACKED_JI_CENTERED_YUAN_SHAO_REGIONAL_POLITY';

if(intake?.schema!=='atlas-stage2-baseline-a-intake/v2'||intake.baseline_digest!==digest||intake.deployment_sha!==deployment) throw new Error('Baseline A intake drift');
if(ledger?.schema!=='atlas-stage2-baseline-a-master-ledger/v2'||ledger.baseline?.baseline_digest!==digest) throw new Error('Baseline A ledger drift');
if(manifest?.schema!=='atlas-stage2-baseline-a-p5p6-execution-manifest/v2'||Number(manifest.summary?.correction_v2_activity_count)!==57) throw new Error('Correction v2 frontier drift');
if(contract?.schema!=='atlas-stage2-correction-v2-contract/v1'||contract.status!=='P6_BRANCH_ONLY_CONTRACT_NO_PRODUCTION_MUTATION'||contract.release_boundary?.production_mutation_authorized!==false) throw new Error('Correction v2 contract drift');
if(contract.manifest_layers?.prebinding_plan?.exact_baseline_before_state_required!==true||contract.operation_types?.split_activity?.survivor_fragment_preserves_original_activity_uuid!==true||contract.operation_types?.split_activity?.new_fragment_activity_uuids_required_in_execution_manifest!==true||contract.operation_types?.split_activity?.existing_source_links_copy_policy_required!==true||contract.operation_types?.split_activity?.overlap_or_gap_requires_explicit_reviewed_policy!==true) throw new Error('Correction v2 split contract drift');
if(plan?.schema!=='atlas-stage2-correction-v2-prebinding-plan/v1'||plan.batch_id!=='p6_correction_v2_prebinding_batch8_yuan_shao_early_han_context_ji_rule_split'||plan.status!=='PREBINDING_ONLY_NOT_PRODUCTION_EXECUTABLE') throw new Error('P6 Batch 8 plan drift');
if(plan.contract!=='stage2/contracts/correction-v2-current.v1.json'||plan.catalog!=='stage2/catalogs/relation-types.v1.json'||plan.p5_polity_authoring!=='stage2/authoring/p5-polity-authoring-batch1-late-han.v1.json'||plan.p5_relation_sources!=='stage2/authoring/p5-polity-relation-sources.v1.json'||plan.source_research!=='research/china/stage2-regional-authority-target-phase-decisions.v1.json'||plan.baseline?.deployment_sha!==deployment||plan.baseline?.baseline_digest!==digest) throw new Error('P6 Batch 8 linkage drift');

const scope=plan.scope_rules||{};
if(scope.existing_eastern_han_survivor_fragment_allowed!==true||scope.prepared_ji_identity_class_may_be_referenced_with_null_uuid!==true||scope.new_polity_uuid_assignment_forbidden_in_this_batch!==true||scope.survivor_fragment_preserves_original_activity_uuid!==true||scope.new_split_fragment_activity_uuid_must_remain_null!==true||scope.reviewed_regional_person_relation_uuid_required!==true||scope.unreviewed_early_person_relation_must_remain_null!==true||scope.reviewed_polity_relation_uuid_may_be_prebound_but_assertion_requires_subject_and_source_uuid!==true||scope.territory_geometry_mutation_forbidden!==true||scope.production_mutation_authorized!==false) throw new Error('P6 Batch 8 scope safety drift');
const blockers=['P5_PRODUCTION_SCHEMA_NOT_APPLIED','P5_YUAN_SHAO_JI_POLITY_UUID_NOT_ASSIGNED','NEW_SPLIT_FRAGMENT_ACTIVITY_UUID_NOT_ASSIGNED','EARLY_189_190_PERSON_RELATION_REVIEW_NOT_COMPLETE','NORMALIZED_ACTIVITY_SOURCE_UUID_BINDINGS_NOT_COMPLETE','P5_RELATION_SOURCE_UUID_NOT_ASSIGNED','POLITY_RELATION_ASSERTION_DEFERRED_UNTIL_EXACT_SUBJECT_AND_SOURCE_UUIDS_EXIST','PRODUCTION_RELEASE_NOT_AUTHORIZED'];
if(!blockers.every((b)=>(plan.common_execution_blockers||[]).includes(b))) throw new Error('P6 Batch 8 execution blockers incomplete');
if(plan.source_preservation_policy?.silent_source_drop_forbidden!==true||!String(plan.source_preservation_policy?.split_activity||'').includes('COPY_ALL_EXISTING_ACTIVITY_SOURCE_LINKS')||!String(plan.source_preservation_policy?.polity_relation_assertion||'').includes('REQUIRE_ASSIGNED_SOURCE_UUID')) throw new Error('P6 Batch 8 source preservation drift');

const reqById=new Map((requirements.requirements||[]).map((r)=>[r.id,r]));
if(reqById.get('ATLAS-RQ-0215')?.status!=='PENDING'||reqById.get('ATLAS-RQ-0216')?.status!=='PENDING') throw new Error('P5/P6 Production requirements must remain pending');

const beforeFields=plan.before_tuple_fields||[];
const expectedFields=['person_id','polity_id','role_id','period_basis_id','activity_start','activity_end','confidence','chronology_status','legacy_source_key','source_count'];
if(JSON.stringify(beforeFields)!==JSON.stringify(expectedFields)) throw new Error('P6 Batch 8 before tuple field drift');
const intakeByActivity=new Map((intake.activity_rows||[]).map((r)=>[r.activity_id,r]));
const ledgerByActivity=new Map((ledger.rows||[]).map((r)=>[r.activity_id,r]));
const frontier=new Set((manifest.correction_activities||[]).map((r)=>r.activity_id));
const earlierIds=new Set([...(batch1.cases||[]).map((r)=>r.activity_id),...(batch2.cases||[]).map((r)=>r.activity_id),...(batch3.cases||[]).map((r)=>r.activity_id),...(batch4.cases||[]).map((r)=>r.activity_id),...(batch5.cases||[]).map((r)=>r.activity_id),...(batch6.cases||[]).map((r)=>r.activity_id),...(batch7.cases||[]).map((r)=>r.activity_id)]);
if(earlierIds.size!==43) throw new Error(`P6 Batch 1-7 coverage drift ${earlierIds.size}`);

if(!Array.isArray(plan.cases)||plan.cases.length!==1) throw new Error('P6 Batch 8 case count drift');
const item=plan.cases[0];
if(item.activity_id!==activityId||item.person!=='Yuan Shao'||earlierIds.has(activityId)||!frontier.has(activityId)) throw new Error('Yuan Shao Batch 8 scope drift');
if(item.type!=='split_activity'||item.mode!=='existing_uuid_early_context_survivor_plus_prepared_null_uuid_regional_rule_fragment') throw new Error('Yuan Shao Batch 8 operation drift');
const live=intakeByActivity.get(activityId);const row=ledgerByActivity.get(activityId);
if(!live||!row||row.person?.canonical!=='Yuan Shao'||row.polity?.uuid!==easternHanUuid) throw new Error('Yuan Shao Baseline A row missing/drifted');
if(!Array.isArray(item.expected_before)||item.expected_before.length!==beforeFields.length) throw new Error('Yuan Shao before tuple shape drift');
for(let i=0;i<beforeFields.length;i++){const field=beforeFields[i];if(item.expected_before[i]!==live[field]) throw new Error(`Yuan Shao exact before-state drift ${field}`);}

if(row.audit?.polity_identity_decision!==undefined&&row.audit?.polity_identity_decision!==null) throw new Error('Yuan Shao must not invent a P4 identity decision');
if(item.p4_identity_decision_expected!==null) throw new Error('Yuan Shao Batch 8 P4 expectation drift');

const p3=row.audit?.polity_relation_decision;
if(!p3||p3.id!=='yuan_shao_ji_nominal_han_relation'||item.p3_relation_decision_id!==p3.id||p3.status!=='P3_POLITY_RELATION_MODEL_DECIDED_IMPLEMENTATION_PENDING'||p3.model_decision!=='SPLIT_EARLY_HAN_CONTEXT_AND_JI_REGIONAL_POLITY_WITH_NOMINAL_HAN_RELATION'||p3.production_mutation_authorized!==false) throw new Error('Yuan Shao P3 relation policy drift');
if(JSON.stringify(item.p3_companion_actions||[])!==JSON.stringify(p3.required_later_actions||[])) throw new Error('Yuan Shao P3 companion actions drift');
if((p3.relation_assertions||[]).length!==1||(p3.new_polity_targets||[]).length!==1) throw new Error('Yuan Shao P3 assertion/target count drift');
const reviewedAssertion=p3.relation_assertions[0];
if(reviewedAssertion.relation_type!=='nominally_subordinate_to'||reviewedAssertion.subject?.kind!=='new_polity'||reviewedAssertion.subject?.identity_class!==jiClass||reviewedAssertion.subject?.polity_uuid!==null||reviewedAssertion.object?.kind!=='existing_polity'||reviewedAssertion.object?.polity_uuid!==easternHanUuid||reviewedAssertion.start?.year!==191||reviewedAssertion.start?.granularity!=='year'||reviewedAssertion.start?.certainty!=='exact'||reviewedAssertion.end?.year!==202||reviewedAssertion.end?.granularity!=='year'||reviewedAssertion.end?.certainty!=='exact'||reviewedAssertion.source_normalization_status!=='P5_P7_SOURCE_AUTHORING_REQUIRED') throw new Error('Yuan Shao reviewed nominal Han relation drift');
const p3Target=p3.new_polity_targets[0];
if(p3Target.identity_class!==jiClass||p3Target.polity_uuid!==null||p3Target.verified_absent_from_baseline_a!==true) throw new Error('Yuan Shao P3 new Polity target drift');

if(item.source_contract!==p3.source_contract||!fs.existsSync(item.source_contract)) throw new Error('Yuan Shao source contract linkage drift');
if(sourceResearch?.schema!=='atlas-stage2-regional-authority-target-phase-research/v1'||sourceResearch.status!=='RESEARCH_REVIEWED_NO_PRODUCTION_WRITE'||sourceResearch.invariants?.fabricated_polity_names_created!==false||sourceResearch.invariants?.fabricated_geometry_created!==false) throw new Error('Yuan Shao source research drift');
const researchDecision=(sourceResearch.decisions||[]).find((d)=>d.person==='Yuan Shao');
if(!researchDecision||researchDecision.current_activity_uuid_evidence_only!==activityId||researchDecision.current_row_disposition!=='SPLIT_REQUIRED'||!Array.isArray(researchDecision.phases)||researchDecision.phases.length!==2||researchDecision.four_province_geometry_from_191_forbidden!==true||researchDecision.you_full_control_before_199_forbidden!==true) throw new Error('Yuan Shao reviewed phase research drift');
const [earlyPhase,regionalPhase]=researchDecision.phases;
if(earlyPhase.start_year!==189||earlyPhase.end_year!==190||earlyPhase.target_class!=='EASTERN_HAN_CONTEXT'||earlyPhase.person_relation!==null||earlyPhase.relation_status!=='PENDING_ROLE_RELATION_INTEGRATION') throw new Error('Yuan Shao early Han phase drift');
if(regionalPhase.start_year!==191||regionalPhase.end_year!==202||regionalPhase.target_class!==jiClass||regionalPhase.production_polity_uuid!==null||regionalPhase.person_relation!=='rules'||regionalPhase.structural_relation?.type!=='nominally_subordinate_to'||regionalPhase.structural_relation?.target!=='Eastern Han') throw new Error('Yuan Shao Ji phase drift');

if(p5Polities?.schema!=='atlas-stage2-p5-polity-authoring-package/v1'||p5Polities.status!=='REVIEWED_AUTHORING_PREP_NO_UUID_NO_PRODUCTION_MUTATION'||p5Polities.rules?.production_mutation_authorized!==false) throw new Error('P5 late-Han authoring package drift');
const jiTarget=(p5Polities.targets||[]).find((t)=>t.identity_class===jiClass);
if(!jiTarget||jiTarget.polity_uuid!==null||jiTarget.baseline_absence_verified!==true||jiTarget.proposed_catalog_label!=='Yuan Shao Ji authority'||jiTarget.semantic_name_kind!=='editorial_catalog_label'||jiTarget.historical_name_claim!==false||jiTarget.relation_decision_id!=='yuan_shao_ji_nominal_han_relation'||jiTarget.territory_geometry_status!=='P14_DEFERRED') throw new Error('P5 Yuan Shao Ji target drift');

const relationByCode=new Map((catalog.person_polity_relation_types||[]).map((r)=>[r.code,r.id]));
const polityRelationByCode=new Map((catalog.polity_relation_types||[]).map((r)=>[r.code,r.id]));
if(relationByCode.get('rules')!=='7ca4de8f-01d4-542c-acc1-a06848c6742c'||polityRelationByCode.get('nominally_subordinate_to')!=='375da950-65bc-5b81-a338-6c705f515120') throw new Error('Yuan Shao exact relation UUID drift');

const sourceCandidate=(p5Sources.sources||[]).find((s)=>s.candidate_key==='bibliographic:ctext:hou-hanshu-yuan-shao');
const sourceLink=(p5Sources.links||[]).find((l)=>l.relation_decision_id==='yuan_shao_ji_nominal_han_relation');
if(!sourceCandidate||sourceCandidate.source_uuid!==null||sourceCandidate.canonical_url!=='https://ctext.org/hou-han-shu/yuan-shao-liu-biao-lie-zhuan-shang/zh'||sourceCandidate.sha256!==null||sourceCandidate.bytes!==null) throw new Error('Yuan Shao P5 relation Source candidate drift');
if(!sourceLink||sourceLink.relation_type!=='nominally_subordinate_to'||sourceLink.source_candidate_key!==sourceCandidate.candidate_key||sourceLink.source_locator_key!=='Yuan Shao biography: 191 Ji takeover and Han-derived northern offices through 202') throw new Error('Yuan Shao P5 relation Source link drift');

if(item.survivor_fragment_id!=='yuan_shao_189_190_eastern_han_context'||!Array.isArray(item.fragments)||item.fragments.length!==2) throw new Error('Yuan Shao fragment declaration drift');
const [early,regional]=item.fragments;
if(early.id!=='yuan_shao_189_190_eastern_han_context'||early.activity_uuid!==activityId||early.target_polity_uuid!==easternHanUuid||early.target_identity_class!=='EASTERN_HAN_CONTEXT'||early.relation!==null||early.relation_assignment_status!=='PENDING_ROLE_RELATION_INTEGRATION'||early.start_year!==189||early.end_year!==190||early.temporal_policy!=='REVIEWED_EARLY_HAN_CONTEXT_189_190_YEAR_LEVEL_RELATION_UNRESOLVED') throw new Error('Yuan Shao early Han survivor fragment drift');
if(regional.id!=='yuan_shao_191_202_ji_regional_rule'||regional.activity_uuid!==null||regional.target_polity_uuid!==null||regional.target_identity_class!==jiClass||JSON.stringify(regional.relation)!==JSON.stringify(['rules','7ca4de8f-01d4-542c-acc1-a06848c6742c'])||regional.start_year!==191||regional.end_year!==202||regional.temporal_policy!=='REVIEWED_JI_REGIONAL_RULE_191_202_YEAR_LEVEL'||regional.geometry_policy!=='DO_NOT_INFER_FOUR_PROVINCE_GEOMETRY_FROM_191; YOU_FULL_CONTROL_BEFORE_199_FORBIDDEN') throw new Error('Yuan Shao Ji regional rule fragment drift');
if(item.overlap_gap_policy!=='NO_YEAR_GAP_OR_OVERLAP; 189_190_EARLY_HAN_CONTEXT_AND_191_202_JI_REGIONAL_RULE ARE YEAR_LEVEL PHASES') throw new Error('Yuan Shao overlap/gap policy drift');

const handoff=item.polity_relation_handoff;
if(!handoff||handoff.relation_decision_id!=='yuan_shao_ji_nominal_han_relation'||handoff.status!=='REVIEWED_ASSERTION_PREBOUND_PENDING_EXACT_JI_AND_SOURCE_UUIDS'||handoff.subject_identity_class!==jiClass||handoff.subject_polity_uuid!==null||handoff.object_polity_uuid!==easternHanUuid||handoff.relation_type_code!=='nominally_subordinate_to'||handoff.relation_type_uuid!=='375da950-65bc-5b81-a338-6c705f515120'||handoff.start_year!==191||handoff.end_year!==202||handoff.source_candidate_key!==sourceCandidate.candidate_key||handoff.source_uuid!==null||handoff.source_locator_key!==sourceLink.source_locator_key) throw new Error('Yuan Shao structural relation handoff drift');
const handoffBlockers=['P5_YUAN_SHAO_JI_POLITY_UUID_NOT_ASSIGNED','P5_RELATION_SOURCE_UUID_NOT_ASSIGNED'];
if(!handoffBlockers.every((b)=>(handoff.execution_blockers||[]).includes(b))) throw new Error('Yuan Shao handoff blockers incomplete');

const combined=new Set([...earlierIds,activityId]);
if(combined.size!==44||57-combined.size!==13) throw new Error(`P6 cumulative prebinding coverage drift total=${combined.size} remaining=${57-combined.size}`);
const result=plan.result||{};
if(Number(result.case_count)!==1||Number(result.split_activity_count)!==1||Number(result.existing_polity_uuid_survivor_targets)!==1||Number(result.prepared_null_uuid_polity_fragments)!==1||Number(result.reviewed_exact_person_relation_bindings)!==1||Number(result.deferred_person_relation_bindings)!==1||Number(result.reviewed_polity_relation_handoffs)!==1||Number(result.polity_relation_assertions_executable_in_batch)!==0||Number(result.new_polity_uuid_bindings)!==0||Number(result.new_activity_fragment_uuid_assignments)!==0||Number(result.cumulative_prebinding_activities)!==44||Number(result.remaining_correction_v2_frontier)!==13||result.production_executable!==false||result.production_mutation_authorized!==false) throw new Error('P6 Batch 8 result summary drift');

console.log(JSON.stringify({marker:'ATLAS_STAGE2_CORRECTION_V2_PREBINDING_BATCH8_OK',batch8_cases:1,batch8_splits:1,early_person_relation_deferred:1,reviewed_exact_person_relations:1,reviewed_polity_relation_handoffs:1,new_polity_uuid_bindings:0,new_activity_fragment_uuid_assignments:0,cumulative_prebinding_activities:44,remaining_correction_v2_frontier:13,production_executable:false,production_mutation_authorized:false},null,2));
