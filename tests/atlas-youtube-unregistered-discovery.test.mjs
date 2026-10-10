import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import fs from "node:fs";
const require=createRequire(import.meta.url);
const d=require("../server/atlas-youtube-unregistered-discovery-read-service.js");
const {GLOBAL_SNAPSHOT_SQL}=require("../server/atlas-youtube-person-signal-read-service.js");
const {createYoutubePersonSignalReadHandler}=require("../server/atlas-youtube-person-signal-read-handler.js");
const sample=[
  {raw_name:"Napoleon Bonaparte",rank:1,distinct_channel_count:98,video_count:120},
  {raw_name:"Napoleon",rank:2,distinct_channel_count:49,video_count:66},
  {raw_name:"Candidate Alpha",rank:3,distinct_channel_count:45,video_count:60},
  {raw_name:"Candidate Beta",rank:4,distinct_channel_count:35,video_count:55},
  {raw_name:"Cléopatra",rank:5,distinct_channel_count:20,video_count:24},
  {raw_name:"Cleopatra",rank:6,distinct_channel_count:14,video_count:21},
  {raw_name:"Jose Maria",rank:7,distinct_channel_count:10,video_count:15},
  {raw_name:"José Maria",rank:8,distinct_channel_count:8,video_count:10},
  {raw_name:"Candidate Gamma",rank:9,distinct_channel_count:3,video_count:5}
];
const registered=[
  {person_id:"p-napoleon",alias_name:"Napoleon Bonaparte"},
  {person_id:"p-napoleon",alias_name:"Napoleon"},
  {person_id:"p-cleopatra-1",alias_name:"Cleopatra"},
  {person_id:"p-cleopatra-2",alias_name:"Cléopatra"}
];
function snapshot(id="yt-current") {
  return {snapshot_id:id,generated_at:"2026-10-10T00:00:00Z",
    channel_count:10127,video_count:2230031,snapshot_scope:"global_reconciled",
    threshold_counts:{"3":8862}};
}
function db({shift=false,emptyPeople=false}={}) {
  let n=0;
  return {async query(sql,params=[]) {
    if(sql===GLOBAL_SNAPSHOT_SQL) return {rows:[snapshot(shift&&++n===2?"yt-newer":"yt-current")]};
    if(sql===d.CANDIDATE_ROWS_SQL) {
      assert.deepEqual(params,["yt-current"]);
      return {rows:sample};
    }
    if(sql===d.PERSON_NAMES_SQL) return {rows:emptyPeople?[]:registered};
    throw Error("unexpected SQL: "+sql.slice(0,90));
  }};
}
test("exact registration removes every Napoleon alias and preserves novel candidates",async()=>{
  const response=await d.readYoutubeUnregisteredDiscovery({client:db()});
  assert.equal(response.schema,d.DISCOVERY_SCHEMA);
  assert.equal(response.snapshot.channel_count,10127);
  assert.ok(response.rows.some(r=>r.raw_name==="Candidate Alpha"));
  assert.ok(!response.rows.some(r=>r.raw_name==="Napoleon Bonaparte"||r.raw_name==="Napoleon"));
  assert.equal(response.registered_excluded_count,2);
  assert.equal(response.purpose,"unregistered_historical_person_discovery");
  assert.equal(response.rows[0].rank,1);
  assert.equal(response.rows[0].raw_name,"Candidate Alpha");
});
test("registered homonyms are held for identity review, not silently certified unregistered",()=>{
  const {candidates,homonymReview}=d.candidatesFromSource(sample,registered);
  assert.equal(homonymReview,2);
  const cleopatra=candidates.find(x=>d.identityKey(x.raw_name)==="cleopatra");
  assert.ok(cleopatra);
  assert.equal(cleopatra.identity_state,"registered_homonym_review");
  assert.equal(cleopatra.registration_match_count,2);
});
test("near-identical candidate labels do not invent summed channel counts",()=>{
  const {candidates,overlappingRawLabels}=d.candidatesFromSource(sample,registered);
  assert.equal(overlappingRawLabels,2);
  const row=candidates.find(r=>d.identityKey(r.raw_name)==="josemaria");
  assert.equal(row.distinct_channel_count,10);
  assert.equal(row.video_count,15);
  assert.equal(row.count_lower_bound,true);
  assert.equal(row.source_labels.length,2);
  assert.equal(row.identity_state,"alias_union_needs_original_ids");
  assert.equal(candidates.filter(r=>d.identityKey(r.raw_name)==="josemaria").length,1);
});
test("six reviewed aliases use original Channel-ID union, not summed raw counts",()=>{
  const all=require("../audits/youtube-discovery-reviewed-source-unions-b024.json");
  assert.equal(all.source_snapshot_id,"yt-20261009T120819Z-10127ch-rebuild-v4");
  assert.equal(all.approved_groups.length,6);
  const p=all.approved_groups.find(g=>g.canonical_name==="Pablo Picasso");
  const pele=all.approved_groups.find(g=>g.canonical_name==="Pelé");
  const orig=[
    {raw_name:"Picasso",rank:1,distinct_channel_count:14,video_count:15},
    {raw_name:"Pablo Picasso",rank:2,distinct_channel_count:25,video_count:29},
    {raw_name:"Pelé",rank:3,distinct_channel_count:15,video_count:16},
    {raw_name:"Pele",rank:4,distinct_channel_count:5,video_count:5},
    {raw_name:"Diana",rank:5,distinct_channel_count:13,video_count:46},
    {raw_name:"Princess Diana",rank:6,distinct_channel_count:55,video_count:87}
  ];
  const reviewed=d.applyReviewedSourceUnions(orig,[p,pele]);
  assert.equal(reviewed.applied,2);
  assert.equal(reviewed.rows.length,4);
  const ranked=d.candidatesFromSource(orig,registered,{
    approvedUnions:[p,pele],now:Date.parse("2026-10-10T00:00:00Z")
  });
  const picasso=ranked.candidates.find(row=>row.raw_name==="Pablo Picasso");
  assert.equal(picasso.distinct_channel_count,39);
  assert.equal(picasso.video_count,44);
  assert.equal(picasso.source_id_union_verified,true);
  assert.deepEqual(picasso.source_labels,["Picasso","Pablo Picasso"]);
  assert.equal(picasso.count_lower_bound,false);
  const pel=ranked.candidates.find(row=>row.raw_name==="Pelé");
  assert.equal(pel.distinct_channel_count,20);
  assert.equal(pel.video_count,21);
  assert.equal(pel.count_lower_bound,false);
  assert.equal(ranked.candidates.filter(row=>d.identityKey(row.raw_name)==="pele").length,1);
  assert.equal(ranked.reviewedUnionsApplied,2);
  // Diana includes a non-person use of her short name; it was NOT approved.
  assert.equal(ranked.candidates.filter(row=>/Diana/.test(row.raw_name)).length,2);
});
test("a newly registered long name automatically suppresses reviewed short-name aliases",()=>{
  const all=require("../audits/youtube-discovery-reviewed-source-unions-b024.json");
  const p=all.approved_groups.find(g=>g.canonical_name==="Pablo Picasso");
  const rows=[
    {raw_name:"Picasso",rank:1,distinct_channel_count:14,video_count:15},
    {raw_name:"Pablo Picasso",rank:2,distinct_channel_count:25,video_count:29}
  ];
  const result=d.candidatesFromSource(rows,[{person_id:"p-picasso",alias_name:"Pablo Picasso"}],{
    approvedUnions:[p],now:Date.parse("2026-10-10T00:00:00Z")
  });
  assert.equal(result.registeredExcluded,1);
  assert.deepEqual(result.candidates,[]);
});
test("reviewed source unions reject mismatched counts and alias collisions",()=>{
  const all=require("../audits/youtube-discovery-reviewed-source-unions-b024.json");
  const p=all.approved_groups.find(g=>g.canonical_name==="Pablo Picasso");
  const rows=[
    {raw_name:"Picasso",rank:1,distinct_channel_count:14,video_count:15},
    {raw_name:"Pablo Picasso",rank:2,distinct_channel_count:25,video_count:29}
  ];
  const changed=structuredClone(rows);changed[0].distinct_channel_count=13;
  assert.throws(()=>d.applyReviewedSourceUnions(changed,[p]),/SOURCE_COUNT_MISMATCH/);
  assert.throws(()=>d.applyReviewedSourceUnions(rows,[p,p]),/ALIAS_COLLISION/);
  assert.throws(()=>d.applyReviewedSourceUnions(rows.slice(0,1),[p]),/SOURCE_LABEL_MISSING/);
});
test("honorific title of already registered Muhammad Ali Jinnah is not a new discovery Person",()=>{
  const reviewed=require("../server/atlas-reviewed-person-registration-aliases.js");
  const jinnah=reviewed.REVIEWED_REGISTRATION_ALIASES.filter(x=>x.canonical_key==="Muhammad Ali Jinnah");
  assert.deepEqual(jinnah.map(x=>x.alias_name),[
    "Quaid-e-Azam Muhammad Ali Jinnah","Quaid e Azam Muhammad Ali Jinnah"
  ]);
  assert.match(d.PERSON_NAMES_SQL,/join atlas_v2\.person_names pn on pn\.name=aliases\.canonical_key/);
  const rows=[
    {raw_name:jinnah[0].alias_name,rank:1,distinct_channel_count:6,video_count:7},
    {raw_name:jinnah[1].alias_name,rank:2,distinct_channel_count:4,video_count:5}
  ];
  const result=d.candidatesFromSource(rows,jinnah.map(x=>({
    alias_name:x.alias_name,person_id:"ffc3f4be-bfa3-4b3b-8abe-16a5231883be"
  })));
  assert.equal(result.registeredExcluded,2);
  assert.deepEqual(result.candidates,[]);
});

