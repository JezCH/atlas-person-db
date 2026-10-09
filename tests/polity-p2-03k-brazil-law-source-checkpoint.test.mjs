import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const d=JSON.parse(readFileSync(new URL("../docs/audits/P2_03K_BRAZIL_1968_LAW_SOURCE_PREFLIGHT_20261010.json",import.meta.url),"utf8"));

test("P2-03K actual Production snapshot has zero collisions over six official URLs and key",()=>{
  assert.equal(d.evidence.github_action_run,37950565052);
  assert.equal(d.evidence.production_read_only,true);
  assert.equal(d.evidence.committed,false);
  assert.equal(d.catalog.source_count_total,3322);
  assert.equal(d.catalog.source_type_count,224);
  assert.equal(d.catalog.official_url_variants.length,6);
  assert.equal(d.catalog.exact_url_or_key_match_count,0);
  assert.deepEqual(d.catalog.exact_url_or_key_matches,[]);
  assert.equal(d.catalog.metadata_match_total,0);
  assert.deepEqual(d.catalog.metadata_candidates,[]);
  assert.equal(d.catalog.catalog_scan_complete,true);
  assert.equal(d.catalog.metadata_truncated,false);
  assert.equal(d.catalog.source_key_candidate,"brazil-law-5389-1968-official");
});

test("20 current generic repository data sources remain uninspected as primary-law payloads",()=>{
  assert.equal(d.catalog.generic_samples_count,20);
  assert.equal(d.catalog.generic_sample_truncated,false);
  assert.equal(d.catalog.generic_repository_sources.length,20);
  assert.equal(new Set(d.catalog.generic_repository_sources.map(x=>x.source_id)).size,20);
  assert.ok(d.catalog.generic_repository_sources.every(x=>x.source_type==="repository_dataset"));
  assert.equal(d.catalog.semantic_duplicate_unlabeled_content_excluded,false);
});

test("original law's date is distinguished from unique legal first title usage",()=>{
  const l=d.law;
  assert.equal(l.signed_on,"1968-02-22");
  assert.equal(l.published_dou_on,"1968-02-23");
  assert.equal(l.symbols_regulation_effective_on,"1968-02-23");
  assert.equal(l.official_title_name_first_exclusive_use_date,null);
  assert.match(l.article_3,/does not expressly establish/);
  assert.equal(l.h733_full_text_verified,false);
  assert.match(l.erratum_affects,/Art\. 2/);
  assert.ok(l.original_act_url.startsWith("https://www2.camara.leg.br/"));
});

test("P2-03K outputs evidence and never constructs a canonical correction",()=>{
  const proposal=d.registration_proposal;
  assert.equal(proposal.source_id,null);
  assert.equal(proposal.source_uuid_issued,false);
  assert.equal(proposal.exact_before_source_id_absence_verified,false);
  assert.equal(proposal.eligible_for_automatic_apply,false);
  assert.equal(proposal.bibliographic_writes_performed,false);
  assert.equal(proposal.sha256,null);
  assert.equal(proposal.bytes,null);
  assert.deepEqual(proposal.operations,[]);
  assert.equal(d.polity_decision.official_name_date_bounds_approved,false);
  assert.deepEqual(d.polity_decision.designation_ids_issued,[]);
  assert.equal(d.polity_decision.activity_transfer_performed,false);
  assert.equal(d.polity_decision.retire_or_delete_performed,false);
  assert.equal(d.polity_decision.status,"REVIEW_REQUIRED");
  assert.equal(d.next_bounded_unit,"POLITY-P2-03L");
});
