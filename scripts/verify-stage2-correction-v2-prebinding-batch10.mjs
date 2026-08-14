import fs from 'node:fs';

const intake=JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-intake.json','utf8'));
const ledger=JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-master-ledger.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-p5p6-execution-manifest.json','utf8'));
const earlierPackages=[
  'stage2/integration/p6-correction-v2-prebinding-batch1.v1.json',
  'stage2/integration/p6-correction-v2-prebinding-batch2.v1.json',
  'stage2/integration/p6-correction-v2-prebinding-batch3.v1.json',
  'stage2/integration/p6-correction-v2-prebinding-batch4.v1.json',
  'stage2/integration/p6-correction-v2-prebinding-batch5.v1.json',
  'stage2/integration/p6-correction-v2-prebinding-batch6.v1.json',
  'stage2/integration/p6-correction-v2-prebinding-batch7.v1.json',
  'stage2/integration/p6-correction-v2-prebinding-batch8.v1.json',
  'stage2/integration/p6-correction-v2-prebinding-batch9.v1.json'
].map((p)=>JSON.parse(fs.readFileSync(p,'utf8')));
const plan=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch10.v1.json','utf8'));
const contract=JSON.parse(fs.readFileSync('stage2/contracts/correction-v2-current.v1.json','utf8'));
const catalog=JSON.parse(fs.readFileSync('stage2/catalogs/relation-types.v1.json','utf8'));
const p5Polities=JSON.parse(fs.readFileSync('stage2/authoring/p5-polity-authoring-batch1-late-han.v1.json','utf8'));
const sourceResearch=JSON.parse(fs.readFileSync('research/china/stage2-regional-authority-target-phase-decisions.v1.json','utf8'));
const requirements=JSON.parse(fs.readFileSync('requirements/atlas-requirements.v1.json','utf8'));

const digest='sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const deployment='ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
const activityId='42274e4c-af35-503f-a14f-e7460489b252';
const easternHan='3a29a08a-d111-50d5-916f-f5c11b5eabaf';
const westernClass='SOURCE_BACKED_WESTERN_REGIONAL_POLITY';

if(intake?.schema!=='atlas-stage2-baseline-a-intake/v2'||intake.baseline_digest!==digest||intake.deployment_sha!==deployment) throw new Error('Baseline A intake drift');
if(ledger?.schema!=='atlas-stage2-baseline-a-master-ledger/v2'||ledger.baseline?.baseline_digest!==digest) throw new Error('Baseline A ledger drift');
if(manifest?.schema!=='atlas-stage2-baseline-a-p5p6-execution-manifest/v2'||Number(manifest.summary?.correction_v2_activity_count)!==57) throw new Error('Correction v2 frontier drift');
if(contract?.schema!=='atlas-stage2-correction-v2-contract/v1'||contract.status!=='P6_BRANCH_ONLY_CONTRACT_NO_PRODUCTION_MUTATION'||contract.release_boundary?.production_mutation_authorized!==false) throw new Error('Correction v2 contract drift');
const split=contract.operation_types?.split_activity||{};
if(contract.manifest_layers?.prebinding_plan?.exact_baseline_before_state_required!==true||split.one_existing_activity_to_multiple_fragments!==true||split.survivor_fragment_must_be_declared!==true||split.survivor_fragment_preserves_original_activity_uuid!==true||split.new_fragment_activity_uuids_required_in_execution_manifest!==true||split.existing_source_links_copy_policy_required!==true||split.overlap_or_gap_requires_explicit_reviewed_policy!==true) throw new Error('Correction v2 split contract drift');

if(plan?.schema!=='atlas-stage2-correction-v2-prebinding-plan/v1'||plan.batch_id!=='p6_correction_v2_prebinding_batch10_ma_teng_multiphase_scaffold'||plan.status!=='PREBINDING_ONLY_NOT_PRODUCTION_EXECUTABLE') throw new Error('P6 Batch 10 plan drift');
if(plan.contract!=='stage2/contracts/correction-v2-current.v1.json'||plan.catalog!=='stage2/catalogs/relation-types.v1.json'||plan.p5_polity_authoring!=='stage2/authoring/p5-polity-authoring-batch1-late-han.v1.json'||plan.source_research!=='research/china/stage2-regional-authority-target-phase-decisions.v1.json'||plan.baseline?.deployment_sha!==deployment||plan.baseline?.baseline_digest!==digest) throw new Error('P6 Batch 10 linkage drift');

