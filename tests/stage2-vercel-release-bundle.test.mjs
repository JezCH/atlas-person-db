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
    assert.match(component.sql_path, /^db\/proposals\//, `P5 component ${index + 1} SQL must remain under db/proposals/`);
    assertExistingRepoPath(component.sql_path, `P5 component ${index + 1} SQL`);
  }
});

test("Train 2 runtime references exist under the bundled Stage 2 path", () => {
  const releasePath = "stage2/releases/train2-data-p9.v1.json";
  assertExistingRepoPath(releasePath, "Train 2 release manifest");
  const release = readJson(releasePath);
  const referencedPaths = [
    [release.entity_prerequisite, "entity prerequisite"],
    [release.role_prerequisite, "role prerequisite"],
    ...((release.p7_authoring || []).map((value, index) => [value, `P7 authoring ${index + 1}`])),
    ...((release.correction_plans || []).map((value, index) => [value, `correction plan ${index + 1}`])),
    [release.p9_release_plan, "P9 release plan"]
  ].filter(([value]) => typeof value === "string" && value.length > 0);

  assert.ok(referencedPaths.length > 4);
  for (const [relativePath, label] of referencedPaths) {
    assert.match(relativePath, /^stage2\//, `${label} must remain under stage2/`);
    assertExistingRepoPath(relativePath, label);
  }
});
