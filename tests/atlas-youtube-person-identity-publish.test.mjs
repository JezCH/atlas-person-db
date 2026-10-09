import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const svc=require("../server/atlas-youtube-person-identity-publish-service.js");
const handler=require("../server/atlas-youtube-person-identity-publish-handler.js");
const {GLOBAL_SNAPSHOT_SQL}=require("../server/atlas-youtube-person-signal-read-service.js");
const SID="yt-20261009T120819Z-10127ch-rebuild-v4";
const ARTIFACT="sha256:"+"a".repeat(64);
const SHA="f".repeat(40);
const UUID1="945b78a7-3941-5e05-a6c9-ce57e7395727";
const UUID2="ea13e48a-94ef-5648-98be-f74554778166";
function body(){
  const x={
    schema:svc.PUBLICATION_SCHEMA,
    identity_snapshot_id:"yt-person-uuid-20261009T120819Z-10127ch-reviewed-v2",
    artifact_id:"11624729509",artifact_digest:ARTIFACT,
    source_run_id:"37948553704",
    source:{production_snapshot_id:SID,successful_channel_count:10127,
      selected_channel_count:10890,source_video_rows:2230031},
    summary:{person_identities_with_evidence:2,matched_video_rows:10,mention_only_title_rows:3},
    persons:[
      {person_id:UUID1,display_name_basis:"Napoleon I",rank:1,
       distinct_channel_count:5,distinct_video_count:6,
       matched_variants:[{raw_name_key:"napoleon bonaparte",channels:5,videos:6}],
       evidence_rows_by_type:{reviewed_prefix:2,reviewed_in_title:4}},
      {person_id:UUID2,display_name_basis:"Yi Sun-sin",rank:2,
       distinct_channel_count:3,distinct_video_count:4,
       matched_variants:[{raw_name_key:"이순신",channels:3,videos:4}],
       evidence_rows_by_type:{reviewed_in_title:4}}
    ]
  };
  x.publication_fingerprint=svc.hashPayload(x);
  return x;
}
function fakeClient(events,{sourceId=SID,existing=[]}={}){
  return {async query(sql,params=[]){
    events.push({sql,params});
    if(sql===GLOBAL_SNAPSHOT_SQL)return {rows:[{snapshot_id:sourceId,channel_count:10127,video_count:2230031}]};
    if(sql===svc.EXISTS_SQL)return {rows:existing};
    if(sql===svc.INSERT_ROWS_SQL)return {rowCount:2,rows:[]};
    return {rows:[],rowCount:1};
  }};
}
test("UUID publication enforces immutable ranks, aliases and digest",()=>{
  const x=body();
  assert.equal(svc.normalizePublication(x).person_count,2);
  const bad=structuredClone(x);bad.persons[0].rank=2;
  assert.throws(()=>svc.normalizePublication(bad),/FINGERPRINT_MISMATCH|RANK_INVALID/);
  const duplicate=structuredClone(x);duplicate.persons[1].person_id=UUID1;
  duplicate.publication_fingerprint=svc.hashPayload(duplicate);
  assert.throws(()=>svc.normalizePublication(duplicate),/DUPLICATE_OR_INVALID/);
  const tamper=structuredClone(x);tamper.persons[0].distinct_channel_count=100;
  assert.throws(()=>svc.normalizePublication(tamper),/FINGERPRINT_MISMATCH/);
  const badSource=structuredClone(x);badSource.artifact_digest="sha256:malicious";
  assert.throws(()=>svc.normalizePublication(badSource),/ARTIFACT_DIGEST_INVALID/);
});
test("append-only UUID publication inserts 2 rows in one transaction, no legacy raw writes",async()=>{
  const events=[],result=await svc.publishIdentity(fakeClient(events),body());
  assert.equal(result.committed,true);
  assert.equal(result.person_count,2);
  assert.ok(events.some(x=>x.sql===svc.INSERT_META_SQL));
  assert.ok(events.some(x=>x.sql===svc.INSERT_ROWS_SQL));
  assert.equal(events.at(-1).sql,"COMMIT");
  const sqls=events.map(e=>e.sql).join("\n");
  assert.doesNotMatch(sqls,/\b(?:DELETE FROM|TRUNCATE TABLE|DROP TABLE)\b/i);
  assert.doesNotMatch(sqls,/UPDATE\s+atlas_v2\.youtube_person_signals/i);
  const migration=fs.readFileSync(svc.MIGRATION,"utf8");
  assert.doesNotMatch(migration,/DELETE FROM|DROP TABLE|TRUNCATE TABLE/i);
});
test("UUID publication refuses a changed global snapshot and conflicting reuse",async()=>{
  const events=[];
  await assert.rejects(()=>svc.publishIdentity(fakeClient(events,{sourceId:"yt-newer"}),body()),
    /ACTIVE_RAW_SNAPSHOT_MISMATCH/);
  assert.equal(events.at(-1).sql,"ROLLBACK");
  assert.ok(!events.some(e=>e.sql===svc.INSERT_META_SQL));
  const collision=body();
  await assert.rejects(()=>svc.publishIdentity(fakeClient([],{existing:[{
    identity_snapshot_id:collision.identity_snapshot_id,publication_fingerprint:"b".repeat(64)
  }]}),collision),/SNAPSHOT_CONFLICT/);
  const p=await svc.publishIdentity(fakeClient([],{existing:[{
    identity_snapshot_id:collision.identity_snapshot_id,
    publication_fingerprint:collision.publication_fingerprint
  }]}),collision);
  assert.equal(p.idempotent,true);
});
function res(){return {statusCode:200,setHeader(){},end(value){this.body=JSON.parse(value);}};}
const env={VERCEL_ENV:"production",VERCEL_GIT_COMMIT_REF:"main",
  VERCEL_GIT_REPO_OWNER:"JezCH",VERCEL_GIT_REPO_SLUG:"atlas-person-db",
  VERCEL_GIT_COMMIT_SHA:SHA,SUPABASE_DB_URL:"postgres://example.invalid/mock"};
test("production publisher blocks unauthenticated callers before database access",async()=>{
  let hits=0;
  const impl=handler.createYoutubePersonIdentityPublishHandler({
    env,clientFactory:async()=>{hits++;return {};},
    verifyOidc:async()=>{throw new Error("should not verify");}
  });
  let response=res();
  await impl({method:"POST",body:{runtime_sha:SHA,publication_sha:SHA}},response);
  assert.equal(response.statusCode,401);
  assert.equal(hits,0);
  response=res();
  await impl({method:"GET"},response);
  assert.equal(response.statusCode,405);
});
test("OIDC workflow claim binding precedes append-only publication",async()=>{
  let verified=false,completed=false;
  const impl=handler.createYoutubePersonIdentityPublishHandler({
    env,verifyOidc:async(token,args)=>{
      assert.equal(token,"signed-token");
      assert.equal(args.expectedSha,SHA);
      assert.match(args.policy.workflowRef,/youtube-person-identity-publish\.yml@refs\/heads\/main/);
      verified=true;
    },
    clientFactory:async()=>({end:async()=>{}}),
    applyMigration:async()=>({applied:"mock"}),
    publish:async()=>{assert.equal(verified,true);completed=true;return {committed:true};}
  });
  const response=res();
  await impl({method:"POST",headers:{authorization:"Bearer signed-token"},
    body:{runtime_sha:SHA,publication_sha:SHA}},response);
  assert.equal(response.statusCode,200);
  assert.equal(response.body.ok,true);
  assert.equal(completed,true);
});
