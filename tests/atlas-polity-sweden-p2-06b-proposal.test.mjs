import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const p=JSON.parse(readFileSync(new URL("../docs/audits/P2_06B_SWEDEN_REVIEW_ONLY_TEMPORAL_DESIGNATION_20261010.json",import.meta.url),"utf8"));
test("Swedish Empire remains a non-executable historical era draft, never a new sovereign or emperor title",()=>{
 assert.equal(p.schema,"atlas-polity-temporal-historiographic-proposal/v1");
 assert.equal(p.review_status,"REVIEW_REQUIRED");
 for (const k of ["production_executable","production_mutation_authorized","auto_apply_allowed","production_authoring_verified","production_runtime_verified","exact_designation_before_state_verified"]) assert.equal(p[k],false,k);
 assert.equal(p.polity.distinct_swedish_empire_polity_should_be_created,false);
 assert.equal(p.polity.id,"93613017-b4c4-5f82-8e96-3ce6b2d3a61e");
 assert.notEqual(p.polity.id,p.polity.separate_union_polity_id);
 assert.equal(p.proposed_temporal_designation.type,"historiographic_period");
 assert.equal(p.proposed_temporal_designation.candidate_designation_id,null);
 assert.equal(p.proposed_temporal_designation.existing_designation_rows,null);
 assert.equal(p.proposed_temporal_designation.source_catalog_ids,null);
 assert.equal(p.correction_plan,null);
});
test("Scholarly 1611–1718 year interval contains four unmodified existing royal Activities; 1721 is a separate periodization",()=>{
 const t=p.proposed_temporal_designation.interval;
 assert.deepEqual([t.valid_from_year,t.valid_to_year],[1611,1718]);
 assert.deepEqual([t.valid_from_granularity,t.valid_to_granularity],["year","year"]);
 assert.equal(p.exact_existing_activity_ids_expected_within_1611_1718.length,4);
 assert.equal(new Set(p.exact_existing_activity_ids_expected_within_1611_1718.map(a=>a.activity_id)).size,4);
 for (const a of p.exact_existing_activity_ids_expected_within_1611_1718) {
  assert.ok(a.year_start>=t.valid_from_year && a.year_end<=t.valid_to_year);
 }
 assert.equal(p.periodization_alternative.years,"1611–1721");
 assert.equal(p.periodization_alternative.simultaneous_second_designation_authorized,false);
 assert.equal(p.polity.public_activity_count,15);
 assert.equal(p.polity.separate_union_activity_count,3);
});