test("reviewed title metadata, places and nonhistorical myths are not person registration candidates",()=>{
  const original=[
    {raw_name:"Full",rank:1,distinct_channel_count:17,video_count:18},
    {raw_name:"The Medici",rank:2,distinct_channel_count:16,video_count:17},
    {raw_name:"The Bermuda Triangle",rank:3,distinct_channel_count:17,video_count:20},
    {raw_name:"Paris",rank:4,distinct_channel_count:21,video_count:24},
    {raw_name:"Hercules",rank:5,distinct_channel_count:6,video_count:8},
    {raw_name:"Ragnarok",rank:6,distinct_channel_count:10,video_count:13},
    {raw_name:"Pablo Picasso",rank:7,distinct_channel_count:25,video_count:27},
    {raw_name:"Picasso",rank:8,distinct_channel_count:14,video_count:16}
  ];
  const output=d.candidatesFromSource(original,registered,
    {now:Date.parse("2026-10-10T00:00:00Z")});
  assert.equal(output.nonpersonExcluded,6);
  assert.deepEqual(output.candidates.map(x=>x.raw_name),["Pablo Picasso","Picasso"]);
  assert.equal(output.candidates.find(x=>x.raw_name==="Picasso").identity_state,
    "short_name_identity_review");
  assert.equal(output.candidates.find(x=>x.raw_name==="Pablo Picasso").identity_state,
    "unregistered_candidate");
  assert.equal(d.reviewedNonPerson("International Women’s Day"),true);
  assert.equal(d.reviewedNonPerson("The Sumerians"),true);
  assert.equal(d.reviewedNonPerson("Muhammad Ali"),false);
});

