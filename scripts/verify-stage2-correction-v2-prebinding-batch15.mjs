import fs from 'node:fs';
const J=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const I=J('artifacts/stage2-baseline-a-intake.json');
const L=J('artifacts/stage2-baseline-a-master-ledger.json');
const M=J('artifacts/stage2-baseline-a-p5p6-execution-manifest.json');
const EFF=J('artifacts/stage2-baseline-a-effective-p5p6-frontier.json');
const A=J('stage2/integration/baseline-a-politic-resolution-amendments.v1.json');
const P=J('stage2/integration/p6-correction-v2-prebinding-batch15.v1.json');
const K=J('stage2/catalogs/relation-types.v1.json');
const R=J('research/china/stage2-regional-authority-target-phase-decisions.v1.json');
const PA=J('stage2/authoring/p5-polity-authoring-batch2-reviewed-polities.v1.json');
const PS=J('stage2/authoring/p5-polity-relation-sources.v1.json');
const G=J('stage2/integration/p6-effective-prebinding-progress.v1.json');

const id='8198cad1-dc14-5c1e-9b01-ddbddc447da7';
const person='33459667-1632-5a3e-bcc3-63833af5128c';
const yuan='d035cbd8-e7b1-5947-8542-c7dd356d52bb';
const role='a33083bd-9e14-5381-ab33-2d75738f262c';
const general='b00e85f9-aa05-5bd1-b5d5-0bc3a2f73d2e';
const rules='7ca4de8f-01d4-542c-acc1-a06848c6742c';
const nominal='375da950-65bc-5b81-a338-6c705f515120';
const target='SOURCE_BACKED_EASTERN_ZHEJIANG_REGIONAL_POLITY';
const sourceKey='bibliographic:ctext:ming-shi-jishi-benmo-fang-guozhen';
const E=(x,m)=>{if(!x)throw Error(`P6B15 ${m}`)};

E(P.schema==='atlas-stage2-correction-v2-prebinding-plan/v1'&&P.batch_id==='p6_correction_v2_prebinding_batch15_fang_guozhen_continuous_regional_polity'&&P.status==='PREBINDING_ONLY_NOT_PRODUCTION_EXECUTABLE','plan');
E(P.scope_rules?.latest_politic_resolution_amendment_is_execution_authority===true&&P.scope_rules?.person_activity_must_remain_one_continuous_regional_polity_activity===true&&P.scope_rules?.old_multiphase_rebuild_must_not_fragment_person_activity_by_each_submission_or_rebellion_phase===true&&P.scope_rules?.later_1359_1367_superior_relations_must_not_be_forced_to_one_exclusive_superior===true&&P.scope_rules?.production_mutation_authorized===false,'scope');

const prior=[];for(let i=1;i<=14;i++)prior.push(J(`stage2/integration/p6-correction-v2-prebinding-batch${i}.v1.json`));
const prev=new Set(prior.flatMap(b=>(b.cases||[]).map(x=>x.activity_id)));
E(prev.size===50&&!prev.has(id),'prior coverage');
E(M.correction_activities.some(x=>x.activity_id===id),'raw frontier');
E(EFF.effective_correction_activities.some(x=>x.activity_id===id)&&EFF.remaining_effective_correction_activities.some(x=>x.activity_id===id),'effective frontier');

const amendment=A.cases.find(x=>x.activity_id===id);
E(amendment?.person==='Fang Guozhen'&&amendment.effective_decision==='RELINK_TO_CONTINUOUS_EASTERN_ZHEJIANG_REGIONAL_POLITY'&&amendment.p6_correction_required===true&&amendment.mandatory_entity_migration===false,'amendment');
E(amendment.effective_target?.kind==='new_polity'&&amendment.effective_target.identity_class===target&&amendment.effective_target.polity_uuid===null&&amendment.effective_target.relation==='rules'&&amendment.effective_target.interval==='1348-1367','effective target');

const rel=new Map(K.person_polity_relation_types.map(x=>[x.code,x.id]));
const prel=new Map(K.polity_relation_types.map(x=>[x.code,x.id]));
E(rel.get('rules')===rules&&prel.get('nominally_subordinate_to')===nominal,'relation catalogs');

