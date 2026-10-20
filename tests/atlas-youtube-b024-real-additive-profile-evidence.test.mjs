import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const src=require("../server/atlas-youtube-b024-original-id-live-ranking.js");
const db=require("../server/atlas-youtube-unregistered-discovery-read-service.js");
const {CROSSWALK,ARCHIVE_SHA}=require("../server/atlas-youtube-original-title-crosswalk-read.js");
const realExtra=require("../audits/youtube-b024-added-profile-title-runtime-source-20261020.json");
const realHolds=require("../audits/youtube-b024-clear-nonindividual-and-identity-holds-20261020.json");
function snapshot(){
 return {
  snapshot_id:CROSSWALK.production_snapshot_id,parser_version:"yt-title-person-reviewed-v5",
  snapshot_scope:"global_reconciled",channel_count:10127,video_count:2230031,
  source_state:{artifact_digest:"sha256:"+ARCHIVE_SHA},generated_at:"2026-10-10T08:36:57Z"
 };
}
function registration(){
 return Array.from({length:2100},(_,i)=>({person_id:"existing-"+i,alias_name:"Known Historical Person "+i}));
}
test("actual persisted 536 new original video IDs, 400 reviewed source groups, strict 6162 not overwritten",()=>{
 const profile=src.validAdditiveProfileSource();
 assert.equal(profile.extra.size,400);
 assert.equal(profile.quarantined.size,62);
 assert.equal(profile.unfiltered_three_channel_groups,895);
 assert.equal(realExtra.combined_unique_profile_plus_biography_title_video_ids,6698);
 assert.equal(realExtra.new_original_profile_title_video_id_count,536);
 assert.equal(realExtra.video_media_playback_verified_count,0);
 assert.equal(realHolds.clear_nonindividual_labels,52);
 assert.equal(realHolds.ambiguous_identity_labels,10);
 assert.equal(src.VERIFIED_SOURCE_ROWS.length,2241);
 assert.equal(src.VERIFIED_SOURCE_ROWS.flatMap(row=>row[3]).length,6162);
});
test("ALL 2241 candidates are recalculated after EXACT current Person+alias check; nonpersons and ambiguous 62 held",()=>{
 const actual=src.renderCurrentRegistryRank({
  snapshot:snapshot(),registryRows:registration(),expectedCurrentRegisteredPersons:2100,
  identityKey:db.identityKey
 });
 assert.equal(actual.newly_reviewed_nonindividual_source_holds,52);
 assert.equal(actual.newly_reviewed_ambiguous_source_holds,10);
 assert.equal(actual.additive_profile_original_video_id_count,536);
 assert.equal(actual.source_total_title_evidence_original_video_id_count,6698);
 assert.equal(actual.threshold_counts["3"],854); // 895 raw - 34 held and 7 reviewed living
 assert.equal(actual.ranking_evidence_type,src.PROFILE_SOURCE_PROOF);
 for(const excluded of ["Black Holes","Pink Floyd","Hagia Sophia","Coca-Cola","12 Years a Slave",
                       "Guns N' Roses","Northern Ireland","Bonnie and Clyde","Princess Alice"]){
  assert.equal(actual.candidates.some(row=>row.raw_name===excluded),false,excluded);
 }
 const hawking=actual.candidates.find(x=>x.raw_name==="Stephen Hawking");
 assert.equal(hawking.strict_biography_original_channel_count,36);
 assert.equal(hawking.strict_biography_original_video_count,37);
 assert.equal(hawking.additional_explicit_profile_original_video_count,3);
 assert.equal(hawking.distinct_channel_count,39);
 assert.equal(hawking.video_count,40);
 assert.equal(hawking.evidence_type,src.PROFILE_SOURCE_PROOF);
 assert.equal(hawking.video_person_centeredness_certified,false);
 const diana=actual.candidates.find(x=>x.raw_name==="Princess Diana");
 assert.equal(diana.distinct_channel_count,32);
 assert.equal(diana.video_count,35);
 assert.equal(diana.presently_unregistered_historical_person_certified,false);
});
test("no invalid new video ID, fake source evidence or unreviewed new identity merge",()=>{
 const forged=structuredClone(realExtra);
 forged.rows[0][2][0]=src.VERIFIED_SOURCE_ROWS[0][3][0];
 assert.throws(()=>src.validAdditiveProfileSource(forged),/DOUBLE_CREDIT/);
 const fakePopulation=structuredClone(realExtra);
 fakePopulation.new_original_profile_title_video_id_count=999;
 assert.throws(()=>src.validAdditiveProfileSource(fakePopulation),/PROFILE_PROVENANCE_INVALID/);
 const fakeHold=structuredClone(realHolds);
 fakeHold.rows[0].name="Unreviewed New Celebrity";
 assert.throws(()=>src.validAdditiveProfileSource(realExtra,fakeHold),/HOLD_NOT_EXACT_PINNED_SOURCE_IDENTITY/);
});
