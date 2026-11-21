import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const meanwhile = require("../atlas-person-spacetime-meanwhile.js");

const person = {
  person_id:"person-1", display_name:"시대 경계의 인물",
  primary_segments:[
    { activity_id:"missing-start", start_ordinal:null, end_ordinal:1, macroregion_code:"east-asia" },
    { activity_id:"missing-end", start_ordinal:-1, end_ordinal:null, macroregion_code:"east-asia" },
    { activity_id:"documented", start_ordinal:-1, end_ordinal:0, macroregion_code:"east-asia" }
  ]
};

test("missing history boundaries never become fabricated AD 1 Activity entries", () => {
  assert.equal(meanwhile.activeAtOrdinal(person.primary_segments[0],0),false);
  assert.equal(meanwhile.activeAtOrdinal(person.primary_segments[1],0),false);
  assert.equal(meanwhile.activeAtOrdinal({start_ordinal:undefined,end_ordinal:0},0),false);
  const entries=meanwhile.activeActivityEntries([person],0);
  assert.deepEqual(entries.map((row)=>row.activity_id),["documented"]);
});

test("ordinal zero remains valid for documented AD 1 and BCE/CE continuity", () => {
  assert.equal(meanwhile.activeAtOrdinal(person.primary_segments[2],-1),true);
  assert.equal(meanwhile.activeAtOrdinal(person.primary_segments[2],0),true);
  assert.equal(meanwhile.activeAtOrdinal(person.primary_segments[2],1),false);
  const summary=meanwhile.summarize([person],0,["east-asia","europe"]);
  assert.equal(summary.ordinal,0);
  assert.equal(summary.activity_count,1);
  assert.equal(summary.unique_person_count,1);
  assert.equal(summary.region_counts[0].unique_person_count,1);
  assert.equal(summary.region_counts[1].unique_person_count,0);
});

test("unknown or malformed ordinals return no activities, never coerce to AD 1", () => {
  for (const value of [null,undefined,"", "0",true,NaN,Infinity,0.5]) {
    assert.equal(meanwhile.activeAtOrdinal(person.primary_segments[2],value),false);
    assert.equal(meanwhile.activeActivityEntries([person],value).length,0);
    const summary=meanwhile.summarize([person],value);
    assert.equal(summary.ordinal,null);
    assert.equal(summary.activity_count,0);
  }
  assert.equal(meanwhile.activeAtOrdinal({start_ordinal:"0",end_ordinal:0},0),false);
  assert.equal(meanwhile.activeAtOrdinal({start_ordinal:0,end_ordinal:"0"},0),false);
});
