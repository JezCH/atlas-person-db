import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const review=require("../server/atlas-namuwiki-review-state.js");
const backfill=require("../data/namuwiki-reviewed-not-found-backfill.v1.json");
const reasonBackfill=require("../data/namuwiki-reviewed-not-found-reasons.v1.json");

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


test("NamuWiki reviewed absence reasons are issue-backed, disjoint, and conservative",()=>{
  assert.equal(reasonBackfill.schema,"atlas-namuwiki-reviewed-not-found-reasons/v1");
  assert.equal(reasonBackfill.issue,820);
  const all=[];
  for (const code of ["no_exact_document","related_only","target_url_pending","link_ready"]) {
    assert.ok(Array.isArray(reasonBackfill.categories[code]));
    all.push(...reasonBackfill.categories[code]);
  }
  assert.ok(all.length >= 300);
  assert.equal(new Set(all).size,all.length);
  assert.equal(review.ABSENCE_REASON_BY_PERSON_ID.size,all.length);

  const classified=all[0];
  assert.equal(
    review.absenceReasonFor({personId:classified,status:"not_found",reviewed:true}),
    review.ABSENCE_REASON_BY_PERSON_ID.get(classified)
  );
  assert.equal(
    review.absenceReasonFor({personId:"ffffffff-ffff-4fff-8fff-ffffffffffff",status:"not_found",reviewed:true}),
    "reviewed_absent_unclassified"
  );
  assert.equal(review.absenceReasonFor({personId:classified,status:"not_found",reviewed:false}),null);
  assert.equal(review.absenceReasonFor({personId:classified,status:"linked",reviewed:true}),null);
});
