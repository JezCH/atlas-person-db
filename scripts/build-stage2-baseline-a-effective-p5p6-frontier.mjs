import fs from 'node:fs';
import path from 'node:path';

const [rawManifestPath='artifacts/stage2-baseline-a-p5p6-execution-manifest.json', amendmentPath='stage2/integration/baseline-a-politic-resolution-amendments.v1.json', intakePath='artifacts/stage2-baseline-a-intake.json', outPath='artifacts/stage2-baseline-a-effective-p5p6-frontier.json'] = process.argv.slice(2);
const read=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const raw=read(rawManifestPath);
const amendment=read(amendmentPath);
const intake=read(intakePath);
const fail=(m)=>{throw new Error(`ATLAS_EFFECTIVE_P5P6_FRONTIER_INVALID: ${m}`)};

if(raw?.schema!=='atlas-stage2-baseline-a-p5p6-execution-manifest/v2') fail('raw manifest schema drift');
if(amendment?.schema!=='atlas-stage2-baseline-a-politic-resolution-amendments/v1') fail('amendment schema drift');
if(raw.production_execution_authorized!==false || amendment.production_execution_authorized!==false || amendment.rules?.production_mutation_authorized!==false) fail('Production boundary lost');
if(raw.derived_from?.baseline?.baseline_digest!==amendment.baseline?.baseline_digest || raw.derived_from?.baseline?.deployment_sha!==amendment.baseline?.deployment_sha) fail('Baseline mismatch');
if(Number(raw.summary?.correction_v2_activity_count)!==57 || Number(raw.summary?.new_polity_target_count)!==24 || Number(raw.summary?.entity_migration_count)!==3) fail('legacy frontier drift');
if((raw.polity_relation_assertions||[]).length!==10) fail('reviewed Polity relation assertion drift');
if(intake?.schema!=='atlas-stage2-baseline-a-intake/v2' || intake.baseline_digest!==amendment.baseline?.baseline_digest || intake.deployment_sha!==amendment.baseline?.deployment_sha) fail('Baseline A intake drift');
const intakeActivities=new Map((intake.activity_rows||[]).map(x=>[x.activity_id,x]));
const intakePolities=new Map((intake.identity_catalogs?.polities||[]).map(x=>[x.id,x]));
for(const resolution of amendment.cases||[]){
  const live=intakeActivities.get(resolution.activity_id);
  if(!live || live.person_name_en!==resolution.person || live.polity_name_en!==resolution.legacy_polity) fail(`amendment Baseline binding drift ${resolution.activity_id}`);
  const targets=[...(resolution.effective_targets||[]), ...(resolution.effective_target?[resolution.effective_target]:[])];
  for(const target of targets){
    if(target.kind==='existing_polity' && !intakePolities.has(target.polity_uuid)) fail(`effective existing Polity absent from Baseline A ${target.polity_uuid}`);
    if(target.kind==='existing_activity'){
      const other=intakeActivities.get(target.activity_id);
      if(!other || other.person_id!==live.person_id || other.activity_start!==live.activity_start || other.activity_end!==live.activity_end || other.role_id!==live.role_id) fail(`effective existing Activity reuse mismatch ${target.activity_id}`);
      if(other.polity_id!==target.polity_uuid) fail(`effective existing Activity Polity mismatch ${target.activity_id}`);
    }
    if(target.kind==='new_polity' && target.polity_uuid!==null) fail(`new effective Polity UUID must remain null ${target.identity_class}`);
  }
}

const rawActivityIds=new Set((raw.correction_activities||[]).map(x=>x.activity_id));
const legacyRemaining=new Set(amendment.legacy_remaining_activity_ids||[]);
const exclusions=new Set(amendment.correction_activity_exclusions||[]);
const expectedRemaining=new Set(amendment.effective_remaining_activity_ids||[]);
if(legacyRemaining.size!==10 || exclusions.size!==3 || expectedRemaining.size!==7) fail('amendment activity cardinality drift');
for(const id of legacyRemaining) if(!rawActivityIds.has(id)) fail(`legacy remaining Activity absent from raw frontier ${id}`);
for(const id of exclusions) if(!legacyRemaining.has(id)) fail(`excluded Activity not in legacy remaining set ${id}`);
for(const id of expectedRemaining) if(!legacyRemaining.has(id) || exclusions.has(id)) fail(`invalid effective remaining Activity ${id}`);

const effectiveCorrectionActivities=(raw.correction_activities||[]).filter(x=>!exclusions.has(x.activity_id)).map(x=>{
  const resolution=(amendment.cases||[]).find(c=>c.activity_id===x.activity_id);
  return resolution?{...x,effective_politic_resolution:{effective_decision:resolution.effective_decision,mandatory_entity_migration:false,person_relation:resolution.person_relation??null}}:x;
});
if(effectiveCorrectionActivities.length!==54 || new Set(effectiveCorrectionActivities.map(x=>x.activity_id)).size!==54) fail('effective correction frontier drift');
const remainingEffective=effectiveCorrectionActivities.filter(x=>expectedRemaining.has(x.activity_id));
if(remainingEffective.length!==7) fail('effective remaining correction count drift');

