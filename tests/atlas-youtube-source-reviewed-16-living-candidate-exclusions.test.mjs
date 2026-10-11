import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const manifest=require("../audits/youtube-live-16-reviewed-living-people-20261011.json");
const living=require("../atlas-youtube-reviewed-living-people.js");
const discovery=require("../server/atlas-youtube-unregistered-discovery-read-service.js");
const reviewedAt=Date.parse("2026-10-11T12:00:00Z");

test("the 16 living 2026 original-source candidate names are exact-only and independently documented",()=>{
 assert.equal(manifest.schema,"atlas-youtube-live-reviewed-current-living-identity-exclusions/v1");
 assert.equal(manifest.names.length,16);
 const norm=living.normalizeLivingName;
 assert.equal(new Set(manifest.names.map(norm)).size,16);
 for(const name of manifest.names){
   assert.ok(living.REVIEWED_LIVING_NAMES.includes(name),name);
   assert.equal(living.reviewedLivingStatus(name,reviewedAt)?.status,"living_likely",name);
 }
 assert.equal(living.reviewedLivingStatus("Muhammad Ali",reviewedAt),null);
 assert.equal(living.reviewedLivingStatus("George Washington Carver",reviewedAt),null);
 assert.equal(living.reviewedLivingStatus("Prince",reviewedAt),null);
});

test("all 16 living Person labels are excluded from the ONE live discovery rank but other historical candidates remain",()=>{
 const signals=manifest.names.map((name,i)=>({
   raw_name:name,rank:i+1,distinct_channel_count:7,video_count:9
 })).concat([{raw_name:"George Washington Carver",rank:99,distinct_channel_count:17,video_count:19}]);
 const registered=[{person_id:"dummy-registered",alias_name:"Dummy already registered Person"}];
 const out=discovery.candidatesFromSource(signals,registered,{now:reviewedAt});
 assert.equal(out.reviewedLivingExcluded,16);
 assert.equal(out.registeredExcluded,0);
 assert.equal(out.candidates.length,1);
 assert.equal(out.candidates[0].raw_name,"George Washington Carver");
});

test("living review naturally expires rather than silencing a historical person forever",()=>{
 const expiry=Date.parse(living.REVIEW_EXPIRES_AT);
 assert.ok(expiry>reviewedAt);
 for(const name of manifest.names){
   assert.equal(living.reviewedLivingStatus(name,expiry),null);
 }
});
