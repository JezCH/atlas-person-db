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
const batch8=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch8.v1.json','utf8'));
const plan=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch9.v1.json','utf8'));
const contract=JSON.parse(fs.readFileSync('stage2/contracts/correction-v2-current.v1.json','utf8'));
const catalog=JSON.parse(fs.readFileSync('stage2/catalogs/relation-types.v1.json','utf8'));
const p5Polities=JSON.parse(fs.readFileSync('stage2/authoring/p5-polity-authoring-batch2-reviewed-polities.v1.json','utf8'));
const sourceResearch=JSON.parse(fs.readFileSync('research/layered/stage2-r1-layered-authority-decisions.v1.json','utf8'));
const requirements=JSON.parse(fs.readFileSync('requirements/atlas-requirements.v1.json','utf8'));

const digest='sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const deployment='ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
const activityId='b651ff3e-0df1-552a-9134-56ca95e9f3be';
const oldPolityUuid='c068d786-ab71-5516-ad51-b682feba155a';
const targetClass='EARLY_NORTHERN_RUS_AUTHORITY';

if(intake?.schema!=='atlas-stage2-baseline-a-intake/v2'||intake.baseline_digest!==digest||intake.deployment_sha!==deployment) throw new Error('Baseline A intake drift');
if(ledger?.schema!=='atlas-stage2-baseline-a-master-ledger/v2'||ledger.baseline?.baseline_digest!==digest) throw new Error('Baseline A ledger drift');
if(manifest?.schema!=='atlas-stage2-baseline-a-p5p6-execution-manifest/v2'||Number(manifest.summary?.correction_v2_activity_count)!==57) throw new Error('Correction v2 frontier drift');
if(contract?.schema!=='atlas-stage2-correction-v2-contract/v1'||contract.status!=='P6_BRANCH_ONLY_CONTRACT_NO_PRODUCTION_MUTATION'||contract.release_boundary?.production_mutation_authorized!==false) throw new Error('Correction v2 contract drift');
if(contract.manifest_layers?.prebinding_plan?.exact_baseline_before_state_required!==true||contract.operation_types?.rewrite_activity?.same_activity_uuid_preserved!==true||contract.operation_types?.rewrite_activity?.exact_before_and_after_required!==true||contract.operation_types?.rewrite_activity?.source_links_preserved_by_default!==true) throw new Error('Correction v2 rewrite contract drift');
if(plan?.schema!=='atlas-stage2-correction-v2-prebinding-plan/v1'||plan.batch_id!=='p6_correction_v2_prebinding_batch9_rurik_early_northern_rus_relink'||plan.status!=='PREBINDING_ONLY_NOT_PRODUCTION_EXECUTABLE') throw new Error('P6 Batch 9 plan drift');
if(plan.contract!=='stage2/contracts/correction-v2-current.v1.json'||plan.catalog!=='stage2/catalogs/relation-types.v1.json'||plan.p5_polity_authoring!=='stage2/authoring/p5-polity-authoring-batch2-reviewed-polities.v1.json'||plan.source_research!=='research/layered/stage2-r1-layered-authority-decisions.v1.json'||plan.baseline?.deployment_sha!==deployment||plan.baseline?.baseline_digest!==digest) throw new Error('P6 Batch 9 linkage drift');

const scope=plan.scope_rules||{};
if(scope.original_activity_uuid_preserved!==true||scope.prepared_new_polity_identity_class_may_be_referenced_with_null_uuid!==true||scope.new_polity_uuid_assignment_forbidden_in_this_batch!==true||scope.reviewed_person_relation_uuid_required!==true||scope.traditional_retrospective_chronology_must_remain_uncertain!==true||scope.subyear_precision_fabrication_forbidden!==true||scope.kiev_direct_control_backprojection_forbidden!==true||scope.precise_northern_geometry_inference_forbidden!==true||scope.backprojected_kievan_rus_activity_usage_must_be_replaced_not_preserved_as_parallel_claim!==true||scope.production_mutation_authorized!==false) throw new Error('P6 Batch 9 scope safety drift');
const blockers=['P5_PRODUCTION_SCHEMA_NOT_APPLIED','P5_EARLY_NORTHERN_RUS_POLITY_UUID_NOT_ASSIGNED','NORMALIZED_ACTIVITY_SOURCE_UUID_BINDINGS_NOT_COMPLETE','CHRONOLOGY_PROVENANCE_BACKFILL_REQUIRED','PRODUCTION_RELEASE_NOT_AUTHORIZED'];
if(!blockers.every((b)=>(plan.common_execution_blockers||[]).includes(b))) throw new Error('P6 Batch 9 execution blockers incomplete');
if(plan.source_preservation_policy?.silent_source_drop_forbidden!==true||!String(plan.source_preservation_policy?.rewrite_activity||'').includes('PRESERVE_ALL_EXISTING_ACTIVITY_SOURCE_LINKS')) throw new Error('P6 Batch 9 source preservation drift');

