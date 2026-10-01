import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const candidate = require("../server/atlas-reviewed-candidate-service.js");
const {
  reviewedAuthoringRequest,
  exactLedgerSnapshot
} = require("../server/atlas-reviewed-candidate-registration-service.js");
const {
  createReviewedCandidateHandler,
  OP_RECORD_REVIEW,
  OP_APPLY_CANDIDATE
} = require("../server/atlas-reviewed-candidate-handler.js");

function responseCapture() {
  return {
    statusCode:0,
    headers:{},
    body:null,
    setHeader(key,value){ this.headers[String(key).toLowerCase()] = value; },
    end(value){ this.body = JSON.parse(String(value)); }
  };
}

const shaA = "a".repeat(40);
const shaB = "b".repeat(40);
const prodEnv = {
  SUPABASE_DB_URL:"postgresql://fixture.invalid/atlas",
  ATLAS_MUTATION_TOKEN:"admin-secret",
  VERCEL_ENV:"production",
  VERCEL_GIT_COMMIT_REF:"main",
  VERCEL_GIT_COMMIT_SHA:shaA,
  VERCEL_GIT_REPO_OWNER:"JezCH",
  VERCEL_GIT_REPO_SLUG:"atlas-person-db"
};

test("reviewed candidate payload has exactly one immutable Authoring packet source", () => {
  const request = {
    schema:"atlas-human-person-authoring/v1",
    person:{ canonical_name_en:"Candidate", display_name_ko:"후보", life_status:"deceased", life_status_checked_at:"2026-10-01", life_status_basis:"historical_certainty" },
    timeline_disposition:{ disposition:"chronology_unresolved", reason:"fixture", basis_code:"fixture" },
    representative_domain:"knowledge",
    sources:[{ title:"Fixture source", citation_text:"Fixture source" }],
    external_references:{ namuwiki:{ status:"not_found", checked_at:"2026-10-01", review_reason:"no_exact_document" } }
  };
  assert.equal(reviewedAuthoringRequest({ reviewed_payload:{ authoring_request:request } }), request);
  assert.throws(() => reviewedAuthoringRequest({ reviewed_payload:{ request } }), /CANDIDATE_AUTHORING_REQUEST_REQUIRED/);
});

test("reviewed candidate exact read-back binds immutable review packet to canonical ledger result", () => {
  const prepared = { request:{requestId:"candidate:req:1"}, hash:"hash-1", schema:"atlas-human-person-authoring/v1" };
  const outcome = { person_id:"11111111-1111-4111-8111-111111111111", relationship_id:null, result:{version:1,person:{id:"11111111-1111-4111-8111-111111111111"}} };
  const ledger = {
    request_id:"candidate:req:1",
    manifest_hash:"hash-1",
    manifest_schema:"atlas-human-person-authoring/v1",
    person_id:outcome.person_id,
    relationship_id:null,
    result_snapshot:outcome.result
  };
  const readback = exactLedgerSnapshot(ledger, prepared, outcome);
  assert.equal(readback.person_id, outcome.person_id);
  assert.equal(readback.exact_snapshot, true);
  assert.throws(() => exactLedgerSnapshot({...ledger,person_id:"22222222-2222-4222-8222-222222222222"}, prepared, outcome), /PERSON_DRIFT/);
});

test("registration transition contract cannot move a terminal registration back to QUEUED", () => {
  assert.doesNotThrow(() => candidate.assertRegistrationTransition("QUEUED","APPLYING"));
  assert.doesNotThrow(() => candidate.assertRegistrationTransition("APPLYING","REGISTERED"));
  assert.throws(() => candidate.assertRegistrationTransition("REGISTERED","QUEUED"), /TRANSITION_INVALID/);
});

