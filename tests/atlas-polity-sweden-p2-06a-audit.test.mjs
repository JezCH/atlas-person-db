import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {swedenPolityCandidates,querySwedenDetails}=require("../server/atlas-polity-reference-audit-handler.js");
test("Sweden candidates are based on existing exact live Polity names, not fabricated aliases",()=>{
 const rows=[
  {polity_id:"a",canonical_key:"kingdom_of_sweden",names:[]},
  {polity_id:"b",canonical_key:"X",names:[{name:"Swedish Empire"}]},
  {polity_id:"c",canonical_key:"X",names:[{name:"스웨덴 왕국"}]},
  {polity_id:"d",canonical_key:"swedenborgian_society",names:[]},
  {polity_id:"e",canonical_key:"X",names:[{name:"Kingdom of Norway"}]}
 ];
 assert.deepEqual(swedenPolityCandidates(rows),["a","b","c"]);
});
test("absent live Sweden identity has no synthesized polity or designation; zero DB writes",async()=>{
 const actual=await querySwedenDetails({query(){throw new Error("Unexpected DB query")}},[]);
 assert.deepEqual(actual.polity_ids,[]);
 assert.deepEqual(actual.designations,[]);
 assert.deepEqual(actual.activities,[]);
 assert.equal(actual.preflight_only,true);
 assert.equal(actual.committed,false);
});