const reqById=new Map((requirements.requirements||[]).map((r)=>[r.id,r]));
if(reqById.get('ATLAS-RQ-0215')?.status!=='PENDING'||reqById.get('ATLAS-RQ-0216')?.status!=='PENDING') throw new Error('P5/P6 Production requirements must remain pending');

const beforeFields=plan.before_tuple_fields||[];
const expectedFields=['person_id','polity_id','role_id','period_basis_id','activity_start','activity_end','confidence','chronology_status','legacy_source_key','source_count'];
if(JSON.stringify(beforeFields)!==JSON.stringify(expectedFields)) throw new Error('P6 Batch 9 before tuple field drift');
const intakeByActivity=new Map((intake.activity_rows||[]).map((r)=>[r.activity_id,r]));
const ledgerByActivity=new Map((ledger.rows||[]).map((r)=>[r.activity_id,r]));
const frontier=new Set((manifest.correction_activities||[]).map((r)=>r.activity_id));
const earlierIds=new Set([
  ...(batch1.cases||[]).map((r)=>r.activity_id),...(batch2.cases||[]).map((r)=>r.activity_id),
  ...(batch3.cases||[]).map((r)=>r.activity_id),...(batch4.cases||[]).map((r)=>r.activity_id),
  ...(batch5.cases||[]).map((r)=>r.activity_id),...(batch6.cases||[]).map((r)=>r.activity_id),
  ...(batch7.cases||[]).map((r)=>r.activity_id),...(batch8.cases||[]).map((r)=>r.activity_id)
]);
if(earlierIds.size!==44) throw new Error(`P6 Batch 1-8 coverage drift ${earlierIds.size}`);

if(!Array.isArray(plan.cases)||plan.cases.length!==1) throw new Error('P6 Batch 9 case count drift');
const item=plan.cases[0];
if(item.activity_id!==activityId||item.person!=='Rurik'||earlierIds.has(activityId)||!frontier.has(activityId)) throw new Error('Rurik Batch 9 scope drift');
if(item.type!=='rewrite_activity'||item.mode!=='new_polity_uuid_pending_semantic_relink') throw new Error('Rurik Batch 9 operation drift');
const live=intakeByActivity.get(activityId); const row=ledgerByActivity.get(activityId);
if(!live||!row||row.person?.canonical!=='Rurik'||row.polity?.uuid!==oldPolityUuid||row.polity?.canonical!=="Kievan Rus'") throw new Error('Rurik Baseline A row missing/drifted');
if(!Array.isArray(item.expected_before)||item.expected_before.length!==beforeFields.length) throw new Error('Rurik before tuple shape drift');
for(let i=0;i<beforeFields.length;i++){const field=beforeFields[i];if(item.expected_before[i]!==live[field]) throw new Error(`Rurik exact before-state drift ${field}`);}

const p4=row.audit?.polity_identity_decision;
if(!p4||p4.id!=='rurik_early_northern_rus_new_polity'||item.p4_decision_id!==p4.id||p4.status!=='P4_IDENTITY_DECIDED_IMPLEMENTATION_PENDING'||p4.reviewed_decision!=='RELINK_EARLY_NORTHERN_RUS_AUTHORITY'||p4.target_disposition!=='NEW_POLITY_REQUIRED'||p4.target_polity_uuid!==null||p4.target_identity_class!==targetClass||p4.execution_kind!=='POLITY_AUTHORING_PENDING'||p4.production_mutation_authorized!==false) throw new Error('Rurik P4 identity overlay drift');
if(JSON.stringify(item.p4_companion_actions||[])!==JSON.stringify(p4.required_later_actions||[])) throw new Error('Rurik P4 companion actions drift');
if(item.source_contract!==p4.source_contract||!fs.existsSync(item.source_contract)) throw new Error('Rurik source contract linkage drift');

if(p5Polities?.schema!=='atlas-stage2-p5-polity-authoring-package/v1'||p5Polities.status!=='REVIEWED_AUTHORING_PREP_NO_UUID_NO_PRODUCTION_MUTATION'||p5Polities.rules?.production_mutation_authorized!==false) throw new Error('P5 reviewed Polity authoring package drift');
const target=(p5Polities.targets||[]).find((t)=>t.identity_class===targetClass);
if(!target||target.polity_uuid!==null||target.baseline_absence_verified!==true||target.proposed_catalog_label!=="Rurik's early northern Rus authority"||target.semantic_name_kind!=='editorial_catalog_label'||target.historical_name_claim!==false||target.identity_decision_id!=='rurik_early_northern_rus_new_polity'||target.chronology_status!=='TRADITIONAL_RETROSPECTIVE_UNCERTAIN'||target.territory_geometry_status!=='P14_DEFERRED') throw new Error('P5 Rurik target drift');

