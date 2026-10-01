import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const json=(p)=>JSON.parse(read(p));

const acceptance=json("data/core/core-v2-final-acceptance.v1.json");
const requirements=json("requirements/atlas-requirements.v1.json");
const ownership=json("docs/core/CORE_AUTHORITY_OWNERSHIP.v1.json");
const runtime=json("contracts/runtime-projection-contract.v1.json");
const obligations=json("data/core/registration-obligations.v1.json");
const execution=read("WORK_EXECUTION.md");

const expectedCriteria=[
  "requirements_contradictions_zero",
  "canonical_multi_writer_zero",
  "duplicate_truth_registries_zero",
  "reachable_legacy_writer_runtime_zero",
  "retired_identity_resurrection_path_zero",
  "fake_date_sentinel_dependency_zero",
  "unresolved_silent_runtime_publish_zero",
  "manual_semantic_runtime_refresh_zero",
  "registration_followup_completeness_debt_zero",
  "runtime_reproducibility_pass",
  "compiler_determinism_pass",
  "writer_idempotency_pass",
  "destructive_lifecycle_pass",
  "provenance_preservation_pass",
  "ai_authoritative_bypass_zero",
  "obsolete_core_execution_code_zero",
  "task_level_single_writer_dependency_zero",
  "stale_authoritative_overwrite_paths_zero",
  "active_task_keys_multiple_artifacts_zero",
  "current_schema_reconstruction_authority_pass",
  "reviewed_candidate_production_lifecycle_pass"
];

test("Unit 17 final acceptance artifact covers every canonical end-state with durable evidence",()=>{
  assert.equal(acceptance.schema,"atlas-core-final-acceptance/v1");
  assert.equal(acceptance.status,"PASS");
  assert.equal(acceptance.p14_content_implementation_in_scope,false);
  assert.deepEqual(acceptance.criteria.map((x)=>x.id),expectedCriteria);
  for(const criterion of acceptance.criteria){
    assert.equal(criterion.status,"PASS",criterion.id);
    assert.ok(Array.isArray(criterion.evidence_paths)&&criterion.evidence_paths.length>0,criterion.id);
    for(const evidencePath of criterion.evidence_paths){
      assert.equal(fs.existsSync(path.join(root,evidencePath)),true,`${criterion.id}: ${evidencePath}`);
    }
  }
});

test("Unit 17 historical acceptance keeps P14 out of scope without pinning current P13 lifecycle status",()=>{
  const byId=new Map(requirements.requirements.map((x)=>[x.id,x]));
  assert.equal(acceptance.status,"PASS");
  assert.equal(acceptance.p14_content_implementation_in_scope,false);
  for(const id of ["ATLAS-RQ-0223","ATLAS-RQ-0226","ATLAS-RQ-0227","ATLAS-RQ-0228","ATLAS-RQ-0229","ATLAS-RQ-0230"]){
    const item=byId.get(id);
    assert.ok(item,id);
    assert.ok(item.evidence_paths?.length,id);
  }
  const lifecycle=byId.get("ATLAS-RQ-0223");
  for(const evidence of [
    "server/atlas-current-schema-reconstruction.js",
    "server/atlas-reviewed-candidate-registration-service.js",
    "tests/core-reentry-reviewed-candidate-production-lifecycle.test.mjs"
  ]) assert.ok(lifecycle.evidence_paths.includes(evidence), evidence);
  for(const id of ["ATLAS-RQ-0224","ATLAS-RQ-0225"]) assert.equal(byId.get(id)?.status,"PENDING",id);
});

test("Unit 17 canonical ownership has no multi-writer, shadow-writer, or duplicate-truth debt",()=>{
  const allowed=new Set(["single_writer","derived_single_writer","repository_source_authority"]);
  for(const resource of ownership.resources){
    assert.ok(allowed.has(resource.status),`${resource.id}: ${resource.status}`);
    assert.deepEqual(resource.shadow_writers,[],resource.id);
    assert.equal(resource.remediation_unit,null,resource.id);
  }
});

