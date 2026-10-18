import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";

const require=createRequire(import.meta.url);
const discovery=require("../server/atlas-youtube-unregistered-discovery-read-service.js");
const holds=require("../audits/youtube-v5-source-reviewed-identity-context-holds.json");
const sourceRegistry=[
  {person_id:"registered-marcos-senior-only",alias_name:"Ferdinand Marcos"},
  {person_id:"registered-emmett-till",alias_name:"Emmett Till"},
  {person_id:"unrelated-registered",alias_name:"Some Different Historical Person"}
];
const sameOriginalZipSnapshot={
  snapshot_id:"yt-20261018T000000Z-10127ch-rebuild-v5",
  parser_version:holds.expected_parser_version,
  channel_count:holds.original_channel_count,
  video_count:holds.original_video_count,
  source_state:{
    artifact_digest:"sha256:"+holds.source_review_zip_sha256,
    source_name_generation_independent_of_registered_persons:true
  }
};
const rawRows=[
  {raw_name:"Ferdinand Marcos",rank:1,distinct_channel_count:6,video_count:9},
  {raw_name:"Emmett Till",rank:2,distinct_channel_count:5,video_count:7},
  {raw_name:"Ada Lovelace",rank:3,distinct_channel_count:4,video_count:6}
];
const union={
  canonical_name:"Patrick of Ireland",
  aliases:[
    {name:"St Patrick",distinct_channel_count:2,video_count:2},
    {name:"Patrick the Saint",distinct_channel_count:2,video_count:2}
  ],
  distinct_channel_count:3,
  video_count:3,
  union_video_ids_sha256:"a".repeat(64)
};

test("same original-source v5 snapshot retains all 4 unresolved identity holds across replay IDs",()=>{
  const old={...sameOriginalZipSnapshot,snapshot_id:holds.active_rank_snapshot_id};
  assert.equal(discovery.reviewedIdentityHoldsForSnapshot(old).size,4);
  assert.equal(discovery.reviewedIdentityHoldsForSnapshot(sameOriginalZipSnapshot).size,4);
  const newZip={...sameOriginalZipSnapshot,source_state:{artifact_digest:"sha256:"+"0".repeat(64)}};
  assert.equal(discovery.reviewedIdentityHoldsForSnapshot(newZip).size,0);
  assert.equal(holds.not_an_unregistered_person_certification,true);
});

test("sub-3-channel reviewed alias union cannot launder St Patrick ambiguity into an unregistered Person",()=>{
  const active=discovery.reviewedIdentityHoldsForSnapshot(sameOriginalZipSnapshot);
  // Neither short alias qualifies on its own for the raw >=3-channel DB feed.
  // Their approved original Video-ID/channel-ID UNION qualifies at exactly 3.
  const result=discovery.candidatesFromSource(rawRows,sourceRegistry,{
    approvedUnions:[union],reviewedIdentityHolds:active
  });
  assert.equal(result.reviewedUnionsApplied,1);
  assert.equal(result.registeredExcluded,1); // Emmett Till suppressed LAST
  assert.equal(result.reviewedIdentityHoldCount,2);
  assert.equal(result.candidates.length,3);
  const patrick=result.candidates.find(x=>x.raw_name==="Patrick of Ireland");
  assert.ok(patrick);
  assert.equal(patrick.distinct_channel_count,3);
  assert.equal(patrick.video_count,3);
  assert.equal(patrick.source_id_union_verified,true);
  assert.equal(patrick.identity_state,"source_reviewed_identity_hold");
  assert.equal(patrick.identity_review_reason,"PERSON_HOLIDAY_CATHEDRAL_AMBIGUITY");
  assert.deepEqual(patrick.source_labels,["St Patrick","Patrick the Saint"]);
  assert.equal(patrick.registration_match_count,0);
  const marcos=result.candidates.find(x=>x.raw_name==="Ferdinand Marcos");
  assert.equal(marcos.identity_state,"source_reviewed_identity_hold");
  assert.equal(marcos.identity_review_reason,"FATHER_SON_SHARED_NAME");
  assert.equal(marcos.registration_match_count,1,
    "One registered father cannot certify the separately living son's identity");
  assert.equal(result.candidates.find(x=>x.raw_name==="Emmett Till"),undefined);
  assert.equal(result.candidates.find(x=>x.raw_name==="Ada Lovelace").identity_state,
    "unregistered_candidate");
  // This is one existing candidate feed, still title-candidate evidence only.
  const ui=readFileSync(new URL("../atlas-registration-review.js",import.meta.url),"utf8");
  assert.ok(ui.indexOf('identity_state==="source_reviewed_identity_hold"')<
    ui.indexOf('source_id_union_verified===true'),
    "Ambiguous Person must render HOLD before a source-ID-union verified badge");
});

test("conflicting reviewed identity holds must stop a wrong same-Person union",()=>{
  const conflicting={
    ...union,
    canonical_name:"Saint Holiday",
    aliases:[
      {name:"St Patrick",distinct_channel_count:2,video_count:2},
      {name:"St Valentine",distinct_channel_count:2,video_count:2}
    ]
  };
  assert.throws(()=>discovery.candidatesFromSource(rawRows,sourceRegistry,{
    approvedUnions:[conflicting],
    reviewedIdentityHolds:discovery.reviewedIdentityHoldsForSnapshot(sameOriginalZipSnapshot)
  }),/YOUTUBE_DISCOVERY_REVIEWED_UNION_CONFLICTING_IDENTITY_HOLDS/);
});

test("no trusted registered Person rows still fail closed (never an empty-registry 'unregistered' claim)",()=>{
  assert.throws(()=>discovery.candidatesFromSource(rawRows,[],{
    approvedUnions:[union],
    reviewedIdentityHolds:discovery.reviewedIdentityHoldsForSnapshot(sameOriginalZipSnapshot)
  }),/YOUTUBE_DISCOVERY_PERSON_REGISTRY_EMPTY/);
});
