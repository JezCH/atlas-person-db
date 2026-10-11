import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const review=require("../audits/youtube-v5-registered-person-specific-aliases-reviewed-56.json");
const {REVIEWED_REGISTRATION_ALIASES,reviewedPersonAliasesValuesSql}
  =require("../server/atlas-reviewed-person-registration-aliases.js");
const {candidatesFromSource,identityKey}
  =require("../server/atlas-youtube-unregistered-discovery-read-service.js");

test("exact 56 source-first candidates map to explicitly reviewed unique registered identities",()=>{
 assert.equal(review.schema,"atlas-youtube-v5-registered-person-56-specific-aliases/v1");
 assert.equal(review.reviewed_exact_alias_count,56);
 assert.equal(review.aliases.length,56);
 assert.equal(new Set(review.aliases.map(x=>identityKey(x.alias_name))).size,56);
 assert.equal(new Set(review.aliases.map(x=>x.production_registered_person_id)).size,52);
 const aliases=new Map(REVIEWED_REGISTRATION_ALIASES.map(x=>[x.alias_name,x]));
 for(const item of review.aliases){
   const entry=aliases.get(item.alias_name);
   assert.ok(entry,"Missing registered reviewed alias "+item.alias_name);
   assert.equal(entry.canonical_key,item.canonical_key);
   assert.equal(entry.representative_default,false);
   assert.ok(item.production_registered_person_id);
   assert.ok(item.prior_reference_title_channel_count>=3);
 }
 const sql=reviewedPersonAliasesValuesSql();
 assert.ok(sql.includes("'Dr Martin Luther King','Martin Luther King Jr.'"));
 assert.ok(sql.includes("'Pope John Paul I','John Paul I'"));
 assert.ok(sql.includes("'Pope John Paul II','John Paul II'"));
});

test("all 56 are excluded in the SAME live single-rank final registered filter",()=>{
 const names=review.aliases.map((a,i)=>({
   raw_name:a.alias_name,rank:i+1,
   distinct_channel_count:a.prior_reference_title_channel_count,
   video_count:a.prior_reference_title_channel_count+2
 }));
 // PERSON_NAMES_SQL emits both the canonical/current Person name and its
 // reviewed specific alias pointing to that SAME Person ID. Mimic that
 // actual SQL projection, not canonical names alone.
 const people=review.aliases.flatMap(a=>[
   {person_id:a.production_registered_person_id,alias_name:a.canonical_key},
   {person_id:a.production_registered_person_id,alias_name:a.alias_name}
 ]);
 // Unsafe lookalikes must remain distinguishable Person identities.
 people.push({person_id:"egypt_muhammad_ali",alias_name:"Muhammad Ali of Egypt"});
 people.push({person_id:"jinnah_muhammad_ali",alias_name:"Muhammad Ali Jinnah"});
 people.push({person_id:"reformer_luther",alias_name:"Martin Luther"});
 people.push({person_id:"father_bush",alias_name:"George H. W. Bush"});
 people.push({person_id:"scientist_vonneumann",alias_name:"John von Neumann"});
 names.push({raw_name:"Muhammad Ali",rank:57,distinct_channel_count:64,video_count:68});
 names.push({raw_name:"Saint John Neumann",rank:58,distinct_channel_count:3,video_count:4});
 names.push({raw_name:"George Washington Carver",rank:59,distinct_channel_count:18,video_count:19});
 const out=candidatesFromSource(names,people);
 assert.equal(out.registeredExcluded,56);
 assert.equal(out.candidates.length,3);
 assert.deepEqual(new Set(out.candidates.map(x=>x.raw_name)),new Set([
   "Muhammad Ali","Saint John Neumann","George Washington Carver"
 ]));
 const reviewedDr=review.aliases.find(a=>a.alias_name==="Dr Martin Luther King");
 assert.equal(reviewedDr.canonical_key,"Martin Luther King Jr.");
});

test("explicit false-similarity holds never become auto-applicable reviewed aliases",()=>{
 const list=new Set(review.aliases.map(a=>a.alias_name));
 for(const name of [
   "Muhammad Ali","George W Bush","George Washington Carver",
   "John Quincy Adams","Saint John Neumann","Kim Jong-nam",
   "Pope John Paul III","John Paul Jones","Abraham Lincoln's",
   "Henry VIII's","Joseph Smith","John Rockefeller","Rajendra Chola"
 ])assert.equal(list.has(name),false,"Unsafe name: "+name);
});
