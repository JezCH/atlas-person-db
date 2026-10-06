import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const {
  OPERATION_TYPE,
  requireOperation,
  requireManifest
}=require("../server/atlas-correction-person-namuwiki-reference-v2-service.js");
const {
  createCorrectionManifestV2DispatchService
}=require("../server/atlas-correction-manifest-v2-dispatch-service.js");

const PERSON_ID="7aeb78bc-2be1-466b-bb0d-13b5e55a9f9c";

function operation(overrides={}) {
  return {
    type:OPERATION_TYPE,
    case_id:"ramanuja-pending-to-linked",
    person_id:PERSON_ID,
    expected_checked_at:"2026-09-28",
    expected_review_reason:"exact_target_url_pending",
    replacement_checked_at:"2026-10-06",
    replacement_document_title:"라마누자",
    replacement_url:"https://namu.wiki/w/%EB%9D%BC%EB%A7%88%EB%88%84%EC%9E%90",
    ...overrides
  };
}

test("NamuWiki reference correction accepts exact pending-to-linked replacement",()=>{
  const normalized=requireOperation(operation(),1);
  assert.equal(normalized.type,OPERATION_TYPE);
  assert.equal(normalized.person_id,PERSON_ID);
  assert.equal(normalized.expected_review_reason,"exact_target_url_pending");
  assert.equal(normalized.replacement_document_title,"라마누자");
  assert.equal(normalized.replacement_url,"https://namu.wiki/w/%EB%9D%BC%EB%A7%88%EB%88%84%EC%9E%90");
});

test("NamuWiki reference correction only accepts the pending migration state",()=>{
  assert.throws(
    ()=>requireOperation(operation({expected_review_reason:"no_exact_document"}),1),
    /EXPECTED_REASON_INVALID/
  );
});

test("NamuWiki reference correction rejects noncanonical replacement hosts",()=>{
  assert.throws(
    ()=>requireOperation(operation({replacement_url:"https://example.com/w/%EB%9D%BC%EB%A7%88%EB%88%84%EC%9E%90"}),1),
    /REPLACEMENT_INVALID/
  );
});

test("NamuWiki reference correction manifest rejects duplicate Person targets",()=>{
  assert.throws(()=>requireManifest({
    schema:"atlas-correction-manifest/v2",
    review_status:"approved",
    request_id:"person-namuwiki-reference:test:duplicate",
    operations:[operation(),operation({case_id:"duplicate"})]
  }),/PERSON_REUSED/);
});

test("v2 dispatcher forbids mixing NamuWiki reference correction with another family",()=>{
  const client={query:async()=>{throw new Error("query must not be reached");}};
  const service=createCorrectionManifestV2DispatchService({client});
  assert.throws(()=>service.execute({
    operations:[operation(),{type:"rewrite_activity"}]
  },{dryRun:true}),/CORRECTION_V2_PERSON_NAMUWIKI_REFERENCE_MIXED_OPERATION_FAMILY_FORBIDDEN/);
});
