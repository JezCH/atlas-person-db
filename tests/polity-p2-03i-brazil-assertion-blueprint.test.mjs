import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const {normalizeStage2AssertionOperation,SOURCE_FIELDS:stage2SourceFields}=
  require("../server/atlas-correction-v2-stage2-assertions.js");
const {SOURCE_FIELDS:fullSourceFields}=require("../server/atlas-source-service.js");
const {TEMPORAL_POLITY_DESIGNATION_JOIN_SQL}=require("../server/atlas-polity-temporal-designation-read.js");
const blueprint=JSON.parse(readFileSync(
  new URL("../docs/audits/P2_03I_BRAZIL_SOURCE_TEMPORAL_ASSERTION_BLUEPRINT_20261009.json",import.meta.url),"utf8"));

const date=s=>s==null?null:`${String(s.year).padStart(4,"0")}-${String(s.month).padStart(2,"0")}-${String(s.day).padStart(2,"0")}`;
const yearStart=y=>`${String(y).padStart(4,"0")}-01-01`;
const yearEnd=y=>`${String(y).padStart(4,"0")}-12-31`;

test("P2-03I review blueprint has zero executable operations and no invented IDs or checksums",()=>{
  assert.equal(blueprint.state,"REVIEW_ONLY_NOT_APPROVED");
  assert.equal(blueprint.safe_to_apply,false);
  assert.equal(blueprint.is_correction_manifest,false);
  assert.equal(blueprint.allow_authoring_write,false);
  assert.equal(blueprint.allow_runtime_write,false);
  assert.deepEqual(blueprint.operations,[]);
  assert.deepEqual(blueprint.source_ids_issued,[]);
  assert.deepEqual(blueprint.designation_ids_issued,[]);
  assert.equal(blueprint.source_bibliography_candidates.length,8);
  for(const s of blueprint.source_bibliography_candidates){
    assert.equal(s.id,null);assert.equal(s.source_key,null);assert.equal(s.sha256,null);assert.equal(s.bytes,null);
    assert.equal(new URL(s.canonical_url).protocol,"https:");
    assert.ok(s.citation_locator?.length>3);
  }
  for(const p of blueprint.interval_candidates){
    assert.equal(p.designation_id,null);assert.equal(p.designation_type,null);
    assert.equal(p.safe_to_assert,false);assert.deepEqual(p.source_uuid_links,[]);
    assert.deepEqual(p.source_name_ids,[]);
    assert.equal(p.candidate_valid_from.certainty,null);
    assert.equal(p.candidate_valid_from.calendar,null);
  }
});

test("all ten exact Production Activity guards remain unchanged and are classified 2+5+3",()=>{
  const e=blueprint.exact_activities;
  assert.equal(e.length,10);
  assert.equal(new Set(e.map(x=>x.activity_id)).size,10);
  const counts={imperial_untouched:0,old_republic_title:0,new_republic_title:0};
  const [oldName,newName]=blueprint.interval_candidates;
  const oldMin=date(oldName.candidate_valid_from);
  const oldMax=date(oldName.candidate_valid_to);
  const newMin=date(newName.candidate_valid_from);
  assert.ok(oldMax<newMin);
  for(const activity of e){
    assert.equal(activity.authoring_mutation_allowed,false);
    assert.ok(Number.isInteger(activity.activity_start_year));
    assert.ok(activity.activity_end_year>=activity.activity_start_year);
    counts[activity.preview_title_bucket]++;
    if(activity.preview_title_bucket==="old_republic_title"){
      assert.ok(yearStart(activity.activity_start_year)>=oldMin);
      assert.ok(yearEnd(activity.activity_end_year)<=oldMax);
    }
    if(activity.preview_title_bucket==="new_republic_title") assert.ok(yearStart(activity.activity_start_year)>=newMin);
  }
  assert.deepEqual(counts,{imperial_untouched:2,old_republic_title:5,new_republic_title:3});
  assert.equal(blueprint.exact_coverage_expectation.total,10);
  const afonso=e.find(x=>x.activity_id==="7a021719-8a81-4367-9fd1-64e75f996563");
  assert.equal(afonso.observed_polity_id,blueprint.jurisdictions.early_republic_polity_id);
  assert.notEqual(afonso.observed_polity_id,blueprint.jurisdictions.later_republic_polity_id);
  assert.equal(e.filter(x=>x.observed_polity_id===blueprint.jurisdictions.later_republic_polity_id).length,7);
});

test("real Stage 2 normalizer fails closed on unissued Source and Designation UUIDs",()=>{
  const s=blueprint.source_bibliography_candidates.find(x=>x.reference_key==="law_1968_5389");
  assert.ok(s);
  assert.equal(s.citation_locator.includes("Art."),true);
  assert.throws(()=>normalizeStage2AssertionOperation({
    type:"assert_source",decision_id:"unapproved-source",
    exact_before:{source_absent_id:s.id},
    exact_after:{source:{...s,source_key:"proposal_not_authorized",citation_text:s.citation_locator}}
  },1),/SOURCE_ID_INVALID/);
  const p=blueprint.interval_candidates[0];
  assert.throws(()=>normalizeStage2AssertionOperation({
    type:"assert_polity_designation",decision_id:"unapproved-designation",
    exact_before:{designation_absent_id:p.designation_id},
    exact_after:{designation:{id:p.designation_id,polity_id:p.intended_polity_id}}
  },2),/DESIGNATION_ID_INVALID/);
});

test("P2-03I recorded bibliographic gap is fixed by later P2-03J source assertion contract",()=>{
  for(const field of ["author_creator","institution","publisher","publication_date","publication_year","external_identifier","citation_metadata","artifact_metadata"]){
    assert.ok(fullSourceFields.includes(field),field);
    assert.ok(stage2SourceFields.includes(field),field);
  }
  assert.ok(blueprint.writer_contract.source_metadata_gap.includes("whitelist"));
});

test("temporal selection requires exactly one FULL containing interval, not partial activity overlap",()=>{
  assert.match(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL,/when count\(\*\) = 1/);
  assert.match(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL,/pp\.activity_start is not null/);
  assert.match(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL,/pp\.activity_end is not null/);
  assert.match(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL,/coalesce\(pp\.activity_start_month, 1\)/);
  assert.match(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL,/coalesce\(pp\.activity_end_month, 12\)/);
  assert.equal(blueprint.unverified_opinion.full_primary_text_verified,false);
  assert.equal(blueprint.parent_status,"REVIEW_REQUIRED");
});
