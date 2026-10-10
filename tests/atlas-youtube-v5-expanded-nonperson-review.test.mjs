import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {spawnSync} from "node:child_process";
const require=createRequire(import.meta.url);
const discovery=require("../server/atlas-youtube-unregistered-discovery-read-service.js");
const manifest=require("../audits/youtube-v5-expanded-nonperson-reviewed-exact.json");
const original=require("../audits/youtube-v5-source-nonperson-exact-labels.json");
const sourceSnapshot={
  snapshot_id:manifest.source_snapshot_id,
  parser_version:manifest.source_parser_version,
  channel_count:manifest.source_channel_count,
  video_count:manifest.source_video_rows,
  source_state:{artifact_digest:"sha256:"+manifest.original_archive_sha256}
};

test("all 409 source-observed nonpersons removed from the ONE ranking, not historical Person rows",()=>{
  assert.equal(manifest.reviewed_label_count,409);
  assert.equal(manifest.previous_visible_candidate_count,9122);
  const filter=discovery.reviewedV5ExpandedNonPersonForSnapshot(sourceSnapshot);
  assert.equal(filter.size,409);
  const previous=discovery.reviewedV5NonPersonForSnapshot(sourceSnapshot);
  assert.equal(previous.size,23);
  const rows=manifest.reviewed_labels.map((x,i)=>({
    raw_name:x.name,rank:i+1,
    distinct_channel_count:x.previous_live_title_cue_channels,
    video_count:x.previous_live_title_cue_videos
  })).concat([{raw_name:"Emmett Till",rank:410,distinct_channel_count:16,video_count:18}]);
  const personRows=[{person_id:"p-existing",alias_name:"Existing Registered Person"}];
  const result=discovery.candidatesFromSource(rows,personRows,{
    reviewedSourceNonPersonKeys:previous,
    expandedSourceNonPersonKeys:filter
  });
  assert.equal(result.expandedNonpersonExcluded,409);
  assert.equal(result.nonpersonExcluded,409);
  assert.deepEqual(result.candidates.map(x=>x.raw_name),["Emmett Till"]);
  assert.equal(result.candidates[0].rank,1);
  assert.equal(result.candidates[0].distinct_channel_count,16);
});

test("exact reviewed source cleanup is only valid for the original v5 snapshot",()=>{
  assert.equal(discovery.reviewedV5ExpandedNonPersonForSnapshot({
    ...sourceSnapshot,snapshot_id:"yt-newer-batch025"
  }).size,0);
  for(const variant of [
    {...sourceSnapshot,parser_version:"yt-title-person-reviewed-v4"},
    {...sourceSnapshot,source_state:{artifact_digest:"sha256:"+"0".repeat(64)}},
    {...sourceSnapshot,channel_count:10126},
    {...sourceSnapshot,video_count:2230030}
  ]){
    assert.throws(()=>discovery.reviewedV5ExpandedNonPersonForSnapshot(variant),
      /YOUTUBE_V5_EXPANDED_NONPERSON_SOURCE_PARITY_MISMATCH/);
  }
  const names=new Set(manifest.reviewed_labels.map(x=>discovery.identityKey(x.name)));
  assert.equal(names.size,manifest.reviewed_label_count);
  for(const held of manifest.explicit_holds) {
    assert.equal(names.has(discovery.identityKey(held)),false,held);
  }
  for(const old of original.reviewed_labels) {
    assert.equal(names.has(discovery.identityKey(old.name)),false,old.name);
  }
});

test("future full-corpus Python signal publisher rejects 409 exact nonpersons and preserves true Person",()=>{
  const program=[
    "import importlib.util,json",
    "spec=importlib.util.spec_from_file_location('snapshot', 'scripts/youtube-build-person-signal-snapshot.py')",
    "mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)",
    "manifest=json.load(open('audits/youtube-v5-expanded-nonperson-reviewed-exact.json'))",
    "for item in manifest['reviewed_labels']:",
    "  assert not mod.valid_candidate(item['name']),item['name']",
    "  assert mod.candidate_rejection(item['name']) != 'parser_validation',item['name']",
    "for name in ['Emmett Till','Carter G Woodson','Simón Bolívar','The Apostle Paul']:",
    "  assert mod.valid_candidate(name),name",
    "print('SOURCE_NAME_PUBLISHER_409_REJECTED_TRUE_PERSONS_PRESERVED')"
  ].join("\n");
  const call=spawnSync("python3",["-c",program],{encoding:"utf8",timeout:20000});
  assert.equal(call.status,0,call.stderr||call.stdout);
  assert.match(call.stdout,/SOURCE_NAME_PUBLISHER_409_REJECTED_TRUE_PERSONS_PRESERVED/);
});
