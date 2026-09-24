import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const review=require("../server/atlas-namuwiki-review-state.js");
const backfill=require("../data/namuwiki-reviewed-not-found-backfill.v1.json");
const reasons=require("../data/namuwiki-reviewed-not-found-reasons.v1.json");

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


test("NamuWiki reviewed-unlinked reason ledger is explicit and conservative",()=>{
  assert.equal(reasons.schema,"atlas-namuwiki-reviewed-not-found-reasons/v1");
  assert.equal(reasons.issue,820);
  const ids=Object.keys(reasons.by_person_id || {});
  assert.ok(ids.length >= 300);
  assert.equal(new Set(ids).size,ids.length);
  const [sampleId,sampleReason]=Object.entries(reasons.by_person_id)[0];
  assert.equal(review.reasonFor({personId:sampleId,status:"not_found",audited:true}),sampleReason);
  assert.equal(review.reasonFor({personId:"ffffffff-ffff-4fff-8fff-ffffffffffff",status:"not_found",audited:true}),null);
  assert.equal(review.reasonFor({personId:sampleId,status:"linked",audited:true}),null);
});
