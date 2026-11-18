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


// Exercise the real CTE and candidate table with the checked-in baseline and
// migration, not a query stub. The input DB must be the local disposable CI
// server; never connect this test to a user/Production database.
const ciUrl = (() => {
  try {
    const u = new URL(process.env.DATABASE_URL || "");
    return ["postgres:","postgresql:"].includes(u.protocol) &&
      u.hostname === "127.0.0.1" && u.pathname === "/atlas_ci" &&
      process.env.GITHUB_ACTIONS === "true" ? u : null;
  } catch { return null; }
})();
test("waitlist real PostgreSQL: insert only, canonical aliases, stale previews and replay", {skip:!ciUrl}, async () => {
  const {Client}=require("pg");
  const {randomUUID}=require("node:crypto");
  const {readCurrentRegistrationQueue}=require("../server/atlas-registration-queue-read-service.js");
  const database="atlas_waitlist_test_"+randomUUID().replaceAll("-","");
  const admin=new Client({connectionString:ciUrl.toString()});
  await admin.connect();
  let db;
  let created=false;
  try {
    await admin.query('create database "'+database+'"');
    created=true;
    const url=new URL(ciUrl);url.pathname="/"+database;
    db=new Client({connectionString:url.toString()});
    await db.connect();
    await db.query(readFileSync(new URL("../db/schema/atlas_v2.current.sql",import.meta.url),"utf8"));
    await db.query(readFileSync(new URL("../db/migrations/20261003_person_registration_queue_authority.sql",import.meta.url),"utf8"));
    const personId="12345678-1234-4234-8234-123456789abc";
    await db.query("insert into atlas_v2.persons(id,canonical_key,person_type,historicity) values($1,'Waitlist Fixture Person','historical','historical')",[personId]);
    await db.query("insert into atlas_v2.person_names(id,person_id,locale,name,name_type,is_preferred) values($1,$2,'en','Waitlist Fixture Álias','primary',true)",[randomUUID(),personId]);
    const existing={candidate_id:"test-waitlist-preserve",name:"Existing Fixture Candidate",display_name_ko:"테스트 기존 후보",source_issue:1};
    await db.query("insert into atlas_v2.person_registration_candidates(candidate_id,name,review_metadata,priority) values($1,$2,$3::jsonb,'S')",[existing.candidate_id,existing.name,JSON.stringify({lookup_names:[existing.display_name_ko],review_state:"APPROVED",keep:"untouched"})]);
    const candidate={candidate_id:"test-waitlist-new",name:"New Fixture Candidate",display_name_ko:"테스트 신규 후보",source_issue:1,representative_domain:"culture",priority:"A"};
    const personAlias={candidate_id:"test-waitlist-person-alias",name:"Waitlist Fixture Alias",source_issue:1};
    const priorAlias={candidate_id:"test-waitlist-existing-alias",name:"테스트 기존 후보",source_issue:1};
    const duplicateA={candidate_id:"test-waitlist-dupe-a",name:"Duplicate Fixture Name",source_issue:1};
    const duplicateB={candidate_id:"test-waitlist-dupe-b",name:"Duplicate Fixture Name",source_issue:1};
    const items=[candidate,personAlias,priorAlias,duplicateA,duplicateB,existing];
    const before=(await db.query("select * from atlas_v2.person_registration_candidates where candidate_id=$1",[existing.candidate_id])).rows[0];
    const counts=async()=> (await db.query("select (select count(*)::int from atlas_v2.persons) as persons,(select count(*)::int from atlas_v2.person_registration_candidates) as candidates")).rows[0];
    const initial=await counts();
    const preview=await admitWaitlist({client:db,items});
    assert.equal(preview.ready_count,1);
    assert.deepEqual(await counts(),initial);
    const statuses=Object.fromEntries(preview.plan.map(x=>[x.candidate_id,x.status]));
    assert.equal(statuses[personAlias.candidate_id],"EXISTING_PERSON_NAME_MATCH");
    // Existing candidate and incoming alias overlap within the same batch:
    // refusal may be BATCH_COLLISION rather than existing candidate match.
    assert.notEqual(statuses[priorAlias.candidate_id],"READY");
    assert.notEqual(statuses[existing.candidate_id],"READY");
    assert.equal(statuses[duplicateA.candidate_id],"BLOCKED_BATCH_COLLISION");
    const applied=await admitWaitlist({client:db,items,commit:true,expected_token:preview.preview_token});
    assert.deepEqual(applied.inserted,[candidate.candidate_id]);
    assert.deepEqual(await counts(),{persons:initial.persons,candidates:initial.candidates+1});
    assert.deepEqual((await db.query("select * from atlas_v2.person_registration_candidates where candidate_id=$1",[existing.candidate_id])).rows[0],before);
    const live=(await readCurrentRegistrationQueue({client:db})).candidates.find(x=>x.candidate_id===candidate.candidate_id);
    assert.equal(live.review_state,"WAITLIST_USER_SELECTED");
    assert.equal(live.review_metadata.user_authorized_for_registration,false);
    await assert.rejects(admitWaitlist({client:db,items,commit:true,expected_token:preview.preview_token}),/STALE/);
    assert.equal((await admitWaitlist({client:db,items})).ready_count,0);
    const stale={candidate_id:"test-waitlist-stale",name:"New Stale Fixture",source_issue:1};
    const old=await admitWaitlist({client:db,items:[stale]});
    await db.query("insert into atlas_v2.person_registration_candidates(candidate_id,name) values('test-waitlist-concurrent',$1)",[stale.name]);
    await assert.rejects(admitWaitlist({client:db,items:[stale],commit:true,expected_token:old.preview_token}),/STALE/);
    assert.equal((await db.query("select count(*)::int as n from atlas_v2.person_registration_candidates where candidate_id=$1",[stale.candidate_id])).rows[0].n,0);
  } finally {
    try { if(db) await db.end(); } finally {
      try { if(created) await admin.query('drop database "'+database+'"'); } finally { await admin.end(); }
    }
  }
});