test("Unit 17 Runtime contract is deterministic, fail-closed, and requires no manual semantic refresh",()=>{
  assert.equal(runtime.principles.runtime_never_fabricates_unknown_temporal_values,true);
  assert.equal(runtime.principles.public_runtime_reads_must_use_projection,true);
  assert.equal(runtime.principles.runtime_publication_is_retry_idempotent,true);
  assert.equal(runtime.principles.activation_is_atomic_with_projection_commit,true);
  assert.equal(runtime.principles.manual_semantic_refresh_trigger_required,false);
  assert.equal(runtime.readiness.year_zero_forbidden,true);
  assert.equal(runtime.readiness.provenance_required,true);
  assert.equal(runtime.snapshot.live_authoring_join_from_runtime_forbidden,true);
  assert.equal(runtime.snapshot.input_fingerprint,"sha256 canonical-json");
  assert.equal(runtime.snapshot.output_fingerprint,"sha256 canonical-json");
});

test("Unit 17 registration obligations close review, authoring, companion, compile, and read-back debt",()=>{
  const keys=new Set(obligations.obligations.map((x)=>x.key));
  for(const key of [
    "person.life_status_review",
    "person.identity_historicity_review",
    "person.timeline_disposition_review",
    "person.representative_domain_review",
    "person.external_reference_namuwiki_review",
    "person.evidence_source_basis",
    "activity.temporal_boundaries",
    "activity.source_provenance",
    "polity.continuity_identity_resolution",
    "polity.spatial_disposition",
    "publication.authoring_verified",
    "publication.compile_disposition",
    "publication.runtime_verified"
  ]) assert.ok(keys.has(key),key);
  const coordinator=read("server/atlas-registration-coordinator.js");
  for(const phase of ["authoring","authoring_readback","companion_writers","compile","runtime_readback"]) assert.match(coordinator,new RegExp(`['"]${phase}['"]`));
  assert.match(coordinator,/REGISTRATION_OBLIGATIONS_INCOMPLETE/);
});

test("Unit 17 blocks retired-identity resurrection and AI-only authoritative approval",()=>{
  const polity=read("server/atlas-polity-identity-resolver.js");
  assert.match(polity,/POLITY_RETIRED_IDENTITY_REVIEW_REQUIRED/);
  assert.match(polity,/matched_by:"retired_redirect"/);
  assert.match(polity,/create_allowed:false/);
  const reviewed=read("server/atlas-reviewed-candidate-service.js");
  assert.match(reviewed,/REVIEW_APPROVAL_REQUIRES_HUMAN_AUTHORIZATION/);
  assert.match(reviewed,/REVIEW_REVISION_IMMUTABLE/);
  assert.match(reviewed,/REGISTRATION_REQUIRES_HUMAN_APPROVED_REVISION/);
});

test("Unit 17 execution governance has no task-level single-writer dependency",()=>{
  assert.match(execution,/work is parallel; authority is singular; commit is resource-scoped/i);
  assert.match(execution,/a work unit is a completion boundary, not a concurrency boundary/i);
  assert.match(execution,/one completed work unit is the maximum unit of execution for one user turn/i);
  assert.match(execution,/RESOURCE PREFLIGHT/);
});

test("Re-entry final acceptance uses one current-schema reconstruction authority",()=>{
  const reconstruction=read("server/atlas-current-schema-reconstruction.js");
  const stage2=read("server/atlas-stage2-schema-release.js");
  assert.match(reconstruction,/CURRENT_SCHEMA_PHASES/);
  assert.match(reconstruction,/\"baseline\",[\s\S]*\"correction\",[\s\S]*\"stage2\",[\s\S]*\"p9\",[\s\S]*\"authoring\"/);
  assert.match(reconstruction,/async function reconstructCurrentSchema/);
  assert.doesNotMatch(stage2,/function applyStage2SchemaRelease\s*\(/);
  assert.equal(fs.existsSync(path.join(root,"scripts/rehearse-stage2-p5-additive-schema-release.mjs")),false);
});

test("Re-entry final acceptance exercises reviewed candidate through canonical Human Authoring",()=>{
  const registration=read("server/atlas-reviewed-candidate-registration-service.js");
  const handler=read("server/atlas-reviewed-candidate-handler.js");
  const api=read("api/atlas-authoring.js");
  assert.match(registration,/begin isolation level serializable/);
  assert.match(registration,/applyPreparedWithinTransaction/);
  assert.match(registration,/CANDIDATE_REVIEW_REVISION_STALE/);
  assert.match(registration,/allowLegacyNamuWikiOmission:false/);
  assert.match(registration,/exactLedgerSnapshot/);
  assert.match(handler,/CANDIDATE_REVIEW_HUMAN_AUTH_REQUIRED/);
  assert.match(api,/surface === "reviewed-candidate"/);
  assert.equal(fs.existsSync(path.join(root,"tests/core-reentry-reviewed-candidate-production-lifecycle.test.mjs")),true);
});

