import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {spawnSync} from "node:child_process";
const require=createRequire(import.meta.url);
const discovery=require("../server/atlas-youtube-unregistered-discovery-read-service.js");
const review=require("../audits/youtube-v5-source-nonperson-exact-labels.json");
const registry=[{person_id:"p-existing",alias_name:"Existing Registered Person"}];
const snapshot={
  snapshot_id:review.active_snapshot_id,
  parser_version:review.parser_version,
  channel_count:review.source_channels,
  video_count:review.source_videos,
  source_state:{artifact_digest:"sha256:"+review.source_archive_sha256}
};
const nonPersonRows=review.reviewed_labels.map((entry,i)=>({
 raw_name:entry.name,rank:i+1,distinct_channel_count:25,video_count:32
}));
const personRow={raw_name:"Emmett Till",rank:24,distinct_channel_count:24,video_count:28};

test("every source-reviewed v5 nonperson label is excluded without harming historical candidates",()=>{
 assert.equal(review.reviewed_labels.length,23);
 const verified=discovery.reviewedV5NonPersonForSnapshot(snapshot);
 assert.equal(verified.size,23);
 const out=discovery.candidatesFromSource([...nonPersonRows,personRow],registry,{
   reviewedSourceNonPersonKeys:verified
 });
 assert.equal(out.sourceNonpersonExcluded,23);
 assert.equal(out.nonpersonExcluded,23);
 assert.equal(out.candidates.length,1);
 assert.equal(out.candidates[0].raw_name,"Emmett Till");
 assert.equal(out.candidates[0].distinct_channel_count,24);
 assert.equal(out.candidates[0].rank,1);
 assert.equal(out.candidates[0].source_id_union_verified,false);
});

test("v5 label evidence is pinned to one immutable snapshot and exact archive digest",()=>{
 assert.equal(discovery.reviewedV5NonPersonForSnapshot({
   ...snapshot,snapshot_id:"yt-unrelated-newer"
 }).size,0);
 for(const altered of [
   {...snapshot,parser_version:"yt-title-person-reviewed-v4"},
   {...snapshot,source_state:{artifact_digest:"sha256:"+"0".repeat(64)}},
   {...snapshot,channel_count:snapshot.channel_count-1},
   {...snapshot,video_count:snapshot.video_count-1}
 ]) {
   assert.throws(()=>discovery.reviewedV5NonPersonForSnapshot(altered),
     /YOUTUBE_V5_REVIEWED_SOURCE_SNAPSHOT_PARITY_MISMATCH/);
 }
});

test("source-review does not convert two-person collectives to Person identities",()=>{
 const keys=discovery.reviewedV5NonPersonForSnapshot(snapshot);
 for(const value of ["Wright Brothers","The Wright Brothers","You Know","Greek Mythology","Nazi Germany","The Tudors"]) {
   assert.ok(keys.has(discovery.identityKey(value)),value);
 }
 assert.equal(keys.has(discovery.identityKey("Wright Brothers")),true);
 assert.equal(keys.has(discovery.identityKey("Wright Brother")),false);
});

test("future Python raw-snapshot publisher rejects every reviewed v5 non-Person label",()=>{
 const program=[
   "import importlib.util,json",
   "p='scripts/youtube-build-person-signal-snapshot.py'",
   "s=importlib.util.spec_from_file_location('youtube_v5_snapshot',p)",
   "m=importlib.util.module_from_spec(s);s.loader.exec_module(m)",
   "r=json.load(open('audits/youtube-v5-source-nonperson-exact-labels.json'))",
   "assert len(r['reviewed_labels'])==23",
   "for item in r['reviewed_labels']:",
   "  assert not m.valid_candidate(item['name']),item['name']",
   "  assert m.candidate_rejection(item['name']) in ('source_reviewed_non_person','reviewed_non_person'),item['name']",
   "assert m.valid_candidate('Emmett Till')",
   "print('PYTHON_NONPERSON_PARSER_GUARD_PASS')"
 ].join("\n");
 const run=spawnSync("python3",["-c",program],{encoding:"utf8",timeout:15000});
 assert.equal(run.status,0,run.stderr||run.stdout);
 assert.match(run.stdout,/PYTHON_NONPERSON_PARSER_GUARD_PASS/);
});
