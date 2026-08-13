import fs from 'node:fs';
const J=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const I=J('artifacts/stage2-baseline-a-intake.json');
const L=J('artifacts/stage2-baseline-a-master-ledger.json');
const M=J('artifacts/stage2-baseline-a-p5p6-execution-manifest.json');
const A=J('stage2/integration/baseline-a-politic-resolution-amendments.v1.json');
const P=J('stage2/integration/p6-correction-v2-prebinding-batch16.v1.json');
const K=J('stage2/catalogs/relation-types.v1.json');
const R=J('research/residual/stage2-baseline-a-residual-22-resolution.v1.json');
const PA=J('stage2/authoring/p5-polity-authoring-batch2-reviewed-polities.v1.json');
const G=J('stage2/integration/p6-effective-prebinding-progress.v1.json');

const id='943ebf94-4a0c-53aa-a535-969e8fb60b2c';
const person='3dfc194c-5c61-5047-ab2b-47796815a5fa';
const gaul='cfe1faef-3a82-5b6c-b542-cff2bd667c6c';
const role='181a1210-844e-5d45-be74-fc7cc12c13b8';
const military='3194b4d0-0d2f-57ed-a5fb-d7f008015fa2';
const rules='7ca4de8f-01d4-542c-acc1-a06848c6742c';
const target='ARVERNI_POLITICAL_ACTOR';
const sourceKey='primary:perseus:caesar-gallic-war-book7';
const E=(x,m)=>{if(!x)throw Error(`P6B16 ${m}`)};

E(P.schema==='atlas-stage2-correction-v2-prebinding-plan/v1'&&P.batch_id==='p6_correction_v2_prebinding_batch16_vercingetorix_arverni_relink'&&P.status==='PREBINDING_ONLY_NOT_PRODUCTION_EXECUTABLE','plan');
E(P.scope_rules?.latest_politic_resolution_amendment_is_execution_authority===true&&P.scope_rules?.gaul_geographic_aggregate_must_not_remain_person_polity_target===true&&P.scope_rules?.arverni_is_the_person_polity_target===true&&P.scope_rules?.gallic_coalition_event_authoring_is_optional_metadata_not_correction_prerequisite===true&&P.scope_rules?.legacy_role_coalition_clause_must_not_expand_person_polity_beyond_arverni===true&&P.scope_rules?.year_52_bce_must_remain_year_level_without_subyear_fabrication===true&&P.scope_rules?.production_mutation_authorized===false,'scope');

const prior=[];for(let i=1;i<=15;i++)prior.push(J(`stage2/integration/p6-correction-v2-prebinding-batch${i}.v1.json`));
const prev=new Set(prior.flatMap(b=>(b.cases||[]).map(x=>x.activity_id)));
E(prev.size===51&&!prev.has(id),'prior coverage');
E(M.correction_activities.some(x=>x.activity_id===id),'raw frontier');

const amendment=A.cases.find(x=>x.activity_id===id);
E(amendment?.person==='Vercingetorix'&&amendment.effective_decision==='RELINK_TO_ARVERNI'&&amendment.p6_correction_required===true&&amendment.mandatory_entity_migration===false,'amendment');
E(amendment.effective_target?.kind==='new_polity'&&amendment.effective_target.identity_class===target&&amendment.effective_target.polity_uuid===null&&amendment.effective_target.relation==='rules'&&amendment.effective_target.interval==='52_BE','effective target');

const rel=new Map(K.person_polity_relation_types.map(x=>[x.code,x.id]));
E(rel.get('rules')===rules,'relation catalog');

const authorTarget=PA.targets.find(x=>x.identity_class===target);
E(authorTarget?.polity_uuid===null&&authorTarget.baseline_absence_verified===true&&authorTarget.proposed_catalog_label==='Arverni'&&authorTarget.semantic_name_kind==='historical_attested'&&authorTarget.historical_name_claim===true&&authorTarget.identity_decision_id==='vercingetorix_arverni_new_polity','P5 Arverni authoring target');

const live=I.activity_rows.find(x=>x.activity_id===id),row=L.rows.find(x=>x.activity_id===id),x=P.cases?.[0],F=P.before_tuple_fields;
E(live&&row&&x&&x.type==='rewrite_activity'&&x.mode==='same_uuid_simple_polity_relink','case');
F.forEach((f,i)=>E(x.expected_before[i]===live[f],`before ${f}`));
E(live.person_id===person&&live.polity_id===gaul&&live.role_id===role&&live.period_basis_id===military&&live.period_basis==='military_activity'&&live.activity_start===-52&&live.activity_end===-52&&live.role_source_label==='King of the Arverni and leader of the Gallic Confederation','baseline row');
E(I.activity_rows.filter(a=>a.polity_id===gaul).length===1,'Gaul baseline reference count');

