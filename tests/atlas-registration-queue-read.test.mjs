import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const { QUEUE_SQL,SUMMARY_SQL,readCurrentRegistrationQueue }=require("../server/atlas-registration-queue-read-service.js");

test("registration queue membership is DB-only person_id IS NULL",()=>{
  assert.match(QUEUE_SQL,/from atlas_v2\.person_candidate_registration_states/i);
  assert.match(QUEUE_SQL,/where person_id is null/i);
  assert.doesNotMatch(QUEUE_SQL,/person_names|lookup_names|registration_state\s*(?:=|in)/i);
});

test("registration queue returns every pending DB row with work metadata",async()=>{
  const client={async query(sql){
    if(String(sql).includes("count(*)")) return {rows:[{candidate_total:3,current_total:2,registered_bound_total:1}]};
    return {rows:[
      {candidate_id:"a",name:"Alpha",representative_domain:"commerce",priority:"SS",metadata:{origin:"fixture"},review_revision:null,registration_state:"QUEUED",updated_at:"2026-10-03"},
      {candidate_id:"b",name:"Beta",representative_domain:null,priority:null,metadata:{},review_revision:2,registration_state:"BLOCKED",updated_at:"2026-10-03"}
    ]};
  }};
  const queue=await readCurrentRegistrationQueue({client});
  assert.equal(queue.authority,"database");
  assert.equal(queue.canonical_table,"atlas_v2.person_candidate_registration_states");
  assert.equal(queue.membership_rule,"person_id IS NULL");
  assert.equal(queue.summary.current_total,2);
  assert.deepEqual(queue.candidates.map(row=>row.candidate_id),["a","b"]);
  assert.match(SUMMARY_SQL,/person_id is null/i);
});

test("queue read implementation has no Git JSON or Person-name runtime dependency",()=>{
  const source=fs.readFileSync(new URL("../server/atlas-registration-queue-read-service.js",import.meta.url),"utf8");
  assert.doesNotMatch(source,/person-registration-queue-source|person_names|lookup_names|normalizeLookupName|fuzzy|similarity/i);
});
