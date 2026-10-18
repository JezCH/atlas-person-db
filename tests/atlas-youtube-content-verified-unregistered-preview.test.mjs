import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const engine=require("../scripts/youtube-content-verified-unregistered-preview.cjs");
const HASH=engine.SOURCE_SHA;
const UC=n=>"UC"+String.fromCharCode(65+n).repeat(22);
const VID=n=>"VID"+String(n).padStart(8,"0");

function manifest(){
 const reasons=[
   ["Ferdinand Marcos","FATHER_SON_SHARED_NAME"],
   ["Saint Benedict","MULTIPLE_SAINTS_WITH_SAME_NAME"],
   ["St Patrick","PERSON_HOLIDAY_CATHEDRAL_AMBIGUITY"],
   ["St Valentine","CONTESTED_SAINT_IDENTITY_HOLIDAY"]
 ];
 return {schema:"atlas-youtube-v5-known-original-source-identity-holds/v1",
  source_review_zip_sha256:HASH,original_channel_count:10127,
  original_video_count:2230031,not_an_unregistered_person_certification:true,
  holds:reasons.map(([raw_name,reason])=>({raw_name,reason,
    source_review_status:"IDENTITY_CONTEXT_HOLD",person_identity_certified:false}))};
}
function registry(extra=[]){
 const people=Array.from({length:2000},(_,i)=>({id:"fixture-person-"+i,
    canonical_key:"Registered Fixture Person "+i,
    canonical_name_en:"Registered Fixture Person "+i,names:[]}));
 for(let i=0;i<extra.length;i++)people[i]=extra[i];
 return {ok:true,mode:"list",projection:"identity",persons:people};
}
function subject(name,idsAndChannels,forms=[name]){
 const videos=[...new Set(idsAndChannels.map(([id])=>id))];
 const channels=[...new Set(idsAndChannels.map(([,id])=>id))];
 return {person_identity_for_review:name,reviewed_source_name_forms:forms,
  distinct_content_verified_channels:channels.length,
  distinct_content_verified_videos:videos.length,
  original_channel_ids:channels,original_video_ids:videos,
  final_registered_person_exclusion_pending:true,
  content_review_provenance:idsAndChannels.map(([video_id,channel_id])=>({
    video_id,channel_id,evidence_method:"VIDEO_PLAYBACK_MANUAL",
    reviewer:"synthetic fixture reviewer",reviewed_at:"2026-10-18T00:00:00Z",
    content_segment:{start_seconds:20,end_seconds:40}
  }))};
}
function gate(people){
 return {schema:"atlas-youtube-content-verified-original-id-candidate-gate/v1",
  source_snapshot_id:"synthetic-test-only",source_zip_sha256:HASH,
  original_requested_video_ids:50,actual_metadata_video_ids:50,
  explicit_content_review_decisions:people.reduce((n,p)=>n+p.original_video_ids.length,0),
  person_centered_video_ids_verified:new Set(people.flatMap(p=>p.original_video_ids)).size,
  registered_person_exclusion_completed:false,production_ranking_publishable:false,
  people};
}
const triple=(start)=>[[VID(start),UC(start%5)],[VID(start+1),UC((start+1)%5)],
 [VID(start+2),UC((start+2)%5)]];
function summary(result){
 assert.equal(result.schema,"atlas-youtube-verified-content-unregistered-preview/v1");
 assert.equal(result.publication_authorized,false);
 assert.equal(result.production_writes,0);
 assert.equal(result.current_production_registry_readback_witnessed,false);
 assert.equal(result.registered_person_screen_proven_current,false);
 assert.equal(result.registered_person_last_stage_runtime_acceptance_pending,true);
}

test("zero content-verified original videos produce ZERO historical unregistered rank candidates",()=>{
 const result=engine.preview(gate([subject("Unproven Historical Candidate",[])]),registry(),manifest());
 summary(result);
 assert.equal(result.original_content_verified_video_ids,0);
 assert.equal(result.rank_candidate_count,0);
 assert.deepEqual(result.rank_candidates,[]);
 assert.equal(result.zero_content_groups_count,1);
});

