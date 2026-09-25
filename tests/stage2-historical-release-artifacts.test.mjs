import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

function assertExistingRepoPath(relativePath, label) {
  assert.equal(typeof relativePath, "string", `${label} must be a path string`);
  assert.equal(path.isAbsolute(relativePath), false, `${label} must stay repository-relative`);
  assert.equal(fs.existsSync(path.join(root, relativePath)), true, `${label} is missing: ${relativePath}`);
}

test("historical P5 schema release evidence retains its six reviewed SQL components", () => {
  const releasePath = "stage2/releases/p5-additive-schema-release.v1.json";
  assertExistingRepoPath(releasePath, "P5 release manifest");
  const release = readJson(releasePath);
  assert.equal(release.components?.length, 6);

  for (const [index, component] of release.components.entries()) {
    assert.match(component.path, /^db\/proposals\/.*\.sql$/, `P5 component ${index + 1} SQL must remain under db/proposals/`);
    assertExistingRepoPath(component.path, `P5 component ${index + 1} SQL`);
  }
});

test("historical Train 2 evidence is preserved as passive reviewed artifacts", () => {
  const releasePath = "stage2/releases/train2-data-p9.v1.json";
  assertExistingRepoPath(releasePath, "Train 2 release manifest");
  const release = readJson(releasePath);

  assert.equal(release.prerequisite_schema_release_id, "p5_stage2_additive_schema_20260813_v1");
  assert.match(release.selection?.p7_execution_directory || "", /^stage2\//);
  assertExistingRepoPath(release.selection.p7_execution_directory, "Train 2 P7 execution directory");
  assert.equal(release.selection?.p7_execution_name_pattern, "p7-*-execution.v1.json");
  assert.equal(release.safety?.production_mutation_authorized, false);

  const closure = readJson("stage2/integration/p6-effective-prebinding-closure.v1.json");
  assert.equal(closure.closure?.effective_correction_v2_activity_count, 54);
  assert.equal(closure.closure?.remaining_effective_prebinding_activity_count, 0);
  assert.equal(closure.closure?.latest_batch, 18);
  assert.equal(closure.closure?.production_mutation_authorized, false);

  const rolePrerequisite = readJson("stage2/execution/p6-reviewed-role-prerequisites.v1.json");
  assert.equal(rolePrerequisite.rules?.production_mutation_authorized, false);
  assert.equal(rolePrerequisite.roles?.length, 1);
  assert.equal(rolePrerequisite.roles?.[0]?.role?.id, "c48b2b1b-ff24-54ec-ba48-d2e00db0872d");
  assert.equal(rolePrerequisite.rules?.literal_uuid_insert_only, true);
  assert.equal(rolePrerequisite.rules?.activity_mutation_forbidden, true);

  const p9 = readJson("stage2/releases/p9-semantic-key-v2-cutover.v1.json");
  assert.equal(p9.schema, "atlas-stage2-p9-semantic-key-v2-cutover/v1");
  assert.equal(p9.status, "BRANCH_ONLY_P9_SEMANTIC_KEY_V2_GLOBAL_CUTOVER_COMPLETE_NO_PRODUCTION_MUTATION");
  assert.equal(p9.prerequisite?.p8_status, "ZERO_KNOWN_BLOCKERS");
  assert.equal(p9.prerequisite?.p8_effective_blockers, 0);
  assert.equal(p9.canonical_activity_identity?.module, "server/atlas-activity-semantic-key-v2.js");
  assertExistingRepoPath(p9.canonical_activity_identity.module, "P9 current semantic-key module");
  assert.equal(p9.canonical_activity_identity?.version, "atlas-activity-semantic-key/v2");
  assert.ok(p9.canonical_activity_identity?.dimensions?.includes("relation_type_id"));
  assert.ok(p9.canonical_activity_identity?.dimensions?.includes("activity_start_full_temporal_boundary_without_certainty"));
  assert.ok(p9.canonical_activity_identity?.dimensions?.includes("activity_end_full_temporal_boundary_without_certainty"));
  assert.ok(p9.canonical_activity_identity?.explicitly_non_identity?.includes("activity_start_certainty"));
  assert.ok(p9.canonical_activity_identity?.explicitly_non_identity?.includes("activity_end_certainty"));
  assert.equal(p9.consumers?.authoring_manifest_v2_new_write, "v2_native");
  assert.equal(p9.consumers?.legacy_name_based_mutation_create_update_import, "disabled_fail_closed");
  assert.equal(p9.consumers?.immutable_activity_id_delete, "allowed");
  assert.equal(p9.consumers?.duplicate_review_relationship_projection, "v2_relation_full_temporal");
  assert.equal(p9.consumers?.relationship_reconciliation, "v2_relation_full_temporal");
  assert.equal(p9.database_rehearsal?.replacement_index, "person_politics_v2_stage2_semantic_identity_uq");
  assert.equal(p9.database_rehearsal?.retired_index, "atlas_v2.person_politics_v2_null_role_semantic_uidx");
  assert.equal(p9.database_rehearsal?.production_applied, false);
  assertExistingRepoPath(p9.database_rehearsal.path, "P9 historical DB rehearsal SQL");
  assert.equal(p9.rules?.historical_authoring_assertions_preserved, true);
  assert.equal(p9.rules?.production_mutation_authorized, false);

  assertExistingRepoPath("docs/stage2/PRODUCTION_TRAIN2_TRANSPORT_2026-08-14.md", "Train 2 transport history");
});

test("reviewed P7 Train 2 plan evidence stays passive and schema-valid", () => {
  const executionDir = path.join(root, "stage2/execution");
  const files = fs.readdirSync(executionDir).filter((name) => /^p7-.*-execution\.v1\.json$/.test(name)).sort();
  assert.ok(files.length >= 20, "reviewed P7 historical execution evidence unexpectedly missing");
  for (const name of files) {
    const plan = readJson(`stage2/execution/${name}`);
    assert.equal(plan.schema, "atlas-stage2-correction-v2-execution-plan/v1", `historical P7 plan schema drift: ${name}`);
    assert.equal(plan.execution_rules?.production_mutation_authorized, false, `historical P7 plan self-authorized: ${name}`);
  }
});

test("retired Train 2 executable helpers stay out of the active repository surface", () => {
  for (const relativePath of [
    "server/atlas-stage2-reviewed-role-authoring.js",
    "scripts/build-stage2-train2-correction-plan-list.mjs",
    "scripts/rehearse-stage2-train2-live-schema-parity.mjs",
    "docs/stage2/.train2-ci-trigger",
    "tests/stage2-train2-historical-artifacts.test.mjs"
  ]) {
    assert.equal(fs.existsSync(path.join(root, relativePath)), false, `retired Train 2 executable residue returned: ${relativePath}`);
  }
});

test("historical reviewed-authoring manifests remain passive, literal, and non-authorizing", () => {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const p5 = readJson("stage2/execution/p5-reviewed-identity-source-authoring.v1.json");
  assert.equal(p5.schema, "atlas-stage2-p5-reviewed-identity-source-authoring/v1");
  assert.equal(p5.status, "REVIEWED_EXACT_ROWS_BRANCH_ONLY_NO_PRODUCTION_MUTATION");
  assert.equal(p5.rules?.literal_uuid_insert_only, true);
  assert.equal(p5.rules?.name_or_url_identity_resolution_forbidden, true);
  assert.equal(p5.rules?.activity_mutation_forbidden, true);
  assert.equal(p5.rules?.territory_geometry_mutation_forbidden, true);
  assert.equal(p5.rules?.production_mutation_authorized, false);
  assert.equal(p5.polities?.length, 17);
  assert.equal(p5.sources?.length, 19);
  assert.equal(p5.result?.new_polity_rows, 17);
  assert.equal(p5.result?.new_polity_name_rows, 17);
  assert.equal(p5.result?.new_source_rows, 19);
  assert.equal(p5.result?.activity_rows_mutated, 0);
  assert.equal(p5.result?.production_mutation_authorized, false);

  const p5PolityIds = new Set();
  const p5NameIds = new Set();
  for (const item of p5.polities) {
    assert.match(item.polity?.id || "", uuid);
    assert.match(item.preferred_name?.id || "", uuid);
    assert.equal(item.preferred_name?.polity_id, item.polity?.id);
    p5PolityIds.add(item.polity.id.toLowerCase());
    p5NameIds.add(item.preferred_name.id.toLowerCase());
  }
  assert.equal(p5PolityIds.size, 17);
  assert.equal(p5NameIds.size, 17);

  const p5SourceIds = new Set();
  const p5SourceKeys = new Set();
  for (const item of p5.sources) {
    assert.match(item.row?.id || "", uuid);
    assert.equal(item.row?.source_key, item.candidate_key);
    assert.equal(item.row?.sha256, null);
    assert.equal(item.row?.bytes, null);
    p5SourceIds.add(item.row.id.toLowerCase());
    p5SourceKeys.add(item.candidate_key);
  }
  assert.equal(p5SourceIds.size, 19);
  assert.equal(p5SourceKeys.size, 19);

  const governance = readJson("stage2/authoring/p7-reviewed-governance-contexts.v1.json");
  assert.equal(governance.schema, "atlas-stage2-p7-reviewed-governance-contexts/v1");
  assert.equal(governance.status, "REVIEWED_LITERAL_UUID_ROWS_BRANCH_ONLY_NO_PRODUCTION_MUTATION");
  assert.equal(governance.rules?.literal_uuid_insert_only, true);
  assert.equal(governance.rules?.runtime_name_resolution_forbidden, true);
  assert.equal(governance.rules?.activity_mutation_forbidden, true);
  assert.equal(governance.rules?.territory_geometry_mutation_forbidden, true);
  assert.equal(governance.rules?.production_mutation_authorized, false);
  assert.equal(governance.contexts?.length, 1);
  assert.equal(governance.contexts?.[0]?.names?.length, 3);
  assert.match(governance.contexts?.[0]?.row?.id || "", uuid);
  for (const name of governance.contexts[0].names) {
    assert.match(name.id || "", uuid);
    assert.equal(name.governance_context_id, governance.contexts[0].row.id);
  }
  assert.deepEqual(governance.result, {
    context_count: 1,
    name_count: 3,
    production_mutation_authorized: false
  });

  const polity = readJson("stage2/authoring/p7-charles-de-gaulle-polity.v1.json");
  assert.equal(polity.schema, "atlas-stage2-p7-reviewed-polities/v1");
  assert.equal(polity.status, "REVIEWED_LITERAL_UUID_ROWS_BRANCH_ONLY_NO_PRODUCTION_MUTATION");
  assert.equal(polity.rules?.literal_uuid_insert_only, true);
  assert.equal(polity.rules?.runtime_name_resolution_forbidden, true);
  assert.equal(polity.rules?.activity_mutation_forbidden, true);
  assert.equal(polity.rules?.territory_geometry_mutation_forbidden, true);
  assert.equal(polity.rules?.production_mutation_authorized, false);
  assert.equal(polity.polities?.length, 1);
  assert.equal(polity.polities?.[0]?.names?.length, 3);
  assert.match(polity.polities?.[0]?.row?.id || "", uuid);
  for (const name of polity.polities[0].names) {
    assert.match(name.id || "", uuid);
    assert.equal(name.polity_id, polity.polities[0].row.id);
  }
  assert.deepEqual(polity.result, {
    polity_count: 1,
    name_count: 3,
    production_mutation_authorized: false
  });

  const solomonSources = readJson("stage2/authoring/p7-solomon-chronology-sources.v1.json");
  assert.equal(solomonSources.schema, "atlas-stage2-p7-reviewed-relation-sources/v1");
  assert.equal(solomonSources.status, "REVIEWED_LITERAL_UUID_ROWS_BRANCH_ONLY_NO_PRODUCTION_MUTATION");
  assert.equal(solomonSources.rules?.literal_uuid_insert_only, true);
  assert.equal(solomonSources.rules?.runtime_title_or_url_resolution_forbidden, true);
  assert.equal(solomonSources.rules?.bibliographic_hash_and_bytes_must_be_null, true);
  assert.equal(solomonSources.rules?.traditional_chronology_must_not_be_promoted_to_exact_fact, true);
  assert.equal(solomonSources.rules?.maximal_biblical_territory_must_not_be_inferred, true);
  assert.equal(solomonSources.rules?.production_mutation_authorized, false);
  assert.equal(solomonSources.sources?.length, 2);
  for (const item of solomonSources.sources) {
    assert.match(item.row?.id || "", uuid);
    assert.equal(item.row?.source_key, item.candidate_key);
    assert.equal(item.row?.sha256, null);
    assert.equal(item.row?.bytes, null);
  }
  assert.deepEqual(solomonSources.result, {
    source_count: 2,
    literal_uuid_count: 2,
    fake_materialized_hash_count: 0,
    production_mutation_authorized: false
  });
});

