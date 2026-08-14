import fs from 'node:fs';

const intake=JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-intake.json','utf8'));
const ledger=JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-master-ledger.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-p5p6-execution-manifest.json','utf8'));
const batch1=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch1.v1.json','utf8'));
const batch2=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch2.v1.json','utf8'));
const batch3=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch3.v1.json','utf8'));
const batch4=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch4.v1.json','utf8'));
const batch5=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch5.v1.json','utf8'));
const plan=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch6.v1.json','utf8'));
const contract=JSON.parse(fs.readFileSync('stage2/contracts/correction-v2-current.v1.json','utf8'));
const catalog=JSON.parse(fs.readFileSync('stage2/catalogs/relation-types.v1.json','utf8'));
const sourceResearch=JSON.parse(fs.readFileSync('research/china/stage2-sun-ce-sun-quan-wu-continuity.v1.json','utf8'));
const requirements=JSON.parse(fs.readFileSync('requirements/atlas-requirements.v1.json','utf8'));

const digest='sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const deployment='ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
if(intake?.schema!=='atlas-stage2-baseline-a-intake/v2'||intake.baseline_digest!==digest||intake.deployment_sha!==deployment) throw new Error('Baseline A intake drift');
if(ledger?.schema!=='atlas-stage2-baseline-a-master-ledger/v2'||ledger.baseline?.baseline_digest!==digest) throw new Error('Baseline A ledger drift');
if(manifest?.schema!=='atlas-stage2-baseline-a-p5p6-execution-manifest/v2'||Number(manifest.summary?.correction_v2_activity_count)!==57) throw new Error('Correction v2 frontier drift');
if(contract?.schema!=='atlas-stage2-correction-v2-contract/v1'||contract.status!=='P6_BRANCH_ONLY_CONTRACT_NO_PRODUCTION_MUTATION'||contract.release_boundary?.production_mutation_authorized!==false) throw new Error('Correction v2 contract drift');
if(contract.manifest_layers?.prebinding_plan?.exact_baseline_before_state_required!==true||contract.operation_types?.split_activity?.one_existing_activity_to_multiple_fragments!==true||contract.operation_types?.split_activity?.survivor_fragment_must_be_declared!==true||contract.operation_types?.split_activity?.survivor_fragment_preserves_original_activity_uuid!==true||contract.operation_types?.split_activity?.new_fragment_activity_uuids_required_in_execution_manifest!==true||contract.operation_types?.split_activity?.existing_source_links_copy_policy_required!==true||contract.operation_types?.split_activity?.overlap_or_gap_requires_explicit_reviewed_policy!==true) throw new Error('Correction v2 split contract drift');
if(plan?.schema!=='atlas-stage2-correction-v2-prebinding-plan/v1'||plan.batch_id!=='p6_correction_v2_prebinding_batch6_sun_ce_existing_uuid_bounded_split'||plan.status!=='PREBINDING_ONLY_NOT_PRODUCTION_EXECUTABLE') throw new Error('P6 Batch 6 plan drift');
if(plan.contract!=='stage2/contracts/correction-v2-current.v1.json'||plan.catalog!=='stage2/catalogs/relation-types.v1.json'||plan.source_research!=='research/china/stage2-sun-ce-sun-quan-wu-continuity.v1.json'||plan.baseline?.deployment_sha!==deployment||plan.baseline?.baseline_digest!==digest) throw new Error('P6 Batch 6 linkage drift');

