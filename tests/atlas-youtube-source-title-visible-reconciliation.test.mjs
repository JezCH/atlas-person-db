import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const audit=require("../server/atlas-youtube-original-title-crosswalk-read.js");
const discovery=require("../server/atlas-youtube-unregistered-discovery-read-service.js");
const {GLOBAL_SNAPSHOT_SQL}=require("../server/atlas-youtube-person-signal-read-service.js");

const snap=()=>({
 snapshot_id:audit.CROSSWALK.production_snapshot_id,
 generated_at:"2026-10-10T08:36:57Z",
 parser_version:"yt-title-person-reviewed-v5",
 snapshot_scope:"global_reconciled",channel_count:10127,video_count:2230031,
 source_state:{artifact_digest:"sha256:"+audit.ARCHIVE_SHA}
});
const candidate=(name,channels,videos)=>({
 raw_name:name,distinct_channel_count:channels,video_count:videos,
 source_labels:[name],source_id_union_verified:false,count_lower_bound:false,
 rank:1
});

test("the REAL B024 original source audit exposes Diana 72/113 versus 231/453 without changing her rank",()=>{
 assert.equal(audit.CROSSWALK.index.size,5217);
 const person=candidate("Princess Diana",72,113);
 const r=audit.annotateSourceTitleCounts([person],snap());
 assert.equal(r.eligible,true);
 assert.equal(r.compared,1);
 assert.equal(r.candidates[0].distinct_channel_count,72);
 assert.equal(r.candidates[0].video_count,113);
 assert.equal(r.candidates[0].rank,1);
 assert.deepEqual([
  r.candidates[0].original_source_title_audit.distinct_title_mention_channels,
  r.candidates[0].original_source_title_audit.distinct_title_mention_videos
 ],[231,453]);
 assert.equal(r.candidates[0].original_source_title_audit.verified_individual_primary_video_content,false);
 assert.equal(r.candidates[0].original_source_title_audit.not_eligible_for_ranking_count_replacement,true);
 assert.equal(person.original_source_title_audit,undefined);
});

test("unknown/stale/edited/merged original-ID title counts are not grafted onto current rank",()=>{
 const diana=candidate("Princess Diana",72,113);
 const cases=[
  {snapshot:{...snap(),snapshot_id:"new-batch"}},
  {snapshot:{...snap(),source_state:{artifact_digest:"sha256:"+"0".repeat(64)}}},
  {snapshot:{...snap(),parser_version:"reviewed-v6"}},
  {candidate:{...diana,distinct_channel_count:73}},
  {candidate:{...diana,source_labels:["Princess Diana","Diana"]}},
  {candidate:{...diana,source_id_union_verified:true}},
  {candidate:{...diana,count_lower_bound:true}},
 ];
 for(const [i,v] of cases.entries()){
  const response=audit.annotateSourceTitleCounts([v.candidate||diana],v.snapshot||snap());
  assert.equal(response.compared,0,"case "+i);
  assert.equal(response.candidates[0].original_source_title_audit,undefined);
 }
});

test("malformed historical shards, conflicting original names and duplicate source labels fail closed",()=>{
 const valid={
  schema:"atlas-youtube-b024-v5-original-id-crosswalk-matched/v1",
  source_5965_sha256:"b9d9bcdb4fa98e0f917a1dc32106a84fc11b788b86780078e9c207b5c44e550c",
  production_snapshot_id:"old",
  source_snapshot_id:"source",
  kind:"exact_name_matched",
  rows:[[1,"Example Person","Example Person",3,3,4,5,"original"]]
 };
 assert.equal(audit.buildCrosswalkIndex([valid]).index.size,1);
 assert.throws(()=>audit.buildCrosswalkIndex([{...valid,rows:[...valid.rows,...valid.rows]}]),
  /YOUTUBE_TITLE_CROSSWALK_DUPLICATE_LABEL/);
 assert.throws(()=>audit.buildCrosswalkIndex([{...valid,rows:[[1,"Other","Example Person",3,3,4,5,"original"]]}]),
  /YOUTUBE_TITLE_CROSSWALK_SOURCE_ROW_INVALID/);
 assert.throws(()=>audit.buildCrosswalkIndex([{...valid,source_5965_sha256:"0".repeat(64)}]),
  /YOUTUBE_TITLE_CROSSWALK_PROVENANCE_INVALID/);
});

test("existing ONE discovery API now screens archived ORIGINAL video/channel IDs with full current Person registry",async()=>{
 let n=0;
 const currentRegistry=[
  ...Array.from({length:2100},(_,i)=>({
   person_id:"current-person-"+i,
   alias_name:"Registered Other Historical Name "+i
  })),
  {person_id:"already-registered-malcolm",alias_name:"Malcolm X"}
 ];
 const db={query:async(sql)=>{
  if(sql===GLOBAL_SNAPSHOT_SQL){n++;return {rows:[snap()]};}
  if(sql===discovery.CANDIDATE_ROWS_SQL)
   throw Error("old raw title signal rank must not be queried for audited B024");
  if(sql===discovery.PERSON_NAMES_SQL)return {rows:currentRegistry};
  if(sql===discovery.PERSON_TOTAL_SQL)return {rows:[{person_count:2101}]};
  throw Error("Unexpected SQL");
 }};
 const result=await discovery.readYoutubeUnregisteredDiscovery({client:db});
 assert.equal(n,2);
 assert.equal(result.ranking_evidence_type,
  "ORIGINAL_ID_EXPLICIT_BIOGRAPHY_AND_PROFILE_TITLE_UNVERIFIED_CONTENT");
 assert.equal(result.source_candidate_count,2241);
 assert.ok(!result.rows.some(r=>r.raw_name==="Malcolm X"));
 assert.equal(result.rows[0].raw_name,"Stephen Hawking");
 assert.equal(result.rows[0].rank,1);
 assert.equal(result.rows[0].distinct_channel_count,39);
 assert.equal(result.rows[0].video_count,40);
 assert.equal(result.registered_excluded_count,1);
 assert.equal(result.current_registry_distinct_persons,2101);
 assert.equal(result.source_original_biography_title_video_ids,10706);
 assert.equal(result.source_additional_profile_title_original_video_ids,536);
 assert.equal(result.video_person_centeredness_certified,false);
 assert.ok(result.available_count>500);
});

test("the current UI presents independent title evidence in the existing row, not another certified leaderboard",()=>{
 const ui=fs.readFileSync(new URL("../atlas-registration-review.js",import.meta.url),"utf8");
 const css=fs.readFileSync(new URL("../atlas-registration-review.css",import.meta.url),"utf8");
 assert.match(ui,/별도 원본 제목 언급:/);
 assert.match(ui,/내용 미검증/);
 assert.match(ui,/original_source_title_audit/);
 assert.match(ui,/제목 신호 채널/);
 assert.match(css,/\.registration-review-source-title-audit/);
 assert.doesNotMatch(ui,/youtubeSignalMode|인물별 통합 순위|원시명 순위/);
});
