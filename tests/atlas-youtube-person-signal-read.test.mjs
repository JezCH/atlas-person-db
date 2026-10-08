import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const service=require("../server/atlas-youtube-person-signal-read-service.js");

test("YouTube person signal read keeps the exact global baseline separate from the supplemental segment",async()=>{
  const calls=[];
  const client={
    async query(sql,params){
      calls.push({sql,params});
      if(sql===service.GLOBAL_SNAPSHOT_SQL) return { rows:[{
        snapshot_id:"yt-global",generated_at:"2026-10-07T05:02:19Z",channel_count:2715,video_count:"818595",
        threshold_counts:{"3":2768,"10":264,"20":63},parser_version:"yt-title-person-raw-v1",
        source_state:{next_batch:"batch008"},snapshot_scope:"global_baseline"
      }]};
      if(sql===service.PROGRESS_SQL) return { rows:[{
        state_key:"current",
        baseline_snapshot_id:"yt-global",
        supplemental_snapshot_id:"yt-segment",
        baseline_unique_channel_count:2715,
        baseline_video_count:"818595",
        supplemental_selected_channel_count:2570,
        supplemental_success_channel_count:2128,
        supplemental_video_count:"444346",
        gross_success_channel_rows:4843,
        gross_video_rows:"1262941",
        unique_channel_lower_bound:2715,
        unique_channel_upper_bound:4843,
        exact_unique_channel_count:null,
        reconciliation_status:"baseline_channel_ids_missing",
        next_batch:"batch012",
        live_ingestion_enabled:false,
        updated_at:"2026-10-08T00:00:00Z"
      }]};
      if(sql===service.SEGMENT_SNAPSHOT_SQL) return { rows:[{
        snapshot_id:"yt-segment",generated_at:"2026-10-07T22:46:14Z",channel_count:2128,video_count:"444346",
        threshold_counts:{"3":1560},parser_version:"yt-title-person-raw-v2",
        source_state:{coverage_batches:["batch008","batch009","batch010","batch011"]},
        snapshot_scope:"segment_supplement"
      }]};
      if(sql===service.SIGNAL_COUNT_SQL) return { rows:[{count:30}] };
      if(sql===service.SIGNAL_ROWS_SQL) return { rows:[{raw_name:"Abraham Lincoln",rank:1,distinct_channel_count:55,video_count:60}] };
      throw new Error("unexpected sql");
    }
  };
  const result=await service.readYoutubePersonSignals({client,minChannels:20,limit:100});
  assert.equal(result.available,true);
  assert.equal(result.snapshot.snapshot_id,"yt-global");
  assert.equal(result.snapshot.channel_count,2715);
  assert.equal(result.segment_snapshot.snapshot_id,"yt-segment");
  assert.equal(result.segment_snapshot.channel_count,2128);
  assert.equal(result.progress.gross_success_channel_rows,4843);
  assert.equal(result.progress.exact_unique_channel_count,null);
  assert.equal(result.progress.next_batch,"batch012");
  assert.equal(result.available_count,63);
  assert.equal(result.stored_count,30);
  assert.deepEqual(result.rows,[{raw_name:"Abraham Lincoln",rank:1,distinct_channel_count:55,video_count:60}]);
  assert.deepEqual(calls.at(-2).params,["yt-global",20]);
  assert.deepEqual(calls.at(-1).params,["yt-global",20,100]);
});

test("YouTube signal read falls back without reconciliation migration during deployment propagation",async()=>{
  const client={
    async query(sql,params){
      if(sql===service.GLOBAL_SNAPSHOT_SQL) {
        const error=new Error("undefined column");
        error.code="42703";
        throw error;
      }
      if(sql===service.LEGACY_LATEST_SNAPSHOT_SQL) return {rows:[{
        snapshot_id:"yt-legacy",generated_at:"2026-10-07T22:46:14Z",channel_count:2128,video_count:444346,
        threshold_counts:{"3":1560},parser_version:"yt-title-person-raw-v2",source_state:{}
      }]};
      if(sql===service.PROGRESS_SQL || sql===service.SEGMENT_SNAPSHOT_SQL) {
        const error=new Error("undefined table");
        error.code="42P01";
        throw error;
      }
      if(sql===service.SIGNAL_COUNT_SQL) return {rows:[{count:1}]};
      if(sql===service.SIGNAL_ROWS_SQL) return {rows:[{raw_name:"Example Person",rank:1,distinct_channel_count:3,video_count:3}]};
      throw new Error(`unexpected sql ${String(sql).slice(0,40)}`);
    }
  };
  const result=await service.readYoutubePersonSignals({client});
  assert.equal(result.snapshot.snapshot_id,"yt-legacy");
  assert.equal(result.progress,null);
  assert.equal(result.segment_snapshot,null);
});

test("YouTube person signal query bounds fail closed",async()=>{
  const client={ query:async()=>({rows:[]}) };
  await assert.rejects(()=>service.readYoutubePersonSignals({client,minChannels:2}),/INVALID_YOUTUBE_PERSON_SIGNAL_QUERY/);
  await assert.rejects(()=>service.readYoutubePersonSignals({client,limit:1001}),/INVALID_YOUTUBE_PERSON_SIGNAL_QUERY/);
});

test("YouTube person signal read has an explicit empty state",async()=>{
  const client={ query:async(sql)=>{
    if(sql===service.GLOBAL_SNAPSHOT_SQL) return {rows:[]};
    if(sql===service.LEGACY_LATEST_SNAPSHOT_SQL) return {rows:[]};
    throw new Error("unexpected sql");
  }};
  const result=await service.readYoutubePersonSignals({client});
  assert.equal(result.available,false);
  assert.equal(result.progress,null);
  assert.deepEqual(result.rows,[]);
});
