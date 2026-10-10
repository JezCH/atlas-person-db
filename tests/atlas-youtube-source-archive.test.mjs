import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const service=require("../server/atlas-youtube-source-archive-service.js");
const handlerModule=require("../server/atlas-youtube-source-archive-handler.js");

function row(overrides={}){
  return {
    object_key:"validated-batch017/sha256/aa/"+"a".repeat(64)+"/out/batch008/videos/UC1.ndjson.gz",
    sha256:"a".repeat(64),
    byte_count:123,
    source_artifact_id:11548326100,
    batch_label:"batch008",
    source_kind:"channel_videos",
    channel_id:"UC1",
    video_rows:2,
    ...overrides
  };
}

test("durable source catalog accepts only exact canonical source records",()=>{
  assert.deepEqual(service.normalizeRecord(row()),row());
  assert.deepEqual(
    service.normalizeRecord(row({source_kind:"metadata",channel_id:null,video_rows:null})),
    row({source_kind:"metadata",channel_id:null,video_rows:null})
  );
  assert.throws(()=>service.normalizeRecord(row({sha256:"bad"})),/SHA256_INVALID/);
  assert.throws(()=>service.normalizeRecords([row(),row()]),/DUPLICATE_OBJECT_KEY/);
});

function fakeClient(initial=[]){
  const data=new Map(initial.map(x=>[x.object_key,{...x}]));
  const commands=[];
  return {
    commands,
    data,
    async query(sql,params=[]){
      commands.push(sql);
      if(sql==="BEGIN" || sql==="COMMIT" || sql==="ROLLBACK" || sql.includes("pg_advisory_xact_lock")) return {rows:[]};
      if(sql.includes("where source_artifact_id=$1")){
        return {rows:[...data.values()].filter(x=>Number(x.source_artifact_id)===Number(params[0])).map(x=>({...x}))};
      }
      if(sql.includes("from atlas_v2.youtube_source_archives")){
        return {rows:(params[0]||[]).filter(k=>data.has(k)).map(k=>({...data.get(k)}))};
      }
      if(sql.includes("insert into atlas_v2.youtube_source_archives")){
        for(const item of JSON.parse(params[0])){
          if(!data.has(item.object_key)) data.set(item.object_key,{...item});
        }
        return {rows:[]};
      }
      throw new Error("unexpected query");
    }
  };
}

test("catalog migration helper applies the existing canonical migration",async()=>{
  const commands=[];
  const result=await service.applyYoutubeSourceArchiveMigrations(
    {query:async sql=>{commands.push(sql);return {rows:[]};}},
    {readFile:()=>"-- durable source catalog migration"}
  );
  assert.deepEqual(result,{applied:[
    "20261009_youtube_durable_source_catalog.sql",
    "20261011_youtube_durable_source_complete_catalog.sql"
  ]});
  assert.deepEqual(commands,[
    "-- durable source catalog migration",
    "-- durable source catalog migration"
  ]);
});

test("catalog publication is transactional, exact and idempotent",async()=>{
  const a=row();
  const b=row({
    object_key:"validated-batch017/sha256/bb/"+"b".repeat(64)+"/out/batch009/manifest.json",
    sha256:"b".repeat(64),
    byte_count:55,
    batch_label:"batch009",
    source_kind:"manifest",
    channel_id:null,
    video_rows:null
  });
  const client=fakeClient();
  const first=await service.publishYoutubeSourceArchiveCatalog(client,{records:[a,b]});
  assert.deepEqual(first,{committed:true,idempotent:false,verified_count:2,inserted_count:2,existing_count:0});
  assert.equal(client.data.size,2);
  const second=await service.publishYoutubeSourceArchiveCatalog(client,{records:[a,b]});
  assert.deepEqual(second,{committed:false,idempotent:true,verified_count:2,inserted_count:0,existing_count:2});
  assert.equal(client.data.size,2);
});

test("catalog readback can independently enumerate the complete artifact",async()=>{
  const a=row();
  const metadata=row({
    object_key:"validated-batch017/sha256/cc/"+"c".repeat(64)+"/recollection-summary.json",
    sha256:"c".repeat(64),
    byte_count:44,
    batch_label:"batch017-cumulative",
    source_kind:"metadata",
    channel_id:null,
    video_rows:null
  });
  const client=fakeClient([a,metadata]);
  const result=await service.readYoutubeSourceArchiveCatalog(client,11548326100);
  assert.equal(result.record_count,2);
  assert.deepEqual(result.records.map(x=>x.source_kind).sort(),["channel_videos","metadata"]);
  assert.equal(client.commands.at(0),"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  assert.equal(client.commands.at(-1),"COMMIT");
});

test("catalog mismatch fails closed and rolls back",async()=>{
  const expected=row();
  const client=fakeClient([{...expected,byte_count:999}]);
  await assert.rejects(
    ()=>service.publishYoutubeSourceArchiveCatalog(client,{records:[expected]}),
    /EXISTING_MISMATCH/
  );
  assert.equal(client.commands.at(-1),"ROLLBACK");
});

function response(){
  return {
    statusCode:null,headers:{},body:null,
    setHeader(k,v){this.headers[k]=v;},
    end(body){this.body=JSON.parse(body);}
  };
}

test("OIDC handler binds workflow identity and exact Production runtime",async()=>{
  const sha="a".repeat(40);
  let policy=null;
  const handler=handlerModule.createYoutubeSourceArchiveHandler({
    env:{
      VERCEL_ENV:"production",
      VERCEL_GIT_COMMIT_REF:"main",
      VERCEL_GIT_REPO_OWNER:"JezCH",
      VERCEL_GIT_REPO_SLUG:"atlas-person-db",
      VERCEL_GIT_COMMIT_SHA:sha,
      SUPABASE_DB_URL:"postgresql://example.invalid/postgres"
    },
    verifyOidc:async(_token,args)=>{policy=args.policy;},
    clientFactory:async()=>({end:async()=>{}}),
    applyMigrations:async()=>({applied:[
      "20261009_youtube_durable_source_catalog.sql",
      "20261011_youtube_durable_source_complete_catalog.sql"
    ]}),
    publish:async()=>({committed:true,idempotent:false,verified_count:1,inserted_count:1,existing_count:0}),
    readCatalog:async()=>({artifact_id:11548326100,record_count:1,records:[row()]})
  });
  const res=response();
  await handler({
    method:"POST",
    headers:{authorization:"Bearer token"},
    body:{runtime_sha:sha,publication_sha:sha,records:[row()]}
  },res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.marker,handlerModule.MARKER);
  assert.equal(policy.audience,"atlas-person-db-youtube-source-archive");
  assert.equal(policy.workflowRef,"JezCH/atlas-person-db/.github/workflows/youtube-preserve-verified-corpus.yml@refs/heads/main");
  assert.deepEqual([...policy.allowedEvents],["workflow_dispatch"]);
});