const scope=plan.scope_rules||{};
if(scope.existing_polity_uuid_targets_only!==true||scope.new_polity_uuid_forbidden_in_this_batch!==true||scope.survivor_fragment_preserves_original_activity_uuid!==true||scope.new_split_fragment_activity_uuid_must_remain_null!==true||scope.reviewed_person_relation_uuid_required!==true||scope.later_eastern_wu_label_backprojection_forbidden!==true||scope.source_timed_polity_relation_assertion_deferred!==true||scope.production_mutation_authorized!==false) throw new Error('P6 Batch 6 scope safety drift');
const blockers=['P5_PRODUCTION_SCHEMA_NOT_APPLIED','NEW_SPLIT_FRAGMENT_ACTIVITY_UUID_NOT_ASSIGNED','NORMALIZED_ACTIVITY_SOURCE_UUID_BINDINGS_NOT_COMPLETE','TEMPORALLY_CORRECT_SUN_WU_DESIGNATION_NOT_AUTHORED','SOURCE_TIMED_HAN_SUPERIOR_RELATION_ASSERTION_DEFERRED_TO_P7','PRODUCTION_RELEASE_NOT_AUTHORIZED'];
if(!blockers.every((b)=>(plan.common_execution_blockers||[]).includes(b))) throw new Error('P6 Batch 6 execution blockers incomplete');
if(plan.source_preservation_policy?.silent_source_drop_forbidden!==true||!String(plan.source_preservation_policy?.split_activity||'').includes('COPY_ALL_EXISTING_ACTIVITY_SOURCE_LINKS')) throw new Error('P6 Batch 6 source preservation drift');

const reqById=new Map((requirements.requirements||[]).map((r)=>[r.id,r]));
if(reqById.get('ATLAS-RQ-0215')?.status!=='PENDING'||reqById.get('ATLAS-RQ-0216')?.status!=='PENDING') throw new Error('P5/P6 Production requirements must remain pending');

const beforeFields=plan.before_tuple_fields||[];
const expectedFields=['person_id','polity_id','role_id','period_basis_id','activity_start','activity_end','confidence','chronology_status','legacy_source_key','source_count'];
if(JSON.stringify(beforeFields)!==JSON.stringify(expectedFields)) throw new Error('P6 Batch 6 before tuple field drift');
const intakeByActivity=new Map((intake.activity_rows||[]).map((r)=>[r.activity_id,r]));
const ledgerByActivity=new Map((ledger.rows||[]).map((r)=>[r.activity_id,r]));
const frontier=new Set((manifest.correction_activities||[]).map((r)=>r.activity_id));
const earlierIds=new Set([
  ...(batch1.cases||[]).map((r)=>r.activity_id),
  ...(batch2.cases||[]).map((r)=>r.activity_id),
  ...(batch3.cases||[]).map((r)=>r.activity_id),
  ...(batch4.cases||[]).map((r)=>r.activity_id),
  ...(batch5.cases||[]).map((r)=>r.activity_id)
]);
if(earlierIds.size!==41) throw new Error(`P6 Batch 1-5 coverage drift ${earlierIds.size}`);

if(!Array.isArray(plan.cases)||plan.cases.length!==1) throw new Error('P6 Batch 6 case count drift');
const item=plan.cases[0];
const activityId='4c91cb84-5e53-5bcf-a4d6-d82a8a0c903f';
if(item.activity_id!==activityId||item.person!=='Sun Ce'||earlierIds.has(activityId)||!frontier.has(activityId)) throw new Error('Sun Ce Batch 6 scope drift');
if(item.type!=='split_activity'||item.mode!=='existing_uuid_bounded_temporal_split') throw new Error('Sun Ce Batch 6 operation drift');
const live=intakeByActivity.get(activityId);const row=ledgerByActivity.get(activityId);
if(!live||!row||row.person?.canonical!=='Sun Ce') throw new Error('Sun Ce Baseline A row missing/drifted');
if(!Array.isArray(item.expected_before)||item.expected_before.length!==beforeFields.length) throw new Error('Sun Ce before tuple shape drift');
for(let i=0;i<beforeFields.length;i++){const field=beforeFields[i];if(item.expected_before[i]!==live[field]) throw new Error(`Sun Ce exact before-state drift ${field}`);}