if(sourceResearch?.schema!=='atlas-stage2-r1-layered-authority-research/v1'||sourceResearch.status!=='RESEARCH_REVIEWED_NO_PRODUCTION_WRITE'||sourceResearch.invariants?.kiev_backprojected_to_rurik!==false||sourceResearch.invariants?.uncertain_subyear_boundary_fabricated!==false||sourceResearch.research_result?.production_writes_authorized!==false) throw new Error('Rurik source research drift');
const decision=(sourceResearch.decisions||[]).find((d)=>d.cluster==='RURIK'&&d.person==='Rurik');
if(!decision||decision.current_activity_uuid_evidence_only!==activityId||decision.current_target!=="Kievan Rus'"||decision.current_interval?.start_year!==862||decision.current_interval?.end_year!==879||decision.current_target_disposition!=='REJECT_BACKPROJECTED_KIEVAN_RUS'||decision.replacement_target_class!==targetClass||decision.production_polity_uuid!==null||decision.person_relation!=='rules'||decision.chronology?.start_year!==862||decision.chronology?.end_year!==879||decision.chronology?.status!=='TRADITIONAL_RETROSPECTIVE_UNCERTAIN'||decision.chronology?.subyear_precision!==null||decision.kiev_direct_control_allowed!==false||decision.precise_northern_polygon_supported!==false) throw new Error('Rurik reviewed research decision drift');

const relationByCode=new Map((catalog.person_polity_relation_types||[]).map((r)=>[r.code,r.id]));
if(relationByCode.get('rules')!=='7ca4de8f-01d4-542c-acc1-a06848c6742c') throw new Error('Rurik exact rules relation UUID drift');

const after=item.after||{};
if(after.activity_uuid!==activityId||after.target_polity_uuid!==null||after.target_identity_class!==targetClass||JSON.stringify(after.relation)!==JSON.stringify(['rules','7ca4de8f-01d4-542c-acc1-a06848c6742c'])||after.start_year!==862||after.end_year!==879||after.chronology_status!=='TRADITIONAL_RETROSPECTIVE_UNCERTAIN'||after.subyear_precision!==null||after.display_identity_policy!=='DO_NOT_BACKPROJECT_KIEVAN_RUS_TO_RURIK'||!String(after.territory_policy||'').includes('NO_KIEV_DIRECT_CONTROL')) throw new Error('Rurik reviewed after-state handoff drift');
const replacement=item.replacement_policy||{};
if(replacement.old_activity_polity_uuid!==oldPolityUuid||replacement.old_activity_polity_label!=="Kievan Rus'"||replacement.parallel_old_polity_activity_claim_allowed!==false||replacement.physical_old_polity_row_retirement_in_this_batch!==false) throw new Error('Rurik replacement policy drift');

const combined=new Set([...earlierIds,activityId]);
if(combined.size!==45||57-combined.size!==12) throw new Error(`P6 cumulative prebinding coverage drift total=${combined.size} remaining=${57-combined.size}`);
const result=plan.result||{};
if(Number(result.case_count)!==1||Number(result.rewrite_activity_count)!==1||Number(result.existing_activity_uuid_preserved)!==1||Number(result.prepared_null_uuid_polity_targets)!==1||Number(result.reviewed_exact_person_relation_bindings)!==1||Number(result.new_polity_uuid_bindings)!==0||Number(result.new_activity_uuid_assignments)!==0||Number(result.physical_polity_retirements)!==0||Number(result.cumulative_prebinding_activities)!==45||Number(result.remaining_correction_v2_frontier)!==12||result.production_executable!==false||result.production_mutation_authorized!==false) throw new Error('P6 Batch 9 result summary drift');

console.log(JSON.stringify({marker:'ATLAS_STAGE2_CORRECTION_V2_PREBINDING_BATCH9_OK',batch9_cases:1,rurik_relinks:1,existing_activity_uuid_preserved:1,prepared_null_uuid_polity_targets:1,reviewed_exact_person_relations:1,new_polity_uuid_bindings:0,new_activity_uuid_assignments:0,physical_polity_retirements:0,cumulative_prebinding_activities:45,remaining_correction_v2_frontier:12,production_executable:false,production_mutation_authorized:false},null,2));
