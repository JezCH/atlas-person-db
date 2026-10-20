import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import fs from "node:fs";
const require=createRequire(import.meta.url);
const d=require("../server/atlas-youtube-unregistered-discovery-read-service.js");
const source=require("../server/atlas-youtube-b024-original-id-live-ranking.js");
const {GLOBAL_SNAPSHOT_SQL}=require("../server/atlas-youtube-person-signal-read-service.js");
const {CROSSWALK,ARCHIVE_SHA}=require("../server/atlas-youtube-original-title-crosswalk-read.js");

function archivedSnapshot(){
 return {
  snapshot_id:CROSSWALK.production_snapshot_id,
  parser_version:"yt-title-person-reviewed-v5",
  snapshot_scope:"global_reconciled",
  channel_count:10127,video_count:2230031,
  generated_at:"2026-10-10T08:36:57Z",
  threshold_counts:{"3":8616},
  source_state:{
   artifact_digest:"sha256:"+ARCHIVE_SHA,
   additional_title_context_extraction:true
  }
 };
}
function fullRegistry(...additionalNames){
 return [
  ...Array.from({length:2100},(_,i)=>({
   person_id:"registered-uuid-"+i,
   alias_name:"Already Registered Other Name "+i
  })),
  ...additionalNames.map(([name,id])=>({alias_name:name,person_id:id}))
 ];
}
function db({names=[],snapshot=archivedSnapshot(),shift=false,onePerson=false}={}){
 let globalReads=0;
 const seen=[];
 return {
  seen,
  async query(sql,params=[]){
   seen.push(sql);
   if(sql===GLOBAL_SNAPSHOT_SQL) {
    globalReads++;
    return {rows:[shift&&globalReads===2?{...snapshot,snapshot_id:"changed"}:snapshot]};
   }
   if(sql===d.PERSON_NAMES_SQL)
    return {rows:onePerson?[{person_id:"one-person",alias_name:"Stephen Hawking"}]:fullRegistry(...names)};
   if(sql===d.CANDIDATE_ROWS_SQL)
    throw Error("REGRESSION: old aggregate title ranking queried for EXACT real B024 source");
   throw Error("Unexpected SQL "+sql.slice(0,90));
  }
 };
}

test("actual full archived source contains 2241 original-ID candidates and 799 original 3+ channel titles",()=>{
 const rows=source.validArchive();
 assert.equal(rows.length,2241);
 assert.equal(rows[0][0],"Stephen Hawking");
 assert.equal(rows[0][2].length,36);
 assert.equal(rows[0][3].length,37);
 assert.equal(rows.filter(r=>r[2].length>=3).length,799);
 assert.equal(rows.reduce((n,r)=>n+r[3].length,0),6162);
 assert.equal(source.SOURCE_PROOF,"ORIGINAL_ID_EXPLICIT_BIOGRAPHY_TITLE_UNVERIFIED_CONTENT");
});

test("actual one discovery service REPLACES legacy 72/113 with original-ID sets AFTER COMPLETE live Person/alias screen",async()=>{
 const conn=db({names:[
  ["Stephen Hawking","current-real-person-hawking"],
  ["Marilyn Monroe","current-real-person-monroe"],
  ["Mother Teresa","current-real-person-mother"],
  ["C. S. Lewis","current-real-person-lewis"]
 ]});
 const rank=await d.readYoutubeUnregisteredDiscovery({client:conn,limit:10,minChannels:3});
 assert.equal(rank.schema,d.DISCOVERY_SCHEMA);
 assert.equal(rank.source_candidate_count,2241);
 assert.equal(rank.ranking_evidence_type,source.SOURCE_PROOF);
 assert.equal(rank.current_registry_distinct_persons,2104);
 assert.equal(rank.registered_excluded_count,4);
 assert.equal(rank.source_original_biography_title_video_ids,10706);
 assert.equal(rank.registration_checked,true);
 assert.equal(rank.video_person_centeredness_certified,false);
 assert.equal(rank.historical_personhood_certified_for_all,false);
 assert.equal(rank.rows[0].rank,1);
 assert.equal(rank.rows[0].raw_name,"Princess Diana");
 assert.equal(rank.rows[0].distinct_channel_count,26);
 assert.equal(rank.rows[0].video_count,29);
 assert.equal(rank.rows[0].source_id_union_verified,true);
 assert.equal(rank.rows[0].presently_unregistered_historical_person_certified,false);
 assert.ok(!rank.rows.some(r=>["Stephen Hawking","Marilyn Monroe","Mother Teresa","C. S. Lewis"].includes(r.raw_name)));
 assert.equal(rank.threshold_counts["3"]<=799,true);
 assert.equal(conn.seen.filter(sql=>sql===d.PERSON_NAMES_SQL).length,1);
 assert.equal(conn.seen.filter(sql=>sql===d.CANDIDATE_ROWS_SQL).length,0);
 assert.equal(conn.seen.filter(sql=>sql===GLOBAL_SNAPSHOT_SQL).length,2);
});

