import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const {
  CONTRACT,
  normalizeReviewedResearchArtifact,
  buildApprovedHandoffs
}=require("../server/atlas-p14-reviewed-research-intake.js");

const POLITY="11111111-1111-4111-8111-111111111111";
const GEOMETRY="22222222-2222-4222-8222-222222222222";
const SOURCE_A="33333333-3333-4333-8333-333333333333";
const SOURCE_B="44444444-4444-4444-8444-444444444444";

function territory(){
  return {
    control_type:"de_facto_control",
    boundary_certainty:"approximate",
    evidence_confidence:"probable",
    valid_start:1584,
    valid_start_month:null,
    valid_start_day:null,
    valid_start_granularity:"year",
    valid_start_certainty:"approximate",
    valid_start_calendar:"source_calendar",
    valid_end:null,
    valid_end_month:null,
    valid_end_day:null,
    valid_end_granularity:null,
    valid_end_certainty:null,
    valid_end_calendar:null,
    chronology_status:"reviewed",
    source_refs:[{source_id:SOURCE_B,locator:"territorial statement pp. 10-12"}]
  };
}
function artifact(caseData){
  return {
    schema:"atlas-p14-reviewed-territory-research/v1",
    status:"REVIEWED_NO_PRODUCTION_MUTATION",
    reviewed_at:"2026-10-02",
    production_mutation_authorized:false,
    cases:[caseData]
  };
}
function approved(){
  return {
    case_id:"fixture-reviewed-territory-1",
    review_state:"APPROVED",
    research_question:"What territorial control is source-supported for this interval?",
    polity_id:POLITY,
    geometry:{
      mode:"candidate",
      geometry_kind:"polygon",
      geometry_ref:"repo://p14/research/fixture-shape-1",
      source_refs:[{source_id:SOURCE_A,locator:"reviewed map plate 1"}]
    },
    territory:territory(),
    remaining_blockers:[]
  };
}

test("P14-B contract keeps reviewed research non-mutating",()=>{
  assert.equal(CONTRACT.schema,"atlas-p14-reviewed-research-intake-contract/v1");
  assert.equal(CONTRACT.rules.production_mutation_authorized,false);
  assert.equal(CONTRACT.rules.reviewed_research_is_not_authoring_write_authority,true);
});

test("APPROVED research normalizes to one non-mutating Authoring handoff",()=>{
  const normalized=normalizeReviewedResearchArtifact(artifact(approved()));
  assert.equal(normalized.approved_count,1);
  assert.equal(normalized.cases[0].ready_for_authoring_handoff,true);
  assert.equal(normalized.cases[0].polity_id,POLITY);
  assert.equal(normalized.cases[0].geometry.geometry_kind,"polygon");
  assert.equal(normalized.cases[0].territory.valid_end,null);
  const handoffs=buildApprovedHandoffs(artifact(approved()));
  assert.equal(handoffs.length,1);
  assert.equal(handoffs[0].production_mutation_authorized,false);
  assert.equal(handoffs[0].canonical_writer,"server/atlas-p14-territory-geometry-service.js");
});

test("APPROVED may reuse an existing canonical Geometry UUID",()=>{
  const row=approved();
  row.geometry={mode:"existing",geometry_id:GEOMETRY};
  const normalized=normalizeReviewedResearchArtifact(artifact(row));
  assert.equal(normalized.cases[0].geometry.mode,"existing");
  assert.equal(normalized.cases[0].geometry.geometry_id,GEOMETRY);
});

test("HOLD preserves blockers and cannot become an Authoring handoff",()=>{
  const raw=artifact({
    case_id:"fixture-hold-1",
    review_state:"HOLD",
    research_question:"Is the exact boundary reconstructible?",
    remaining_blockers:["INSUFFICIENT_GEOMETRY_EVIDENCE"]
  });
  const normalized=normalizeReviewedResearchArtifact(raw);
  assert.equal(normalized.hold_count,1);
  assert.deepEqual(normalized.cases[0].remaining_blockers,["INSUFFICIENT_GEOMETRY_EVIDENCE"]);
  assert.deepEqual(buildApprovedHandoffs(raw),[]);
});

