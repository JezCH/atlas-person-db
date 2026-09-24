import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const review=require("../server/atlas-namuwiki-review-state.js");
const backfill=require("../data/namuwiki-reviewed-not-found-backfill.v1.json");
const outcomes=require("../data/namuwiki-review-outcome-backfill.v1.json");

test("NamuWiki reviewed-not-found backfill is unique and issue-backed",()=>{
  assert.equal(backfill.schema,"atlas-namuwiki-reviewed-not-found-backfill/v1");
  assert.equal(backfill.issue,820);
  assert.ok(backfill.person_ids.length >= 90);
  assert.equal(new Set(backfill.person_ids).size,backfill.person_ids.length);
  assert.equal(review.REVIEWED_NOT_FOUND_BACKFILL_IDS.size,backfill.person_ids.length);
});

test("NamuWiki review state stays conservative without audit/backfill evidence",()=>{
  assert.equal(review.stateFor({personId:"ffffffff-ffff-4fff-8fff-ffffffffffff",status:"not_found"}),"legacy_unverified");
  assert.equal(review.stateFor({personId:"ffffffff-ffff-4fff-8fff-ffffffffffff",status:"not_found",audited:true}),"reviewed_absent");
  assert.equal(review.stateFor({personId:backfill.person_ids[0],status:"not_found"}),"reviewed_absent");
  assert.equal(review.stateFor({personId:backfill.person_ids[0],status:"linked"}),null);
});

test("review evidence SQL reads immutable external-reference mutation audits",()=>{
  assert.match(review.NOT_FOUND_REVIEW_AUDIT_SQL,/person_profile_mutation_audits/);
  assert.match(review.NOT_FOUND_REVIEW_AUDIT_SQL,/set_person_external_reference/);
  assert.match(review.NOT_FOUND_REVIEW_AUDIT_SQL,/not_found/);
});


test("NamuWiki review outcome backfill keeps exact-subject pending separate from confirmed absence",()=>{
  assert.equal(outcomes.schema,"atlas-namuwiki-review-outcome-backfill/v1");
  assert.equal(outcomes.issue,820);
  assert.ok(Object.keys(outcomes.outcomes).length >= 300);
  const byOutcome=(code)=>Object.entries(outcomes.outcomes).find(([,value])=>value===code)?.[0];
  const pendingUrl=byOutcome("target_found_url_pending");
  const pendingLink=byOutcome("target_found_link_pending");
  const noExact=byOutcome("no_exact_document");
  const relatedOnly=byOutcome("related_or_derivative_only");
  assert.ok(pendingUrl);
  assert.ok(pendingLink);
  assert.ok(noExact);
  assert.ok(relatedOnly);
  assert.equal(review.stateFor({personId:pendingUrl,status:"not_found",audited:true}),"target_found_url_pending");
  assert.equal(review.stateFor({personId:pendingLink,status:"not_found",audited:true}),"target_found_link_pending");
  assert.equal(review.stateFor({personId:noExact,status:"not_found"}),"reviewed_absent");
  assert.equal(review.stateFor({personId:relatedOnly,status:"not_found"}),"reviewed_absent");
  assert.equal(review.reasonFor({personId:noExact,status:"not_found"}),"no_exact_document");
  assert.equal(review.reasonFor({personId:relatedOnly,status:"not_found"}),"related_or_derivative_only");
});

test("reviewed not-found without a recorded reason stays confirmed but explicitly unclassified",()=>{
  const id="ffffffff-ffff-4fff-8fff-ffffffffffff";
  assert.equal(review.stateFor({personId:id,status:"not_found",audited:true}),"reviewed_absent");
  assert.equal(review.reasonFor({personId:id,status:"not_found",audited:true}),"reviewed_absent_unclassified");
  assert.equal(review.reasonFor({personId:id,status:"not_found"}),"legacy_unverified");
});