const p4=row.audit?.polity_identity_decision;
if(!p4||p4.id!=='sun_ce_eastern_han_jiangdong_split'||item.p4_decision_id!==p4.id||p4.status!=='P4_IDENTITY_DECIDED_IMPLEMENTATION_PENDING'||p4.target_disposition!=='KEEP_DISTINCT'||p4.target_polity_uuid!=='3a29a08a-d111-50d5-916f-f5c11b5eabaf'||p4.production_mutation_authorized!==false) throw new Error('Sun Ce P4 identity overlay drift');
if(!Array.isArray(p4.split_targets)||p4.split_targets.length!==2) throw new Error('Sun Ce P4 split target drift');
const [p4Han,p4Sun]=p4.split_targets;
if(p4Han.target_disposition!=='REUSE_CURRENT_UUID'||p4Han.polity_uuid!=='3a29a08a-d111-50d5-916f-f5c11b5eabaf'||p4Han.identity_class!=='EASTERN_HAN_POLITICAL_CONTEXT'||p4Han.relation!=='serves') throw new Error('Sun Ce P4 Han split target drift');
if(p4Sun.target_disposition!=='REUSE_CURRENT_UUID'||p4Sun.polity_uuid!=='8768ce4f-26fe-5de9-a501-c19525461fdb'||p4Sun.identity_class!=='STABLE_SUN_CE_SUN_QUAN_WU_POLITICAL_ACTOR'||p4Sun.relation!=='rules'||!String(p4Sun.name_policy||'').includes('Do not back-project')) throw new Error('Sun Ce P4 Sun/Wu split target drift');
if(JSON.stringify(item.p4_companion_actions||[])!==JSON.stringify(p4.required_later_actions||[])) throw new Error('Sun Ce P4 companion actions drift');

const p3=row.audit?.polity_relation_decision;
if(!p3||p3.id!=='sun_ce_han_relation_policy'||item.p3_relation_decision_id!==p3.id||p3.status!=='P3_POLITY_RELATION_MODEL_DECIDED_IMPLEMENTATION_PENDING'||p3.model_decision!=='STABLE_SUN_WU_POLITY_WITH_SOURCE_TIMED_NOMINAL_HAN_RELATION_ONLY'||(p3.relation_assertions||[]).length!==0||p3.production_mutation_authorized!==false) throw new Error('Sun Ce P3 relation policy drift');
if(JSON.stringify(item.p3_companion_actions||[])!==JSON.stringify(p3.required_later_actions||[])) throw new Error('Sun Ce P3 companion actions drift');
if(item.polity_relation_handoff?.status!=='SOURCE_TIMED_SUBINTERVAL_DEFERRED_TO_P7_NO_ASSERTION_IN_BATCH6'||item.polity_relation_handoff?.relation_assertion_count!==0||item.polity_relation_handoff?.policy!==p3.relation_policy) throw new Error('Sun Ce deferred Polity relation handoff drift');

if(item.source_contract!==p4.source_contract||item.source_contract!==p3.source_contract||!fs.existsSync(item.source_contract)) throw new Error('Sun Ce source contract linkage drift');
if(sourceResearch?.schema!=='atlas-stage2-sun-ce-sun-quan-wu-continuity-research/v1'||sourceResearch.status!=='RESEARCH_REVIEWED_NO_PRODUCTION_WRITE'||sourceResearch.baseline?.baseline_digest!==digest||sourceResearch.invariants?.production_mutation_authorized!==false) throw new Error('Sun Ce source research drift');
const identity=sourceResearch.identity_decision||{};
if(identity.stable_single_polity!==true||identity.technical_survivor_uuid!=='8768ce4f-26fe-5de9-a501-c19525461fdb'||identity.canonical_label_backprojection_before_formal_wu_forbidden!==true) throw new Error('Sun/Wu continuity identity drift');
if(identity.sun_ce?.activity_id!==activityId||identity.sun_ce?.pre_rule_context?.polity_uuid!=='3a29a08a-d111-50d5-916f-f5c11b5eabaf'||identity.sun_ce?.pre_rule_context?.relation!=='serves'||identity.sun_ce?.regional_rule_context?.polity_uuid!=='8768ce4f-26fe-5de9-a501-c19525461fdb'||identity.sun_ce?.regional_rule_context?.relation!=='rules'||!String(identity.sun_ce?.chronology_policy||'').includes('around 195')) throw new Error('Sun Ce reviewed chronology/context drift');

