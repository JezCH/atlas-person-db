import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {normalizeStage2AssertionOperation}=require("../server/atlas-correction-v2-stage2-assertions.js");
const {BRAZIL_P2_03L_LAW_SOURCE_ID_CANDIDATE,BRAZIL_P2_03K_LAW_SOURCE_KEY,BRAZIL_P2_03K_OFFICIAL_LAW_URLS}=
  require("../server/atlas-polity-reference-audit-handler.js");
const manifest=JSON.parse(readFileSync(new URL("../docs/audits/P2_03L_BRAZIL_ARCHIVED_GENERIC_SOURCES_AND_LAW_SOURCE_CANDIDATE_20261010.json",import.meta.url),"utf8"));

test("20 historical generic Sources each map to an actual independently-addressable pre-cleanup Git blob",()=>{
  const snap=manifest.historical_snapshot;
  assert.equal(snap.archive_ref,"1196e397deb506696386bae1cd88800c16c9cddf");
  assert.equal(snap.cleanup_commit,"cdf93d65a898f49bfe0f12285408e03dde02f81d");
  assert.equal(snap.archived_file_count,20);
  assert.equal(snap.historical_source_files.length,20);
  assert.equal(new Set(snap.historical_source_files.map(x=>x.production_source_id)).size,20);
  assert.equal(new Set(snap.historical_source_files.map(x=>x.legacy_file_path)).size,20);
  for(const row of snap.historical_source_files){
    assert.equal(row.source_category,"repository_dataset");
    assert.match(row.production_source_key,/^repository-source:/);
    assert.match(row.archived_git_blob_sha1,/^[a-f0-9]{40}$/);
    assert.ok(row.archived_git_url.endsWith("/"+row.legacy_file_path));
    assert.ok(row.archived_bytes>100);
    assert.equal(row.strict_law_title_or_citation_text_hits_in_archived_file,0);
    assert.equal(row.candidate_first_party_law_5389_source,false);
    assert.equal(row.source_key_sha256_vs_archived_bytes_matched,false);
  }
  assert.equal(snap.word_search.file_count_queried,20);
  assert.equal(snap.word_search.strict_matching_archived_files,0);
  assert.equal(snap.word_search.archived_file_bytes_equivalence_to_production_source_key_sha256_verified,false);
});

test("candidate first primary law has reviewed official URL, full Source bibliography and deterministic proposed identity",()=>{
  const candidate=manifest.offline_source_candidate;
  const src=candidate.source_record;
  assert.equal(src.id,"e7ad7bd0-e77c-526b-b7d9-832bcca75dab");
  assert.equal(src.id,BRAZIL_P2_03L_LAW_SOURCE_ID_CANDIDATE);
  assert.equal(src.source_key,BRAZIL_P2_03K_LAW_SOURCE_KEY);
  assert.equal(src.canonical_url,BRAZIL_P2_03K_OFFICIAL_LAW_URLS[0]);
  assert.equal(src.publication_date,"1968-02-23");
  assert.equal(src.publication_year,1968);
  assert.equal(src.sha256,null);assert.equal(src.bytes,null);
  assert.equal(candidate.uuid_allocation_is_offline_only,true);
  assert.equal(candidate.registered_source_uuid,null);
  assert.equal(candidate.stage2_assertion_type,"assert_source");
  assert.deepEqual(candidate.expected_exact_before,{source_absent_id:src.id});
  assert.equal(candidate.before_state_at_writer_transaction_verified,false);
  assert.equal(candidate.target_id_absence_on_live_prod_snapshot_verified,false);
  assert.match(src.citation_text,/NOT|not|não|does not/i);
  const normalized=normalizeStage2AssertionOperation({
    type:"assert_source",decision_id:"P2-03L-OFFLINE-VALIDATION-ONLY",
    exact_before:candidate.expected_exact_before,
    exact_after:{source:src}
  },0);
  assert.equal(normalized.exact_after.source.source_key,src.source_key);
  assert.deepEqual(normalized.exact_after.source.citation_metadata,src.citation_metadata);
  assert.equal(normalized.exact_after.source.sha256,null);
});

test("review JSON is not a correction and cannot authorize a Polity identity write",()=>{
  assert.equal(manifest.source_registration_authorized,false);
  assert.equal(manifest.source_writer_invoked,false);
  assert.equal(manifest.polity_authoring_or_runtime_mutation,false);
  assert.deepEqual(manifest.operations,[]);
  assert.equal(manifest.legal_bounds.formal_name_first_exclusive_use_date,null);
  assert.equal(manifest.legal_bounds.h733_primary_opinion_verified,false);
  assert.equal(manifest.legal_bounds.temporal_designations_approved,false);
  assert.equal(manifest.parent_status,"REVIEW_REQUIRED");
  assert.equal(manifest.next,"POLITY-P2-03M");
});
