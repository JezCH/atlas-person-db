import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {querySongDetails,SONG_P2_08_POLITY_IDS,SONG_P2_08_GAOZONG_ACTIVITIES}=require("../server/atlas-polity-reference-audit-handler.js");
const all=SONG_P2_08_POLITY_IDS.map(polity_id=>({polity_id}));
test("P2-08 exact triple existing Song polity identity, two original Gaozong segments",()=>{
 assert.deepEqual([...SONG_P2_08_POLITY_IDS],[
  "1a1983fd-1850-5756-877c-3d2c17b85e1f",
  "407d91cf-7a97-45e3-81ea-d42a3cbfba35",
  "fe073a4c-d967-56e2-bb31-f74bdde1af87"
 ]);
 assert.equal(SONG_P2_08_GAOZONG_ACTIVITIES.length,2);
});
test("P2-08 refuses any absent existing Song identity before DB access",async()=>{
 const client={query(){throw Error("Unexpected query");}};
 await assert.rejects(()=>querySongDetails(client,[]),/POLITY_SONG_P2_08_EXACT_IDENTITY_MISSING/);
 await assert.rejects(()=>querySongDetails(client,all.slice(0,2)),/POLITY_SONG_P2_08_EXACT_IDENTITY_MISSING/);
});
test("P2-08 SELECT-only preflight rejects absent Gaozong segment without fabricating UUID",async()=>{
 const observed=[];
 const client={async query(sql){
  observed.push(String(sql));
  assert.match(String(sql),/^\s*select\b/i);
  if(/from atlas_v2.person_politics_v2 a\s+where a.polity_id/.test(sql))return {rows:[{activity_id:SONG_P2_08_GAOZONG_ACTIVITIES[0],polity_id:SONG_P2_08_POLITY_IDS[0],activity:{}}]};
  return {rows:[]};
 }};
 await assert.rejects(()=>querySongDetails(client,all),/POLITY_SONG_P2_08_GAOZONG_ACTIVITY_MISSING/);
 assert.equal(observed.length,9);
});
test("P2-08 keeps two Gaozong segments and remains noncommitting",async()=>{
 const seen=[];
 const client={async query(sql){
  seen.push(String(sql));
  assert.match(String(sql),/^\s*select\b/i);
  if(/from atlas_v2.person_politics_v2 a\s+where a.polity_id/.test(sql))return {rows:SONG_P2_08_GAOZONG_ACTIVITIES.map(activity_id=>({activity_id,polity_id:SONG_P2_08_POLITY_IDS[0],activity:{person_id:"82809cc5-fc51-4e96-98e5-b290126fdcac"}}))};
  return {rows:[]};
 }};
 const r=await querySongDetails(client,all);
 assert.equal(r.preflight_only,true);
 assert.equal(r.committed,false);
 assert.deepEqual(r.polity_ids,[...SONG_P2_08_POLITY_IDS]);
 assert.equal(r.activities.length,2);
 assert.ok(seen.every(s=>/^\s*select\b/i.test(s)));
});