test("four Batch024 reviewed living-person orthographic pairs are excluded instead of counted as unregistered aliases",()=>{
  const living=require("../atlas-youtube-reviewed-living-people.js");
  const pairs=[
    ["Jay-Z","Jay Z",7,3],
    ["Jean-Claude Van Damme","Jean Claude Van Damme",5,3],
    ["Captain Ibrahim Traoré","Captain Ibrahim Traore",4,3],
    ["Marina Abramović","Marina Abramovic",3,3]
  ];
  const rows=pairs.flatMap(([first,second,a,b],i)=>[
    {raw_name:first,rank:i*2+1,distinct_channel_count:a,video_count:a},
    {raw_name:second,rank:i*2+2,distinct_channel_count:b,video_count:b}
  ]);
  rows.push({raw_name:"Historical Candidate",rank:9,distinct_channel_count:3,video_count:3});
  const now=Date.parse("2026-10-10T00:00:00Z");
  for(const [first,second] of pairs){
    assert.equal(living.reviewedLivingStatus(first,now)?.status,"living_likely");
    assert.equal(living.reviewedLivingStatus(second,now)?.status,"living_likely");
  }
  const result=d.candidatesFromSource(rows,registered,{now});
  assert.equal(result.reviewedLivingExcluded,8);
  assert.equal(result.overlappingRawLabels,0);
  assert.deepEqual(result.candidates.map(x=>x.raw_name),["Historical Candidate"]);
  assert.equal(living.reviewedLivingStatus("Jay Z",Date.parse("2027-01-10T00:00:00Z")),null);
});

