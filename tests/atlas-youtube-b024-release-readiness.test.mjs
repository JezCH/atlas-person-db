import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {runAcceptance,validateDiscovery,PROBE_SCHEMA} from "../scripts/verify-youtube-b024-one-shot-production-readiness.mjs";
const require=createRequire(import.meta.url);
const source=require("../server/atlas-youtube-b024-original-id-live-ranking.js");
const discovery=require("../server/atlas-youtube-unregistered-discovery-read-service.js");
const {ARCHIVE_SHA,CROSSWALK}=require("../server/atlas-youtube-original-title-crosswalk-read.js");

const expectedSha="a".repeat(40);
function snapshot(){
 return {
  snapshot_id:CROSSWALK.production_snapshot_id,
  parser_version:"yt-title-person-reviewed-v5",snapshot_scope:"global_reconciled",
  generated_at:"2026-10-10T08:36:57Z",
  source_state:{artifact_digest:"sha256:"+ARCHIVE_SHA},
  channel_count:10127,video_count:2230031
 };
}
function registry(){
 return Array.from({length:2100},(_,i)=>({alias_name:"Registered "+i,person_id:"p-"+i}));
}
function payload(){
 const rank=source.renderCurrentRegistryRank({
  snapshot:snapshot(),registryRows:registry(),
  identityKey:discovery.identityKey,
  expectedCurrentRegisteredPersons:2100
 });
 const selected=rank.candidates.filter(x=>x.distinct_channel_count>=3);
 return {
  ok:true,source:"youtube-unregistered-candidate-discovery",
  schema:discovery.DISCOVERY_SCHEMA,available:true,snapshot:snapshot(),
  population:"original_video_id_biography_title_candidate_sets",
  identity_rule:"full_current_registered_person_id_all_names_screened_last",
  ranking_evidence_type:source.PROFILE_SOURCE_PROOF,
  registration_checked:true,
  source_candidate_count:2241,
  source_original_biography_title_video_ids:10706,
  source_additional_profile_title_original_video_ids:536,
  source_total_profile_and_biography_original_video_ids:6698,
  current_registry_person_count_parity_verified:true,
  current_registry_authoritative_person_count:2100,
  current_registry_distinct_persons:2100,
  registered_excluded_count:rank.current_registered_excluded_count,
  video_person_centeredness_certified:false,
  historical_personhood_certified_for_all:false,
  source_id_union_verified:true,
  threshold_counts:rank.threshold_counts,
  available_count:selected.length,stored_count:selected.length,
  min_channels:3,rows:selected.slice(0,20)
 };
}
function mockResponse(body,status=200){
 return {status,ok:status>=200&&status<300,
  async json(){return body;},async text(){return String(body);}};
}
function mockTransport({result=payload(),sha=expectedSha,asset="mode=discovery ORIGINAL_ID_EXPLICIT_BIOGRAPHY_AND_PROFILE_TITLE_UNVERIFIED_CONTENT 원본 Video ID · 채널 ID로 집계",statuses={}}={}){
 const calls=[];
 const identity={ok:true,schema:"atlas-runtime-identity/v1",
  identity:{git_commit_ref:"main",git_commit_sha:sha}};
 function fetchImpl(url,opts){
  calls.push({url,opts});
  const u=new URL(url);
  if(u.searchParams.get("__atlas_read_surface")==="runtime-identity")
   return Promise.resolve(mockResponse(identity,statuses.identity||200));
  if(u.searchParams.get("__atlas_read_surface")==="youtube-person-signals")
   return Promise.resolve(mockResponse(result,statuses.rank||200));
  if(u.pathname==="/atlas-registration-review.js")
   return Promise.resolve(mockResponse(asset,statuses.ui||200));
  throw Error("unexpected URL "+url);
 }
 return {calls,fetchImpl};
}
test("pre-restoration OFFLINE release rehearsal validates ALL 2241-source title ranking data through existing single API contract",()=>{
 const r=validateDiscovery(payload());
 assert.equal(r.pre_registry_source_candidate_names,2241);
 assert.equal(r.source_original_video_titles,2230031);
 assert.equal(r.source_biography_title_video_ids,10706);
 assert.equal(r.additional_profile_title_original_video_ids,536);
 assert.equal(r.total_filtered_source_title_evidence_original_video_ids,6698);
 assert.equal(r.authoritative_persons,2100);
 assert.equal(r.current_three_channel_title_candidate_count,855); // 861 screened after 62 holds, minus 6 reviewed living
 assert.equal(r.historical_personhood_confirmed_for_all,false);
 assert.equal(r.actual_video_content_confirmed,0);
});
test("one-shot post-restoration acceptance proves same main SHA, one rank, updated UI, original counts and full roster parity",async()=>{
 const t=mockTransport();
 const result=await runAcceptance({expectedSha,fetchImpl:t.fetchImpl});
 assert.equal(result.schema,PROBE_SCHEMA);
 assert.equal(result.status,"LIVE_TITLE_SIGNAL_ACCEPTED_CONTENT_NOT_CERTIFIED");
 assert.equal(result.returned_main_sha,expectedSha);
 assert.equal(result.exact_request_count,4);
 assert.equal(t.calls.length,4);
 assert.deepEqual(t.calls.map(x=>new URL(x.url).pathname),
  ["/api/atlas-read","/api/atlas-read","/atlas-registration-review.js","/api/atlas-read"]);
});
test("no retry on 402 or transient 500; no claim of a restored Production deployment",async()=>{
 for(const code of [402,500]){
  const t=mockTransport({statuses:{identity:code}});
  await assert.rejects(()=>runAcceptance({expectedSha,fetchImpl:t.fetchImpl}),
   code===402?/402_STOP_NO_RETRY/:/HTTP_500_STOP_NO_RETRY/);
  assert.equal(t.calls.length,1);
 }
});
test("wrong deployed SHA and stale UI fail closed",async()=>{
 const a=mockTransport({sha:"b".repeat(40)});
 await assert.rejects(()=>runAcceptance({expectedSha,fetchImpl:a.fetchImpl}),/RUNTIME_SHA_NOT_EXPECTED_MAIN/);
 assert.equal(a.calls.length,1);
 const b=mockTransport({asset:"old youtubeSignalMode only"});
 await assert.rejects(()=>runAcceptance({expectedSha,fetchImpl:b.fetchImpl}),/SINGLE_TABLE_UI_ASSET_NOT_UPDATED/);
 assert.equal(b.calls.length,3);
});
test("partial registered roster and fake current total cannot validate",()=>{
 const r=payload();
 for(const mutate of [
  x=>x.current_registry_distinct_persons=2101,
  x=>x.current_registry_person_count_parity_verified=false,
  x=>x.current_registry_authoritative_person_count=0,
  x=>x.ranking_evidence_type="UNVERIFIED_FAKED_TRANSCRIPT_CONTENT",
  x=>x.source_candidate_count=8,
  x=>x.snapshot.snapshot_id="a-new-batch",
  x=>x.video_person_centeredness_certified=true,
  x=>x.rows[0].presently_unregistered_historical_person_certified=true,
  x=>x.rows[0].distinct_channel_count=1,
  x=>x.threshold_counts["3"]=862,
 ]){
  const d=structuredClone(r);mutate(d);
  assert.throws(()=>validateDiscovery(d),/B024_RELEASE_/);
 }
});
