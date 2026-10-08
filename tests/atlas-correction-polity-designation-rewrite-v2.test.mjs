import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const {
  OPERATION_TYPE,
  REVIEW_REASON,
  requireManifest
}=require("../server/atlas-correction-polity-designation-rewrite-v2-service.js");
const {
  POLITY_DESIGNATION_REWRITE_OPERATION_TYPE
}=require("../server/atlas-correction-manifest-v2-dispatch-service.js");

const DESIGNATION_ID="21d2913e-c71a-40e9-865c-2d8a3a421b15";
const POLITY_ID="1eaa48b6-dc60-49d6-91c4-49db556f4ddf";

function bundle({endMonth=null,endDay=null,endGranularity="year",notes="before",links=1}={}) {
  return {
    designation:{
      id:DESIGNATION_ID,
      polity_id:POLITY_ID,
      designation_type:"state_form",
      valid_from_year:1815,
      valid_from_month:7,
      valid_from_day:9,
      valid_from_granularity:"day",
      valid_from_certainty:"exact",
      valid_from_calendar:"gregorian",
      valid_to_year:1830,
      valid_to_month:endMonth,
      valid_to_day:endDay,
      valid_to_granularity:endGranularity,
      valid_to_certainty:"exact",
      valid_to_calendar:"gregorian",
      confidence:"reviewed",
      notes
    },
    names:[
      {id:"9c39dc5b-45b5-4b24-aec4-9b49ca299d89",polity_designation_id:DESIGNATION_ID,locale:"en",name:"Kingdom of France",is_preferred:true},
      {id:"ca527188-0fa2-4356-a9f5-9d9079732e03",polity_designation_id:DESIGNATION_ID,locale:"ko",name:"프랑스 왕국",is_preferred:true}
    ],
    source_links:[
      {polity_designation_id:DESIGNATION_ID,source_id:"194bffc0-1f80-4255-b19c-4c4ad25c0328",source_locator_key:"old"}
    ].concat(links>1 ? [
      {polity_designation_id:DESIGNATION_ID,source_id:"f4d11488-2e4c-49f7-b64c-7191976d5e42",source_locator_key:"official"}
    ] : [])
  };
}

function manifest(mutator) {
  const raw={
    schema:"atlas-correction-manifest/v2",
    review_status:"approved",
    request_id:"designation-rewrite:test:v1",
    operations:[{
      type:OPERATION_TYPE,
      case_id:"unit",
      review_reason:REVIEW_REASON,
      exact_before:bundle(),
      exact_after:bundle({endMonth:8,endDay:2,endGranularity:"day",notes:"after",links:2})
    }]
  };
  if (mutator) mutator(raw);
  return raw;
}

test("designation rewrite operation is registered with correction dispatcher",()=>{
  assert.equal(POLITY_DESIGNATION_REWRITE_OPERATION_TYPE,OPERATION_TYPE);
  assert.equal(OPERATION_TYPE,"rewrite_polity_designation");
});

test("designation rewrite accepts same UUID, immutable names and additive provenance",()=>{
  const parsed=requireManifest(manifest());
  const op=parsed.operations[0];
  assert.equal(op.exact_before.designation.valid_to_granularity,"year");
  assert.equal(op.exact_after.designation.valid_to_month,8);
  assert.equal(op.exact_after.designation.valid_to_day,2);
  assert.equal(op.added_source_links.length,1);
});

test("designation rewrite forbids changing designation names",()=>{
  assert.throws(()=>requireManifest(manifest((raw)=>{
    raw.operations[0].exact_after.names[0].name="Different";
  })),/NAME_CHANGE_FORBIDDEN/);
});

test("designation rewrite forbids removing old provenance",()=>{
  assert.throws(()=>requireManifest(manifest((raw)=>{
    raw.operations[0].exact_after.source_links=raw.operations[0].exact_after.source_links.slice(1);
  })),/SOURCE_REMOVAL_FORBIDDEN/);
});

test("designation rewrite forbids changing the owner polity",()=>{
  assert.throws(()=>requireManifest(manifest((raw)=>{
    raw.operations[0].exact_after.designation.polity_id="11111111-1111-4111-8111-111111111111";
  })),/POLITY_ID_CHANGE_FORBIDDEN/);
});
