import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const manifest=require("../audits/youtube-source-first-live-registered-aliases-50.json");
const alias=require("../server/atlas-reviewed-person-registration-aliases.js");
const discovery=require("../server/atlas-youtube-unregistered-discovery-read-service.js");
const validUuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const newNames=manifest.reviewed_aliases.map(x=>x.source_name);

test("50 source-first live candidate aliases have exact reviewed registered UUID target, without duplicates",()=>{
 assert.equal(manifest.schema,"atlas-youtube-live-registered-person-alias-lookup/v1");
 assert.equal(manifest.source_live_total_before,8710);
 assert.equal(manifest.verified_production_identity_uuid_projection_count,2145);
 assert.equal(newNames.length,50);
 const key=x=>discovery.identityKey(x);
 assert.equal(new Set(newNames.map(key)).size,50);
 assert.ok(manifest.reviewed_aliases.every(x=>validUuid.test(x.registered_uuid)&&x.registered_name));
 const registered=alias.REVIEWED_REGISTRATION_ALIASES;
 for(const row of manifest.reviewed_aliases){
   const choices=registered.filter(x=>key(x.alias_name)===key(row.source_name));
   assert.equal(choices.length,1,"exactly one approved alias: "+row.source_name);
   assert.equal(choices[0].canonical_key,row.registered_name);
   assert.equal(choices[0].representative_default,false);
   assert.ok(alias.reviewedPersonAliasesValuesSql().includes("'"+row.source_name.replaceAll("'","''")+"'"),
     "SQL binds reviewed alias: "+row.source_name);
 }
 assert.ok(discovery.PERSON_NAMES_SQL.includes(alias.reviewedPersonAliasesValuesSql()),
   "actual Production registered Person SQL must ingest reviewed aliases");
});

test("all 50 registered Person aliases disappear from one discovery rank, without blocking unrelated history names",()=>{
 const registry=manifest.reviewed_aliases.map(x=>({
   person_id:x.registered_uuid,alias_name:x.source_name
 }));
 registry.push({person_id:"id-jinnah",alias_name:"Muhammad Ali Jinnah"});
 registry.push({person_id:"id-washington",alias_name:"George Washington"});
 const signals=manifest.reviewed_aliases.map((x,i)=>({
   raw_name:x.source_name,rank:i+1,distinct_channel_count:5,video_count:7
 }));
 signals.push({raw_name:"Muhammad Ali",rank:52,distinct_channel_count:40,video_count:53});
 signals.push({raw_name:"George Washington Carver",rank:53,distinct_channel_count:17,video_count:20});
 const out=discovery.candidatesFromSource(signals,registry);
 assert.equal(out.registeredExcluded,50);
 assert.equal(out.candidates.length,2);
 assert.deepEqual(out.candidates.map(x=>x.raw_name),["Muhammad Ali","George Washington Carver"]);
 assert.ok(out.candidates.every(x=>x.source_id_union_verified===false));
});

test("ambiguous regnal names remain held rather than receiving silent person registration links",()=>{
 for(const name of ["King David","King Solomon","Queen Mary I","King George V",
   "Queen Isabella I","The REAL King Arthur","Muhammad Ali"]){
   assert.ok(manifest.explicit_identity_holds.includes(name),name);
   assert.ok(!newNames.includes(name),name);
 }
});
