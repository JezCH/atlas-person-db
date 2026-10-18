import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";

const require=createRequire(import.meta.url);
const discovery=require("../server/atlas-youtube-unregistered-discovery-read-service.js");
const holds=require("../audits/youtube-v5-source-reviewed-identity-context-holds.json");
const originalReview=require("../audits/youtube-b024-source-first-36-final-registered-identity-review.json");
const snapshot={
  snapshot_id:holds.active_rank_snapshot_id,
  parser_version:holds.expected_parser_version,
  channel_count:holds.original_channel_count,
  video_count:holds.original_video_count,
  source_state:{artifact_digest:"sha256:"+holds.source_review_zip_sha256}
};
const sourceRegistry=[{person_id:"known-person-1",alias_name:"Al-Bukhari"}];
const rawRows=holds.holds.map((x,i)=>({
 raw_name:x.raw_name,rank:i+1,distinct_channel_count:6,video_count:7
})).concat([{raw_name:"Emmett Till",rank:5,distinct_channel_count:7,video_count:10}]);

test("the four EXISTING source-reviewed identity ambiguities are visible as holds, not accepted Persons",()=>{
 assert.equal(holds.holds.length,4);
 assert.equal(holds.source_review_schema,originalReview.schema);
 const m=discovery.reviewedIdentityHoldsForSnapshot(snapshot);
 assert.equal(m.size,4);
 for(const [name,reason] of Object.entries(originalReview.identity_context_hold)) {
   assert.equal(m.get(discovery.identityKey(name)),reason,name);
 }
 const output=discovery.candidatesFromSource(rawRows,sourceRegistry,{
   reviewedIdentityHolds:m
 });
 assert.equal(output.reviewedIdentityHoldCount,4);
 assert.equal(output.candidates.length,5);
 assert.equal(output.candidates[0].raw_name,"Emmett Till");
 for(const row of output.candidates.slice(1)) {
   assert.equal(row.identity_state,"source_reviewed_identity_hold",row.raw_name);
   assert.equal(row.identity_review_reason,m.get(discovery.identityKey(row.raw_name)));
   assert.equal(row.distinct_channel_count,6);
   assert.equal(row.source_id_union_verified,false);
 }
});

test("hold is exact source label only, never a fuzzy deletion or a registered Person name injection",()=>{
 const reviewed=discovery.reviewedIdentityHoldsForSnapshot(snapshot);
 const outcome=discovery.candidatesFromSource([...rawRows,
   {raw_name:"Patrick of Ireland",rank:6,distinct_channel_count:4,video_count:5},
   {raw_name:"Emmett Till",rank:7,distinct_channel_count:3,video_count:4}
 ],sourceRegistry,{reviewedIdentityHolds:reviewed});
 assert.equal(outcome.reviewedIdentityHoldCount,4);
 assert.ok(outcome.candidates.find(row=>row.raw_name==="Patrick of Ireland" &&
   row.identity_state==="unregistered_candidate"));
 assert.equal(outcome.overlappingRawLabels,1);
 assert.ok(outcome.candidates.find(row=>row.raw_name==="Emmett Till" &&
   row.distinct_channel_count===7));
 assert.equal(outcome.nonpersonExcluded,0);
});

test("source-reviewed identity holds persist across same-archive v5 rebuilds, but do not auto-apply to different corpora",()=>{
 const sameArchiveNewSnapshot={...snapshot,snapshot_id:"yt-new-v5-replay-of-same-original-b024-zip"};
 assert.equal(discovery.reviewedIdentityHoldsForSnapshot(sameArchiveNewSnapshot).size,4);
 const differentSource={...sameArchiveNewSnapshot,
   source_state:{artifact_digest:"sha256:"+"0".repeat(64)}};
 assert.equal(discovery.reviewedIdentityHoldsForSnapshot(differentSource).size,0);
 for(const altered of [
   {...snapshot,parser_version:"yt-title-person-reviewed-v4"},
   {...snapshot,source_state:{artifact_digest:"sha256:"+"0".repeat(64)}},
   {...snapshot,channel_count:holds.original_channel_count-1},
   {...snapshot,video_count:holds.original_video_count-1}
 ]) {
   assert.throws(()=>discovery.reviewedIdentityHoldsForSnapshot(altered),
     /YOUTUBE_V5_SOURCE_REVIEWED_IDENTITY_HOLD_SNAPSHOT_PARITY_MISMATCH/);
 }
});

test("registration review UI renders hold-specific ambiguous badges instead of misleading unmatched",()=>{
 const script=readFileSync(new URL("../atlas-registration-review.js",import.meta.url),"utf8");
 assert.match(script,/identity_state==="source_reviewed_identity_hold"/);
 assert.match(script,/data-status="ambiguous"/);
 assert.match(script,/부자 동명이인/);
 assert.match(script,/동명 성인/);
 assert.match(script,/인물·기념일·장소 혼동/);
});
