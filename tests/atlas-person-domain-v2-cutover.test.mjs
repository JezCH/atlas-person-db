import assert from "node:assert/strict";import test from "node:test";import {createRequire} from "node:module";const require=createRequire(import.meta.url);const C=require("../contracts/person-domain-v2-final-cutover.json");const {EXPECTED_IDS,V2_CODES,sameIds,summarize}=require("../server/atlas-person-domain-v2-cutover-service.js");
test("cutover authority is exactly 72 reviewed science ids",()=>{assert.equal(C.status,"approved");assert.equal(C.science_target_ids.length,72);assert.equal(new Set(C.science_target_ids).size,72);assert.deepEqual(EXPECTED_IDS,[...C.science_target_ids].sort());assert.deepEqual(V2_CODES,C.canonical_codes);});
test("precondition and completion are mutually exclusive exact sets",()=>{const pre=EXPECTED_IDS.map(person_id=>({person_id,representative_domain:"knowledge"}));assert.equal(summarize(pre).pre_cutover_exact,true);const post=EXPECTED_IDS.map(person_id=>({person_id,representative_domain:"science"}));assert.equal(summarize(post).data_cutover_complete,true);assert.equal(sameIds(summarize(post).science_ids,EXPECTED_IDS),true);const mixed=[...pre];mixed[0]={...mixed[0],representative_domain:"science"};assert.equal(summarize(mixed).pre_cutover_exact,false);});

test("post-cutover completion tolerates later canonical domain writes",()=>{
  const baseline=EXPECTED_IDS.map(person_id=>({person_id,representative_domain:"science"}));
  const expanded=[
    ...baseline,
    {person_id:"00000000-0000-4000-8000-000000000001",representative_domain:"science"},
    {person_id:"00000000-0000-4000-8000-000000000002",representative_domain:"culture"},
    {person_id:"00000000-0000-4000-8000-000000000003",representative_domain:"military"}
  ];
  const state=summarize(expanded);
  assert.equal(state.data_cutover_complete,true);
  assert.equal(state.knowledge_ids.length,0);
  assert.equal(state.unsupported.length,0);
  assert.equal(state.science_ids.length,EXPECTED_IDS.length+1);
});
test("post-cutover completion still rejects legacy or unsupported live codes",()=>{
  const legacy=[...EXPECTED_IDS.map(person_id=>({person_id,representative_domain:"science"})),{person_id:"00000000-0000-4000-8000-000000000004",representative_domain:"knowledge"}];
  const unsupported=[...EXPECTED_IDS.map(person_id=>({person_id,representative_domain:"science"})),{person_id:"00000000-0000-4000-8000-000000000005",representative_domain:"unknown-sector"}];
  assert.equal(summarize(legacy).data_cutover_complete,false);
  assert.equal(summarize(unsupported).data_cutover_complete,false);
});
