import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const more=require("../audits/youtube-v5-registered-28-nonoverlap-specific-aliases.json");
const prior=require("../audits/youtube-source-first-live-registered-aliases-50.json");
const {REVIEWED_REGISTRATION_ALIASES,reviewedPersonAliasesValuesSql}
 =require("../server/atlas-reviewed-person-registration-aliases.js");
const {candidatesFromSource}=require("../server/atlas-youtube-unregistered-discovery-read-service.js");

test("28 new registered aliases and 50 prior aliases have zero overlap and unique actual targets",()=>{
 assert.equal(more.novel_exact_alias_count,28);
 assert.equal(more.already_handled_overlap_count,28);
 assert.equal(prior.reviewed_aliases.length,50);
 const already=new Set(prior.reviewed_aliases.map(x=>x.source_name));
 const all=new Map();
 for(const e of REVIEWED_REGISTRATION_ALIASES){
   if(!all.has(e.alias_name))all.set(e.alias_name,[]);
   all.get(e.alias_name).push(e);
 }
 const ids=new Set();
 for(const a of more.aliases){
   assert.equal(already.has(a.alias_name),false,a.alias_name);
   const entry=all.get(a.alias_name);
   assert.equal(entry?.length,1,"duplicate or missing registered alias: "+a.alias_name);
   assert.equal(entry[0].canonical_key,a.canonical_key);
   assert.equal(entry[0].representative_default,false);
   assert.match(a.production_registered_person_id,/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
   assert.ok(a.prior_reference_title_channel_count>=3);
   ids.add(a.production_registered_person_id);
 }
 assert.equal(ids.size,27);
 const sql=reviewedPersonAliasesValuesSql();
 assert.ok(sql.includes("'Dr Martin Luther King','Martin Luther King Jr.'"));
 assert.ok(sql.includes("'Pope John Paul I','John Paul I'"));
 assert.ok(sql.includes("'The Apostle Paul','Paul the Apostle'"));
});

test("28 source-first historical labels disappear only through actual final registered exclusion",()=>{
 const input=more.aliases.map((a,i)=>({
   raw_name:a.alias_name,rank:i+1,distinct_channel_count:a.prior_reference_title_channel_count,
   video_count:a.prior_reference_title_channel_count+2
 }));
 // Exactly what PERSON_NAMES_SQL returns: current registered name + its
 // reviewed source-specific alias, both with the same live Person UUID.
 const people=more.aliases.flatMap(a=>[
  {person_id:a.production_registered_person_id,alias_name:a.canonical_key},
  {person_id:a.production_registered_person_id,alias_name:a.alias_name}
 ]);
 input.push({raw_name:"Muhammad Ali",rank:29,distinct_channel_count:64,video_count:68});
 input.push({raw_name:"George Washington Carver",rank:30,distinct_channel_count:18,video_count:24});
 people.push({person_id:"different_person1",alias_name:"Muhammad Ali of Egypt"});
 people.push({person_id:"different_person2",alias_name:"Muhammad Ali Jinnah"});
 people.push({person_id:"different_person3",alias_name:"George Washington"});
 const result=candidatesFromSource(input,people);
 assert.equal(result.registeredExcluded,28);
 assert.equal(result.candidates.length,2);
 assert.deepEqual(new Set(result.candidates.map(x=>x.raw_name)),
   new Set(["Muhammad Ali","George Washington Carver"]));
});

test("dangerous homonym and ordinal examples not silently approved as registry aliases",()=>{
 const approved=new Set(more.aliases.map(x=>x.alias_name));
 for(const candidate of ["Muhammad Ali","George W Bush","George Washington Carver",
   "Pope John Paul II","John Paul Jones","Saint John Neumann",
   "Kim Jong-nam","Joseph Smith","John Rockefeller","Rajendra Chola"])
   assert.equal(approved.has(candidate),false);
});
