import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import fs from "node:fs";
const require=createRequire(import.meta.url);
const d=require("../server/atlas-youtube-unregistered-discovery-read-service.js");
const {GLOBAL_SNAPSHOT_SQL}=require("../server/atlas-youtube-person-signal-read-service.js");
const {createYoutubePersonSignalReadHandler}=require("../server/atlas-youtube-person-signal-read-handler.js");
const sample=[
  {raw_name:"Napoleon Bonaparte",rank:1,distinct_channel_count:98,video_count:120},
  {raw_name:"Napoleon",rank:2,distinct_channel_count:49,video_count:66},
  {raw_name:"Candidate Alpha",rank:3,distinct_channel_count:45,video_count:60},
  {raw_name:"Candidate Beta",rank:4,distinct_channel_count:35,video_count:55},
  {raw_name:"Cléopatra",rank:5,distinct_channel_count:20,video_count:24},
  {raw_name:"Cleopatra",rank:6,distinct_channel_count:14,video_count:21},
  {raw_name:"Jose Maria",rank:7,distinct_channel_count:10,video_count:15},
  {raw_name:"José Maria",rank:8,distinct_channel_count:8,video_count:10},
  {raw_name:"Candidate Gamma",rank:9,distinct_channel_count:3,video_count:5}
];
const registered=[
  {person_id:"p-napoleon",alias_name:"Napoleon Bonaparte"},
  {person_id:"p-napoleon",alias_name:"Napoleon"},
  {person_id:"p-cleopatra-1",alias_name:"Cleopatra"},
  {person_id:"p-cleopatra-2",alias_name:"Cléopatra"}
];
function snapshot(id="yt-current") {
  return {snapshot_id:id,generated_at:"2026-10-10T00:00:00Z",
    channel_count:10127,video_count:2230031,snapshot_scope:"global_reconciled",
    threshold_counts:{"3":8862}};
}
function db({shift=false,emptyPeople=false}={}) {
  let n=0;
  return {async query(sql,params=[]) {
    if(sql===GLOBAL_SNAPSHOT_SQL) return {rows:[snapshot(shift&&++n===2?"yt-newer":"yt-current")]};
    if(sql===d.CANDIDATE_ROWS_SQL) {
      assert.deepEqual(params,["yt-current"]);
      return {rows:sample};
    }
    if(sql===d.PERSON_NAMES_SQL) return {rows:emptyPeople?[]:registered};
    throw Error("unexpected SQL: "+sql.slice(0,90));
  }};
}
test("exact registration removes every Napoleon alias and preserves novel candidates",async()=>{
  const response=await d.readYoutubeUnregisteredDiscovery({client:db()});
  assert.equal(response.schema,d.DISCOVERY_SCHEMA);
  assert.equal(response.snapshot.channel_count,10127);
  assert.ok(response.rows.some(r=>r.raw_name==="Candidate Alpha"));
  assert.ok(!response.rows.some(r=>r.raw_name==="Napoleon Bonaparte"||r.raw_name==="Napoleon"));
  assert.equal(response.registered_excluded_count,2);
  assert.equal(response.purpose,"unregistered_historical_person_discovery");
  assert.equal(response.rows[0].rank,1);
  assert.equal(response.rows[0].raw_name,"Candidate Alpha");
});
test("registered homonyms are held for identity review, not silently certified unregistered",()=>{
  const {candidates,homonymReview}=d.candidatesFromSource(sample,registered);
  assert.equal(homonymReview,2);
  const cleopatra=candidates.find(x=>d.identityKey(x.raw_name)==="cleopatra");
  assert.ok(cleopatra);
  assert.equal(cleopatra.identity_state,"registered_homonym_review");
  assert.equal(cleopatra.registration_match_count,2);
});
test("near-identical candidate labels do not invent summed channel counts",()=>{
  const {candidates,overlappingRawLabels}=d.candidatesFromSource(sample,registered);
  assert.equal(overlappingRawLabels,2);
  const row=candidates.find(r=>d.identityKey(r.raw_name)==="josemaria");
  assert.equal(row.distinct_channel_count,10);
  assert.equal(row.video_count,15);
  assert.equal(row.count_lower_bound,true);
  assert.equal(row.source_labels.length,2);
  assert.equal(row.identity_state,"alias_union_needs_original_ids");
  assert.equal(candidates.filter(r=>d.identityKey(r.raw_name)==="josemaria").length,1);
});
test("reviewed living people never outrank unregistered historical candidates",()=>{
  const live=[
    {raw_name:"Elon Musk",rank:1,distinct_channel_count:94,video_count:108},
    {raw_name:"Donald Trump",rank:2,distinct_channel_count:70,video_count:87},
    {raw_name:"Princess Diana",rank:3,distinct_channel_count:55,video_count:87},
    {raw_name:"Malcolm X",rank:4,distinct_channel_count:52,video_count:63}
  ];
  const result=d.candidatesFromSource(live,registered,
    {now:Date.parse("2026-10-10T00:00:00Z")});
  assert.equal(result.reviewedLivingExcluded,2);
  assert.deepEqual(result.candidates.map(x=>x.raw_name),["Princess Diana","Malcolm X"]);
  assert.deepEqual(result.candidates.map(x=>x.rank),[1,2]);
});

