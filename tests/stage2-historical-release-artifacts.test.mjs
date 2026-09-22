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

test("historical Train 2 evidence retains reviewed selection and prerequisite artifacts", () => {
  const releasePath = "stage2/releases/train2-data-p9.v1.json";
  assertExistingRepoPath(releasePath, "Train 2 release manifest");
  const release = readJson(releasePath);

  assert.equal(release.prerequisite_schema_release_id, "p5_stage2_additive_schema_20260813_v1");
  assert.match(release.selection?.p7_execution_directory || "", /^stage2\//);
  assertExistingRepoPath(release.selection.p7_execution_directory, "Train 2 P7 execution directory");
  assert.equal(release.selection?.p7_execution_name_pattern, "p7-*-execution.v1.json");

  assertExistingRepoPath("stage2/integration/p6-effective-prebinding-closure.v1.json", "P6 closure prerequisite");
  assertExistingRepoPath("stage2/releases/p9-semantic-key-v2-cutover.v1.json", "P9 cutover release plan");
});
