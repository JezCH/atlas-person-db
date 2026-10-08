import assert from "node:assert/strict";
import test from "node:test";
import {createRequire} from "node:module";

const service=createRequire(import.meta.url)("../server/atlas-youtube-person-signal-read-service.js");

test("YouTube reads one canonical cumulative snapshot and exact threshold counts",async()=>{
  const calls=[];
  const client={async query(sql,params=[]){
    calls.push({sql,params});
    if(sql===service.GLOBAL_SNAPSHOT_SQL) return {rows:[{
      snapshot_id:"batch008plus",snapshot_scope:"global_reconciled",
      generated_at:"2026-10-08T12:00:00Z",channel_count:2128,video_count:444346,
      threshold_counts:{"3":1560,"5":484,"10":113,"15":43,"20":20},
      source_state:{channel_ids_persisted:true,next_batch:"batch012"}
    }]};
    if(sql===service.SIGNAL_COUNT_SQL) return {rows:[{count:20}]};
    if(sql===service.SIGNAL_ROWS_SQL) return {rows:[{raw_name:"Abraham Lincoln",rank:1,distinct_channel_count:39,video_count:44}]};
    throw new Error("unexpected SQL");
  }};
  const result=await service.readYoutubePersonSignals({client,minChannels:20,limit:30});
  assert.equal(result.available,true);
  assert.equal(result.snapshot.channel_count,2128);
  assert.equal(result.available_count,20);
  assert.equal(result.stored_count,20);
  assert.equal(result.rows[0].distinct_channel_count,39);
  assert.equal(result.rows[0].channel_count_upper_bound,undefined);
  assert.deepEqual(calls.filter(row=>row.params.length).map(row=>row.params),[
    ["batch008plus",20],["batch008plus",20,30]
  ]);
  assert.doesNotMatch(service.GLOBAL_SNAPSHOT_SQL,/global_baseline|global_checkpoint/);
});

test("newer ID-preserved publications win over older ones",()=>{
  assert.match(service.GLOBAL_SNAPSHOT_SQL,/order by generated_at desc/i);
  assert.doesNotMatch(service.GLOBAL_SNAPSHOT_SQL,/segment_supplement/);
  assert.match(service.GLOBAL_SNAPSHOT_SQL,/global_reconciled/);
});

test("legacy snapshots cannot silently reenter the live ranking",async()=>{
  assert.doesNotMatch(service.GLOBAL_SNAPSHOT_SQL,/global_baseline|global_checkpoint|segment_supplement/);
  const error=Object.assign(new Error("column missing"),{code:"42703"});
  await assert.rejects(()=>service.readYoutubePersonSignals({client:{query:async()=>{throw error;}}}),/column missing/);
});

test("invalid limits fail closed and empty snapshots are handled",async()=>{
  const client={query:async()=>({rows:[]})};
  await assert.rejects(()=>service.readYoutubePersonSignals({client,minChannels:2}),/INVALID_YOUTUBE_PERSON_SIGNAL_QUERY/);
  await assert.rejects(()=>service.readYoutubePersonSignals({client,limit:1001}),/INVALID_YOUTUBE_PERSON_SIGNAL_QUERY/);
  const empty=await service.readYoutubePersonSignals({client});
  assert.equal(empty.available,false);
  assert.deepEqual(empty.rows,[]);
});

test("filtered ranking pages from the global snapshot without changing absolute rank",async()=>{
  const calls=[];
  const client={async query(sql,params=[]){
    calls.push({sql,params});
    if(sql===service.GLOBAL_SNAPSHOT_SQL) return {rows:[{snapshot_id:"snapshot",snapshot_scope:"global_reconciled",threshold_counts:{"3":6445}}]};
    if(sql===service.SIGNAL_COUNT_SQL) return {rows:[{count:6445}]};
    if(sql===service.PAGED_SIGNAL_ROWS_SQL) return {rows:[{raw_name:"Candidate",rank:1001,distinct_channel_count:5,video_count:6}]};
    throw new Error("unexpected SQL");
  }};
  const result=await service.readYoutubePersonSignals({client,minChannels:3,limit:1000,offset:1000});
  assert.equal(result.offset,1000);
  assert.equal(result.rows[0].rank,1001);
  assert.deepEqual(calls.find(call=>call.sql===service.PAGED_SIGNAL_ROWS_SQL).params,["snapshot",3,1000,1000]);
  await assert.rejects(()=>service.readYoutubePersonSignals({client,offset:-1}),/INVALID_YOUTUBE_PERSON_SIGNAL_QUERY/);
  const larger=await service.readYoutubePersonSignals({client,offset:10001});
  assert.equal(larger.offset,10001);
  await assert.rejects(()=>service.readYoutubePersonSignals({client,offset:100001}),/INVALID_YOUTUBE_PERSON_SIGNAL_QUERY/);
});
