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
  assert.equal(p9.database_rehearsal?.replacement_index, "person_politics_v2_stage2_semantic_identity_uq");
  assert.equal(p9.database_rehearsal?.retired_index, "atlas_v2.person_politics_v2_null_role_semantic_uidx");
  assert.equal(p9.rules?.production_mutation_authorized, false);
  assert.ok(p9.canonical_activity_identity?.dimensions?.includes("relation_type_id"));
  assert.ok(p9.canonical_activity_identity?.dimensions?.includes("activity_start_full_temporal_boundary_without_certainty"));
  assert.ok(p9.canonical_activity_identity?.explicitly_non_identity?.includes("activity_start_certainty"));
  assert.ok(p9.canonical_activity_identity?.explicitly_non_identity?.includes("activity_end_certainty"));

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
