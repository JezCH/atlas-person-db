import assert from "node:assert/strict";
import test from "node:test";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const raw=require("../server/atlas-youtube-person-signal-read-service.js");
const identity=require("../server/atlas-youtube-person-identity-read-service.js");
const {createYoutubePersonSignalReadHandler}=require("../server/atlas-youtube-person-signal-read-handler.js");
const SID="yt-20261009T120819Z-10127ch-rebuild-v4";
const UUID="ea13e48a-94ef-5648-98be-f74554778166";
function snapshot(id=SID) {
  return {snapshot_id:id,generated_at:"2026-10-09T12:08:19Z",
    channel_count:10127,video_count:2230031,snapshot_scope:"global_reconciled"};
}
function meta() {return {identity_snapshot_id:"yt-person-uuid-b024-verified-v2",
  source_snapshot_id:SID,artifact_id:"11624729509",artifact_digest:"sha256:"+"a".repeat(64),
  source_run_id:"37948553704",extraction_policy:identity.IDENTITY_POLICY,
  matched_video_rows:56456,person_count:577,created_at:"2026-10-09T15:02:55Z"};}
function totals(){return {count:577,channels_3:280,channels_5:170,channels_10:90,channels_15:60,channels_20:45};}

test("person mode joins latest raw snapshot and returns UUID with immutable provenance",async()=>{
  const calls=[];
  const client={async query(sql,params=[]){
    calls.push({sql,params});
    if(sql===raw.GLOBAL_SNAPSHOT_SQL)return {rows:[snapshot()]};
    if(sql===identity.IDENTITY_META_SQL)return {rows:[meta()]};
    if(sql===identity.IDENTITY_COUNT_SQL)return {rows:[{count:45}]};
    if(sql===identity.IDENTITY_TOTAL_SQL)return {rows:[totals()]};
    if(sql===identity.IDENTITY_ROWS_SQL)return {rows:[{
      person_id:UUID,display_name_basis:"Yi Sun-sin",rank:57,
      distinct_channel_count:38,distinct_video_count:52,
      matched_variants:[{raw_name_key:"이순신",channels:35,videos:45}],
      evidence_rows_by_type:{reviewed_in_title:45,reviewed_prefix:7}
    }]};
    throw new Error("unexpected query");
  }};
  const result=await identity.readYoutubePersonIdentitySignals({client,minChannels:20,limit:20,offset:1});
  assert.equal(result.available,true);
  assert.equal(result.snapshot.snapshot_id,SID);
  assert.equal(result.identity_snapshot.source_snapshot_id,SID);
  assert.equal(result.identity_snapshot.artifact_id,"11624729509");
  assert.equal(result.rows[0].person_id,UUID);
  assert.equal(result.rows[0].video_count,52);
  assert.equal(result.rows[0].evidence_kind,"reviewed_title_mentions");
  assert.equal(result.threshold_counts["20"],45);
  assert.deepEqual(calls.find(x=>x.sql===identity.IDENTITY_ROWS_SQL).params,
    ["yt-person-uuid-b024-verified-v2",20,20,1]);
  assert.equal(calls.filter(x=>x.sql===raw.GLOBAL_SNAPSHOT_SQL).length,2);
});

test("unpublished, uninstalled, and stale identity mode all fail closed",async()=>{
  let client={query:async(sql)=>sql===raw.GLOBAL_SNAPSHOT_SQL?{rows:[snapshot()]}:{rows:[]}};
  let answer=await identity.readYoutubePersonIdentitySignals({client});
  assert.equal(answer.available,false);
  assert.equal(answer.unavailable_reason,"identity_snapshot_not_published");
  assert.deepEqual(answer.rows,[]);
  client={query:async(sql)=>{
    if(sql===raw.GLOBAL_SNAPSHOT_SQL)return {rows:[snapshot()]};
    throw Object.assign(new Error("missing relation"),{code:"42P01"});
  }};
  answer=await identity.readYoutubePersonIdentitySignals({client});
  assert.equal(answer.unavailable_reason,"identity_model_not_installed");
  let rawRead=0;
  client={query:async(sql)=>{
    if(sql===raw.GLOBAL_SNAPSHOT_SQL)return {rows:[snapshot(++rawRead===1?SID:"yt-newer")]};
    if(sql===identity.IDENTITY_META_SQL)return {rows:[meta()]};
    if(sql===identity.IDENTITY_COUNT_SQL)return {rows:[{count:1}]};
    if(sql===identity.IDENTITY_TOTAL_SQL)return {rows:[totals()]};
    if(sql===identity.IDENTITY_ROWS_SQL)return {rows:[]};
    throw new Error("unexpected");
  }};
  answer=await identity.readYoutubePersonIdentitySignals({client});
  assert.equal(answer.unavailable_reason,"global_snapshot_changed");
  assert.equal(answer.available,false);
});

test("incomplete UUID publication is rejected, raw API unchanged",async()=>{
  const client={query:async(sql)=>{
    if(sql===raw.GLOBAL_SNAPSHOT_SQL)return {rows:[snapshot()]};
    if(sql===identity.IDENTITY_META_SQL)return {rows:[meta()]};
    if(sql===identity.IDENTITY_COUNT_SQL)return {rows:[{count:10}]};
    if(sql===identity.IDENTITY_TOTAL_SQL)return {rows:[{...totals(),count:576}]};
    if(sql===identity.IDENTITY_ROWS_SQL)return {rows:[]};
    throw new Error("unexpected");
  }};
  await assert.rejects(()=>identity.readYoutubePersonIdentitySignals({client}),/YOUTUBE_IDENTITY_SNAPSHOT_COUNT_MISMATCH/);
  assert.equal(raw.YOUTUBE_PERSON_SIGNAL_SCHEMA,"atlas-youtube-person-signals/v2");
  assert.match(raw.SIGNAL_ROWS_SQL,/raw_name/);
});

test("handler dispatches explicit person mode and refuses unknown modes",async()=>{
  const cases=[];
  const handler=createYoutubePersonSignalReadHandler({
    env:{SUPABASE_DB_URL:"postgres://localhost/test"},
    clientFactory:async()=>({end:async()=>{}}),
    readSignals:async()=>{cases.push("raw");return {mode:"raw",rows:[]};},
    readIdentity:async()=>{cases.push("person");return {mode:"person",rows:[]};}
  });
  function res(){return {statusCode:200,setHeader(){},end(v){this.body=JSON.parse(v);}};}
  let answer=res();
  await handler({method:"GET",url:"/api/atlas-read?mode=person"},answer);
  assert.equal(answer.statusCode,200);
  assert.equal(answer.body.mode,"person");
  answer=res();
  await handler({method:"GET",url:"/api/atlas-read?mode=raw"},answer);
  assert.equal(answer.body.mode,"raw");
  answer=res();
  await handler({method:"GET",url:"/api/atlas-read?mode=invalid"},answer);
  assert.equal(answer.statusCode,400);
  assert.deepEqual(cases,["person","raw"]);
});
