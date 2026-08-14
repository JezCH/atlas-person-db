import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const REQUIRED_INCLUDE_GLOB = "{stage2/**,db/proposals/**}";

function assertExistingRepoPath(relativePath, label) {
  assert.equal(typeof relativePath, "string", `${label} must be a path string`);
  assert.equal(path.isAbsolute(relativePath), false, `${label} must stay repository-relative`);
  assert.equal(fs.existsSync(path.join(root, relativePath)), true, `${label} is missing: ${relativePath}`);
}

test("Stage 2 Production release functions explicitly bundle dynamic release assets", () => {
  const vercel = readJson("vercel.json");
  for (const route of [
    "api/atlas-stage2-schema-release.js",
    "api/atlas-stage2-train2-release.js"
  ]) {
    assert.equal(vercel.functions?.[route]?.includeFiles, REQUIRED_INCLUDE_GLOB);
  }
});

test("P5 schema release runtime SQL references exist under the bundled proposal path", () => {
  const releasePath = "stage2/releases/p5-additive-schema-release.v1.json";
  assertExistingRepoPath(releasePath, "P5 release manifest");
  const release = readJson(releasePath);
  assert.equal(release.components?.length, 6);

  for (const [index, component] of release.components.entries()) {
    assert.match(component.path, /^db\/proposals\/.*\.sql$/, `P5 component ${index + 1} SQL must remain under db/proposals/`);
    assertExistingRepoPath(component.path, `P5 component ${index + 1} SQL`);
  }
});

test("Train 2 release selection and prerequisite assets remain inside the bundled Stage 2 tree", () => {
  const releasePath = "stage2/releases/train2-data-p9.v1.json";
  assertExistingRepoPath(releasePath, "Train 2 release manifest");
  const release = readJson(releasePath);

  assert.equal(release.prerequisite_schema_release_id, "p5_stage2_additive_schema_20260813_v1");
  assert.match(release.selection?.p7_execution_directory || "", /^stage2\//);
  assertExistingRepoPath(release.selection.p7_execution_directory, "Train 2 P7 execution directory");
  assert.equal(release.selection?.p7_execution_name_pattern, "p7-*-execution.v1.json");

  const p6Closure = "stage2/integration/p6-effective-prebinding-closure.v1.json";
  assertExistingRepoPath(p6Closure, "P6 closure prerequisite");
  const p9Release = "stage2/releases/p9-semantic-key-v2-cutover.v1.json";
  assertExistingRepoPath(p9Release, "P9 cutover release plan");
});
