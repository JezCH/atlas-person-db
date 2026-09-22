import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const readApi=require('../api/atlas-read.js');
const exclusionsService=require('../server/atlas-runtime-exclusions-read-service.js');
const exclusionsHandler=require('../server/atlas-runtime-exclusions-read-handler.js');

test('atlas-read preserves runtime exclusions compatibility exports through the extracted modules', () => {
  assert.equal(readApi.RUNTIME_EXCLUSIONS_SCHEMA,exclusionsService.RUNTIME_EXCLUSIONS_SCHEMA);
  assert.equal(readApi.readRuntimeExclusions,exclusionsService.readRuntimeExclusions);
  assert.equal(readApi.createRuntimeExclusionsReadHandler,exclusionsHandler.createRuntimeExclusionsReadHandler);
});


test('Runtime exclusion read returns exact active compile targets with human-readable identities', async () => {
  const key='runtime-person-politics-v1:current';
  let step=0;
  const client={async query(sql,params){
    step+=1;
    if (step===1) {
      assert.match(sql,/runtime_compile_exclusions/);
      return {rows:[{exclusion_targets:true}]};
    }
    if (step===2) {
      assert.match(sql,/runtime_person_politics_v1/);
      return {rows:[{runtime_activity_count:90,compile_key_count:1,compile_key:key}]};
    }
    if (step===3) {
      assert.deepEqual(params,[key]);
      return {rows:[{
        excluded_row_count:2,
        exclusion_summary:{PROVENANCE_UNRESOLVED:1,START_BOUNDARY_UNRESOLVED:1},
        compiled_at:'2026-09-20T08:00:00Z'
      }]};
    }
    assert.equal(step,4);
    assert.deepEqual(params,[key]);
    assert.match(sql,/person_display_name/);
    assert.match(sql,/polity_display_name/);
    return {rows:[
      {
        activity_id:'11111111-1111-4111-8111-111111111111',
        person_id:'22222222-2222-4222-8222-222222222222',
        person_display_name:'인물 A',
        polity_id:'33333333-3333-4333-8333-333333333333',
        polity_display_name:'정치체 A',
        reason_code:'PROVENANCE_UNRESOLVED'
      },
      {
        activity_id:'44444444-4444-4444-8444-444444444444',
        person_id:'55555555-5555-4555-8555-555555555555',
        person_display_name:'인물 B',
        polity_id:'66666666-6666-4666-8666-666666666666',
        polity_display_name:'정치체 B',
        reason_code:'START_BOUNDARY_UNRESOLVED'
      }
    ]};
  }};
  const result=await exclusionsService.readRuntimeExclusions(client);
  assert.equal(result.schema,'atlas-runtime-exclusions/v1');
  assert.equal(result.available,true);
  assert.equal(result.active_compile_key,key);
  assert.equal(result.total_count,2);
  assert.deepEqual(result.reason_summary,{PROVENANCE_UNRESOLVED:1,START_BOUNDARY_UNRESOLVED:1});
  assert.equal(result.targets[0].person_display_name,'인물 A');
  assert.equal(result.targets[1].polity_display_name,'정치체 B');
});

test('Runtime exclusion read fails closed when target snapshot does not match compile ledger', async () => {
  const key='runtime-person-politics-v1:current';
  let step=0;
  const client={async query(){
    step+=1;
    if (step===1) return {rows:[{exclusion_targets:true}]};
    if (step===2) return {rows:[{runtime_activity_count:90,compile_key_count:1,compile_key:key}]};
    if (step===3) return {rows:[{
      excluded_row_count:2,
      exclusion_summary:{START_BOUNDARY_UNRESOLVED:2},
      compiled_at:'2026-09-20T08:00:00Z'
    }]};
    return {rows:[{
      activity_id:'11111111-1111-4111-8111-111111111111',
      person_id:'22222222-2222-4222-8222-222222222222',
      person_display_name:'인물 A',
      polity_id:'33333333-3333-4333-8333-333333333333',
      polity_display_name:'정치체 A',
      reason_code:'START_BOUNDARY_UNRESOLVED'
    }]};
  }};
  const result=await exclusionsService.readRuntimeExclusions(client);
  assert.equal(result.available,false);
  assert.equal(result.reason,'RUNTIME_EXCLUSION_TARGET_SNAPSHOT_INCOMPLETE');
  assert.equal(result.expected_count,2);
  assert.equal(result.observed_count,1);
  assert.deepEqual(result.targets,[]);
});

test('Runtime exclusion read preserves migration absence as unavailable instead of zero', async () => {
  const client={async query(){ return {rows:[{exclusion_targets:false}]}; }};
  const result=await exclusionsService.readRuntimeExclusions(client);
  assert.equal(result.available,false);
  assert.equal(result.reason,'RUNTIME_EXCLUSION_TARGET_LEDGER_NOT_APPLIED');
  assert.equal(result.total_count,null);
  assert.deepEqual(result.targets,[]);
});


function exclusionsResponse() {
  return {
    statusCode:0,
    headers:{},
    body:"",
    setHeader(name,value) { this.headers[String(name).toLowerCase()]=value; },
    end(value="") { this.body=String(value); }
  };
}

test('extracted runtime exclusions handler rejects non-GET before DB access', async () => {
  let factoryCalls=0;
  const handler=exclusionsHandler.createRuntimeExclusionsReadHandler({
    env:{ SUPABASE_DB_URL:'postgresql://example.invalid/atlas' },
    clientFactory:async () => {
      factoryCalls+=1;
      throw new Error('must not open database');
    }
  });
  const res=exclusionsResponse();
  await handler({ method:'POST' },res);
  const body=JSON.parse(res.body);
  assert.equal(res.statusCode,405);
  assert.equal(body.schema,'atlas-runtime-exclusions/v1');
  assert.equal(body.code,'METHOD_NOT_ALLOWED');
  assert.equal(factoryCalls,0);
});

test('extracted runtime exclusions handler preserves response contract and closes its client', async () => {
  let ended=false;
  const payload=Object.freeze({
    schema:'atlas-runtime-exclusions/v1',
    source:'runtime-compile-exclusion-ledger',
    available:true,
    reason:null,
    active_compile_key:'runtime-person-politics-v1:test',
    compiled_at:'2026-09-20T08:00:00.000Z',
    total_count:0,
    reason_summary:Object.freeze({}),
    targets:Object.freeze([])
  });
  const handler=exclusionsHandler.createRuntimeExclusionsReadHandler({
    env:{ SUPABASE_DB_URL:'postgresql://example.invalid/atlas' },
    clientFactory:async (databaseUrl) => {
      assert.equal(databaseUrl,'postgresql://example.invalid/atlas');
      return { async end() { ended=true; } };
    },
    read:async () => payload
  });
  const res=exclusionsResponse();
  await handler({ method:'GET' },res);
  const body=JSON.parse(res.body);
  assert.equal(res.statusCode,200);
  assert.equal(res.headers['cache-control'],'no-store');
  assert.equal(body.ok,true);
  assert.equal(body.schema,'atlas-runtime-exclusions/v1');
  assert.equal(body.total_count,0);
  assert.equal(ended,true);
});
