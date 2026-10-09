import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const evidence=JSON.parse(readFileSync(new URL("../docs/audits/P2_03M_BRAZIL_FINAL_REPUBLIC_IDENTITY_CORRECTION_20261010.json",import.meta.url),"utf8"));
const plan=JSON.parse(readFileSync(new URL("../corrections/plans/brazil-republic-continuity-afonso-pena-relink-20261010.v1.json",import.meta.url),"utf8"));
const registry=readFileSync(new URL("../atlas-polity-review-registry.js",import.meta.url),"utf8");
const caseBlock=registry.slice(registry.indexOf('id: "brazil-regime-family"'),registry.indexOf("\n      },",registry.indexOf('id: "brazil-regime-family"')));

test("final Brazil family identity review is FIXED for active references, not retired",()=>{
  assert.equal(evidence.review_status,"FIXED_ACTIVE_IDENTITY_LINKAGE");
  assert.match(caseBlock,/status: "FIXED"/);
  assert.match(caseBlock,/terminal_status: "FIXED"/);
  assert.equal(evidence.historical_decision.empire_separate,true);
  assert.equal(evidence.historical_decision.republican_continuity,true);
  assert.equal(evidence.historical_decision.legacy_polity_physically_retired,false);
  assert.equal(evidence.historical_decision.retirement_requires_explicit_user_approval,true);
  assert.equal(evidence.registry.new_terminal_if_Fixed,52);
  assert.equal(evidence.registry.remaining,23);
});

test("correction was genuinely committed and Authoring post-state is exactly 2+0+8",()=>{
  const release=evidence.release;
  assert.equal(release.pr,2332);
  assert.equal(release.integrity_success,true);
  assert.equal(release.dry_run.ok,true);
  assert.equal(release.dry_run.committed,false);
  assert.equal(release.apply.ok,true);
  assert.equal(release.apply.committed,true);
  assert.equal(release.apply.replay,false);
  assert.equal(release.apply.request_id,plan.batch_id);
  assert.equal(release.post_commit_authoring_baseline.target_row_in_survivor,true);
  assert.deepEqual(release.post_commit_authoring_baseline.scoped_counts,{empire:2,legacy_old_title_uuid:0,canonical_republic:8});
  assert.equal(release.post_commit_authoring_baseline.total_activities,2511);
  assert.equal(release.post_commit_authoring_baseline.total_normalized_source_links,3854);
  assert.equal(release.runtime_projection_compile.success,true);
  assert.equal(release.runtime_projection_compile.published_rows,2511);
  assert.equal(release.runtime_projection_compile.independent_full_row_runtime_identity_audit,false);
});

test("one Afonso Activity, all exact historical dates and existing source remain unchanged, zero retirement",()=>{
  const o=plan.operations;
  assert.equal(o.length,1);assert.equal(o[0].type,"rewrite_activity");
  assert.equal(o[0].activity_id,evidence.change.activity_id);
  assert.equal(o[0].baseline_before.polity_id,evidence.change.old_polity_id);
  assert.equal(o[0].after.polity_id,evidence.change.new_polity_id);
  assert.equal(o[0].after.notes_policy,"PRESERVE_EXACT_LIVE_NOTES");
  assert.equal(o[0].after.activity_start_detail.day,15);
  assert.equal(o[0].after.activity_start_detail.month,11);
  assert.equal(o[0].after.activity_end_detail.day,14);
  assert.equal(o[0].after.activity_end_detail.month,6);
  assert.equal(evidence.change.existing_source_id,"e91990eb-2d4a-4e05-afc0-9a5d9f6b741a");
  assert.equal(evidence.change.activity_uuid_unchanged,true);
  assert.equal(evidence.change.any_other_activity_changed,false);
  assert.equal(evidence.change.retirements,0);
  assert.equal(evidence.change.source_assertions,0);
  assert.equal(evidence.change.designation_assertions,0);
});

test("review closure never implies automatic deletion, source registration or fabricated 1968 title dates",()=>{
  assert.equal(evidence.deferred_independent_approval.retired_empty_legacy_polity,false);
  assert.equal(evidence.deferred_independent_approval.historical_1968_exact_designations,false);
  assert.equal(evidence.deferred_independent_approval.source_bibliography_registration,false);
  assert.equal(evidence.historical_decision.date_of_first_exclusive_formal_name_adoption_verified,false);
  assert.equal(evidence.historical_decision.avoid_unverified_day_precision,true);
  assert.match(evidence.next_work,/different|DIFFERENT/i);
});