test("real video-first set-unions, identity HOLDs, reviewed aliases, and registered-Person exclusion LAST",()=>{
 const people=[
  subject("New Individual Historian",[
    [VID(1),UC(1)],[VID(2),UC(1)],[VID(3),UC(2)],[VID(4),UC(3)]],
    ["New Individual Historian","Neue individuelle Historikerin"]),
  subject("Napoleon",triple(10)),
  subject("Ferdinand Marcos",triple(20)),
  subject("Patrick of Ireland",triple(30),["Patrick of Ireland","St Patrick"]),
  subject("Less Covered Person",[[VID(40),UC(1)],[VID(41),UC(2)]]),
  subject("Emmett Till",triple(50))
 ];
 const persons=registry([
  {id:"napoleon-uuid",canonical_key:"Napoleon I",canonical_name_en:"Napoleon I",names:[]},
  {id:"emmett-uuid",canonical_key:"Emmett Till",canonical_name_en:"Emmett Till",names:[]},
  {id:"marcos-father-only",canonical_key:"Ferdinand Marcos",canonical_name_en:"Ferdinand Marcos",names:[]}
 ]);
 const result=engine.preview(gate(people),persons,manifest());
 summary(result);
 assert.equal(result.original_content_verified_video_ids,people.reduce((n,p)=>n+p.original_video_ids.length,0));
 assert.equal(result.rank_candidate_count,1);
 assert.equal(result.rank_candidates[0].rank,1);
 assert.equal(result.rank_candidates[0].raw_name,"New Individual Historian");
 assert.equal(result.rank_candidates[0].distinct_content_verified_channels,3);
 assert.equal(result.rank_candidates[0].distinct_content_verified_videos,4);
 assert.equal(result.rank_candidates[0].original_video_ids.length,4);
 assert.equal(result.registered_excluded_count,2); // known Napoleon alias, Emmett
 assert.equal(result.registered_excluded_names.includes("Napoleon"),true);
 assert.equal(result.registered_excluded_names.includes("Emmett Till"),true);
 assert.equal(result.identity_hold_count,2);
 assert.equal(result.identity_holds.find(x=>x.raw_name==="Ferdinand Marcos")?.reason,
  "FATHER_SON_SHARED_NAME");
 assert.equal(result.identity_holds.find(x=>x.raw_name==="Patrick of Ireland")?.reason,
  "PERSON_HOLIDAY_CATHEDRAL_AMBIGUITY");
 assert.equal(result.below_three_verified_channels_count,1);
});

test("a single original VIDEO ID cannot be assigned as biography credit to TWO historical individuals",()=>{
 const a=subject("Person A",triple(70));
 const b=subject("Person B",[[VID(70),UC(0)],[VID(71),UC(1)],[VID(72),UC(2)]]);
 assert.throws(()=>engine.preview(gate([a,b]),registry(),manifest()),
  /VIDEO_RANK_SAME_ORIGINAL_VIDEO_CREDITED_TO_TWO_PEOPLE/);
});

test("incomplete registered-Person export, forged global counts, and nonexistent reviewers always fail",()=>{
 const person=subject("Preview Person",triple(90));
 assert.throws(()=>engine.preview(gate([person]),registry().persons.slice(0,2),manifest()),
  /VIDEO_RANK_PERSON_REGISTRY_INCOMPLETE_FAIL_CLOSED/);
 const short=registry();short.persons.pop();
 assert.throws(()=>engine.preview(gate([person]),short,manifest()),
  /VIDEO_RANK_PERSON_REGISTRY_INCOMPLETE_FAIL_CLOSED/);
 const wrong=gate([person]);wrong.person_centered_video_ids_verified=4;
 assert.throws(()=>engine.preview(wrong,registry(),manifest()),
  /VIDEO_RANK_GLOBAL_VERIFIED_VIDEO_SET_MISMATCH/);
 const forged=gate([person]);forged.people[0].content_review_provenance=[];
 assert.throws(()=>engine.preview(forged,registry(),manifest()),
  /VIDEO_RANK_ORIGINAL_ID_CARDINALITY_MISMATCH/);
});

test("unresolved common name matching two registered Persons remains a HOLD, never unregistered",()=>{
 const jane=subject("Shared Registered Person",triple(100));
 const data=registry([
  {id:"uuid-1",canonical_key:"Person One",canonical_name_en:"Person One",
    names:[{name:"Shared Registered Person"}]},
  {id:"uuid-2",canonical_key:"Person Two",canonical_name_en:"Person Two",
    names:[{name:"Shared Registered Person"}]}
 ]);
 const output=engine.preview(gate([jane]),data,manifest());
 summary(output);
 assert.equal(output.rank_candidate_count,0);
 assert.equal(output.identity_holds[0].reason,"MULTIPLE_REGISTERED_PERSON_IDS_MATCH");
 assert.equal(output.identity_holds[0].registered_id_count,2);
});

test("identity HOLD source and reviewed alias malformed population can never turn into a valid ranking",()=>{
 const g=gate([subject("St Patrick",triple(110))]);
 const bad=manifest();bad.holds[0].person_identity_certified=true;
 assert.throws(()=>engine.preview(g,registry(),bad),
  /VIDEO_RANK_REVIEWED_IDENTITY_HOLD_INVALID/);
 const bad2=manifest();bad2.source_review_zip_sha256="0".repeat(64);
 assert.throws(()=>engine.preview(g,registry(),bad2),
  /VIDEO_RANK_IDENTITY_HOLD_MANIFEST_INVALID/);
 const bad3=gate([subject("Person C",triple(120))]);
 bad3.people[0].reviewed_source_name_forms=["Person C","Person C"];
 assert.throws(()=>engine.preview(bad3,registry(),manifest()),
  /VIDEO_RANK_DUPLICATE_OR_INVALID_IDENTITY_ALIAS/);
});