const p4=row.audit?.polity_identity_decision;
E(p4?.id==='vercingetorix_arverni_new_polity'&&p4.reviewed_decision==='RELINK_ARVERNI_AND_MIGRATE_GALLIC_COALITION_COMMAND_TO_EVENT'&&p4.target_disposition==='NEW_POLITY_REQUIRED'&&p4.target_polity_uuid===null&&p4.target_identity_class===target,'P4 decision');

const research=R.cases.find(c=>c.activity_id===id);
E(research?.person==='Vercingetorix'&&research.decision==='RELINK_ARVERNI_AND_MIGRATE_GALLIC_COALITION_COMMAND_TO_EVENT'&&research.relation_hint==='rules'&&research.temporal_action==='retain_52_bce_year_level'&&research.evidence_urls?.length===1,'research contract');

const y=x.proposed_after;
E(y.activity_uuid===id&&y.person_id===person&&y.polity_id===null&&y.polity_identity_class===target&&y.polity_label_for_review==='Arverni'&&y.polity_label_semantic_kind==='historical_attested'&&y.historical_name_claim===true,'proposed polity');
E(y.role_id===role&&y.period_basis_id===military&&y.period_basis==='military_activity'&&y.activity_start===-52&&y.activity_end===-52,'proposed activity');
E(JSON.stringify(y.relation)===JSON.stringify(['rules',rules]),'rules relation');
E(y.start_boundary?.year===-52&&y.end_boundary?.year===-52&&y.start_boundary?.granularity==='year'&&y.end_boundary?.granularity==='year'&&String(y.start_boundary.interpretation).includes('DO NOT INVENT A MONTH OR DAY'),'year boundaries');
E(String(y.role_interpretation).includes('MUST NOT EXPAND THIS PERSON-POLITY RULE RELATION BEYOND THE ARVERNI')&&String(y.notes_policy).includes('WIDER GALLIC COALITION COMMAND MAY BE AUTHORED AS OPTIONAL EVENT/COALITION METADATA'),'role/event safety');

E(x.optional_auxiliary_metadata?.length===1&&x.optional_auxiliary_metadata[0].required_for_correction===false&&String(x.optional_auxiliary_metadata[0].entity).includes('HistoricalEvent'),'optional event');
E(String(x.invalid_current_polity_retirement_policy).includes('EXACTLY ONE BASELINE-A ACTIVITY REFERENCE')&&String(x.invalid_current_polity_retirement_policy).includes('REFERENCE COUNT IS ZERO'),'Gaul retirement policy');
E(P.source_candidates?.length===1&&P.source_candidates[0].candidate_key===sourceKey&&P.source_candidates[0].source_uuid===null&&P.source_candidates[0].canonical_url===research.evidence_urls[0],'source candidate');
E(x.normalized_source_candidate_keys?.length===1&&x.normalized_source_candidate_keys[0]===sourceKey,'source link');
E(String(x.geometry_policy).includes('NO_TERRITORY_OR_GEOMETRY')&&String(x.geometry_policy).includes('P14'),'geometry');

const r=P.result;
E(G.schema==='atlas-stage2-p6-effective-prebinding-progress/v1'&&G.effective_correction_v2_activities===54&&G.completed_prebinding_activities>=52&&G.completed_prebinding_activities<=54&&G.remaining_prebinding_activities<=2&&G.remaining_prebinding_activities>=0&&G.completed_prebinding_activities+G.remaining_prebinding_activities===54&&G.latest_completed_batch>=16&&G.production_mutation_authorized===false,'progress monotonic');
E(Array.isArray(G.remaining_activity_ids)&&G.remaining_activity_ids.length===G.remaining_prebinding_activities&&!G.remaining_activity_ids.includes(id),'progress remaining');
if(G.latest_completed_batch===16) E(G.completed_prebinding_activities===52&&G.remaining_prebinding_activities===2&&G.latest_completed_activity_id===id,'batch16 latest snapshot');
E(r.cumulative_effective_prebinding_activities===52&&r.effective_correction_v2_activities===54&&r.remaining_effective_correction_v2_frontier===2&&r.activity_uuid_preserved_count===1&&r.new_polity_uuid_bindings===0&&r.new_activity_uuid_assignments===0&&r.rules_relation_bindings===1&&r.optional_event_metadata_count===1&&r.invalid_gaul_polity_retirements_executed===0&&r.production_executable===false&&r.production_mutation_authorized===false,'result');
for(const b of ['P5_PRODUCTION_SCHEMA_NOT_APPLIED','ARVERNI_POLITY_UUID_NOT_ASSIGNED','NORMALIZED_REVIEWED_VERCINGETORIX_SOURCE_UUID_BINDING_NOT_COMPLETE','INVALID_GAUL_POLITY_RETIREMENT_NOT_EXECUTED','PRODUCTION_RELEASE_NOT_AUTHORIZED']) E(P.common_execution_blockers.includes(b),b);

console.log(JSON.stringify({marker:'ATLAS_STAGE2_CORRECTION_V2_PREBINDING_BATCH16_OK',cumulative:52,effective_total:54,remaining:2,production:false}));
