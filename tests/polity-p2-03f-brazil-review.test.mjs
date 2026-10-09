import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const review=JSON.parse(readFileSync(new URL("../docs/audits/P2_03F_BRAZIL_REPUBLIC_DESIGNATION_REVIEW_20261009.json",import.meta.url),"utf8"));
const sql=readFileSync(new URL("../db/audits/p2-03f-brazil-republic-continuity-preflight-readonly-20261009.sql",import.meta.url),"utf8");
const EXPECTED={
  empire:"efcd0f70-bffe-5464-86e3-b28b3658404b",
  early:"750bf6be-49e9-4215-95ff-a356ba1831cd",
  later:"a8b27d54-b180-4d51-a664-dd40b3eed08f"
};
const Afonso="7a021719-8a81-4367-9fd1-64e75f996563";

test("P2-03F case is explicitly review-only and has no approved canonical mutation",()=>{
  assert.equal(review.review_status,"REVIEW_ONLY_NOT_APPROVED");
  assert.equal(review.safe_to_apply,false);
  assert.equal(review.canonical_mutation,false);
  assert.equal(review.production_anchors.historical_empire_polity_id,EXPECTED.empire);
  assert.equal(review.production_anchors.republican_early_polity_id,EXPECTED.early);
  assert.equal(review.production_anchors.republican_survivor_candidate_polity_id,EXPECTED.later);
});

test("P2-03F preserves the exact ten separate Person Activity IDs, years and Polity owners",()=>{
  const activities=review.exact_activity_guards;
  assert.equal(activities.length,10);
  assert.equal(new Set(activities.map(a=>a.id)).size,10);
  const counts=Object.fromEntries([EXPECTED.empire,EXPECTED.early,EXPECTED.later].map(id=>[id,activities.filter(a=>a.polity_id===id).length]));
  assert.deepEqual(counts,{[EXPECTED.empire]:2,[EXPECTED.early]:1,[EXPECTED.later]:7});
  assert.deepEqual(activities.find(a=>a.id===Afonso),{id:Afonso,polity_id:EXPECTED.early,years:[1906,1909]});
  assert.equal(review.exact_transfer_candidate_activity_id,Afonso);
  for(const a of activities){
    assert.ok(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(a.id));
    assert.ok(a.years[0] > 0 && a.years[1]>=a.years[0]);
    assert.ok(sql.includes(a.id),a.id+" missing from independent SQL preflight");
  }
});

test("P2-03F distinguishes Activity Source links from direct Polity sources",()=>{
  const a=review.production_anchors;
  assert.equal(a.verified_source_links.person_activity,17);
  assert.equal(a.verified_source_links.direct_polity_empire,1);
  assert.equal(a.verified_source_links.direct_polity_early_republic,0);
  assert.equal(a.verified_source_links.direct_polity_later_republic,0);
  assert.equal(a.verified_missing.designations,0);
  assert.equal(a.verified_missing.identity_relations,0);
  assert.equal(a.verified_missing.governance_periods,0);
});

test("seven federal primary documents use actual official source links and explicit locators",()=>{
  assert.equal(review.primary_sources.length,7);
  assert.equal(new Set(review.primary_sources.map(s=>s.key)).size,7);
  for(const s of review.primary_sources){
    assert.ok(s.canonical_url.startsWith("https://"));
    assert.ok(/camara|planalto|senado/.test(new URL(s.canonical_url).hostname));
    assert.ok(s.title && s.issuer && s.locator && s.not_proof_of);
    assert.ok(s.attests.length>0);
  }
  const constitution=review.primary_sources.find(s=>s.key==="constitution_1967");
  assert.ok(constitution.attests.includes("constitution_effective_1967_03_15"));
  assert.match(constitution.not_proof_of,/first exclusive official naming/i);
  const amended=review.primary_sources.find(s=>s.key==="amendment_1969_1");
  assert.ok(amended.attests.includes("amendment_effective_1969_10_30"));
});

test("candidate designations are deliberately incomplete rather than invent a title switch",()=>{
  assert.equal(review.designation_candidates.length,2);
  for(const d of review.designation_candidates){
    assert.equal(d.intended_polity_id,EXPECTED.later);
    assert.equal(d.designation_type,null);
    assert.deepEqual(d.source_uuid_links,[]);
    assert.equal(d.end_boundary,null);
    assert.ok(d.positive_evidence_keys.length>0);
  }
  assert.equal(review.designation_candidates[0].end_boundary_status,"UNRESOLVED_DO_NOT_APPROVE");
  assert.equal(review.designation_candidates[1].start_boundary,null);
  assert.match(review.designation_candidates[1].start_boundary_status,/UNRESOLVED/);
});

test("preflight SQL remains entirely read-only and scopes both Republic and Empire identities",()=>{
  assert.match(sql,/^BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;/m);
  assert.match(sql,/COMMIT;\s*$/);
  assert.doesNotMatch(sql,/\b(?:insert|update|delete|alter|drop|truncate|create|grant|revoke)\s+(?:into|from|table|on|schema|role|view|index|atlas_v2)/i);
  for(const id of Object.values(EXPECTED)) assert.ok(sql.includes(id),id+" missing");
  for(const table of ["person_politics_v2","person_politics_sources","polity_sources","polity_designations",
    "polity_designation_sources","polity_identity_relations","polity_identity_retirements",
    "runtime_person_politics_v1","sources"]) assert.ok(sql.includes("atlas_v2."+table));
  assert.match(sql,/information_schema\.columns/);
  assert.match(sql,/observed_full_activity_row/);
  assert.match(sql,/source_locator_key/);
  assert.match(sql,/extra_activity_id/);
});

test("P2-03F never treats mere official-title changes as automatic split or deletion approval",()=>{
  assert.ok(review.required_decisions.some(s=>s.includes("No retirement/deletion")));
  assert.ok(review.required_decisions.some(s=>s.includes("1967 and 1969")));
  assert.ok(review.required_decisions.some(s=>s.includes("Afonso Pena")));
});
