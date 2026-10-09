import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const review=JSON.parse(readFileSync(new URL("../docs/audits/P2_03H_BRAZIL_OFFICIAL_NAME_SOURCE_REVIEW_20261009.json",import.meta.url),"utf8"));
test("P2-03H checkpoint cannot authorize canonical writes or Source fabrication",()=>{
  assert.equal(review.status,"REVIEW_ONLY_NOT_APPROVED");
  assert.equal(review.canonical_mutation,false);
  assert.equal(review.safe_to_apply,false);
  assert.equal(review.source_registration_candidate.source_id,null);
  assert.equal(review.source_registration_candidate.sha256,null);
  assert.equal(review.source_registration_candidate.bytes,null);
  assert.equal(review.reviewed_boundary_candidate.approved_for_writer,false);
  assert.equal(review.reviewed_boundary_candidate.designation_uuid,null);
  assert.equal(review.reviewed_boundary_candidate.designation_type,null);
  assert.deepEqual(review.reviewed_boundary_candidate.source_uuid_links,[]);
});
test("1968 official published-law date is distinct from the later 1969 Constitution",()=>{
  const q=review.legal_name_change;
  assert.equal(q.law_number,"Lei nº 5.389");
  assert.equal(q.signed_on,"1968-02-22");
  assert.equal(q.published_dou_on,"1968-02-23");
  assert.equal(q.effective_on,"1968-02-23");
  assert.equal(q.opinion_reference.full_primary_opinion_text_obtained,false);
  assert.ok(q.legal_locator.includes("Art. 4"));
});
test("possible 1968 temporal boundary is nonoverlapping but not approved",()=>{
  const r=review.reviewed_boundary_candidate;
  assert.ok(r.early.review_end<r.later.review_start);
  assert.equal(r.early.review_start,"1889-11-15");
  assert.equal(r.later.review_start,"1968-02-23");
  assert.match(r.confidence,/PENDING/);
  assert.equal(r.approved_for_writer,false);
});
test("live alias absence is metadata-bounded, not semantic proof",()=>{
  const p=review.current_production;
  assert.equal(p.run_id,37920065332);
  assert.equal(p.source_metadata_candidates,0);
  assert.equal(p.search_complete,true);
  assert.equal(p.truncated,false);
  assert.equal(p.exact_official_url_sources_from_p2_03g,0);
  assert.equal(p.source_semantic_alias_absence_proven,false);
  assert.equal(p.readonly,true);
  assert.equal(p.committed,false);
  assert.equal(review.parent_status,"REVIEW_REQUIRED");
});
