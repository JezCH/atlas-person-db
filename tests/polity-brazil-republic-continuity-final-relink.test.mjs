import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const plan=JSON.parse(readFileSync(new URL("../corrections/plans/brazil-republic-continuity-afonso-pena-relink-20261010.v1.json",import.meta.url),"utf8"));
const {synthesizeCorrectionV2Manifest}=require("../server/atlas-correction-v2-manifest-synthesizer.js");

const a=plan.operations[0],old="750bf6be-49e9-4215-95ff-a356ba1831cd",
  survivor="a8b27d54-b180-4d51-a664-dd40b3eed08f";

test("Brazil final decision relinks only the existing Afonso Pena Activity, retains the Empire distinct",()=>{
  assert.equal(plan.schema,"atlas-stage2-correction-v2-execution-plan/v1");
  assert.equal(plan.operations.length,1);
  assert.equal(a.type,"rewrite_activity");
  assert.equal(a.activity_id,"7a021719-8a81-4367-9fd1-64e75f996563");
  assert.equal(a.baseline_before.polity_id,old);
  assert.equal(a.after.polity_id,survivor);
  assert.equal(plan.evidence.distinct_empire_polity_id,"efcd0f70-bffe-5464-86e3-b28b3658404b");
  assert.equal(plan.evidence.other_nine_activities_untouched,true);
  assert.equal(plan.evidence.republican_legacy_polity_retirement_approved,false);
  assert.equal(plan.result.political_identity_retired_count,0);
  assert.deepEqual(plan.stage2_assertions,[]);
  assert.deepEqual(plan.polity_relation_assertions,[]);
});

test("Afonso exact term, governance relationship, confidence and single official source remain identical",()=>{
  const before=a.baseline_before,after=a.after;
  assert.equal(after.person_id,before.person_id);
  assert.equal(after.role_id,before.role_id);
  assert.equal(after.period_basis_id,before.period_basis_id);
  assert.equal(after.activity_start,before.activity_start);
  assert.equal(after.activity_end,before.activity_end);
  assert.equal(after.confidence,before.confidence);
  assert.equal(after.chronology_status,before.chronology_status);
  assert.equal(after.legacy_source_key,before.legacy_source_key);
  assert.deepEqual(after.activity_start_detail,{year:1906,month:11,day:15,granularity:"day",certainty:"exact",calendar:"gregorian"});
  assert.deepEqual(after.activity_end_detail,{year:1909,month:6,day:14,granularity:"day",certainty:"exact",calendar:"gregorian"});
  assert.equal(after.notes_policy,"PRESERVE_EXACT_LIVE_NOTES");
  assert.equal(after.source_links_policy,"PRESERVE_ALL_EXISTING_NORMALIZED_SOURCE_LINKS_AND_LOCATORS");
  assert.equal(before.source_count,1);
  assert.equal(plan.evidence.source_preservation.source_id,"e91990eb-2d4a-4e05-afc0-9a5d9f6b741a");
});

test("plan synthesis against true scoped Afonso exact-before preserves canonical source link",()=>{
  const id=a.activity_id;
  const activity={
    id,notes:"Afonso Pena served as president during Brazil's First Republic under the constitutional state name United States of Brazil. The official presidential archive gives his term from 15 November 1906 until his death in office on 14 June 1909.",
    role_id:a.baseline_before.role_id,person_id:a.baseline_before.person_id,polity_id:old,
    confidence:"well_established",activity_end:1909,
    content_hash:"e831854f4511bf8ab9405c7fb0ef91e33487081c28ac7c8df804e60ab655be45",
    activity_start:1906,source_locator:{kind:"stage2_native_authoring",operation:"create",request_id:"authoring:afonso-pena:united-states-of-brazil:1906-1909:v1"},
    period_basis_id:a.baseline_before.period_basis_id,activity_end_day:14,
    relation_type_id:a.after.relation_type_id,chronology_status:"reviewed",legacy_source_key:null,
    activity_end_month:6,activity_start_day:15,activity_start_month:11,
    activity_end_calendar:"gregorian",activity_end_certainty:"exact",activity_start_calendar:"gregorian",
    activity_end_granularity:"day",activity_start_certainty:"exact",activity_start_granularity:"day"
  };
  const link={person_politics_id:id,source_id:"e91990eb-2d4a-4e05-afc0-9a5d9f6b741a",
    source_locator_key:"https://www.biblioteca.presidencia.gov.br/presidencia/ex-presidentes/affonso-penna/nome-do-presidente"};
  const snapshot={schema:"atlas-correction-v2-target-snapshot/v1",snapshot_digest:"sha256:"+"a".repeat(64),
    activity_ids:[id],activities:[activity],
    normalized_activity_source_links:[link],chronology_claims:[],relationship_descriptions:[]};
  const manifest=synthesizeCorrectionV2Manifest(plan,snapshot);
  assert.equal(manifest.operations.length,1);
  const op=manifest.operations[0];
  assert.equal(op.exact_before.activity.polity_id,old);
  assert.equal(op.exact_after.activity.polity_id,survivor);
  assert.equal(op.exact_after.activity.id,id);
  assert.equal(op.exact_after.activity.notes,activity.notes);
  assert.equal(op.exact_after.activity.content_hash,activity.content_hash);
  assert.deepEqual(op.exact_after.normalized_source_links,[link]);
  assert.deepEqual(op.exact_after.chronology_claims,[]);
  assert.deepEqual(op.exact_after.relationship_descriptions,[]);
});

test("no title-boundary speculation or unapproved irreversible action in the release plan",()=>{
  assert.equal(plan.execution_rules.production_executable,false);
  assert.equal(plan.execution_rules.production_mutation_authorized,false);
  assert.equal(plan.execution_rules.retirement_or_delete_without_explicit_user_approval_forbidden,true);
  assert.equal(plan.execution_rules.no_1968_exclusive_name_boundary_assertion,true);
  assert.equal(plan.result.asserted_polity_designation_count,0);
  assert.equal(plan.evidence.any_source_or_designation_registration_authorized,false);
  assert.equal(plan.operations.some(x=>/retire|delete|split/.test(x.type)),false);
});
