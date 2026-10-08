import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const service=require("../server/atlas-youtube-person-signal-publish-service.js");

function payload() {
  return {
    schema:"atlas-youtube-person-signal-publication/v2",
    publication_fingerprint:"a".repeat(64),
    snapshot:{
      snapshot_id:"yt-20261008T000000Z-3ch-rebuild-v2",
      generated_at:"2026-10-08T00:00:00Z",
      channel_count:3,
      video_count:6,
      threshold_counts:{"3":1,"5":0,"10":0,"15":0,"20":0},
      parser_version:"yt-title-person-raw-v2",
      source_state:{
        artifact_id:123,
        channel_ids_persisted:true,
        coverage_mode:"reconstructable_id_preserved",
        legacy_overlap_status:"unknown_not_additive"
      }
    },
    channels:[
      {channel_id:"UC1",channel_name:"A",batch_id:"batch008",scan_status:"OK",video_count:1},
      {channel_id:"UC2",channel_name:"B",batch_id:"batch008",scan_status:"OK",video_count:2},
      {channel_id:"UC3",channel_name:"C",batch_id:"batch009",scan_status:"OK",video_count:3}
    ],
    signals:[
      {raw_name:"Example Person",rank:1,distinct_channel_count:3,video_count:3}
    ]
  };
}

test("YouTube publication validates exact channel/video and threshold counts",()=>{
  const normalized=service.normalizePublicationPayload(payload());
  assert.equal(normalized.snapshot.channel_count,3);
  assert.equal(normalized.snapshot.video_count,6);
  assert.equal(normalized.signals.length,1);

  const badChannels=payload();
  badChannels.snapshot.channel_count=4;
  assert.throws(()=>service.normalizePublicationPayload(badChannels),/YOUTUBE_PUBLICATION_CHANNEL_COUNT_MISMATCH/);

  const badThreshold=payload();
  badThreshold.snapshot.threshold_counts["3"]=2;
  assert.throws(()=>service.normalizePublicationPayload(badThreshold),/YOUTUBE_PUBLICATION_THRESHOLD_COUNT_MISMATCH_3/);
});

test("YouTube publication commits append-only snapshot and persistent Channel IDs",async()=>{
  const calls=[];
  const client={
    async query(sql,params=[]){
      calls.push({sql,params});
      if(sql===service.EXISTING_SNAPSHOT_SQL) return {rows:[]};
      return {rows:[]};
    }
  };
  const result=await service.publishYoutubePersonSignalSnapshot(client,payload());
  assert.equal(result.committed,true);
  assert.equal(result.idempotent,false);
  assert.equal(result.snapshot_id,"yt-20261008T000000Z-3ch-rebuild-v2");
  assert.equal(result.registry_input_count,3);
  assert.ok(calls.some(({sql})=>sql===service.INSERT_SNAPSHOT_SQL));
  assert.ok(calls.some(({sql})=>sql===service.INSERT_SIGNALS_SQL));
  assert.ok(calls.some(({sql})=>sql===service.UPSERT_CHANNELS_SQL));
  assert.equal(calls.at(-1).sql,"COMMIT");
});

test("YouTube publication is idempotent only for the same fingerprint",async()=>{
  const client={
    async query(sql){
      if(sql==="BEGIN" || sql.startsWith("select pg_advisory")) return {rows:[]};
      if(sql===service.EXISTING_SNAPSHOT_SQL) {
        return {rows:[{snapshot_id:"yt-20261008T000000Z-3ch-rebuild-v2",publication_fingerprint:"a".repeat(64)}]};
      }
      if(sql==="ROLLBACK") return {rows:[]};
      throw new Error(`unexpected sql: ${sql}`);
    }
  };
  const result=await service.publishYoutubePersonSignalSnapshot(client,payload());
  assert.equal(result.committed,false);
  assert.equal(result.idempotent,true);
});


test("YouTube publication rejects lower cumulative totals before any inserts",async()=>{
  const calls=[];
  const client={async query(sql){
    calls.push(sql);
    if(sql===service.EXISTING_SNAPSHOT_SQL)return {rows:[]};
    if(sql===service.LATEST_GLOBAL_SNAPSHOT_SQL)return {rows:[{snapshot_id:"previous",channel_count:4,video_count:8}]};
    return {rows:[]};
  }};
  await assert.rejects(service.publishYoutubePersonSignalSnapshot(client,payload()),
    /YOUTUBE_PUBLICATION_CUMULATIVE_REGRESSION/);
  assert.ok(calls.includes("ROLLBACK"));
  assert.ok(!calls.includes(service.INSERT_SNAPSHOT_SQL));
});

test("YouTube publication rejects a missing known Channel ID even when totals grow",async()=>{
  const calls=[];
  const client={async query(sql){
    calls.push(sql);
    if(sql===service.EXISTING_SNAPSHOT_SQL)return {rows:[]};
    if(sql===service.LATEST_GLOBAL_SNAPSHOT_SQL)return {rows:[{snapshot_id:"previous",channel_count:2,video_count:4}]};
    if(sql===service.KNOWN_DISCOVERY_CHANNELS_SQL)return {rows:[{channel_id:"UC1"},{channel_id:"UC2"},{channel_id:"UC_LEGACY"}]};
    return {rows:[]};
  }};
  await assert.rejects(service.publishYoutubePersonSignalSnapshot(client,payload()),
    /YOUTUBE_PUBLICATION_KNOWN_CHANNEL_MISSING/);
  assert.ok(calls.includes("ROLLBACK"));
  assert.ok(!calls.includes(service.INSERT_SNAPSHOT_SQL));
});

test("YouTube publication permits monotonic growth preserving every known Channel ID",async()=>{
  const calls=[];
  const client={async query(sql){
    calls.push(sql);
    if(sql===service.EXISTING_SNAPSHOT_SQL)return {rows:[]};
    if(sql===service.LATEST_GLOBAL_SNAPSHOT_SQL)return {rows:[{snapshot_id:"previous",channel_count:2,video_count:4}]};
    if(sql===service.KNOWN_DISCOVERY_CHANNELS_SQL)return {rows:[{channel_id:"UC1"},{channel_id:"UC2"}]};
    return {rows:[]};
  }};
  const result=await service.publishYoutubePersonSignalSnapshot(client,payload());
  assert.equal(result.committed,true);
  assert.equal(calls.at(-1),"COMMIT");
});
