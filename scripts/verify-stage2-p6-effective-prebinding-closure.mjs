import fs from 'node:fs';
const J=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const C=J('stage2/integration/p6-effective-prebinding-closure.v1.json');
const A=J('stage2/integration/baseline-a-politic-resolution-amendments.v1.json');
const M=J('artifacts/stage2-baseline-a-p5p6-execution-manifest.json');
const G=J('stage2/integration/p6-effective-prebinding-progress.v1.json');
const E=(x,m)=>{if(!x)throw Error(`P6C ${m}`)};

E(C.schema==='atlas-stage2-p6-effective-prebinding-closure/v1'&&C.status==='P6_EFFECTIVE_PREBINDING_CLOSED_BRANCH_ONLY_NO_PRODUCTION_MUTATION','closure contract');
E(C.baseline?.deployment_sha==='ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79'&&C.baseline?.baseline_digest==='sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27','baseline');
E(M.schema==='atlas-stage2-baseline-a-p5p6-execution-manifest/v2'&&M.correction_activities?.length===57,'legacy manifest');
E(Array.isArray(A.correction_activity_exclusions)&&A.correction_activity_exclusions.length===3,'exclusions');
const raw=new Set(M.correction_activities.map(x=>x.activity_id));
const excluded=new Set(A.correction_activity_exclusions);
E(excluded.size===3&&[...excluded].every(id=>raw.has(id)),'excluded subset');
const effective=new Set([...raw].filter(id=>!excluded.has(id)));
E(effective.size===54,'effective count');

const all=[];
for(let i=1;i<=18;i++) {
  const b=J(`stage2/integration/p6-correction-v2-prebinding-batch${i}.v1.json`);
  E(b.status==='PREBINDING_ONLY_NOT_PRODUCTION_EXECUTABLE',`batch ${i} status`);
  E(b.result?.production_executable===false&&b.result?.production_mutation_authorized===false,`batch ${i} production`);
  for(const x of b.cases||[]) all.push({batch:i,id:x.activity_id});
}
const seen=new Map();
for(const x of all) {
  E(!seen.has(x.id),`duplicate activity ${x.id}`);
  seen.set(x.id,x.batch);
}
E(seen.size===54,'unique prebinding coverage');
E([...effective].every(id=>seen.has(id))&&[...seen.keys()].every(id=>effective.has(id)),'exact effective-set coverage');
E([...excluded].every(id=>!seen.has(id)),'superseded excluded');

E(G.schema==='atlas-stage2-p6-effective-prebinding-progress/v1'&&G.effective_correction_v2_activities===54&&G.completed_prebinding_activities===54&&G.remaining_prebinding_activities===0&&G.latest_completed_batch===18&&Array.isArray(G.remaining_activity_ids)&&G.remaining_activity_ids.length===0&&G.production_mutation_authorized===false,'progress closed');
E(C.closure?.legacy_correction_v2_activity_count===57&&C.closure?.effective_correction_v2_activity_count===54&&C.closure?.superseded_correction_activity_count===3&&C.closure?.completed_effective_prebinding_activity_count===54&&C.closure?.remaining_effective_prebinding_activity_count===0&&C.closure?.latest_batch===18&&C.closure?.mandatory_entity_migration_activity_count===0&&C.closure?.production_executable===false&&C.closure?.production_mutation_authorized===false,'closure summary');
E(A.mandatory_entity_migration_activity_ids?.length===0,'mandatory migrations zero');
for(const [k,v] of Object.entries(C.invariants||{})) E(v===true,`invariant ${k}`);
E(C.next_gate?.p5_production_schema_apply_may_be_prepared===true&&C.next_gate?.correction_v2_execution_manifest_may_be_authored===true&&C.next_gate?.production_apply_still_requires_explicit_release_authorization_and_live_before_state_verification===true,'next gate');

console.log(JSON.stringify({marker:'ATLAS_STAGE2_P6_EFFECTIVE_PREBINDING_CLOSED',legacy:57,effective:54,completed:54,remaining:0,batches:18,production:false}));
