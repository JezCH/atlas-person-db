import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {bindRegistrationQueueCandidate}=require("../server/atlas-registration-queue-service.js");

test("queue binding writes canonical UUID onto the same candidate row",async()=>{
  const calls=[];
  const client={async query(sql,args){
    calls.push({sql:String(sql),args});
    if(/for update/i.test(sql)) return {rows:[{candidate_id:"candidate-1",person_id:null}],rowCount:1};
    if(/update atlas_v2\.person_candidate_registration_states/i.test(sql)) return {rows:[{candidate_id:"candidate-1",person_id:"11111111-1111-4111-8111-111111111111"}],rowCount:1};
    return {rows:[],rowCount:0};
  }};
  const result=await bindRegistrationQueueCandidate(client,{candidate_id:"candidate-1",person_id:"11111111-1111-4111-8111-111111111111"});
  assert.equal(result.person_id,"11111111-1111-4111-8111-111111111111");
  assert.ok(calls.some(call=>/set person_id=\$2::uuid/i.test(call.sql)));
});

test("queue binding fails closed on person drift",async()=>{
  const client={async query(){return {rows:[{candidate_id:"candidate-1",person_id:"22222222-2222-4222-8222-222222222222"}],rowCount:1};}};
  await assert.rejects(()=>bindRegistrationQueueCandidate(client,{candidate_id:"candidate-1",person_id:"11111111-1111-4111-8111-111111111111"}),/BINDING_DRIFT/);
});