test("threshold, pagination, and ranks are recomputed after registration removal",async()=>{
  const response=await d.readYoutubeUnregisteredDiscovery({client:db(),minChannels:20,limit:1,offset:1});
  assert.equal(response.available_count,3);
  assert.equal(response.rows.length,1);
  assert.equal(response.rows[0].raw_name,"Candidate Beta");
  assert.equal(response.rows[0].rank,2);
  assert.equal(response.threshold_counts["3"],5);
  assert.equal(response.threshold_counts["20"],3);
});
test("stale source and unavailable live Person registry fail closed",async()=>{
  await assert.rejects(()=>d.readYoutubeUnregisteredDiscovery({client:db({shift:true})}),
    /YOUTUBE_DISCOVERY_SNAPSHOT_CHANGED/);
  await assert.rejects(()=>d.readYoutubeUnregisteredDiscovery({client:db({emptyPeople:true})}),
    /YOUTUBE_DISCOVERY_PERSON_REGISTRY_EMPTY/);
});
test("one discovery surface only; old registered-people leaderboard modes are rejected",async()=>{
  const calls=[];
  const handler=createYoutubePersonSignalReadHandler({
    clientFactory:async()=>({end:async()=>{}}),
    env:{SUPABASE_DB_URL:"postgres://localhost/fake"},
    readDiscovery:async()=>{calls.push("discovery");return {rows:[],available:true};}
  });
  function reply(){return {statusCode:200,setHeader(){},end(v){this.body=JSON.parse(v);}};}
  let res=reply();
  await handler({method:"GET",url:"/api/atlas-read?mode=discovery"},res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.source,"youtube-unregistered-candidate-discovery");
  for(const mode of ["person","raw"]) {
    res=reply();
    await handler({method:"GET",url:"/api/atlas-read?mode="+mode},res);
    assert.equal(res.statusCode,400);
  }
  assert.deepEqual(calls,["discovery"]);
});
test("no obsolete dual-ranking code and no deployed route to obsolete publisher",()=>{
  const ui=fs.readFileSync(new URL("../atlas-registration-review.js",import.meta.url),"utf8");
  const author=fs.readFileSync(new URL("../api/atlas-authoring-apply.js",import.meta.url),"utf8");
  assert.match(ui,/미등록 역사 인물 발굴/);
  assert.match(ui,/mode=discovery/);
  assert.match(ui,/candidateStatusBadge/);
  assert.doesNotMatch(ui,/youtubeSignalMode|excludeRegistered|인물별 통합 순위|원시명 순위/);
  assert.doesNotMatch(author,/youtube-person-identity-publish/);
  for(const path of [
    "../server/atlas-youtube-person-identity-publish-handler.js",
    "../server/atlas-youtube-person-identity-read-service.js",
    "../.github/workflows/youtube-person-identity-publish.yml"
  ]) assert.equal(fs.existsSync(new URL(path,import.meta.url)),false);
});
