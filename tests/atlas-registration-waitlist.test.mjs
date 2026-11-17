import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
const require=createRequire(import.meta.url);
const {normalizeItems,admitWaitlist,PLAN_SQL}=require("../server/atlas-registration-waitlist-service.js");
const {authorizeCandidateRequest}=require("../server/atlas-reviewed-candidate-handler.js");
const item={candidate_id:"wait-a",name:"Test Name",display_name_ko:"테스트",source_issue:2619};
const ready={input_id:"wait-a",id_exists:false,empty_key:false,person_ids:[],candidate_ids:[],batch_collisions:[]};
function mock(row=ready, insertConflict=false){
 const log=[];
 return {log,async query(sql,args){
  log.push({sql,args});
  if(sql===PLAN_SQL)return {rows:[row]};
  if(sql.startsWith("insert into")){
    assert.match(sql,/on conflict\(candidate_id\) do nothing/);
    assert.doesNotMatch(sql,/do update|delete from/i);
    const metadata=JSON.parse(args[4]);
    assert.equal(metadata.user_authorized_for_registration,false);
    assert.equal(metadata.review_state,"WAITLIST_USER_SELECTED");
    return insertConflict?{rowCount:0,rows:[]}:{rowCount:1,rows:[{candidate_id:args[0],person_id:null,review_metadata:metadata}]};
  }
  return {rows:[]};
 }};
}
test("waitlist validation rejects promotion, identity binding, duplicate ids and oversized input",()=>{
 assert.throws(()=>normalizeItems([{...item,review_state:"APPROVED"}]),/FORBIDDEN/);
 assert.throws(()=>normalizeItems([{...item,person_id:"existing"}]),/FORBIDDEN/);
 assert.throws(()=>normalizeItems([item,item]),/COLLISION/);
 assert.throws(()=>normalizeItems(Array(31).fill(item)),/INVALID/);
});
test("preview is read-only; exact preview permits one insert-only candidate",async()=>{
 const c=mock();
 const p=await admitWaitlist({client:c,items:[item]});
 assert.equal(p.committed,false);assert.equal(p.ready_count,1);
 assert.deepEqual(c.log.map(x=>x.sql),["begin isolation level repeatable read read only",PLAN_SQL,"commit"]);
 const w=mock();
 assert.deepEqual((await admitWaitlist({client:w,items:[item],commit:true,expected_token:p.preview_token})).inserted,["wait-a"]);
 assert.equal(w.log[0].sql,"begin isolation level serializable");
});
test("stale preview rolls back without mutation; existing identities do not insert",async()=>{
 const p=await admitWaitlist({client:mock(),items:[item]});
 for(const changed of [{...ready,id_exists:true},{...ready,person_ids:["p1"]},{...ready,candidate_ids:["c1"]},{...ready,batch_collisions:["wait-b"]}]){
  const c=mock(changed);
  await assert.rejects(admitWaitlist({client:c,items:[item],commit:true,expected_token:p.preview_token}),/STALE/);
  assert.equal(c.log.at(-1).sql,"rollback");
  assert.ok(!c.log.some(x=>x.sql.startsWith("insert into")));
  assert.equal((await admitWaitlist({client:mock(changed),items:[item]})).ready_count,0);
 }
});
test("conflict at insert aborts, cannot overwrite existing candidate",async()=>{
 const p=await admitWaitlist({client:mock(),items:[item]});
 const c=mock(ready,true);
 await assert.rejects(admitWaitlist({client:c,items:[item],commit:true,expected_token:p.preview_token}),/CONFLICT/);
 assert.equal(c.log.at(-1).sql,"rollback");
});
test("OIDC cannot admit waitlist; existing admin credentials required",async()=>{
 let oidcCalled=false;
 const env={ATLAS_MUTATION_TOKEN:"test-admin",ATLAS_SESSION_SECRET:"test-secret"};
 const verifyOidc=async()=>{oidcCalled=true;throw Error("must not run")};
 const body={operation:"admit_waitlist"};
 await assert.rejects(authorizeCandidateRequest({method:"POST",headers:{authorization:"Bearer fake-oidc"}},body,{env,verifyOidc}),/HUMAN_AUTH/);
 assert.equal(oidcCalled,false);
 const a=await authorizeCandidateRequest({method:"POST",headers:{authorization:"Bearer test-admin"}},body,{env,verifyOidc});
 assert.equal(a.method,"bearer");
});
test("29 approved waitlist-only selections and admin entry point",()=>{
 const js=readFileSync(new URL("../atlas-admin-waitlist.js",import.meta.url),"utf8");
 const data=JSON.parse(js.slice(js.indexOf("const preset = ")+15,js.indexOf(";\n  const input=")));
 assert.equal(data.length,29);
 assert.equal(data.filter(i=>i.source_issue===2545).length,14);
 assert.equal(data.filter(i=>i.source_issue===2619&&i.priority==="A").length,15);
 assert.equal(normalizeItems(data).length,29);
 assert.match(readFileSync(new URL("../admin.html",import.meta.url),"utf8"),/id="waitlistApply"[^>]*disabled/);
});
