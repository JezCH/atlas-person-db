import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {build}=require("../scripts/youtube-b024-rank-all-existing-source-candidates.cjs");
const labels=(name,channels,n,prior="PRIOR_2026_10_09_NEEDS_REVIEW_NOT_PROVEN_UNREGISTERED")=>({
 identity_label_for_review:name,source_raw_name_forms:[name],registration_screen_status:prior,
 strong_biography_title_distinct_original_video_ids:Array.from({length:n},(_,i)=>name+"-v"+i),
 strong_biography_title_distinct_original_channel_ids:Array.from({length:channels},(_,i)=>name+"-ch"+i),
 strong_biography_title_distinct_channels:channels,strong_biography_title_distinct_videos:n,
 source_examples:[{video_id:name+"-v0",original_title:"Biography of "+name,original_channel_id:name+"-ch0"}],
 actual_video_content_certified:false,
 current_complete_production_person_registry_rechecked:false
});
const data=(rows)=>({
 schema:"atlas-youtube-b024-prior-identity-positive-refined-original-cohorts/v1",
 input_existing_b024_original_video_ids:10706,input_source_name_labels:2766,
 full_current_ATLAS_person_and_alias_census_completed:false,
 confirmed_current_unregistered_historical_people:0,
 real_video_primary_content_certified:0,production_writes:0,
 new_youtube_videos_fetched:0,publishable:false,rows
});

test("ranks ALL open original-ID candidates, never just previously cherry-picked 8",()=>{
 const rows=[
  labels("C.S Lewis",3,4),
  labels("C. S. Lewis",2,2),
  labels("A. P. J. Abdul Kalam",3,3),
  labels("Not Yet Reviewed Historian",5,5),
  labels("Princess Diana",4,4),
  labels("Abraham Lincoln",10,10,"CONFIRMED_REGISTERED_AS_OF_2026_10_09_EXCLUDE"),
  labels("Jackie Chan",7,7),
  labels("Earth Day",6,6),
  labels("Picasso",4,4),
 ];
 const r=build(data(rows),{enforceRealSource:false});
 assert.equal(r.source_labels_processed,9);
 assert.equal(r.positive_registered_living_and_nonperson_excluded,3);
 assert.equal(r.ambiguous_held,1);
 assert.equal(r.provisional_identity_groups,4);
 assert.deepEqual(r.ranked_provisional_all_identities.map(x=>x.review_name),
  ["C. S. Lewis","Not Yet Reviewed Historian","Princess Diana","A. P. J. Abdul Kalam"]);
 const lewis=r.ranked_provisional_all_identities[0];
 assert.equal(lewis.original_distinct_channels,5);
 assert.equal(lewis.original_distinct_videos,6);
 assert.equal(lewis.source_names.length,2);
 assert.equal(lewis.reviewed_historical_identity_prior_2145_person_screen,true);
 assert.equal(r.ranked_provisional_all_identities.at(-1).provisional_review_priority,4);
 assert.deepEqual(r.channel_threshold_groups,{"1":4,"2":4,"3":4,"5":2,"10":0,"20":0});
 assert.equal(r.additional_exact_living_nonperson_exclusions,2);
 assert.equal(r.screened_current_complete_ATLAS_registration_list,false);
 assert.equal(r.official_production_rank_updated,false);
 assert.equal(r.actually_watched_person_biography_videos,0);
});

test("never restore previously excluded registered/living aliases or ambiguous surname",()=>{
 const r=build(data([
  labels("Jesus Christ",34,46,"ADDITIONAL_REGISTERED_UUID_POSITIVE_EXCLUDE"),
  labels("Serena Williams",13,14,"ADDITIONAL_DATED_LIVING_EVIDENCE_EXCLUDE"),
  labels("Picasso",10,11),
  labels("Some New Scholar",2,3)
 ]),{enforceRealSource:false});
 assert.equal(r.provisional_identity_groups,1);
 assert.equal(r.excluded_source_labels.length,2);
 assert.equal(r.identity_holds[0].reason,"SURNAME_OR_HOMONYM_HOLD");
 assert.equal(r.ranked_provisional_all_identities[0].review_name,"Some New Scholar");
 assert.equal(r.ranked_provisional_all_identities[0].min_3_channels_review_threshold_met,false);
});

test("duplicate original video IDs / forged watched content / fabricated current registry verification fail closed",()=>{
 const rows=[labels("Carter G Woodson",3,3),labels("Other Person",3,3)];
 rows[1].strong_biography_title_distinct_original_video_ids[0]=rows[0].strong_biography_title_distinct_original_video_ids[0];
 assert.throws(()=>build(data(rows),{enforceRealSource:false}),/B024_RANK_ORIGINAL_VIDEO_ID_DOUBLE_ASSIGNED/);
 const altered=[labels("Carter G Woodson",3,3)];
 altered[0].actual_video_content_certified=true;
 assert.throws(()=>build(data(altered),{enforceRealSource:false}),/B024_RANK_SOURCE_ID_OR_REVIEW_INTEGRITY_FAILED/);
 altered[0].actual_video_content_certified=false;
 altered[0].current_complete_production_person_registry_rechecked=true;
 assert.throws(()=>build(data(altered),{enforceRealSource:false}),/B024_RANK_SOURCE_ID_OR_REVIEW_INTEGRITY_FAILED/);
 const d=data([labels("Carter G Woodson",3,3)]);
 d.confirmed_current_unregistered_historical_people=10;
 assert.throws(()=>build(d,{enforceRealSource:false}),/B024_RANK_PRIOR_REAL_ORIGINAL_SOURCE_INVALID/);
});
