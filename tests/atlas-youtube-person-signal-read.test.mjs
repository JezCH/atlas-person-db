import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const service=require("../server/atlas-youtube-person-signal-read-service.js");

test("YouTube person signal read returns latest append-only snapshot and ranked rows",async()=>{
  const calls=[];
  const client={
    async query(sql,params){
      calls.push({sql,params});
      if(sql===service.LATEST_SNAPSHOT_SQL) return { rows:[{
        snapshot_id:"yt-1",generated_at:"2026-10-07T03:00:00Z",channel_count:2319,video_count:"767706",
        threshold_counts:{"3":2536,"10":236,"20":52},parser_version:"yt-title-person-raw-v1",source_state:{next_batch:"batch007"}
      }]};
      if(sql===service.SIGNAL_COUNT_SQL) return { rows:[{count:52}] };
      if(sql===service.SIGNAL_ROWS_SQL) return { rows:[{raw_name:"Abraham Lincoln",rank:1,distinct_channel_count:53,video_count:58}] };
      throw new Error("unexpected sql");
    }
  };
  const result=await service.readYoutubePersonSignals({client,minChannels:20,limit:100});
  assert.equal(result.available,true);
  assert.equal(result.snapshot.channel_count,2319);
  assert.equal(result.snapshot.video_count,767706);
  assert.equal(result.available_count,52);
  assert.deepEqual(result.rows,[{raw_name:"Abraham Lincoln",rank:1,distinct_channel_count:53,video_count:58}]);
  assert.deepEqual(calls[1].params,["yt-1",20]);
  assert.deepEqual(calls[2].params,["yt-1",20,100]);
});

test("YouTube person signal query bounds fail closed",async()=>{
  const client={ query:async()=>({rows:[]}) };
  await assert.rejects(()=>service.readYoutubePersonSignals({client,minChannels:2}),/INVALID_YOUTUBE_PERSON_SIGNAL_QUERY/);
  await assert.rejects(()=>service.readYoutubePersonSignals({client,limit:1001}),/INVALID_YOUTUBE_PERSON_SIGNAL_QUERY/);
});

test("YouTube person signal read has an explicit empty state",async()=>{
  const client={ query:async(sql)=>{
    assert.equal(sql,service.LATEST_SNAPSHOT_SQL);
    return {rows:[]};
  }};
  const result=await service.readYoutubePersonSignals({client});
  assert.equal(result.available,false);
  assert.deepEqual(result.rows,[]);
});