const rawTargetMap=new Map((raw.new_polity_targets||[]).map(x=>[x.identity_class,x]));
const supersededTargetClasses=new Set(amendment.superseded_new_polity_identity_classes||[]);
if(supersededTargetClasses.size!==8) fail('superseded target count drift');
for(const key of supersededTargetClasses) if(!rawTargetMap.has(key)) fail(`superseded target absent from raw frontier ${key}`);
const replacementTargets=amendment.replacement_new_polity_targets||[];
if(replacementTargets.length!==1) fail('replacement target count drift');
for(const target of replacementTargets){
  if(target.polity_uuid!==null || target.baseline_absence_verified!==true || target.territory_geometry_status!=='P14_DEFERRED') fail(`invalid replacement target ${target.identity_class}`);
  if(rawTargetMap.has(target.identity_class)) fail(`replacement target already exists in raw frontier ${target.identity_class}`);
}
const effectiveNewPolityTargets=[
  ...(raw.new_polity_targets||[]).filter(x=>!supersededTargetClasses.has(x.identity_class)),
  ...replacementTargets.map(target=>({...target,target_polity_uuid:null,origins:[{source:'POLITIC_RESOLUTION_AMENDMENT',activity_id:target.origin_activity_id,decision_id:'william_orange_effective_politic_resolution',origin:'replacement_target',source_contract:target.source_contract}]}))
].sort((a,b)=>a.identity_class.localeCompare(b.identity_class));
if(effectiveNewPolityTargets.length!==17 || new Set(effectiveNewPolityTargets.map(x=>x.identity_class)).size!==17) fail('effective new Polity frontier drift');

const caseMap=new Map((amendment.cases||[]).map(x=>[x.activity_id,x]));
if(caseMap.size!==10) fail('amendment case count drift');
for(const id of legacyRemaining) if(!caseMap.has(id)) fail(`amendment case missing ${id}`);
const excludedCases=(amendment.cases||[]).filter(x=>x.p6_correction_required===false);
if(excludedCases.length!==3 || excludedCases.some(x=>!exclusions.has(x.activity_id))) fail('P6 exclusion case drift');
const retainedCases=(amendment.cases||[]).filter(x=>x.p6_correction_required===true);
if(retainedCases.length!==7 || retainedCases.some(x=>!expectedRemaining.has(x.activity_id))) fail('remaining P6 case drift');
if((amendment.mandatory_entity_migration_activity_ids||[]).length!==0) fail('mandatory entity migrations must be zero after amendment');

const expected=amendment.expected_effective_frontier||{};
for(const [k,v] of Object.entries({correction_v2_activities:54,new_polity_targets:17,mandatory_entity_migrations:0,completed_prebinding_activities:47,remaining_prebinding_activities:7,reviewed_polity_relation_assertions:10})) if(Number(expected[k])!==v) fail(`amendment expected count drift ${k}`);

const frontier={
  schema:'atlas-stage2-baseline-a-effective-p5p6-frontier/v1',
  as_of:amendment.as_of,
  status:'EFFECTIVE_P5P6_FRONTIER_AFTER_LATEST_POLITIC_RESOLUTION_NO_PRODUCTION_MUTATION',
  baseline:amendment.baseline,
  derived_from:{raw_manifest:rawManifestPath,amendment:amendmentPath,intake:intakePath,contract:amendment.contract},
  summary:{
    raw_correction_v2_activities:57,
    effective_correction_v2_activities:54,
    completed_prebinding_activities:47,
    remaining_effective_correction_v2_activities:7,
    raw_new_polity_targets:24,
    superseded_new_polity_targets:8,
    replacement_new_polity_targets:1,
    effective_new_polity_targets:17,
    raw_entity_migrations:3,
    mandatory_entity_migrations:0,
    reviewed_polity_relation_assertions:10,
    production_mutation_authorized:false
  },
  effective_correction_activities:effectiveCorrectionActivities,
  remaining_effective_correction_activities:remainingEffective,
  excluded_correction_activities:excludedCases,
  effective_new_polity_targets:effectiveNewPolityTargets,
  superseded_new_polity_targets:(raw.new_polity_targets||[]).filter(x=>supersededTargetClasses.has(x.identity_class)),
  replacement_new_polity_targets:replacementTargets,
  case_resolutions:amendment.cases,
  optional_auxiliary_entity_metadata:amendment.optional_auxiliary_entity_metadata||[],
  polity_relation_assertions:raw.polity_relation_assertions,
  production_execution_authorized:false
};
fs.mkdirSync(path.dirname(outPath),{recursive:true});
fs.writeFileSync(outPath,`${JSON.stringify(frontier,null,2)}\n`);
console.log(JSON.stringify({marker:'ATLAS_EFFECTIVE_P5P6_FRONTIER_BUILT',...frontier.summary},null,2));