const authorTarget=PA.targets.find(x=>x.identity_class===target);
E(authorTarget?.polity_uuid===null&&authorTarget.baseline_absence_verified===true&&authorTarget.proposed_catalog_label==='Fang Guozhen eastern Zhejiang authority'&&authorTarget.semantic_name_kind==='editorial_catalog_label'&&authorTarget.historical_name_claim===false&&authorTarget.relation_decision_id==='fang_guozhen_multi_superior_relation_policy','P5 polity authoring target');

const source=PS.sources.find(x=>x.candidate_key===sourceKey);
const sourceLink=PS.links.find(x=>x.relation_decision_id==='fang_guozhen_multi_superior_relation_policy');
E(source?.source_uuid===null&&source.canonical_url&&source.title.includes('Fang Guozhen')&&sourceLink?.source_candidate_key===sourceKey&&sourceLink.relation_type==='nominally_subordinate_to'&&sourceLink.source_locator_key.includes('1355–1358'),'P5 relation source handoff');

const live=I.activity_rows.find(x=>x.activity_id===id),row=L.rows.find(x=>x.activity_id===id),x=P.cases?.[0],F=P.before_tuple_fields;
E(live&&row&&x&&x.type==='rewrite_activity'&&x.mode==='same_uuid_relink_to_continuous_regional_polity_with_separate_polity_relation','case');
F.forEach((f,i)=>E(x.expected_before[i]===live[f],`before ${f}`));
E(live.person_id===person&&live.polity_id===yuan&&live.role_id===role&&live.period_basis_id===general&&live.period_basis==='general_activity'&&live.activity_start===1348&&live.activity_end===1367&&live.role_source_label==='Warlord','baseline row');

const p3=row.audit?.polity_relation_decision;
E(p3?.id==='fang_guozhen_multi_superior_relation_policy'&&p3.model_decision==='CONTINUOUS_REGIONAL_POLITY_WITH_INDEPENDENT_TIME_BOUNDED_SUPERIOR_RELATIONS'&&p3.relation_assertions?.length===1&&p3.new_polity_targets?.[0]?.identity_class===target&&p3.new_polity_targets[0].polity_uuid===null,'P3 decision');
const pa=p3.relation_assertions[0];
E(pa.relation_type==='nominally_subordinate_to'&&pa.object?.polity_uuid===yuan&&pa.start?.year===1355&&pa.end?.year===1358,'P3 Yuan assertion');
E(String(p3.relation_policy).includes('1359_1367_MAY_HAVE_MULTIPLE_OVERLAPPING_SUPERIORS')&&String(p3.relation_policy).includes('NEVER_FORCE_EXCLUSIVE_SINGLE_SUPERIOR'),'P3 later-superior policy');

const research=R.decisions.find(d=>d.person==='Fang Guozhen');
E(research?.current_activity_uuid_evidence_only===id&&research.current_target==='Yuan Dynasty'&&research.current_interval?.start_year===1348&&research.current_interval?.end_year===1367,'research binding');
E(research.regional_polity?.target_class===target&&research.regional_polity.production_polity_uuid===null&&research.regional_polity.person_relation==='rules','research polity');
E(research.minimum_phase_classes?.length===4&&research.minimum_phase_classes[0].start_year===1348&&research.minimum_phase_classes[2].start_year===1355&&research.minimum_phase_classes[2].end_year===1358&&research.minimum_phase_classes[3].start_year===1359&&research.minimum_phase_classes[3].multiple_time_bounded_superior_relations_required===true,'research phases');

const y=x.proposed_after;
E(y.activity_uuid===id&&y.person_id===person&&y.polity_id===null&&y.polity_identity_class===target&&y.role_id===role&&y.period_basis_id===general&&y.period_basis==='general_activity'&&y.activity_start===1348&&y.activity_end===1367,'proposed activity');
E(y.polity_label_semantic_kind==='editorial_catalog_label'&&y.historical_name_claim===false,'editorial label');
E(JSON.stringify(y.relation)===JSON.stringify(['rules',rules]),'rules relation');
E(y.start_boundary?.granularity==='year'&&y.end_boundary?.granularity==='year'&&String(y.start_boundary.interpretation).includes('DO NOT INFER MATURE LAND-POLITY GEOMETRY'),'temporal/geometry start safety');
E(String(x.phase_semantics_policy).includes('DO NOT TURN THEM INTO FOUR PERSON ACTIVITIES')&&String(x.phase_semantics_policy).includes('CONTINUOUSLY RULES THE SAME REVIEWED REGIONAL POLITY'),'phase simplification');

