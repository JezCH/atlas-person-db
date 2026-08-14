import fs from 'node:fs';
const J=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const I=J('artifacts/stage2-baseline-a-intake.json');
const L=J('artifacts/stage2-baseline-a-master-ledger.json');
const M=J('artifacts/stage2-baseline-a-p5p6-execution-manifest.json');
const A=J('stage2/integration/baseline-a-politic-resolution-amendments.v1.json');
const P=J('stage2/integration/p6-correction-v2-prebinding-batch14.v1.json');
const K=J('stage2/catalogs/relation-types.v1.json');
const R=J('research/residual/stage2-baseline-a-residual-22-resolution.v1.json');
const G=J('stage2/integration/p6-effective-prebinding-progress.v1.json');

const id='4fe7a2d1-c4de-5451-b660-cf17d5475e4e';
const dutchRevolt='ba7a7e2d-3ba5-5a54-a98f-88294d3429f7';
const spanish='b7f3e13a-4b68-5fd9-aad6-b2b951de0996';
const role='caf6d45b-5d36-5d17-9750-aff653fceb97';
const general='b00e85f9-aa05-5bd1-b5d5-0bc3a2f73d2e';
const term='e78bcf72-81e3-5db8-a76a-8c2ca9c6d745';
const governs='67a57b37-1853-5f2a-b7ab-e6b2d32b56b6';
const opposes='5d2d3af6-6e53-5af1-8423-f76c2263afe4';
const E=(x,m)=>{if(!x)throw Error(`P6B14 ${m}`)};

E(P.schema==='atlas-stage2-correction-v2-prebinding-plan/v1'&&P.batch_id==='p6_correction_v2_prebinding_batch14_william_orange_parallel_governance_opposition'&&P.status==='PREBINDING_ONLY_NOT_PRODUCTION_EXECUTABLE','plan');
E(P.scope_rules?.latest_politic_resolution_amendment_is_execution_authority===true&&P.scope_rules?.dutch_revolt_event_must_not_remain_person_polity_target===true&&P.scope_rules?.historical_event_authoring_is_optional_metadata_not_correction_prerequisite===true&&P.scope_rules?.parallel_relations_must_preserve_1568_opposition_and_1572_governance===true&&P.scope_rules?.production_mutation_authorized===false,'scope');

const prior=[];for(let i=1;i<=13;i++)prior.push(J(`stage2/integration/p6-correction-v2-prebinding-batch${i}.v1.json`));
const prev=new Set(prior.flatMap(b=>(b.cases||[]).map(x=>x.activity_id)));
E(prev.size===49&&!prev.has(id),'prior coverage');
E(M.correction_activities.some(x=>x.activity_id===id),'raw frontier');

const amendment=A.cases.find(x=>x.activity_id===id);
E(amendment?.person==='William I of Orange'&&amendment.effective_decision==='REPLACE_EVENT_WITH_ONE_TRANSITIONAL_DUTCH_POLITICAL_ACTOR_PLUS_OPPOSITION_RELATION'&&amendment.p6_correction_required===true&&amendment.mandatory_entity_migration===false,'amendment');
E(amendment.effective_targets?.length===2&&amendment.effective_targets[0].identity_class==='DUTCH_REBEL_PROVINCES_POLITICAL_ACTOR'&&amendment.effective_targets[0].polity_uuid===null&&amendment.effective_targets[0].relation==='governs'&&amendment.effective_targets[0].interval==='1572-1584','govern target');
E(amendment.effective_targets[1].polity_uuid===spanish&&amendment.effective_targets[1].relation==='opposes'&&amendment.effective_targets[1].interval==='1568-1584','opposition target');
for(const c of ['SOURCE_BACKED_HOLLAND_POLITICAL_AUTHORITY_FROM_1572','SOURCE_BACKED_ZEELAND_POLITICAL_AUTHORITY_FROM_1572']) E(A.superseded_new_polity_identity_classes.includes(c)&&amendment.superseded_new_polity_targets.includes(c),`superseded ${c}`);
const replacement=A.replacement_new_polity_targets.find(x=>x.identity_class==='DUTCH_REBEL_PROVINCES_POLITICAL_ACTOR');
E(replacement?.polity_uuid===null&&replacement.baseline_absence_verified===true&&replacement.semantic_name_kind==='editorial_catalog_label'&&replacement.historical_name_claim===false&&replacement.person_relation==='governs','replacement polity target');

const rel=new Map(K.person_polity_relation_types.map(x=>[x.code,x.id]));
E(rel.get('governs')===governs&&rel.get('opposes')===opposes,'relation catalog');

const live=I.activity_rows.find(x=>x.activity_id===id),row=L.rows.find(x=>x.activity_id===id),x=P.cases?.[0],F=P.before_tuple_fields;
E(live&&row&&x&&x.type==='split_activity'&&x.mode==='parallel_relation_split_event_polity_retirement','case');
F.forEach((f,i)=>E(x.expected_before[i]===live[f],`before ${f}`));
E(live.person_id==='91b6365a-4192-5fcb-836e-3250f60d6e02'&&live.polity_id===dutchRevolt&&live.role_id===role&&live.period_basis_id===general&&live.period_basis==='general_activity'&&live.activity_start===1568&&live.activity_end===1584,'baseline row');
E(I.activity_rows.filter(a=>a.polity_id===dutchRevolt).length===1,'dutch revolt baseline reference count');

