import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const readApi=require("../api/atlas-read.js");
const recentDeltaService=require("../server/atlas-recent-delta-read-service.js");
const recentDeltaHandler=require("../server/atlas-recent-delta-read-handler.js");

test("atlas-read preserves Recent Delta compatibility exports through the extracted modules", () => {
  assert.equal(readApi.RECENT_DELTA_SCHEMA,recentDeltaService.RECENT_DELTA_SCHEMA);
  assert.equal(readApi.RECENT_DELTA_LIMIT,recentDeltaService.RECENT_DELTA_LIMIT);
  assert.equal(readApi.recentDeltaTableCoverage,recentDeltaService.recentDeltaTableCoverage);
  assert.equal(readApi.readRecentDelta,recentDeltaService.readRecentDelta);
  assert.equal(readApi.createRecentDeltaReadHandler,recentDeltaHandler.createRecentDeltaReadHandler);
});

test("Recent Delta merges canonical mutation ledgers, sorts newest first, applies one final limit, and preserves delete coverage as unknown", async () => {
  let step=0;
  const client={async query(sql,params){
    step+=1;
    if(step===1){
      assert.match(sql,/authoring_manifest_runs/);
      assert.match(sql,/person_profile_mutation_audits/);
      assert.match(sql,/correction_manifest_runs/);
      assert.match(sql,/person_merge_audits/);
      return {rows:[{authoring:true,profile:true,correction:true,merge:true}]};
    }
    assert.deepEqual(params,[3]);
    if(step===2){
      assert.match(sql,/from atlas_v2\.authoring_manifest_runs/);
      return {rows:[{
        occurred_at:"2026-09-22T03:00:00Z",
        kind:"authoring",
        operation:"create_activity",
        person_id:"00000000-0000-4000-8000-000000000001",
        display_name:"A",
        change_count:1
      }]};
    }
    if(step===3){
      assert.match(sql,/from atlas_v2\.person_profile_mutation_audits/);
      return {rows:[{
        occurred_at:"2026-09-22T05:00:00Z",
        kind:"profile",
        operation:"profile_update",
        person_id:"00000000-0000-4000-8000-000000000002",
        display_name:"B",
        change_count:1
      }]};
    }
    if(step===4){
      assert.match(sql,/from atlas_v2\.correction_manifest_runs/);
      return {rows:[{
        occurred_at:"2026-09-22T02:00:00Z",
        kind:"correction",
        operation:"relationship_correction",
        person_id:null,
        display_name:null,
        change_count:2
      }]};
    }
    assert.equal(step,5);
    assert.match(sql,/from atlas_v2\.person_merge_audits/);
    return {rows:[{
      occurred_at:"2026-09-22T04:00:00Z",
      kind:"merge",
      operation:"person_merge",
      person_id:"00000000-0000-4000-8000-000000000003",
      display_name:"C",
      change_count:1
    }]};
  }};

  const result=await recentDeltaService.readRecentDelta(client,{limit:3});
  assert.equal(result.schema,"atlas-recent-delta/v1");
  assert.equal(result.source,"v2-mutation-ledgers");
  assert.equal(result.limit,3);
  assert.deepEqual(result.rows.map((row)=>row.kind),["profile","merge","authoring"]);
  assert.deepEqual(result.coverage,{
    authoring:true,
    profile:true,
    correction:true,
    merge:true,
    delete_person:false,
    delete_person_reason:"PERSON_DELETE_IMMUTABLE_AUDIT_NOT_EXPOSED"
  });
  assert.equal(step,5);
});

test("Recent Delta skips unavailable ledgers instead of inventing empty evidence", async () => {
  let step=0;
  const client={async query(sql,params){
    step+=1;
    if(step===1) return {rows:[{authoring:false,profile:true,correction:false,merge:false}]};
    assert.equal(step,2);
    assert.deepEqual(params,[recentDeltaService.RECENT_DELTA_LIMIT]);
    assert.match(sql,/person_profile_mutation_audits/);
    return {rows:[]};
  }};

  const result=await recentDeltaService.readRecentDelta(client);
  assert.equal(result.rows.length,0);
  assert.equal(result.coverage.authoring,false);
  assert.equal(result.coverage.profile,true);
  assert.equal(result.coverage.correction,false);
  assert.equal(result.coverage.merge,false);
  assert.equal(result.coverage.delete_person,false);
  assert.equal(step,2);
});

function response() {
  return {
    statusCode:0,
    headers:{},
    body:"",
    setHeader(name,value){ this.headers[String(name).toLowerCase()]=value; },
    end(value=""){ this.body=String(value); }
  };
}

test("extracted Recent Delta handler rejects non-GET before database access", async () => {
  let factoryCalls=0;
  const handler=recentDeltaHandler.createRecentDeltaReadHandler({
    env:{SUPABASE_DB_URL:"postgresql://example.invalid/atlas"},
    clientFactory:async()=>{
      factoryCalls+=1;
      throw new Error("must not open database");
    }
  });
  const res=response();
  await handler({method:"POST"},res);
  const body=JSON.parse(res.body);
  assert.equal(res.statusCode,405);
  assert.equal(body.schema,"atlas-recent-delta/v1");
  assert.equal(body.code,"METHOD_NOT_ALLOWED");
  assert.equal(factoryCalls,0);
});

test("extracted Recent Delta handler preserves response contract and always closes its client", async () => {
  let ended=false;
  const payload=Object.freeze({
    schema:"atlas-recent-delta/v1",
    source:"v2-mutation-ledgers",
    limit:12,
    rows:Object.freeze([]),
    coverage:Object.freeze({
      authoring:false,
      profile:false,
      correction:false,
      merge:false,
      delete_person:false,
      delete_person_reason:"PERSON_DELETE_IMMUTABLE_AUDIT_NOT_EXPOSED"
    })
  });
  const handler=recentDeltaHandler.createRecentDeltaReadHandler({
    env:{SUPABASE_DB_URL:"postgresql://example.invalid/atlas"},
    clientFactory:async(databaseUrl)=>{
      assert.equal(databaseUrl,"postgresql://example.invalid/atlas");
      return {async end(){ ended=true; }};
    },
    read:async()=>payload
  });
  const res=response();
  await handler({method:"GET"},res);
  const body=JSON.parse(res.body);
  assert.equal(res.statusCode,200);
  assert.equal(res.headers["cache-control"],"no-store");
  assert.equal(body.ok,true);
  assert.equal(body.schema,"atlas-recent-delta/v1");
  assert.equal(body.limit,12);
  assert.equal(ended,true);
});
