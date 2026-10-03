import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const bootstrap=require("../server/atlas-registration-queue-bootstrap-service.js");

test("bootstrap source preserves unique candidate identities for the one-time cutover",()=>{
  const source=bootstrap.loadBootstrapSource();
  assert.equal(new Set(source.candidates.map(row=>row.candidate_id)).size,source.candidates.length);
  assert.ok(source.candidates.some(row=>row.metadata.origin==="commerce_world_history_20261003"));
});

test("bootstrap exact matching is migration-only and rejects ambiguous canonical identities",()=>{
  const source={candidates:[{candidate_id:"a",name:"Alpha",lookup_names:["Alpha"],representative_domain:null,priority:null,metadata:{origin:"fixture"}}]};
  assert.throws(()=>bootstrap.baselineBindings(source,[
    {person_id:"11111111-1111-4111-8111-111111111111",name:"Alpha"},
    {person_id:"22222222-2222-4222-8222-222222222222",name:"Alpha"}
  ]),/AMBIGUOUS_IDENTITY/);
});

test("set diff proves candidate-id equality rather than count equality",()=>{
  assert.deepEqual(bootstrap.diffSets(["a","b"],["b","a"]),{missing:[],extra:[]});
  assert.deepEqual(bootstrap.diffSets(["a","b"],["a","c"]),{missing:["b"],extra:["c"]});
});