test("reviewed living people never outrank unregistered historical candidates",()=>{
  const live=[
    {raw_name:"Elon Musk",rank:1,distinct_channel_count:94,video_count:108},
    {raw_name:"Donald Trump",rank:2,distinct_channel_count:70,video_count:87},
    {raw_name:"Princess Diana",rank:3,distinct_channel_count:55,video_count:87},
    {raw_name:"Malcolm X",rank:4,distinct_channel_count:52,video_count:63}
  ];
  const result=d.candidatesFromSource(live,registered,
    {now:Date.parse("2026-10-10T00:00:00Z")});
  assert.equal(result.reviewedLivingExcluded,2);
  assert.deepEqual(result.candidates.map(x=>x.raw_name),["Princess Diana","Malcolm X"]);
  assert.deepEqual(result.candidates.map(x=>x.rank),[1,2]);
});

test("threshold, pagination, and ranks are recomputed after registration removal",async()=>{
  const response=await d.readYoutubeUnregisteredDiscovery({client:db(),minChannels:20,limit:1,offset:1});
  assert.equal(response.available_count,3);
  assert.equal(response.rows.length,1);
  assert.equal(response.rows[0].raw_name,"Candidate Beta");
  assert.equal(response.rows[0].rank,2);
  assert.equal(response.threshold_counts["3"],5);
  assert.equal(response.threshold_counts["20"],3);
});
test("stale source and unavailable live Person registry fail closed",async()=>{
  await assert.rejects(()=>d.readYoutubeUnregisteredDiscovery({client:db({shift:true})}),
    /YOUTUBE_DISCOVERY_SNAPSHOT_CHANGED/);
  await assert.rejects(()=>d.readYoutubeUnregisteredDiscovery({client:db({emptyPeople:true})}),
    /YOUTUBE_DISCOVERY_PERSON_REGISTRY_EMPTY/);
});
test("one discovery surface only; old registered-people leaderboard modes are rejected",async()=>{
  const calls=[];
  const handler=createYoutubePersonSignalReadHandler({
    clientFactory:async()=>({end:async()=>{}}),
    env:{SUPABASE_DB_URL:"postgres://localhost/fake"},
    readDiscovery:async()=>{calls.push("discovery");return {rows:[],available:true};}
  });
  function reply(){return {statusCode:200,setHeader(){},end(v){this.body=JSON.parse(v);}};}
  let res=reply();
  await handler({method:"GET",url:"/api/atlas-read?mode=discovery"},res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.source,"youtube-unregistered-candidate-discovery");
  for(const mode of ["person","raw"]) {
    res=reply();
    await handler({method:"GET",url:"/api/atlas-read?mode="+mode},res);
    assert.equal(res.statusCode,400);
  }
  assert.deepEqual(calls,["discovery"]);
});
test("no obsolete dual-ranking code and no deployed route to obsolete publisher",()=>{
  const ui=fs.readFileSync(new URL("../atlas-registration-review.js",import.meta.url),"utf8");
  const author=fs.readFileSync(new URL("../api/atlas-authoring-apply.js",import.meta.url),"utf8");
  assert.match(ui,/미등록 역사 인물 발굴/);
  assert.match(ui,/mode=discovery/);
  assert.match(ui,/candidateStatusBadge/);
  assert.doesNotMatch(ui,/youtubeSignalMode|excludeRegistered|인물별 통합 순위|원시명 순위/);
  assert.doesNotMatch(author,/youtube-person-identity-publish/);
  for(const path of [
    "../server/atlas-youtube-person-identity-publish-handler.js",
    "../server/atlas-youtube-person-identity-read-service.js",
    "../.github/workflows/youtube-person-identity-publish.yml"
  ]) assert.equal(fs.existsSync(new URL(path,import.meta.url)),false);
});
