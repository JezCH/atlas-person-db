import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const sem=require('../server/atlas-activity-semantic-key-v2.js');
const p9Planner=require('../server/atlas-p9-mutation-planner.js');
const reconciliation=require('../server/atlas-relationship-reconciliation.js');
const interlock=require('../server/atlas-person-merge-interlock.js');
const manifest=JSON.parse(fs.readFileSync('stage2/releases/p9-semantic-key-v2-cutover.v1.json','utf8'));
if(fs.existsSync('artifacts/stage2-p7p8-effective-cutover-gate.json')){
  const p8=JSON.parse(fs.readFileSync('artifacts/stage2-p7p8-effective-cutover-gate.json','utf8'));
  assert.equal(p8.p8_zero_known_blocker_gate.status,'ZERO_KNOWN_BLOCKERS');
  assert.equal(p8.p8_zero_known_blocker_gate.known_runtime_semantic_blockers,0);
  assert.equal(p8.p8_zero_known_blocker_gate.cutover_allowed,true);
}
const mutationHandler=fs.readFileSync('server/atlas-vercel-mutation-handler.js','utf8');
const dispatch=fs.readFileSync('server/atlas-authoring-manifest-dispatch-service.js','utf8');
const nativeAuthoring=fs.readFileSync('server/atlas-authoring-manifest-v2-native-service.js','utf8');
const nativeActivity=fs.readFileSync('server/atlas-stage2-native-activity-service.js','utf8');
const sql=fs.readFileSync('db/proposals/stage2_activity_semantic_key.rehearsal.sql','utf8');

assert.equal(sem.SEMANTIC_KEY_VERSION,'atlas-activity-semantic-key/v2');
assert.equal(manifest.status,'BRANCH_ONLY_P9_SEMANTIC_KEY_V2_GLOBAL_CUTOVER_COMPLETE_NO_PRODUCTION_MUTATION');
assert.equal(manifest.prerequisite.p8_status,'ZERO_KNOWN_BLOCKERS');
assert.equal(manifest.prerequisite.p8_verified_integrity_run,606);
assert.equal(manifest.prerequisite.p8_effective_blockers,0);
assert.equal(manifest.canonical_activity_identity.version,sem.SEMANTIC_KEY_VERSION);
assert.equal(manifest.rules.production_mutation_authorized,false);

for(const op of ['create','update','import','reconcile']){
  const plan=p9Planner.plan(op,op==='import'?[]:{});
  assert.equal(plan.commit,false);
  assert.equal(plan.commands.length,0);
  assert.equal(plan.blockers[0]?.code,p9Planner.P9_MUTATION_BLOCK_CODE);
}
assert.equal(p9Planner.plan('delete',{id:'activity-id'}).commands[0]?.type,'DELETE_PERSON_POLITICS_V2_BY_ID');
assert.match(mutationHandler,/atlas-p9-mutation-planner\.js/);
assert.doesNotMatch(mutationHandler,/require\("\.\.\/atlas-v2-command-planner\.js"\)/);
assert.match(dispatch,/AUTHORING_MANIFEST_V1_NEW_WRITE_RETIRED/);
assert.match(dispatch,/return nativeV2\.apply\(rawManifest\)/);
assert.match(nativeAuthoring,/atlas-activity-semantic-key-v2\.js/);
assert.match(nativeActivity,/atlas-activity-semantic-key-v2\.js/);

assert.equal(reconciliation.RECONCILIATION_SEMANTIC_VERSION,'v2-relation-full-temporal');
assert.equal(interlock.REQUIRED_RECONCILIATION_SEMANTIC_VERSION,'v2-relation-full-temporal');
assert.equal(interlock.personMergeExecutionState().allowed,false);
assert.equal(interlock.personMergeExecutionState().person_merge_lifecycle_version,'pre-p10-blocked');

const base={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',person_id:'11111111-1111-4111-8111-111111111111',polity_id:'22222222-2222-4222-8222-222222222222',relation_type_id:'33333333-3333-4333-8333-333333333333',role_id:'44444444-4444-4444-8444-444444444444',period_basis_id:'55555555-5555-4555-8555-555555555555',activity_start:1912,activity_start_month:null,activity_start_day:null,activity_start_granularity:'year',activity_start_calendar:'gregorian',activity_start_certainty:'exact',activity_end:1912,activity_end_month:null,activity_end_day:null,activity_end_granularity:'year',activity_end_calendar:'gregorian',activity_end_certainty:'exact'};
const other={...base,id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',person_id:'66666666-6666-4666-8666-666666666666'};
assert.equal(reconciliation.reconciliationReadiness(base).ready,true);
assert.equal(reconciliation.buildRelationshipReconciliationGroups({rows:[base,other],lowPersonId:base.person_id,highPersonId:other.person_id}).length,1);
assert.equal(reconciliation.buildRelationshipReconciliationGroups({rows:[base,{...other,relation_type_id:'77777777-7777-4777-8777-777777777777'}],lowPersonId:base.person_id,highPersonId:other.person_id}).length,0);
assert.equal(reconciliation.buildRelationshipReconciliationGroups({rows:[base,{...other,activity_start_month:1,activity_start_granularity:'month',activity_end_month:1,activity_end_granularity:'month'}],lowPersonId:base.person_id,highPersonId:other.person_id}).length,0);
const legacyProjection={id:other.id,person_id:other.person_id,polity_id:other.polity_id,role_id:other.role_id,period_basis_id:other.period_basis_id,activity_start:1912,activity_end:1912};
assert.equal(reconciliation.reconciliationReadiness(legacyProjection).ready,false);
assert.equal(reconciliation.buildRelationshipReconciliationGroups({rows:[base,legacyProjection],lowPersonId:base.person_id,highPersonId:other.person_id}).length,0);

assert.match(sql,/drop index if exists atlas_v2\.person_politics_v2_null_role_semantic_uidx/i);
assert.match(sql,/person_politics_v2_semantic_v2_uidx/i);
assert.match(sql,/relation_type_id/i);
assert.match(sql,/activity_start_month/i);
assert.match(sql,/activity_end_granularity/i);

fs.mkdirSync('artifacts',{recursive:true});
const result={schema:'atlas-stage2-p9-semantic-key-v2-cutover-result/v1',as_of:'2026-08-14',status:'P9_COMPLETE_BRANCH_ONLY',semantic_key_version:sem.SEMANTIC_KEY_VERSION,p8_effective_blockers:0,legacy_name_based_mutation_writes:'DISABLED_FAIL_CLOSED',new_authoring_writes:'STAGE2_NATIVE_V2',relationship_reconciliation:reconciliation.RECONCILIATION_SEMANTIC_VERSION,person_physical_merge:'BLOCKED_UNTIL_P10',production_mutation_authorized:false};
fs.writeFileSync('artifacts/stage2-p9-semantic-key-v2-cutover.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({marker:'ATLAS_STAGE2_P9_SEMANTIC_KEY_V2_GLOBAL_CUTOVER_OK',...result},null,2));
export { result };