const scope=plan.scope_rules||{};
if(scope.existing_eastern_han_uuid_survivor_required!==true||scope.reviewed_central_service_phase_208_212_required!==true||scope.pre208_regional_authority_outer_envelope_may_reference_prepared_null_uuid_polity!==true||scope.pre208_person_relation_must_remain_unbound_until_subphase_chronology_resolved!==true||scope.new_polity_uuid_assignment_forbidden_in_this_batch!==true||scope.survivor_fragment_preserves_original_activity_uuid!==true||scope.new_split_fragment_activity_uuid_must_remain_null!==true||scope.reviewed_central_service_relation_uuid_required!==true||scope.continuous_nominal_han_relation_for_pre208_forbidden!==true||scope.central_service_role_normalization_must_remain_explicitly_blocked!==true||scope.production_mutation_authorized!==false) throw new Error('P6 Batch 10 safety scope drift');
const blockers=['P5_PRODUCTION_SCHEMA_NOT_APPLIED','P5_MA_TENG_WESTERN_POLITY_UUID_NOT_ASSIGNED','NEW_SPLIT_FRAGMENT_ACTIVITY_UUID_NOT_ASSIGNED','EARLY_SUBPHASE_CHRONOLOGY_UNRESOLVED','EARLY_PERSON_RELATION_SUBPHASES_UNRESOLVED','CENTRAL_SERVICE_ROLE_UUID_NOT_NORMALIZED','NORMALIZED_ACTIVITY_SOURCE_UUID_BINDINGS_NOT_COMPLETE','PRODUCTION_RELEASE_NOT_AUTHORIZED'];
if(!blockers.every((b)=>(plan.common_execution_blockers||[]).includes(b))) throw new Error('P6 Batch 10 blockers incomplete');
if(plan.source_preservation_policy?.silent_source_drop_forbidden!==true||!String(plan.source_preservation_policy?.split_activity||'').includes('COPY_ALL_EXISTING_ACTIVITY_SOURCE_LINKS')) throw new Error('P6 Batch 10 source preservation drift');

const reqById=new Map((requirements.requirements||[]).map((r)=>[r.id,r]));
if(reqById.get('ATLAS-RQ-0215')?.status!=='PENDING'||reqById.get('ATLAS-RQ-0216')?.status!=='PENDING') throw new Error('P5/P6 Production requirements must remain pending');

const beforeFields=plan.before_tuple_fields||[];
const expectedFields=['person_id','polity_id','role_id','period_basis_id','activity_start','activity_end','confidence','chronology_status','legacy_source_key','source_count'];
if(JSON.stringify(beforeFields)!==JSON.stringify(expectedFields)) throw new Error('P6 Batch 10 before tuple field drift');
const intakeByActivity=new Map((intake.activity_rows||[]).map((r)=>[r.activity_id,r]));
const ledgerByActivity=new Map((ledger.rows||[]).map((r)=>[r.activity_id,r]));
const manifestByActivity=new Map((manifest.correction_activities||[]).map((r)=>[r.activity_id,r]));
const frontier=new Set(manifestByActivity.keys());
const earlierIds=new Set(earlierPackages.flatMap((pkg)=>(pkg.cases||[]).map((r)=>r.activity_id)));
if(earlierIds.size!==45) throw new Error(`P6 Batch 1-9 coverage drift ${earlierIds.size}`);

if(!Array.isArray(plan.cases)||plan.cases.length!==1) throw new Error('P6 Batch 10 case count drift');
const item=plan.cases[0];
if(item.activity_id!==activityId||item.person!=='Ma Teng'||earlierIds.has(activityId)||!frontier.has(activityId)) throw new Error('Ma Teng Batch 10 scope drift');
if(item.type!=='split_activity'||item.mode!=='reviewed_central_service_survivor_plus_deferred_pre208_multiphase_envelope') throw new Error('Ma Teng Batch 10 operation drift');
const live=intakeByActivity.get(activityId); const row=ledgerByActivity.get(activityId); const mf=manifestByActivity.get(activityId);
if(!live||!row||!mf||row.person?.canonical!=='Ma Teng'||row.polity?.uuid!==easternHan||row.polity?.canonical!=='Eastern Han') throw new Error('Ma Teng Baseline A row missing/drifted');
if(!Array.isArray(item.expected_before)||item.expected_before.length!==beforeFields.length) throw new Error('Ma Teng before tuple shape drift');
for(let i=0;i<beforeFields.length;i++){const field=beforeFields[i];if(item.expected_before[i]!==live[field]) throw new Error(`Ma Teng exact before-state drift ${field}`);}

