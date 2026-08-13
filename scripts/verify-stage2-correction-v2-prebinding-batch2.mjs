import fs from 'node:fs';

const intake=JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-intake.json','utf8'));
const ledger=JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-master-ledger.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('artifacts/stage2-baseline-a-p5p6-execution-manifest.json','utf8'));
const plan=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch2.v1.json','utf8'));
const batch1=JSON.parse(fs.readFileSync('stage2/integration/p6-correction-v2-prebinding-batch1.v1.json','utf8'));
const contract=JSON.parse(fs.readFileSync('stage2/contracts/correction-v2-current.v1.json','utf8'));
const catalog=JSON.parse(fs.readFileSync('stage2/catalogs/relation-types.v1.json','utf8'));
const p4Base=JSON.parse(fs.readFileSync('stage2/integration/baseline-a-polity-identity-decisions.v1.json','utf8'));
const requirements=JSON.parse(fs.readFileSync('requirements/atlas-requirements.v1.json','utf8'));

const digest='sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const deployment='ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
if(intake?.schema!=='atlas-stage2-baseline-a-intake/v2'||intake.baseline_digest!==digest||intake.deployment_sha!==deployment) throw new Error('Baseline A intake drift');
if(ledger?.schema!=='atlas-stage2-baseline-a-master-ledger/v2'||ledger.baseline?.baseline_digest!==digest) throw new Error('Baseline A ledger drift');
if(manifest?.schema!=='atlas-stage2-baseline-a-p5p6-execution-manifest/v2'||Number(manifest.summary?.correction_v2_activity_count)!==57) throw new Error('Correction v2 frontier drift');
if(contract?.schema!=='atlas-stage2-correction-v2-contract/v1'||contract.status!=='P6_BRANCH_ONLY_CONTRACT_NO_PRODUCTION_MUTATION'||contract.release_boundary?.production_mutation_authorized!==false) throw new Error('Correction v2 contract drift');
if(plan?.schema!=='atlas-stage2-correction-v2-prebinding-plan/v1'||plan.batch_id!=='p6_correction_v2_prebinding_batch2_existing_uuid_relation_semantics'||plan.status!=='PREBINDING_ONLY_NOT_PRODUCTION_EXECUTABLE') throw new Error('P6 Batch 2 plan drift');
if(plan.contract!=='stage2/contracts/correction-v2-current.v1.json'||plan.catalog!=='stage2/catalogs/relation-types.v1.json'||plan.baseline?.deployment_sha!==deployment||plan.baseline?.baseline_digest!==digest) throw new Error('P6 Batch 2 contract/Baseline linkage drift');
if(plan.scope_rules?.existing_polity_uuid_only!==true||plan.scope_rules?.merge_retire_split_new_polity_forbidden_in_this_batch!==true||plan.scope_rules?.activity_uuid_preserved!==true||plan.scope_rules?.activity_year_interval_preserved!==true||plan.scope_rules?.companion_semantics_retained!==true||plan.scope_rules?.production_mutation_authorized!==false) throw new Error('P6 Batch 2 scope safety drift');
if(!['P5_PRODUCTION_SCHEMA_NOT_APPLIED','NORMALIZED_REVIEWED_EVIDENCE_FOR_COMPANION_SEMANTICS_NOT_COMPLETE','PRODUCTION_RELEASE_NOT_AUTHORIZED'].every((b)=>(plan.common_execution_blockers||[]).includes(b))) throw new Error('P6 Batch 2 execution blockers incomplete');
if(plan.source_preservation_policy?.silent_source_drop_forbidden!==true||!String(plan.source_preservation_policy?.rewrite_activity||'').includes('PRESERVE_ALL_EXISTING_ACTIVITY_SOURCE_LINKS')) throw new Error('P6 Batch 2 source preservation drift');

const reqById=new Map((requirements.requirements||[]).map((r)=>[r.id,r]));
if(reqById.get('ATLAS-RQ-0215')?.status!=='PENDING'||reqById.get('ATLAS-RQ-0216')?.status!=='PENDING') throw new Error('P5/P6 Production requirements must remain pending');
const relationByCode=new Map((catalog.person_polity_relation_types||[]).map((r)=>[r.code,r.id]));
if(relationByCode.get('rules')!=='7ca4de8f-01d4-542c-acc1-a06848c6742c'||relationByCode.get('active_in')!=='f33d2789-2e65-50c1-af3e-91335bcbd3ca') throw new Error('P6 Batch 2 Relation Type UUID drift');

