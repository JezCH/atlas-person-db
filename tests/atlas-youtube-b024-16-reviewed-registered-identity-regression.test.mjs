import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const historicalReview=require("../audits/youtube-b024-source-first-36-final-registered-identity-review.json");
const aliases=require("../server/atlas-reviewed-person-registration-aliases.js");
const discovery=require("../server/atlas-youtube-unregistered-discovery-read-service.js");

test("all 16 explicitly reviewed REGISTERED source identities must remain suppressed in live candidate filtering",()=>{
 const exact=Object.entries(historicalReview.registered_exact);
 const reviewed=Object.entries(historicalReview.registered_reviewed_alias);
 assert.equal(exact.length,11);
 assert.equal(reviewed.length,5);
 const registered=[...exact,...reviewed].flatMap(([sourceName,record])=>[
   {person_id:record.uuid,alias_name:record.registered_name},
   ...aliases.REVIEWED_REGISTRATION_ALIASES
     .filter(a=>a.canonical_key===record.registered_name)
     .map(a=>({person_id:record.uuid,alias_name:a.alias_name}))
 ]);
 for(const [sourceName,record] of reviewed){
   assert.ok(aliases.REVIEWED_REGISTRATION_ALIASES.some(
     a=>discovery.identityKey(a.alias_name)===discovery.identityKey(sourceName) &&
       discovery.identityKey(a.canonical_key)===discovery.identityKey(record.registered_name)
   ),"Reviewed historically registered alias is missing from permanent registry bridge: "+sourceName);
 }
 const sourceRows=[...exact,...reviewed].map(([name],i)=>({
   raw_name:name,rank:i+1,distinct_channel_count:8,video_count:10
 }));
 const filtered=discovery.candidatesFromSource(sourceRows,registered);
 assert.equal(filtered.registeredExcluded,16);
 assert.equal(filtered.candidates.length,0);
});

test("four identity context holds are never registered aliases by implication",()=>{
 const holds=Object.keys(historicalReview.identity_context_hold);
 const reviewed=aliases.REVIEWED_REGISTRATION_ALIASES;
 for(const name of holds){
  assert.ok(!reviewed.some(a=>discovery.identityKey(a.alias_name)===discovery.identityKey(name)),
    "Historical hold requires more context and MUST NOT be added as registered alias: "+name);
 }
});
