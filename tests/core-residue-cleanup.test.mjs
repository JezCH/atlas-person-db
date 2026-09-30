import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const root=new URL("../",import.meta.url);
const read=(p)=>fs.readFileSync(new URL(p,root),"utf8");
const exists=(p)=>fs.existsSync(new URL(p,root));

test("Unit 16 removes obsolete executable residue while retaining audit evidence", () => {
  for(const p of [".github/workflows/atlas-core-unit5-reconcile.yml",".github/workflows/atlas-core-unit5-verify.yml","api/atlas-core-unit5-reconcile.js","server/atlas-core-unit5-reconciliation-handler.js","server/atlas-core-unit5-reconciliation-service.js","non-timeline-persons.json","scripts/validate-non-timeline-persons.mjs","server/atlas-correction-role-merge-v2-service.js","server/atlas-correction-role-scope-v2-service.js","tests/atlas-role-case-dedup-correction.test.mjs","tests/atlas-role-polity-scope-normalization.test.mjs","tests/non-timeline-registration-validator.test.mjs","tests/atlas-core-unit5-non-timeline.test.mjs"]) assert.equal(exists(p),false,`obsolete residue: ${p}`);
  for(const p of ["data/migrations/core-v2-unit5-non-timeline-canonicalization.v1.json","corrections/requests/role-case-dedup-founder-and-ruler.v2.json","corrections/requests/role-polity-scope-normalization.v2.json"]) assert.equal(exists(p),true,`missing audit evidence: ${p}`);
});
test("legacy Role correction operation families are unreachable", () => {
  const d=read("server/atlas-correction-manifest-v2-dispatch-service.js");
  assert.doesNotMatch(d,/merge_role_case_duplicate|merge_role_polity_qualifier|atlas-correction-role-(merge|scope)-v2-service/);
  assert.match(d,/createCorrectionManifestV2Service/);
});
test("Person UI uses canonical timeline dispositions only", () => {
  const s=read("atlas-client-data-store.js"),m=read("atlas-person-main.js");
  assert.doesNotMatch(s,/non-timeline-persons\.json|loadNonTimelinePersons|nonTimeline/);
  assert.doesNotMatch(m,/unknownChronologyRegistry|registry_only|loadNonTimelinePersons/);
  assert.match(m,/timeline_disposition/);
  assert.match(m,/chronology_unresolved/);
});
test("external-reference projection trigger is retired", () => {
  const m=read("db/migrations/20260930_unit16_retire_external_reference_sync_trigger.sql");
  const a=read("server/atlas-authoring-migrations.js");
  assert.match(m,/DROP TRIGGER IF EXISTS authoring_manifest_runs_external_reference_sync/);
  assert.match(m,/DROP FUNCTION IF EXISTS atlas_v2\.sync_human_authoring_external_references\(\)/);
  assert.equal((a.match(/20260930_unit16_retire_external_reference_sync_trigger\.sql/g)||[]).length,2);
});
test("ownership registry has no unresolved writer or duplicate-truth debt", () => {
  const r=JSON.parse(read("docs/core/CORE_AUTHORITY_OWNERSHIP.v1.json"));
  const bad=new Set(["multi_writer_debt","ownership_gap","duplicate_truth_registry","transitional_single_writer"]);
  for(const x of r.resources){assert.equal(bad.has(x.status),false,`${x.id}: ${x.status}`);assert.deepEqual(x.shadow_writers,[]);assert.equal(x.remediation_unit,null);}
  const b=new Map(r.resources.map(x=>[x.id,x]));
  assert.equal(b.get("non_timeline_person_registry").canonical_state[0],"atlas_v2.person_timeline_dispositions");
  assert.equal(b.get("person_external_reference").authoritative_writer.path,"server/atlas-external-reference-service.js");
  assert.equal(b.get("activity_correction_lifecycle").status,"single_writer");
});