test("record_review requires the privileged human-admin auth channel and never falls back to GitHub OIDC", async () => {
  let oidcCalls = 0;
  const handler = createReviewedCandidateHandler({
    env:prodEnv,
    verifyOidc:async() => { oidcCalls += 1; },
    clientFactory:async() => { throw new Error("client must not open"); }
  });
  const req = {
    method:"POST",
    headers:{ authorization:"Bearer oidc-token" },
    body:{
      operation:OP_RECORD_REVIEW,
      transport_version:2,
      runtime_sha:shaA,
      authoring_sha:shaB,
      review:{ candidate_id:"candidate-1", revision:1, review_state:"APPROVED", review_checkpoint:"#1374 comment 1", reviewed_payload:{} }
    }
  };
  const res = responseCapture();
  await handler(req,res);
  assert.equal(res.statusCode,401);
  assert.equal(res.body.code,"CANDIDATE_REVIEW_HUMAN_AUTH_REQUIRED");
  assert.equal(oidcCalls,0);
});

test("record_review uses admin auth and service assigns human authorization instead of trusting an API boolean", async () => {
  let received = null;
  const handler = createReviewedCandidateHandler({
    env:prodEnv,
    inspectReadiness:async() => ({ready:true}),
    clientFactory:async() => ({query:async()=>({rows:[]}),end:async()=>{}}),
    createService:() => ({
      recordHumanReview:async(review) => {
        received = review;
        return { candidate_id:review.candidate_id, review_revision:review.revision, review_state:review.review_state, human_authorized:true, registration_state:"QUEUED" };
      }
    })
  });
  const req = {
    method:"POST",
    headers:{ authorization:"Bearer admin-secret" },
    body:{
      operation:OP_RECORD_REVIEW,
      review:{
        candidate_id:"candidate-1",
        revision:1,
        review_state:"APPROVED",
        review_checkpoint:"#1374 comment 1",
        reviewed_payload:{authoring_request:{schema:"atlas-human-person-authoring/v1"}},
        human_authorized:false
      }
    }
  };
  const res = responseCapture();
  await handler(req,res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.registration_state,"QUEUED");
  assert.equal(received.human_authorized,false);
});

test("apply_reviewed_candidate allows GitHub OIDC automation but forwards only exact candidate revision, never a second Authoring packet", async () => {
  let expectedOidcSha = null;
  let applied = null;
  const handler = createReviewedCandidateHandler({
    env:prodEnv,
    verifyOidc:async(_token,{expectedSha}) => { expectedOidcSha = expectedSha; },
    inspectReadiness:async() => ({ready:true}),
    clientFactory:async() => ({query:async()=>({rows:[]}),end:async()=>{}}),
    createService:() => ({
      applyQueued:async(input) => {
        applied = input;
        return {
          candidate_id:input.candidate_id,
          review_revision:input.review_revision,
          registration_state:"REGISTERED",
          person_id:"11111111-1111-4111-8111-111111111111",
          authoring_request_id:"candidate:req:1",
          exact_readback:true
        };
      }
    })
  });

  const req = {
    method:"POST",
    headers:{ authorization:"Bearer oidc-token" },
    body:{
      operation:OP_APPLY_CANDIDATE,
      transport_version:2,
      runtime_sha:shaA,
      authoring_sha:shaB,
      candidate_id:"candidate-1",
      review_revision:7,
      request:{malicious_second_packet:true},
      reviewed_payload:{malicious_second_packet:true}
    }
  };
  const res = responseCapture();
  await handler(req,res);
  assert.equal(res.statusCode,200);
  assert.equal(expectedOidcSha,shaB);
  assert.equal(applied.candidate_id,"candidate-1");
  assert.equal(applied.review_revision,7);
  assert.equal(applied.request,undefined);
  assert.equal(applied.reviewed_payload,undefined);
  assert.equal(applied.transport.kind,"github_oidc");
  assert.equal(res.body.exact_readback,true);
});


test("consolidated Authoring API exposes reviewed-candidate as a named surface without adding a second API route", () => {
  const source = fs.readFileSync(new URL("../api/atlas-authoring.js", import.meta.url), "utf8");
  assert.match(source, /surface === "reviewed-candidate"/);
  assert.match(source, /createReviewedCandidateHandler/);
  assert.match(source, /ATLAS_REVIEWED_CANDIDATE_FAILURE/);
});
