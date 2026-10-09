import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const evidence=JSON.parse(readFileSync(
  new URL("../docs/audits/P2_03J_BRAZIL_STAGE2_SOURCE_SCHEMA_READINESS_20261009.json",import.meta.url),
  "utf8"));
const prior=JSON.parse(readFileSync(
  new URL("../docs/audits/P2_03I_BRAZIL_SOURCE_TEMPORAL_ASSERTION_BLUEPRINT_20261009.json",import.meta.url),
  "utf8"));
const officialSourceFields=[
  "id","source_key","source_type","title","author_creator","institution","publisher",
  "publication_date","publication_year","canonical_url","external_identifier",
  "citation_text","citation_metadata","artifact_metadata","sha256","bytes"
];

test("P2-03J authentic live Production schema checkpoint identifies exact allowable Designation types",()=>{
  const e=evidence.confirmed_current_production;
  assert.equal(evidence.provenance.production_readonly_run,37948838233);
  assert.equal(evidence.provenance.production_sha,"827e3dbc25731e592e61735ef036f75c889a9a17");
  assert.deepEqual(e.designation_types,["official_name","state_form","historiographic_period","conventional_temporal_label"]);
  assert.deepEqual(e.time_granularities,["year","month","day"]);
  assert.deepEqual(e.temporal_certainties,["exact","approximate","uncertain"]);
  assert.deepEqual(e.calendar_types,["gregorian","julian","unspecified_historical","source_calendar"]);
  assert.equal(e.source_writer_supports_complete_bibliography,true);
  assert.deepEqual(e.missing_columns,[]);
  assert.deepEqual([...e.source_columns].sort(),[...officialSourceFields].sort());
});

test("P2-03J Source citation is traceable yet no fabricated Source identity or hashes",()=>{
  const s=evidence.proposed_registration_not_authorized.source;
  assert.equal(s.id,null);
  assert.equal(s.source_key,null);
  assert.equal(s.sha256,null);
  assert.equal(s.bytes,null);
  assert.equal(s.key_unique_checked_at_commit,false);
  assert.equal(s.id_absent_checked_at_commit,false);
  assert.deepEqual(s.real_source_uuid_links,[]);
  assert.equal(s.publication_date,"1968-02-23");
  assert.equal(s.publication_year,1968);
  assert.match(s.title,/5.389/);
  assert.ok(s.canonical_url.startsWith("https://www2.camara.leg.br/"));
  assert.equal(s.canonical_url,prior.source_bibliography_candidates.find(x=>x.reference_key==="law_1968_5389").canonical_url);
  assert.ok(s.citation_text.includes("Art."));
});

test("reviewed legal-name interval candidates fit Production enums but remain legally unapproved",()=>{
  const x=evidence.proposed_registration_not_authorized;
  assert.equal(x.candidate_old_name.designation_type,"official_name");
  assert.equal(x.candidate_later_name.designation_type,"official_name");
  assert.equal(x.candidate_old_name.valid_to.year,1968);
  assert.equal(x.candidate_old_name.valid_to.month,2);
  assert.equal(x.candidate_old_name.valid_to.day,22);
  assert.equal(x.candidate_later_name.valid_from.year,1968);
  assert.equal(x.candidate_later_name.valid_from.month,2);
  assert.equal(x.candidate_later_name.valid_from.day,23);
  assert.equal(x.candidate_old_name.valid_from.calendar,"gregorian");
  assert.equal(x.candidate_later_name.valid_from.calendar,"gregorian");
  assert.equal(x.candidate_old_name.legal_exclusivity_verified,false);
  assert.equal(x.candidate_later_name.legal_exclusivity_verified,false);
  assert.equal(x.candidate_old_name.approved_for_writer,false);
  assert.equal(x.candidate_later_name.approved_for_writer,false);
  assert.equal(x.candidate_old_name.designation_id,null);
  assert.equal(x.candidate_later_name.designation_id,null);
  assert.deepEqual(x.candidate_old_name.source_uuid_links,[]);
  assert.deepEqual(x.candidate_later_name.source_uuid_links,[]);
});

test("new Brazil P2-03J checkpoint cannot be submitted as a Correction manifest",()=>{
  assert.equal(evidence.correction_manifest,false);
  assert.equal(evidence.auto_apply_allowed,false);
  assert.deepEqual(evidence.operations,[]);
  assert.equal(evidence.no_politico_runtime_mutation,true);
  assert.equal(evidence.parent_status,"REVIEW_REQUIRED");
  assert.equal(evidence.affected_activities.total,10);
  assert.deepEqual([
    evidence.affected_activities.unchanged_empire,
    evidence.affected_activities.reviewed_early_republic_name,
    evidence.affected_activities.reviewed_later_republic_name
  ],[2,5,3]);
  assert.equal(evidence.next_bounded_unit,"POLITY-P2-03K");
  assert.ok(evidence.remaining_blockers.some(x=>x.includes("H-733")));
});
