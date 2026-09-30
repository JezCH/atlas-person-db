import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const {
  OPERATION_TYPE,
  REVIEW_REASON_EDITORIAL,
  requireManifest
}=require("../server/atlas-correction-polity-designation-retire-v2-service.js");
const {
  POLITY_DESIGNATION_RETIRE_OPERATION_TYPE
}=require("../server/atlas-correction-manifest-v2-dispatch-service.js");

const DESIGNATION_ID="1f9c843f-cdc7-5e2d-9963-1ced563894d7";
const POLITY_ID="ee37aba0-fb1a-4896-a6d2-06e32b77b251";

function manifest(overrides={}) {
  const operation={
    type:OPERATION_TYPE,
    case_id:"retire-meiji-government-designation",
    review_reason:REVIEW_REASON_EDITORIAL,
    exact_before:{
      designation:{
        id:DESIGNATION_ID,
        polity_id:POLITY_ID,
        designation_type:"government_period",
        valid_from_year:1868,
        valid_from_month:1,
        valid_from_day:3,
        valid_from_granularity:"day",
        valid_from_certainty:"exact",
        valid_from_calendar:"gregorian",
        valid_to_year:1889,
        valid_to_month:2,
        valid_to_day:10,
        valid_to_granularity:"day",
        valid_to_certainty:"exact",
        valid_to_calendar:"gregorian",
        confidence:"reviewed",
        notes:"reviewed exact note"
      },
      names:[
        {id:"b77dc210-be1d-55c3-85a8-87ebc293e5d3",polity_designation_id:DESIGNATION_ID,locale:"en",name:"Meiji Government",is_preferred:true},
        {id:"dca88dd5-2d3c-5ac7-b580-2d6a8ff7eee7",polity_designation_id:DESIGNATION_ID,locale:"ko",name:"메이지 정부",is_preferred:true}
      ],
      source_links:[
        {polity_designation_id:DESIGNATION_ID,source_id:"49edf48b-5ce9-47c2-84fe-a311e695133e",source_locator_key:"reviewed locator"}
      ]
    },
    ...(overrides.operation||{})
  };
  return {
    schema:"atlas-correction-manifest/v2",
    review_status:"approved",
    request_id:"polity-designation-retire:test:v1",
    operations:[operation],
    ...overrides,
    operations:overrides.operations||[operation]
  };
}

test("designation-retirement operation is registered with correction dispatcher",()=>{
  assert.equal(POLITY_DESIGNATION_RETIRE_OPERATION_TYPE,OPERATION_TYPE);
  assert.equal(OPERATION_TYPE,"retire_polity_designation");
});

test("designation-retirement manifest accepts an exact designation bundle",()=>{
  const parsed=requireManifest(manifest());
  assert.equal(parsed.operations.length,1);
  assert.equal(parsed.operations[0].exact_before.designation.id,DESIGNATION_ID);
  assert.deepEqual(parsed.operations[0].exact_before.names.map((row)=>row.locale),["en","ko"]);
});

test("designation-retirement manifest rejects an unsupported review reason",()=>{
  assert.throws(
    ()=>requireManifest(manifest({operation:{review_reason:"UNREVIEWED"}})),
    /REVIEW_REASON_UNSUPPORTED/
  );
});

test("designation-retirement manifest rejects a mismatched name owner",()=>{
  const bad=manifest();
  bad.operations[0].exact_before.names[0].polity_designation_id="8cdee6c3-8c2d-5dce-8b7f-96814112dc34";
  assert.throws(()=>requireManifest(bad),/DESIGNATION_ID_MISMATCH/);
});