const polityById=new Map((intake.identity_catalogs?.polities||[]).map((p)=>[p.id,p]));
if(polityById.get('3a29a08a-d111-50d5-916f-f5c11b5eabaf')?.canonical_key!=='Eastern Han'||polityById.get('8768ce4f-26fe-5de9-a501-c19525461fdb')?.canonical_key!=='Eastern Wu') throw new Error('Sun Ce existing Polity UUID catalog drift');
const relationByCode=new Map((catalog.person_polity_relation_types||[]).map((r)=>[r.code,r.id]));
if(relationByCode.get('serves')!=='0fc4827f-8543-52f7-9e9a-3173b0c698a7'||relationByCode.get('rules')!=='7ca4de8f-01d4-542c-acc1-a06848c6742c') throw new Error('Sun Ce exact Person relation UUID drift');

if(item.survivor_fragment_id!=='sun_ce_194_eastern_han_service'||!Array.isArray(item.fragments)||item.fragments.length!==2) throw new Error('Sun Ce fragment declaration drift');
const [han,sun]=item.fragments;
if(han.id!=='sun_ce_194_eastern_han_service'||han.activity_uuid!==activityId||han.target_polity_uuid!=='3a29a08a-d111-50d5-916f-f5c11b5eabaf'||han.target_identity_class!=='EASTERN_HAN_POLITICAL_CONTEXT'||JSON.stringify(han.relation)!==JSON.stringify(['serves','0fc4827f-8543-52f7-9e9a-3173b0c698a7'])||han.start_year!==194||han.end_year!==194||han.temporal_policy!=='REVIEWED_INITIAL_194_CONTEXT_YEAR_LEVEL_NO_SUBYEAR_PRECISION') throw new Error('Sun Ce Han survivor fragment drift');
if(sun.id!=='sun_ce_195_200_stable_sun_wu_rule'||sun.activity_uuid!==null||sun.target_polity_uuid!=='8768ce4f-26fe-5de9-a501-c19525461fdb'||sun.target_identity_class!=='STABLE_SUN_CE_SUN_QUAN_WU_POLITICAL_ACTOR'||JSON.stringify(sun.relation)!==JSON.stringify(['rules','7ca4de8f-01d4-542c-acc1-a06848c6742c'])||sun.start_year!==195||sun.end_year!==200||sun.temporal_policy!=='REVIEWED_DE_FACTO_RULE_START_AROUND_195_KEEP_START_APPROXIMATE_NO_SUBYEAR_PRECISION'||sun.display_policy!=='DO_NOT_BACK_PROJECT_LATER_EASTERN_WU_LABEL_TO_EARLY_JIANGDONG_PHASE') throw new Error('Sun Ce Sun/Wu fragment drift');
if(item.overlap_gap_policy!=='NO_YEAR_GAP_OR_OVERLAP; REVIEWED_TRANSITION_IS_YEAR_LEVEL_AND_NO_SUBYEAR_BOUNDARY_IS_CLAIMED') throw new Error('Sun Ce overlap/gap policy drift');

const combined=new Set([...earlierIds,activityId]);
if(combined.size!==42||57-combined.size!==15) throw new Error(`P6 cumulative prebinding coverage drift total=${combined.size} remaining=${57-combined.size}`);
const result=plan.result||{};
if(Number(result.case_count)!==1||Number(result.split_activity_count)!==1||Number(result.existing_polity_uuid_targets)!==2||Number(result.reviewed_exact_person_relation_bindings)!==2||Number(result.new_polity_uuid_bindings)!==0||Number(result.new_activity_fragment_uuid_assignments)!==0||Number(result.polity_relation_assertions_in_batch)!==0||Number(result.cumulative_prebinding_activities)!==42||Number(result.remaining_correction_v2_frontier)!==15||result.production_executable!==false||result.production_mutation_authorized!==false) throw new Error('P6 Batch 6 result summary drift');

console.log(JSON.stringify({marker:'ATLAS_STAGE2_CORRECTION_V2_PREBINDING_BATCH6_OK',batch6_cases:1,batch6_splits:1,existing_polity_uuid_targets:2,reviewed_exact_person_relations:2,new_activity_fragment_uuid_assignments:0,polity_relation_assertions_in_batch:0,cumulative_prebinding_activities:42,remaining_correction_v2_frontier:15,production_executable:false,production_mutation_authorized:false},null,2));
