import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const {
  OPERATION_TYPE,
  requireManifest
}=require("../server/atlas-correction-polity-restore-v2-service.js");
const {
  POLITY_RESTORE_OPERATION_TYPE
}=require("../server/atlas-correction-manifest-v2-dispatch-service.js");

const POLITY_ID="46534f7e-9247-5644-b5ad-9525c3d4f5d6";

function manifest(overrides={}) {
  const operation={
    type:OPERATION_TYPE,
    case_id:"restore-tokugawa-shogunate",
    expected_retirement:{
      retired_polity_id:POLITY_ID,
      survivor_polity_id:null,
      canonical_key:"Tokugawa Shogunate",
      polity_type:"historical_polity",
      historicity:"historical",
      review_reason:"GOVERNANCE_CONTEXT_DUPLICATE_POLITY",
      source_request_id:"polity-retirement:governance-context-duplicates:2026-08-21:v1",
      source_case_id:"polity-retire:tokugawa-shogunate"
    },
    restore_preferred_names:[
      {id:"c7dd6396-b8e4-55f4-a895-20986b5638f8",polity_id:POLITY_ID,locale:"en",name:"Tokugawa Shogunate",name_type:"canonical",is_preferred:true},
      {id:"9c6ed3f9-8c37-5c80-93ec-87ded725a01a",polity_id:POLITY_ID,locale:"ko",name:"도쿠가와 막부",name_type:"display",is_preferred:true}
    ],
    restore_source_ids:["a04aae2d-ce8f-40be-b4a9-fa764bcc3010"],
    ...(overrides.operation||{})
  };
  return {
    schema:"atlas-correction-manifest/v2",
    review_status:"approved",
    request_id:"polity-restore:test:v1",
    operations:[operation],
    ...overrides,
    operations:overrides.operations||[operation]
  };
}

test("restore operation is registered with correction dispatcher",()=>{
  assert.equal(POLITY_RESTORE_OPERATION_TYPE,OPERATION_TYPE);
  assert.equal(OPERATION_TYPE,"restore_retired_polity");
});

test("restore manifest accepts an exact tombstone with deterministic preferred-name rows",()=>{
  const parsed=requireManifest(manifest());
  assert.equal(parsed.operations.length,1);
  assert.equal(parsed.operations[0].expected_retirement.retired_polity_id,POLITY_ID);
  assert.deepEqual(parsed.operations[0].restore_preferred_names.map((row)=>row.locale),["en","ko"]);
  assert.deepEqual(parsed.operations[0].restore_source_ids,["a04aae2d-ce8f-40be-b4a9-fa764bcc3010"]);
});

test("restore manifest rejects a retirement that redirects to a live survivor",()=>{
  assert.throws(
    ()=>requireManifest(manifest({operation:{expected_retirement:{
      retired_polity_id:POLITY_ID,
      survivor_polity_id:"e029b047-544a-52c7-8897-4e494ac72af4",
      canonical_key:"Tokugawa Shogunate",
      polity_type:"historical_polity",
      historicity:"historical",
      review_reason:"GOVERNANCE_CONTEXT_DUPLICATE_POLITY",
      source_request_id:"polity-retirement:governance-context-duplicates:2026-08-21:v1",
      source_case_id:"polity-retire:tokugawa-shogunate"
    }}})),
    /SURVIVOR_REDIRECT_REVIEW_REQUIRED/
  );
});

test("restore manifest rejects a preferred name that was authored for a different polity",()=>{
  const bad=manifest();
  bad.operations[0].restore_preferred_names[0].polity_id="e029b047-544a-52c7-8897-4e494ac72af4";
  assert.throws(()=>requireManifest(bad),/POLITY_ID_MISMATCH/);
});

test("restore manifest rejects missing reviewed polity provenance",()=>{
  const bad=manifest();
  delete bad.operations[0].restore_source_ids;
  assert.throws(()=>requireManifest(bad),/SOURCE_IDS_REQUIRED/);
});