if(item.p4_decision_id!==null||mf.p4_identity_decision!==null||row.audit?.polity_identity_decision!==undefined) throw new Error('Ma Teng must remain P3-only with no fabricated P4 overlay');
const p3=row.audit?.polity_relation_decision;
if(!p3||p3.id!=='ma_teng_western_relation_policy'||item.p3_relation_decision_id!==p3.id||p3.status!=='P3_POLITY_RELATION_MODEL_DECIDED_IMPLEMENTATION_PENDING'||p3.model_decision!=='AUTHOR_WESTERN_REGIONAL_POLITY_BUT_FORBID_CONTINUOUS_NOMINAL_HAN_RELATION'||(p3.relation_assertions||[]).length!==0||p3.relation_policy!=='ASSERT_ONLY_SOURCE_SUPPORTED_SUBINTERVALS_AFTER_MULTIPHASE_CHRONOLOGY; NO_CONTINUOUS_DEFAULT'||p3.production_mutation_authorized!==false) throw new Error('Ma Teng P3 relation policy drift');
if(JSON.stringify(item.p3_companion_actions||[])!==JSON.stringify(p3.required_later_actions||[])) throw new Error('Ma Teng P3 companion actions drift');
if(item.source_contract!==p3.source_contract||!fs.existsSync(item.source_contract)) throw new Error('Ma Teng source contract linkage drift');

if(p5Polities?.schema!=='atlas-stage2-p5-polity-authoring-package/v1'||p5Polities.status!=='REVIEWED_AUTHORING_PREP_NO_UUID_NO_PRODUCTION_MUTATION'||p5Polities.rules?.production_mutation_authorized!==false) throw new Error('P5 Late Han authoring package drift');
const target=(p5Polities.targets||[]).find((t)=>t.identity_class===westernClass);
if(!target||target.polity_uuid!==null||target.baseline_absence_verified!==true||target.proposed_catalog_label!=='Ma Teng western regional authority'||target.semantic_name_kind!=='editorial_catalog_label'||target.historical_name_claim!==false||target.relation_decision_id!=='ma_teng_western_relation_policy'||target.territory_geometry_status!=='P14_DEFERRED') throw new Error('P5 Ma Teng western target drift');

if(sourceResearch?.schema!=='atlas-stage2-regional-authority-target-phase-research/v1'||sourceResearch.status!=='RESEARCH_REVIEWED_NO_PRODUCTION_WRITE'||sourceResearch.invariants?.fabricated_polity_names_created!==false||sourceResearch.invariants?.fabricated_geometry_created!==false||sourceResearch.invariants?.unknown_subyear_boundaries_fabricated!==false) throw new Error('Ma Teng source research drift');
const decision=(sourceResearch.decisions||[]).find((d)=>d.person==='Ma Teng');
if(!decision||decision.current_activity_uuid_evidence_only!==activityId||decision.current_target!=='Eastern Han'||decision.current_interval?.start_year!==189||decision.current_interval?.end_year!==212||decision.current_row_disposition!=='MULTIPHASE_REBUILD_REQUIRED'||decision.pre_208?.regional_political_authority_supported!==true||decision.pre_208?.target_class!==westernClass||decision.pre_208?.production_polity_uuid!==null||decision.pre_208?.person_relation_for_territorial_phases!=='rules'||decision.pre_208?.continuous_nominal_subordination_assertion_allowed!==false||decision.central_service_phase?.start_year!==208||decision.central_service_phase?.end_year!==212||decision.central_service_phase?.target!=='Eastern Han'||decision.central_service_phase?.person_relation!=='serves'||decision.central_service_phase?.role_evidence!=='Weiwei'||decision.central_service_phase?.direct_regional_geometry_after_transfer!==false) throw new Error('Ma Teng reviewed phase decision drift');

const relationByCode=new Map((catalog.person_polity_relation_types||[]).map((r)=>[r.code,r.id]));
if(relationByCode.get('serves')!=='0fc4827f-8543-52f7-9e9a-3173b0c698a7'||relationByCode.get('rules')!=='7ca4de8f-01d4-542c-acc1-a06848c6742c') throw new Error('Ma Teng relation catalog drift');

