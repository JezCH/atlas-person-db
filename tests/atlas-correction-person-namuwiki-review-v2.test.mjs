import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const {
  OPERATION_TYPE,
  requireOperation,
  requireManifest
}=require("../server/atlas-correction-person-namuwiki-review-v2-service.js");
const {
  createCorrectionManifestV2DispatchService
}=require("../server/atlas-correction-manifest-v2-dispatch-service.js");

const CARTIER_ID="dd2719b0-95b3-414c-be27-c94e2f73a2d6";

function operation(overrides={}) {
  return {
    type:OPERATION_TYPE,
    case_id:"jacques-cartier-related-only",
    person_id:CARTIER_ID,
    expected_checked_at:"2026-10-05",
    expected_review_reason:null,
    replacement_review_reason:"related_or_derivative_only",
    ...overrides
  };
}

test("NamuWiki review-reason correction accepts exact null-to-terminal reason repair",()=>{
  const normalized=requireOperation(operation(),1);
  assert.equal(normalized.type,OPERATION_TYPE);
  assert.equal(normalized.person_id,CARTIER_ID);
  assert.equal(normalized.expected_review_reason,null);
  assert.equal(normalized.replacement_review_reason,"related_or_derivative_only");
});

test("NamuWiki review-reason correction rejects unresolved or invented terminal reasons",()=>{
  assert.throws(
    ()=>requireOperation(operation({replacement_review_reason:"exact_target_url_pending"}),1),
    /REPLACEMENT_REASON_INVALID/
  );
  assert.throws(
    ()=>requireOperation(operation({replacement_review_reason:"invented_reason"}),1),
    /REPLACEMENT_REASON_INVALID/
  );
  assert.throws(
    ()=>requireOperation(operation({expected_review_reason:"related_or_derivative_only"}),1),
    /NO_CHANGE/
  );
});

test("NamuWiki review-reason correction requires exact before reason presence including explicit null",()=>{
  const raw=operation();
  delete raw.expected_review_reason;
  assert.throws(()=>requireOperation(raw,1),/EXPECTED_REASON_REQUIRED/);
});

test("NamuWiki review-reason correction manifest rejects duplicate Person targets",()=>{
  assert.throws(()=>requireManifest({
    schema:"atlas-correction-manifest/v2",
    review_status:"approved",
    request_id:"person-namuwiki:test:duplicate",
    operations:[operation(),operation({case_id:"duplicate"})]
  }),/PERSON_REUSED/);
});

test("v2 dispatcher forbids mixing NamuWiki review correction with another family",()=>{
  const client={query:async()=>{throw new Error("query must not be reached");}};
  const service=createCorrectionManifestV2DispatchService({client});
  assert.throws(()=>service.execute({
    operations:[operation(),{type:"rewrite_activity"}]
  },{dryRun:true}),/CORRECTION_V2_PERSON_NAMUWIKI_REVIEW_MIXED_OPERATION_FAMILY_FORBIDDEN/);
});
