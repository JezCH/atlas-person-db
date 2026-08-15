import test from "node:test";
import assert from "node:assert/strict";
import {
  isSafeToSkipPath,
  isAuthoringDataOnly,
  isSafeForDeployedAuthoringRuntimePath,
  requiresAuthoringRuntimeDeployment,
  shouldBuildForChangedPaths
} from "../scripts/vercel-ignore-build.mjs";

test("documentation, research evidence, reviewed authoring data and integrity-only changes are safe to skip", () => {
  for (const file of [
    "README.md",
    "ATLAS_REQUIREMENTS.md",
    "docs/audits/example.md",
    "requirements/atlas-requirements.v1.json",
    "tests/atlas-correction-transport.test.mjs",
    "corrections/evidence/reviewed.json",
    "research/sengoku/notes.json",
    "migration/phase-8/reports/evidence.json",
    "authoring/requests/new-person.json",
    ".github/workflows/atlas-integrity.yml"
  ]) {
    assert.equal(isSafeToSkipPath(file), true, file);
  }
  assert.equal(shouldBuildForChangedPaths([
    "README.md",
    "docs/audits/example.md",
    "tests/atlas-correction-transport.test.mjs",
    "authoring/requests/new-person.json"
  ]), false);
});

test("runtime, schema, release-operation and production-workflow changes always build", () => {
  for (const file of [
    "api/atlas-correction-apply.js",
    "server/atlas-correction-apply-handler.js",
    "server/atlas-authoring-apply-handler.js",
    "server/atlas-authoring-readiness.js",
    "db/migrations/20260812_correction_manifest_v1_1.sql",
    "app.js",
    "admin.html",
    "styles.css",
    "package.json",
    "package-lock.json",
    "vercel.json",
    "corrections/requests/stage2-r0-true-activity-duplicates.json",
    "corrections/intents/stage2-r1-muhammad-pre622-medina.json",
    ".github/workflows/atlas-correction-apply.yml",
    ".github/workflows/atlas-audit-inventory.yml",
    ".github/workflows/atlas-authoring-apply.yml",
    "migration/phase-8/scripts/live-operation.mjs"
  ]) {
    assert.equal(isSafeToSkipPath(file), false, file);
    assert.equal(shouldBuildForChangedPaths([file]), true, file);
  }
});

test("authoring runtime compatibility allows only proven non-authoring drift", () => {
  const safe = [
    ".github/workflows/atlas-p10-person-duplicate-v2-revalidation.yml",
    "authoring/requests/new-person.json",
    "scripts/rehearse-p10-person-duplicate-v2-revalidation.mjs",
    "tests/p10-person-duplicate-v2-revalidation.test.mjs",
    "server/atlas-duplicate-detector.js",
    "server/atlas-duplicate-review-service.js"
  ];
  for (const file of safe) assert.equal(isSafeForDeployedAuthoringRuntimePath(file), true, file);
  assert.equal(requiresAuthoringRuntimeDeployment(safe), false);
});

test("authoring runtime compatibility remains fail-closed for its actual dependency surface", () => {
  for (const file of [
    "api/atlas-authoring.js",
    "api/atlas-authoring-apply.js",
    "server/atlas-human-authoring-handler.js",
    "server/atlas-human-authoring-service.js",
    "server/atlas-authoring-apply-handler.js",
    "server/atlas-authoring-readiness.js",
    "server/atlas-postgres-client.js",
    "server/atlas-stage2-native-activity-service.js",
    "server/atlas-activity-semantic-key-v2.js",
    "db/migrations/20260812_stage2_schema.sql",
    "package.json",
    "package-lock.json",
    "vercel.json"
  ]) {
    assert.equal(isSafeForDeployedAuthoringRuntimePath(file), false, file);
    assert.equal(requiresAuthoringRuntimeDeployment([file]), true, file);
  }
});

test("ATLAS Authoring Apply keeps Vercel build policy strict while using its narrower compatibility boundary", () => {
  const before = process.env.GITHUB_WORKFLOW;
  try {
    process.env.GITHUB_WORKFLOW = "ATLAS Authoring Apply";
    assert.equal(shouldBuildForChangedPaths([
      "server/atlas-duplicate-detector.js",
      "server/atlas-duplicate-review-service.js",
      "scripts/rehearse-p10-person-duplicate-v2-revalidation.mjs",
      "authoring/requests/new-person.json"
    ]), false);
    assert.equal(shouldBuildForChangedPaths(["server/atlas-human-authoring-service.js"]), true);
  } finally {
    if (before == null) delete process.env.GITHUB_WORKFLOW;
    else process.env.GITHUB_WORKFLOW = before;
  }

  assert.equal(shouldBuildForChangedPaths(["server/atlas-duplicate-detector.js"]), true);
});

test("one deployment-relevant path makes a mixed commit build", () => {
  assert.equal(shouldBuildForChangedPaths([
    "authoring/requests/new-person.json",
    "docs/research/sengoku.md",
    "server/atlas-authoring-apply-handler.js"
  ]), true);
  assert.equal(isAuthoringDataOnly([
    "authoring/requests/new-person.json",
    "server/atlas-authoring-apply-handler.js"
  ]), false);
});

test("authoring request commits alone can be proven as data-only fast-skip commits", () => {
  const paths = [
    "authoring/requests/person-a.json",
    "authoring/requests/person-b.json"
  ];
  assert.equal(isAuthoringDataOnly(paths), true);
  assert.equal(shouldBuildForChangedPaths(paths), false);
  assert.equal(isAuthoringDataOnly(["authoring/README.md"]), false);
  assert.equal(isAuthoringDataOnly([]), false);
});

test("empty diff does not request a build", () => {
  assert.equal(shouldBuildForChangedPaths([]), false);
  assert.equal(shouldBuildForChangedPaths(["", "./"]), false);
});