test("full current aliases suppress already registered historic Persons with different source names",()=>{
 const result=source.renderCurrentRegistryRank({
  snapshot:archivedSnapshot(),
  registryRows:fullRegistry(["Princess Diana","person-wales"],["Diana, Princess of Wales","person-wales"]),
  identityKey:d.identityKey
 });
 assert.ok(!result.candidates.some(r=>r.raw_name==="Princess Diana"));
 assert.equal(result.current_registered_excluded_count,1);
 assert.equal(result.candidates[0].raw_name,"Stephen Hawking");
 assert.equal(result.candidates[0].rank,1);
});

test("pagination and 3/5/10/15/20 channel thresholds reflect the filtered ORIGINAL-ID rank",async()=>{
 const conn=db({names:[["Stephen Hawking","p-hawking"],["Marilyn Monroe","p-monroe"]]});
 const first=await d.readYoutubeUnregisteredDiscovery({client:conn,minChannels:10,limit:2,offset:0});
 const second=await d.readYoutubeUnregisteredDiscovery({client:db({names:[["Stephen Hawking","p-hawking"],["Marilyn Monroe","p-monroe"]]}),minChannels:10,limit:1,offset:1});
 assert.equal(first.rows.length,2);
 assert.equal(first.rows[0].raw_name,"Mother Teresa");
 assert.equal(second.rows[0].raw_name,first.rows[1].raw_name);
 assert.equal(second.rows[0].rank,2);
 assert.equal(first.threshold_counts["3"],797);
 assert.equal(first.available_count,first.threshold_counts["10"]);
 assert.equal(first.threshold_counts["3"]>=first.threshold_counts["5"],true);
 assert.equal(first.threshold_counts["5"]>=first.threshold_counts["10"],true);
});

test("partial current DB or mismatched running snapshot fails closed rather than declaring every name unregistered",async()=>{
 await assert.rejects(()=>d.readYoutubeUnregisteredDiscovery({client:db({onePerson:true})}),/CURRENT_REGISTRY_INCOMPLETE/);
 await assert.rejects(()=>d.readYoutubeUnregisteredDiscovery({client:db({shift:true})}),/SNAPSHOT_CHANGED/);
 const wrong=archivedSnapshot();wrong.source_state.artifact_digest="sha256:fake";
 assert.throws(()=>source.renderCurrentRegistryRank({snapshot:wrong,registryRows:fullRegistry(),identityKey:d.identityKey}),
  /SOURCE_SNAPSHOT_MISMATCH/);
});

test("single existing UI states the exact original title evidence, registration and content uncertainty",()=>{
 const ui=fs.readFileSync(new URL("../atlas-registration-review.js",import.meta.url),"utf8");
 assert.match(ui,/원본 Video ID · 채널 ID로 집계/);
 assert.match(ui,/등록 Person/);
 assert.match(ui,/내용 미검증/);
 assert.doesNotMatch(ui,/youtubeSignalMode|인물별 통합 순위|원시명 순위/);
});

test("fake archive row, forged provenance and original ID reuse cannot be passed to live ranking",()=>{
 const raw=require("../audits/youtube-b024-original-id-runtime-source-20261020.json");
 assert.throws(()=>source.validArchive({...raw,provenance:{...raw.provenance,watched_media_count:10}}),
  /PROVENANCE_INVALID/);
 const tampered=structuredClone(raw);
 tampered.rows[1][3][0]=tampered.rows[0][3][0];
 assert.throws(()=>source.validArchive(tampered),
  /ORIGINAL_VIDEO_ID_SHARED_BETWEEN_IDENTITIES/);
});
