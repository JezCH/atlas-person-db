import test from "node:test";
import assert from "node:assert/strict";
import {
  isSafeToSkipPath,
  shouldBuildForChangedPaths
} from "../scripts/vercel-ignore-build.mjs";

test("documentation, research evidence and integrity-only changes are safe to skip", () => {
  for (const file of [
    "README.md",
    "ATLAS_REQUIREMENTS.md",
    "docs/audits/example.md",
    "requirements/atlas-requirements.v1.json",
    "tests/atlas-correction-transport.test.mjs",
    "corrections/evidence/reviewed.json",
    "research/sengoku/notes.json",
    "migration/phase-8/reports/evidence.json",
    ".github/workflows/atlas-integrity.yml"
  ]) {
    assert.equal(isSafeToSkipPath(file), true, file);
  }
  assert.equal(shouldBuildForChangedPaths([
    "README.md",
    "docs/audits/example.md",
    "tests/atlas-correction-transport.test.mjs"
  ]), false);
});

test("runtime, schema, release-operation and production-workflow changes always build", () => {
  for (const file of [
    "api/atlas-correction-apply.js",
    "server/atlas-correction-apply-handler.js",
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

test("one deployment-relevant path makes a mixed commit build", () => {
  assert.equal(shouldBuildForChangedPaths([
    "docs/research/sengoku.md",
    "requirements/atlas-requirements.v1.json",
    "server/atlas-correction-apply-handler.js"
  ]), true);
});

test("empty diff does not request a build", () => {
  assert.equal(shouldBuildForChangedPaths([]), false);
  assert.equal(shouldBuildForChangedPaths(["", "./"]), false);
});