E(x.planned_polity_relation_assertions?.length===1,'planned polity relation count');
const ar=x.planned_polity_relation_assertions[0];
E(ar.type==='assert_polity_relation'&&ar.subject_polity_id===null&&ar.subject_identity_class===target&&ar.object_polity_id===yuan,'planned relation endpoints');
E(JSON.stringify(ar.relation)===JSON.stringify(['nominally_subordinate_to',nominal])&&ar.start_boundary?.year===1355&&ar.end_boundary?.year===1358&&ar.source_candidate_key===sourceKey&&ar.source_locator_key===sourceLink.source_locator_key,'planned Yuan relation/source');
E(ar.execution_status==='BLOCKED_UNTIL_SUBJECT_POLITY_AND_SOURCE_UUIDS_ASSIGNED','planned relation blocker');
E(x.later_superior_relation_policy?.interval==='1359-1367'&&x.later_superior_relation_policy.exclusive_single_superior_forbidden===true&&x.later_superior_relation_policy.new_assertion_count_in_batch===0&&String(x.later_superior_relation_policy.reason).includes('WITHOUT FABRICATING ASSERTIONS'),'later superior no fabrication');

E(x.normalized_source_candidate_keys?.length===1&&x.normalized_source_candidate_keys[0]===sourceKey,'normalized source key');
E(String(x.geometry_policy).includes('NO_TERRITORY_OR_GEOMETRY')&&String(x.geometry_policy).includes('SEPARATE P14'),'geometry');

const r=P.result;
E(G.schema==='atlas-stage2-p6-effective-prebinding-progress/v1'&&G.effective_correction_v2_activities===54&&G.completed_prebinding_activities>=51&&G.completed_prebinding_activities<=54&&G.remaining_prebinding_activities<=3&&G.remaining_prebinding_activities>=0&&G.completed_prebinding_activities+G.remaining_prebinding_activities===54&&G.latest_completed_batch>=15&&G.production_mutation_authorized===false,'progress monotonic');
E(Array.isArray(G.remaining_activity_ids)&&G.remaining_activity_ids.length===G.remaining_prebinding_activities&&!G.remaining_activity_ids.includes(id),'progress remaining');
if(G.latest_completed_batch===15) E(G.completed_prebinding_activities===51&&G.remaining_prebinding_activities===3&&G.latest_completed_activity_id===id,'batch15 latest snapshot');
E(r.cumulative_effective_prebinding_activities===51&&r.effective_correction_v2_activities===54&&r.remaining_effective_correction_v2_frontier===3&&r.activity_uuid_preserved_count===1&&r.new_polity_uuid_bindings===0&&r.new_activity_uuid_assignments===0&&r.nominally_subordinate_to_assertions_prebound===1&&r.later_multi_superior_assertions_fabricated===0&&r.person_activity_fragment_count===1&&r.production_executable===false&&r.production_mutation_authorized===false,'result');
for(const b of ['P5_PRODUCTION_SCHEMA_NOT_APPLIED','EASTERN_ZHEJIANG_POLITY_UUID_NOT_ASSIGNED','NORMALIZED_REVIEWED_FANG_GUOZHEN_SOURCE_UUID_BINDINGS_NOT_COMPLETE','POLITY_RELATION_EXECUTION_SUBJECT_UUID_NOT_ASSIGNED','LATER_1359_1367_SUPERIOR_RELATION_CHRONOLOGY_NOT_FULLY_RESOLVED','PRODUCTION_RELEASE_NOT_AUTHORIZED']) E(P.common_execution_blockers.includes(b),b);

console.log(JSON.stringify({marker:'ATLAS_STAGE2_CORRECTION_V2_PREBINDING_BATCH15_OK',cumulative:51,effective_total:54,remaining:3,production:false}));
