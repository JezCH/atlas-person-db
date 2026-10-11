import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const parts=[
 require("../audits/youtube-b024-v5-crosswalk-matched-part1.json"),
 require("../audits/youtube-b024-v5-crosswalk-matched-part2.json"),
 require("../audits/youtube-b024-v5-crosswalk-matched-part3.json")
];
const oldMatched=parts.flatMap(p=>p.rows);
const oldProdOnly=require("../audits/youtube-b024-v5-crosswalk-production-only.json").rows;
const oldSourceOnly=require("../audits/youtube-b024-v5-crosswalk-source-only.json").rows;
const live=require("../audits/youtube-v5-production-current-title-signal-reference-20261011.json");
const delta=require("../audits/youtube-b024-v5-refreshed-8616-source-crosswalk-delta.json");

test("fully refreshed 8713→8616 original-source crosswalk is complete and non-destructive",()=>{
 assert.equal(live.current_title_candidate_count,8616);
 assert.equal(live.rows.length,8616);
 assert.equal(live.production_snapshot_id,"yt-20261010T083657Z-10127ch-rebuild-v5");
 assert.equal(live.source_original_channel_count,10127);
 assert.equal(live.source_original_video_count,2230031);
 assert.equal(delta.not_authorized_as_final_historical_person_rank,true);
 assert.equal(delta.previous_865_source_recount_discrepancies_unresolved,true);
 const names=new Set(live.rows.map(x=>x[1]));
 assert.equal(names.size,8616);
 for(const [index,row] of live.rows.entries())assert.equal(row[0],index+1);
 assert.equal(oldMatched.length,5217);
 assert.equal(oldProdOnly.length,3496);
 assert.equal(oldSourceOnly.length,748);
 const keptMatched=oldMatched.filter(row=>names.has(row[1]));
 const keptOnly=oldProdOnly.filter(row=>names.has(row[1]));
 const removedMatched=oldMatched.filter(row=>!names.has(row[1]));
 const removedOnly=oldProdOnly.filter(row=>!names.has(row[1]));
 assert.equal(keptMatched.length,delta.current_exact_source_matches);
 assert.equal(keptOnly.length,delta.current_production_only);
 assert.equal(removedMatched.length,delta.removed_matched);
 assert.equal(removedOnly.length,delta.removed_production_only);
 assert.equal(keptMatched.length+keptOnly.length,8616);
 assert.equal(keptMatched.length+oldSourceOnly.length+removedMatched.length,5965);
 assert.equal(delta.current_source_only,827);
 assert.equal(delta.removed_since_8713,97);
 const oldNameMap=new Map([...oldMatched,...oldProdOnly].map(r=>[r[1],r]));
 assert.ok(live.rows.every(r=>oldNameMap.has(r[1])));
 const rebuiltRemoved=[...removedMatched.map(r=>r[1]),...removedOnly.map(r=>r[1])].sort();
 assert.deepEqual(delta.removed_labels.map(x=>x.name).sort(),rebuiltRemoved);
 const liveIndex=new Map(live.rows.map(r=>[r[1],r]));
 assert.equal(keptMatched.filter(row=>row[3]!==liveIndex.get(row[1])[2]||row[4]!==liveIndex.get(row[1])[3]).length,0);
 assert.equal(keptMatched.filter(row=>row[5]!==liveIndex.get(row[1])[2]||row[6]!==liveIndex.get(row[1])[3]).length,4868);
});

test("reviewed registered and living source names no longer reappear on current live reference",()=>{
 const registered=require("../audits/youtube-source-first-live-registered-aliases-50.json");
 const living=require("../audits/youtube-live-16-reviewed-living-people-20261011.json");
 const names=new Set(live.rows.map(row=>row[1]));
 for(const entry of registered.reviewed_aliases)assert.equal(names.has(entry.source_name),false,entry.source_name);
 for(const name of living.names)assert.equal(names.has(name),false,name);
 assert.equal(delta.current_live_count,8616);
 assert.equal(delta.added_names_after_historical_snapshot,0);
});
