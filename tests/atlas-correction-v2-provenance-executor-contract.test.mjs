import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const executor = require('../server/atlas-correction-manifest-v2-service.js');
const synth = require('../server/atlas-correction-v2-manifest-synthesizer.js');

const PERSON='11111111-1111-4111-8111-111111111111';
const POLITY='22222222-2222-4222-8222-222222222222';
const ROLE='33333333-3333-4333-8333-333333333333';
const PERIOD='44444444-4444-4444-8444-444444444444';
const RELATION='55555555-5555-4555-8555-555555555555';
const TARGET='66666666-6666-4666-8666-666666666666';
const SURVIVOR='77777777-7777-4777-8777-777777777777';
const FRAGMENT='88888888-8888-4888-8888-888888888888';
const SOURCE_A='99999999-9999-4999-8999-999999999999';
const SOURCE_B='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function activity(id,start=100,end=110,relation=null,legacy=`legacy:${id}`){return {id,person_id:PERSON,polity_id:POLITY,relation_type_id:relation,role_id:ROLE,period_basis_id:PERIOD,activity_start:start,activity_start_month:null,activity_start_day:null,activity_start_granularity:null,activity_start_certainty:null,activity_start_calendar:null,activity_end:end,activity_end_month:null,activity_end_day:null,activity_end_granularity:null,activity_end_certainty:null,activity_end_calendar:null,confidence:'legacy_asserted',chronology_status:'exact_as_recorded',legacy_source_key:legacy,notes:null,source_locator:{},content_hash:`hash:${id}`};}
const link=(activityId,sourceId,locator)=>({person_politics_id:activityId,source_id:sourceId,source_locator_key:locator});
const bundle=(row,sources=[])=>({activity:row,normalized_source_links:sources,chronology_claims:[],relationship_descriptions:[]});

test('retire operation preserves every retired Source on reviewed survivor',()=>{
  const target=bundle(activity(TARGET),[link(TARGET,SOURCE_A,'page:10')]);
  const before=bundle(activity(SURVIVOR,90,120),[link(SURVIVOR,SOURCE_B,'page:20')]);
  const after=bundle(activity(SURVIVOR,90,120),[link(SURVIVOR,SOURCE_A,'page:10'),link(SURVIVOR,SOURCE_B,'page:20')]);
  const op=executor.normalizeOperation({type:'retire_activity',case_id:'retire',activity_id:TARGET,exact_before:target,replacement_survivors:[{activity_id:SURVIVOR,exact_before:before,exact_after:after}],source_transfer_policy:synth.RETIRE_SOURCE_TRANSFER_POLICY,silent_source_drop_forbidden:true},1);
  assert.deepEqual(executor.existingActivityLockIds([op]),[TARGET,SURVIVOR].sort());
  assert.equal(executor.expectedCountDeltas([op]).activity_sources,0);
});

test('legacy Activity may remain relation-null before P9 but relation removal is forbidden',()=>{
  const before=bundle(activity(TARGET));
  const after=bundle({...activity(TARGET),activity_end:111});
  assert.equal(executor.normalizeOperation({type:'rewrite_activity',case_id:'legacy-null',activity_id:TARGET,exact_before:before,exact_after:after},1).exact_after.activity.relation_type_id,null);
  assert.throws(()=>executor.normalizeOperation({type:'rewrite_activity',case_id:'remove',activity_id:TARGET,exact_before:bundle(activity(TARGET,100,110,RELATION)),exact_after:bundle(activity(TARGET))},2),/RELATION_REMOVAL_FORBIDDEN/);
});

test('new split fragment requires relation while reviewed DO_NOT_COPY_EXISTING may be source-empty',()=>{
  const before=bundle(activity(TARGET),[link(TARGET,SOURCE_A,'page:10')]);
  const survivor=bundle({...activity(TARGET,100,104),relation_type_id:RELATION},[link(TARGET,SOURCE_A,'page:10')]);
  const fragment={...bundle(activity(FRAGMENT,105,110,RELATION,null),[]),source_copy_policy:'DO_NOT_COPY_EXISTING'};
  const op=executor.normalizeOperation({type:'split_activity',case_id:'split',activity_id:TARGET,exact_before:before,survivor_fragment:survivor,new_fragments:[fragment],gap_overlap_policy:'reviewed'},1);
  assert.equal(op.new_fragments[0].source_copy_policy,'DO_NOT_COPY_EXISTING');
  assert.equal(executor.expectedCountDeltas([op]).activities,1);
});

test('same Activity cannot bind one Source UUID to multiple locator variants',()=>{
  assert.throws(()=>executor.normalizeActivityBundle(bundle(activity(TARGET),[link(TARGET,SOURCE_A,'page:10'),link(TARGET,SOURCE_A,'page:11')]),'DUP'),/SOURCE_ID_REUSED/);
});