const beforeFields=plan.before_tuple_fields||[];
const expectedFields=['person_id','polity_id','role_id','period_basis_id','activity_start','activity_end','confidence','chronology_status','legacy_source_key','source_count'];
if(JSON.stringify(beforeFields)!==JSON.stringify(expectedFields)) throw new Error('P6 Batch 2 before tuple field drift');
const intakeByActivity=new Map((intake.activity_rows||[]).map((r)=>[r.activity_id,r]));
const ledgerByActivity=new Map((ledger.rows||[]).map((r)=>[r.activity_id,r]));
const frontier=new Set((manifest.correction_activities||[]).map((r)=>r.activity_id));
const batch1Ids=new Set((batch1.cases||[]).map((r)=>r.activity_id));
const baseP4ById=new Map((p4Base.decisions||[]).map((d)=>[d.id,d]));
const expectedDecisionIds=new Set([
'hammurabi_babylon_first_dynasty','new_kingdom_egypt_hatshepsut','new_kingdom_egypt_akhenaten','new_kingdom_egypt_ramses_ii','trung_trac_short_lived_polity_reuse','hypatia_pre395_roman_context','hypatia_post395_eastern_roman_context','peter_post1721_stable_russia_reuse','maria_pre1815_portugal_reuse','maria_distinct_1815_union_keep'
]);
if(!Array.isArray(plan.cases)||plan.cases.length!==10) throw new Error('P6 Batch 2 case count drift');
const seen=new Set();let rules=0,activeIn=0;
for(const item of plan.cases){
  if(!expectedDecisionIds.has(item.p4_decision_id)||seen.has(item.activity_id)||batch1Ids.has(item.activity_id)) throw new Error(`unexpected/duplicate/overlap P6 Batch 2 case ${item.activity_id}`);
  seen.add(item.activity_id);
  if(!frontier.has(item.activity_id)) throw new Error(`${item.activity_id}: outside authoritative 57-Activity frontier`);
  const live=intakeByActivity.get(item.activity_id);const row=ledgerByActivity.get(item.activity_id);
  if(!live||!row) throw new Error(`${item.activity_id}: missing Baseline A row`);
  if(item.person!==row.person?.canonical) throw new Error(`${item.activity_id}: person drift`);
  if(!Array.isArray(item.expected_before)||item.expected_before.length!==beforeFields.length) throw new Error(`${item.activity_id}: before tuple shape drift`);
  for(let i=0;i<beforeFields.length;i++){const field=beforeFields[i];if(item.expected_before[i]!==live[field]) throw new Error(`${item.activity_id}: exact before-state drift ${field}`);}
  const p4=row.audit?.polity_identity_decision;
  if(!p4||p4.id!==item.p4_decision_id||p4.status!=='P4_IDENTITY_DECIDED_IMPLEMENTATION_PENDING') throw new Error(`${item.activity_id}: P4 decision overlay drift`);
  if(!['REUSE_CURRENT_UUID','KEEP_DISTINCT'].includes(p4.target_disposition)||p4.target_polity_uuid!==live.polity_id||item.target_polity_uuid!==live.polity_id||item.target_polity_uuid!==p4.target_polity_uuid||item.target_identity_class!==p4.target_identity_class) throw new Error(`${item.activity_id}: existing Polity reuse boundary drift`);
  if(p4.activity_disposition||((p4.split_targets||[]).length>0)) throw new Error(`${item.activity_id}: Batch 2 may not contain retire/split identity cases`);
  if(!item.source_contract||item.source_contract!==p4.source_contract||!fs.existsSync(item.source_contract)) throw new Error(`${item.activity_id}: reviewed source contract drift`);
  const expectedCompanion=(p4.required_later_actions||[]).filter((action)=>action!=='RELATION_SET');
  if(JSON.stringify(item.companion_actions||[])!==JSON.stringify(expectedCompanion)) throw new Error(`${item.activity_id}: companion semantic actions drift`);
  const relation=item.relation||[];
  const code=relation[0],id=relation[1];
  if(!['rules','active_in'].includes(code)||relationByCode.get(code)!==id) throw new Error(`${item.activity_id}: Relation Type UUID binding drift`);
  const baseDecision=baseP4ById.get(item.p4_decision_id);
  const reviewedHint=baseDecision?.relation_hint ?? row.audit?.relation_hint;
  if(reviewedHint!==code) throw new Error(`${item.activity_id}: planned relation ${code} does not match reviewed relation ${reviewedHint}`);
  if(code==='rules') rules+=1; else activeIn+=1;
}
if(seen.size!==10||rules!==8||activeIn!==2) throw new Error(`P6 Batch 2 aggregate drift cases=${seen.size} rules=${rules} active_in=${activeIn}`);
const combined=new Set([...batch1Ids,...seen]);
if(batch1Ids.size!==9||combined.size!==19||57-combined.size!==38) throw new Error(`P6 cumulative prebinding coverage drift batch1=${batch1Ids.size} total=${combined.size} remaining=${57-combined.size}`);
const result=plan.result||{};
if(Number(result.case_count)!==10||Number(result.rewrite_activity_count)!==10||Number(result.rules_relation_count)!==8||Number(result.active_in_relation_count)!==2||Number(result.existing_polity_uuid_reuses)!==10||Number(result.new_polity_uuid_bindings)!==0||Number(result.new_activity_uuid_assignments)!==0||Number(result.merge_operations)!==0||Number(result.retire_operations)!==0||Number(result.split_operations)!==0||result.production_executable!==false||result.production_mutation_authorized!==false) throw new Error('P6 Batch 2 result summary drift');

console.log(JSON.stringify({marker:'ATLAS_STAGE2_CORRECTION_V2_PREBINDING_BATCH2_OK',batch2_cases:10,batch2_rewrites:10,rules:8,active_in:2,existing_polity_uuid_reuses:10,new_uuid_assignments:0,cumulative_prebinding_activities:19,remaining_correction_v2_frontier:38,production_executable:false,production_mutation_authorized:false},null,2));