const p4=row.audit?.polity_identity_decision;
E(p4?.id==='william_orange_dutch_revolt_event_and_authorities_split'&&p4.reviewed_decision==='MIGRATE_DUTCH_REVOLT_TO_EVENT_AND_SPLIT_GOVERNING_OPPOSITION_RELATIONS'&&p4.split_targets?.length===3,'p4 decision');
E(p4.split_targets.some(t=>t.polity_uuid===spanish&&t.relation==='opposes'),'p4 spanish opposition');
const research=R.cases.find(c=>c.activity_id===id);
E(research?.decision==='MIGRATE_DUTCH_REVOLT_TO_EVENT_AND_SPLIT_GOVERNING_OPPOSITION_RELATIONS'&&research.temporal_action==='event_from_1568_governance_from_1572'&&research.evidence_urls?.length===1,'research contract');

E(x.survivor_fragment_id==='william_1568_1584_spanish_monarchy_opposition'&&x.fragments?.length===2,'split structure');
const opposition=x.fragments.find(f=>f.id===x.survivor_fragment_id);
const governance=x.fragments.find(f=>f.id==='william_1572_1584_dutch_rebel_governance');
E(opposition?.activity_uuid===id&&governance?.activity_uuid===null,'activity uuids');
E(opposition.polity_id===spanish&&opposition.activity_start===1568&&opposition.activity_end===1584&&opposition.role_id===role&&opposition.period_basis_id===general&&opposition.period_basis==='general_activity','opposition fragment');
E(JSON.stringify(opposition.relation)===JSON.stringify(['opposes',opposes]),'opposition relation');
E(governance.polity_id===null&&governance.polity_identity_class==='DUTCH_REBEL_PROVINCES_POLITICAL_ACTOR'&&governance.activity_start===1572&&governance.activity_end===1584&&governance.role_id===role&&governance.period_basis_id===term&&governance.period_basis==='term','governance fragment');
E(JSON.stringify(governance.relation)===JSON.stringify(['governs',governs]),'governance relation');

E(opposition.start_boundary?.granularity==='year'&&governance.start_boundary?.granularity==='year'&&String(x.overlap_policy).includes('1572-1584 OVERLAP IS INTENTIONAL')&&String(x.overlap_policy).includes('DIFFERENT PERSON-POLITY RELATIONS'),'parallel overlap policy');
E(String(opposition.role_interpretation).includes('MUST NOT BE READ AS SERVICE TO THE SPANISH MONARCHY')&&String(governance.display_policy).includes('NOT A CLAIMED HISTORICAL STATE NAME')&&String(governance.display_policy).includes('DO NOT BACK-PROJECT THE LATER DUTCH REPUBLIC'),'semantic safeguards');
E(String(x.invalid_current_polity_retirement_policy).includes('ONE BASELINE-A ACTIVITY REFERENCE')&&String(x.invalid_current_polity_retirement_policy).includes('REFERENCE COUNT IS ZERO'),'retirement policy');
E(x.optional_auxiliary_metadata?.length===1&&x.optional_auxiliary_metadata[0].entity==='HistoricalEvent'&&x.optional_auxiliary_metadata[0].required_for_correction===false,'optional event');
E(P.source_candidates?.length===1&&P.source_candidates[0].source_uuid===null&&P.source_candidates[0].canonical_url===research.evidence_urls[0]&&P.source_candidates[0].supports?.includes('reviewed_1572_governing_authority_context'),'source candidate');
E(x.normalized_source_candidate_keys?.length===1&&x.normalized_source_candidate_keys[0]===P.source_candidates[0].candidate_key,'source link');
E(String(x.geometry_policy).includes('NO_TERRITORY_OR_GEOMETRY')&&String(x.geometry_policy).includes('PERSON-OWNED GEOMETRY'),'geometry');

const r=P.result;
E(G.schema==='atlas-stage2-p6-effective-prebinding-progress/v1'&&G.effective_correction_v2_activities===54&&G.completed_prebinding_activities>=50&&G.completed_prebinding_activities<=54&&G.remaining_prebinding_activities<=4&&G.remaining_prebinding_activities>=0&&G.completed_prebinding_activities+G.remaining_prebinding_activities===54&&G.latest_completed_batch>=14&&G.production_mutation_authorized===false,'progress monotonic');
E(Array.isArray(G.remaining_activity_ids)&&G.remaining_activity_ids.length===G.remaining_prebinding_activities&&!G.remaining_activity_ids.includes(id),'progress remaining');
if(G.latest_completed_batch===14) E(G.completed_prebinding_activities===50&&G.remaining_prebinding_activities===4&&G.latest_completed_activity_id===id,'batch14 latest snapshot');
E(r.cumulative_effective_prebinding_activities===50&&r.effective_correction_v2_activities===54&&r.remaining_effective_correction_v2_frontier===4&&r.new_polity_uuid_bindings===0&&r.new_activity_uuid_assignments===0&&r.invalid_dutch_revolt_polity_retirements_executed===0&&r.production_executable===false&&r.production_mutation_authorized===false,'result');
for(const b of ['P5_PRODUCTION_SCHEMA_NOT_APPLIED','DUTCH_REBEL_PROVINCES_POLITY_UUID_NOT_ASSIGNED','NEW_GOVERNING_ACTIVITY_UUID_NOT_ASSIGNED','NORMALIZED_REVIEWED_WILLIAM_ORANGE_SOURCE_UUID_BINDINGS_NOT_COMPLETE','INVALID_DUTCH_REVOLT_POLITY_RETIREMENT_NOT_EXECUTED','PRODUCTION_RELEASE_NOT_AUTHORIZED']) E(P.common_execution_blockers.includes(b),b);

console.log(JSON.stringify({marker:'ATLAS_STAGE2_CORRECTION_V2_PREBINDING_BATCH14_OK',cumulative:50,effective_total:54,remaining:4,production:false}));