test("REJECTED requires an explicit review reason",()=>{
  const raw=artifact({
    case_id:"fixture-rejected-1",
    review_state:"REJECTED",
    research_question:"Does a campaign imply direct territorial control?",
    review_reason:"Campaign evidence does not establish territorial control."
  });
  assert.equal(normalizeReviewedResearchArtifact(raw).rejected_count,1);
  assert.throws(()=>normalizeReviewedResearchArtifact(artifact({
    case_id:"bad-rejected",
    review_state:"REJECTED",
    research_question:"Unsupported proposal?"
  })),/REJECTED_REASON_REQUIRED/);
});

test("APPROVED fails closed on unresolved canonical evidence or blockers",()=>{
  const missingSource=approved();
  missingSource.geometry={...missingSource.geometry,source_refs:[]};
  assert.throws(()=>normalizeReviewedResearchArtifact(artifact(missingSource)),/SOURCE_REQUIRED/);

  const blocked=approved();
  blocked.remaining_blockers=["POLITY_IDENTITY_UNRESOLVED"];
  assert.throws(()=>normalizeReviewedResearchArtifact(artifact(blocked)),/APPROVED_BLOCKERS_MUST_BE_EMPTY/);

  const badPolity=approved();
  badPolity.polity_id="not-a-uuid";
  assert.throws(()=>normalizeReviewedResearchArtifact(artifact(badPolity)),/POLITY_ID_INVALID/);
});

test("research intake forbids inline geometry and Person or Activity authority",()=>{
  const inline=approved();
  inline.geometry.coordinates=[1,2];
  assert.throws(()=>normalizeReviewedResearchArtifact(artifact(inline)),/INLINE_GEOMETRY_FORBIDDEN/);

  const personOwned=approved();
  personOwned.person_id="55555555-5555-4555-8555-555555555555";
  assert.throws(()=>normalizeReviewedResearchArtifact(artifact(personOwned)),/PERSON_ACTIVITY_AUTHORITY_FORBIDDEN/);
});

test("unknown and ongoing temporal boundaries preserve current P14 semantics",()=>{
  const unresolved=normalizeReviewedResearchArtifact(artifact(approved()));
  assert.equal(unresolved.cases[0].territory.valid_end,null);

  const partial=approved();
  partial.territory.valid_end_month=4;
  assert.throws(()=>normalizeReviewedResearchArtifact(artifact(partial)),/UNRESOLVED_BOUNDARY_PARTIAL/);

  const ongoing=approved();
  ongoing.territory.chronology_status="ongoing";
  ongoing.territory.ongoing_as_of="2026-10-02";
  const ongoingNormalized=normalizeReviewedResearchArtifact(artifact(ongoing));
  assert.equal(ongoingNormalized.cases[0].territory.ongoing_as_of,"2026-10-02");
});

test("unknown intake fields fail closed instead of being silently discarded",()=>{
  const extraCase=approved();
  extraCase.territory.direct_control_note="ignored fields are forbidden";
  assert.throws(()=>normalizeReviewedResearchArtifact(artifact(extraCase)),/TERRITORY_FIELD_FORBIDDEN/);

  const extraArtifact=artifact(approved());
  extraArtifact.source_urls=["https://example.invalid"];
  assert.throws(()=>normalizeReviewedResearchArtifact(extraArtifact),/ARTIFACT_FIELD_FORBIDDEN/);
});

test("research artifacts can never self-authorize Production mutation",()=>{
  const raw=artifact(approved());
  raw.production_mutation_authorized=true;
  assert.throws(()=>normalizeReviewedResearchArtifact(raw),/PRODUCTION_MUTATION_FORBIDDEN/);
});