if(item.survivor_fragment_id!=='ma_teng_208_212_eastern_han_central_service'||!Array.isArray(item.fragments)||item.fragments.length!==2) throw new Error('Ma Teng fragment declaration drift');
const [early,service]=item.fragments;
if(early.id!=='ma_teng_189_207_western_multiphase_reconstruction_envelope'||early.activity_uuid!==null||early.target_polity_uuid!==null||early.target_identity_class!==westernClass||early.relation!==null||early.start_year!==189||early.end_year!==207||early.fragment_status!=='DEFERRED_MULTIPHASE_RECONSTRUCTION_NOT_EXECUTION_READY'||!String(early.temporal_policy||'').includes('OUTER_ENVELOPE_ONLY_189_207')||!String(early.person_relation_policy||'').includes('DO_NOT_BIND_RULES_TO_THE_WHOLE_189_207_ENVELOPE')||early.polity_relation_policy!==p3.relation_policy) throw new Error('Ma Teng early deferred envelope drift');
if(service.id!=='ma_teng_208_212_eastern_han_central_service'||service.activity_uuid!==activityId||service.target_polity_uuid!==easternHan||service.target_identity_class!=='EASTERN_HAN_POLITICAL_CONTEXT'||JSON.stringify(service.relation)!==JSON.stringify(['serves','0fc4827f-8543-52f7-9e9a-3173b0c698a7'])||service.start_year!==208||service.end_year!==212||service.temporal_policy!=='REVIEWED_CENTRAL_SERVICE_PHASE_208_212_YEAR_LEVEL'||service.role_evidence!=='Weiwei'||service.normalized_role_uuid!==null||!String(service.role_policy||'').includes('DO_NOT_RETAIN_LEGACY_WARLORD_ROLE')||service.direct_regional_geometry_after_transfer!==false) throw new Error('Ma Teng central service survivor drift');
if(!String(item.overlap_gap_policy||'').includes('NO_OUTER_YEAR_GAP_OR_OVERLAP')||!String(item.overlap_gap_policy||'').includes('INTERNAL_189_207_SUBPHASE_BOUNDARIES_REMAIN_UNRESOLVED')) throw new Error('Ma Teng overlap/gap policy drift');
const handoff=item.polity_relation_handoff||{};
if(handoff.relation_decision_id!==p3.id||handoff.status!=='NO_ASSERTION_PREBOUND_UNTIL_SOURCE_SUPPORTED_SUBINTERVALS_EXIST'||handoff.reviewed_assertion_count!==0||handoff.continuous_nominal_han_relation_allowed!==false||handoff.policy!==p3.relation_policy) throw new Error('Ma Teng Polity relation handoff drift');

const combined=new Set([...earlierIds,activityId]);
if(combined.size!==46||57-combined.size!==11) throw new Error(`P6 cumulative prebinding coverage drift total=${combined.size} remaining=${57-combined.size}`);
const result=plan.result||{};
if(Number(result.case_count)!==1||Number(result.split_activity_count)!==1||Number(result.existing_eastern_han_survivor_fragments)!==1||Number(result.deferred_pre208_multiphase_envelopes)!==1||Number(result.prepared_null_uuid_polity_targets)!==1||Number(result.reviewed_exact_person_relation_bindings)!==1||Number(result.intentionally_unbound_early_person_relations)!==1||Number(result.polity_relation_assertions_prebound)!==0||Number(result.new_polity_uuid_bindings)!==0||Number(result.new_activity_uuid_assignments)!==0||Number(result.cumulative_prebinding_activities)!==46||Number(result.remaining_correction_v2_frontier)!==11||result.production_executable!==false||result.production_mutation_authorized!==false) throw new Error('P6 Batch 10 result summary drift');

console.log(JSON.stringify({marker:'ATLAS_STAGE2_CORRECTION_V2_PREBINDING_BATCH10_OK',batch10_cases:1,ma_teng_multiphase_scaffolds:1,central_service_survivors:1,deferred_pre208_envelopes:1,prepared_null_uuid_polity_targets:1,reviewed_exact_person_relations:1,intentionally_unbound_early_relations:1,polity_relation_assertions_prebound:0,new_polity_uuid_bindings:0,new_activity_uuid_assignments:0,cumulative_prebinding_activities:46,remaining_correction_v2_frontier:11,production_executable:false,production_mutation_authorized:false},null,2));
