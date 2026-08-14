import fs from 'node:fs';

const [frontierPath='artifacts/stage2-baseline-a-effective-p5p6-frontier.json', amendmentPath='stage2/integration/baseline-a-politic-resolution-amendments.v1.json', contractPath='stage2/contracts/politic-resolution-current.v1.json', readinessPath='stage2/integration/p5-effective-readiness-after-politic-resolution.v1.json'] = process.argv.slice(2);
const read=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const frontier=read(frontierPath), amendment=read(amendmentPath), contract=read(contractPath), readiness=read(readinessPath);
const fail=(m)=>{throw new Error(`ATLAS_EFFECTIVE_P5P6_FRONTIER_VERIFY_FAILED: ${m}`)};
if(frontier?.schema!=='atlas-stage2-baseline-a-effective-p5p6-frontier/v1') fail('frontier schema');
if(contract?.schema!=='atlas-stage2-politic-resolution-contract/v1' || contract.status!=='CURRENT') fail('contract schema/status');
if(readiness?.schema!=='atlas-stage2-p5-effective-readiness-after-politic-resolution/v1') fail('readiness schema');
if(frontier.production_execution_authorized!==false || frontier.summary?.production_mutation_authorized!==false || readiness.production_mutation_authorized!==false) fail('Production boundary');
if(frontier.baseline?.baseline_digest!==amendment.baseline?.baseline_digest || readiness.baseline?.baseline_digest!==amendment.baseline?.baseline_digest) fail('baseline digest');
for(const source of (amendment.cases||[]).flatMap(x=>x.source_contracts||[])) if(!fs.existsSync(source)) fail(`source contract missing ${source}`);
for(const target of amendment.replacement_new_polity_targets||[]) if(!target.source_contract || !fs.existsSync(target.source_contract)) fail(`replacement target source missing ${target.identity_class}`);
const s=frontier.summary||{};
const expected={raw_correction_v2_activities:57,effective_correction_v2_activities:54,completed_prebinding_activities:47,remaining_effective_correction_v2_activities:7,raw_new_polity_targets:24,superseded_new_polity_targets:8,replacement_new_polity_targets:1,effective_new_polity_targets:17,raw_entity_migrations:3,mandatory_entity_migrations:0,reviewed_polity_relation_assertions:10};
for(const [k,v] of Object.entries(expected)) if(Number(s[k])!==v) fail(`${k}=${s[k]} expected ${v}`);
if((frontier.effective_correction_activities||[]).length!==54 || (frontier.remaining_effective_correction_activities||[]).length!==7 || (frontier.excluded_correction_activities||[]).length!==3) fail('effective Activity arrays');
if((frontier.effective_new_polity_targets||[]).length!==17 || (frontier.superseded_new_polity_targets||[]).length!==8 || (frontier.replacement_new_polity_targets||[]).length!==1) fail('effective Polity arrays');
if((frontier.polity_relation_assertions||[]).length!==10) fail('Polity relation assertions');
const remaining=new Set((frontier.remaining_effective_correction_activities||[]).map(x=>x.activity_id));
const expectedRemaining=new Set(amendment.effective_remaining_activity_ids||[]);
if(remaining.size!==expectedRemaining.size || [...remaining].some(id=>!expectedRemaining.has(id))) fail('remaining Activity IDs');
const excluded=new Set((frontier.excluded_correction_activities||[]).map(x=>x.activity_id));
for(const id of ['592aa8f9-4eb4-527c-a72d-a78ee7769daf','b4a6b048-9465-539a-bc4b-ec50a057b594','cf0e606a-7f93-5154-93b7-0b3b29a4650a']) if(!excluded.has(id)) fail(`expected overfragmentation exclusion missing ${id}`);
const targetClasses=new Set((frontier.effective_new_polity_targets||[]).map(x=>x.identity_class));
for(const forbidden of amendment.superseded_new_polity_targets||[]) if(targetClasses.has(forbidden)) fail(`superseded micro-target still active ${forbidden}`);
for(const required of ['ARVERNI_POLITICAL_ACTOR','SOURCE_BACKED_EASTERN_ZHEJIANG_REGIONAL_POLITY','DUTCH_REBEL_PROVINCES_POLITICAL_ACTOR']) if(!targetClasses.has(required)) fail(`required target missing ${required}`);
const caseByPerson=new Map((frontier.case_resolutions||[]).map(x=>[x.person,x]));
for(const [person,decision] of Object.entries({
  'Pocatello':'KEEP_CURRENT_COARSE_TRIBAL_POLITIC',
  'Sitting Bull':'KEEP_CURRENT_COARSE_TRIBAL_POLITIC',
  'Niccolo Machiavelli':'KEEP_FLORENCE_POLITIC_NO_REGIME_SPLIT',
  'Jesus':'RETIRE_OVERSPECIFIC_ROW_REUSE_EXISTING_ROMAN_EMPIRE_ACTIVITY',
  'Vercingetorix':'RELINK_TO_ARVERNI',
  'Fang Guozhen':'RELINK_TO_CONTINUOUS_EASTERN_ZHEJIANG_REGIONAL_POLITY'
})) if(caseByPerson.get(person)?.effective_decision!==decision) fail(`${person} decision drift`);
const jesus=caseByPerson.get('Jesus');
if(jesus?.effective_target?.activity_id!=='f4f5f19f-1800-5ca0-9e00-9ba812245a05' || jesus?.effective_target?.canonical_key!=='Roman Empire') fail('Jesus map-level Roman Empire reuse drift');
const shi=caseByPerson.get('Shi Xie');
if((shi?.effective_targets||[]).length!==2 || shi.effective_targets[0].canonical_key!=='Eastern Han' || !String(shi.effective_targets[1].canonical_key).includes('Sun')) fail('Shi Xie allegiance split drift');
const william=caseByPerson.get('William I of Orange');
if((william?.effective_targets||[]).length!==2 || william.effective_targets[0].identity_class!=='DUTCH_REBEL_PROVINCES_POLITICAL_ACTOR' || william.effective_targets[1].canonical_key!=='Spanish Monarchy') fail('William transition model drift');
for(const principle of ['clear_state_context_preferred_when_sufficient','finer_subpolity_requires_independent_or_quasi_independent_authority_or_real_allegiance_change','micro_polity_creation_only_to_avoid_a_people_label_is_forbidden','people_group_and_polity_may_share_a_conventional_label_after_explicit_review','relation_semantics_control_map_interpretation']) if(contract.principles?.[principle]!==true) fail(`contract principle missing ${principle}`);
if(readiness.effective_frontier?.new_polity_targets!==17 || readiness.effective_frontier?.correction_v2_activities!==54 || readiness.effective_frontier?.remaining_prebinding_activities!==7 || readiness.effective_frontier?.mandatory_entity_migrations!==0) fail('effective P5 readiness drift');
if(readiness.schema_capability_policy?.people_group_event_governance_schema_remains_valid!==true || readiness.schema_capability_policy?.old_prepared_micro_polity_candidates_are_evidence_not_active_authoring_targets!==true) fail('schema capability preservation policy');
console.log(JSON.stringify({marker:'ATLAS_EFFECTIVE_P5P6_FRONTIER_OK',effective_correction_v2_activities:54,completed:47,remaining:7,effective_new_polity_targets:17,mandatory_entity_migrations:0,production:false},null,2));
