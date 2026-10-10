import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const aliases=require("../server/atlas-reviewed-person-registration-aliases.js");
const discovery=require("../server/atlas-youtube-unregistered-discovery-read-service.js");
const reviewed=require("../audits/youtube-b024-source-first-36-final-registered-identity-review.json");
const pinned=require("../audits/youtube-b024-live-three-registered-person-alias-leaks.json");

const entries=pinned.live_registered_alias_leaks;

test("three live historical name aliases were source-reviewed and verified against registered UUID identities",()=>{
  assert.equal(entries.length,3);
  const aliasesInService=aliases.REVIEWED_REGISTRATION_ALIASES;
  for(const entry of entries) {
    const reviewedName=reviewed.registered_reviewed_alias[entry.youtube_raw_name];
    assert.ok(reviewedName,"original-source historical identity review absent: "+entry.youtube_raw_name);
    assert.equal(reviewedName.uuid,entry.registered_person_uuid);
    assert.equal(reviewedName.registered_name,entry.canonical_registered_name);
    const actual=aliasesInService.filter(
      x=>x.alias_name===entry.youtube_raw_name
    );
    assert.equal(actual.length,1,"must have exactly one registered alias: "+entry.youtube_raw_name);
    assert.equal(actual[0].canonical_key,entry.canonical_registered_name);
    assert.notEqual(actual[0].representative_default,true);
    assert.ok(aliases.reviewedPersonAliasesValuesSql().includes(
       "('"+entry.youtube_raw_name+"','"+entry.canonical_registered_name+"')"
    ));
  }
  assert.equal(new Set(entries.map(x=>x.registered_person_uuid)).size,3);
});

test("existing ONE production discovery ranking excludes reviewed registered aliases at last-stage Person match, no original data or channel sums",()=>{
  const raw=entries.map((entry,i)=>({
    raw_name:entry.youtube_raw_name,
    rank:entry.live_v5_rank_before,
    distinct_channel_count:entry.live_title_cue_distinct_channels_before,
    video_count:entry.live_title_cue_distinct_channels_before+3
  }));
  raw.push({raw_name:"New Historical Individual Awaiting Review",rank:900,
            distinct_channel_count:12,video_count:17});
  const registered=entries.map(x=>({person_id:x.registered_person_uuid,
       alias_name:x.youtube_raw_name}));
  for(const row of entries) registered.push({
    person_id:row.registered_person_uuid,alias_name:row.canonical_registered_name});
  const result=discovery.candidatesFromSource(raw,registered);
  assert.equal(result.registeredExcluded,3);
  assert.equal(result.candidates.length,1);
  assert.equal(result.candidates[0].raw_name,"New Historical Individual Awaiting Review");
  assert.equal(result.candidates[0].distinct_channel_count,12);
  assert.equal(result.candidates[0].source_id_union_verified,false);
});

test("registered historical aliases resolve to exactly one Person, and true homonyms are preserved for review",()=>{
  const row=entries[0];
  const signal={raw_name:row.youtube_raw_name,rank:1,distinct_channel_count:8,video_count:11};
  const collision=discovery.candidatesFromSource([signal],[
    {person_id:row.registered_person_uuid,alias_name:row.youtube_raw_name},
    {person_id:"different-person-uuid",alias_name:row.youtube_raw_name}
  ]);
  assert.equal(collision.registeredExcluded,0);
  assert.equal(collision.homonymReview,1);
  assert.equal(collision.candidates[0].identity_state,"registered_homonym_review");
  assert.equal(collision.candidates[0].count_lower_bound,false);
});
