import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const auditOidc = require("../server/atlas-audit-github-oidc.js");
const correctionOidc = require("../server/atlas-correction-github-oidc.js");
const root = process.cwd();
const SHA = "a".repeat(40);
const RETIRED_P11_WORKFLOW_REF =
  "JezCH/atlas-person-db/.github/workflows/atlas-p11-semantic-v2-backfill.yml@refs/heads/main";

function trustPayload(oidc, workflowRef) {
  return {
    iss: oidc.ISSUER,
    aud: oidc.EXPECTED_AUDIENCE,
    repository: oidc.EXPECTED_REPOSITORY,
    repository_id: oidc.EXPECTED_REPOSITORY_ID,
    ref: oidc.EXPECTED_REF,
    workflow_ref: workflowRef,
    environment: "production",
    event_name: "push",
    sha: SHA
  };
}

test("retired migration workflows have no live repository execution surface", () => {
  for (const relativePath of [
    ".github/workflows/atlas-p10-release-launcher.yml",
    ".github/workflows/atlas-p11-baseline-b-capture.yml",
    ".github/workflows/atlas-p11-semantic-v2-backfill.yml",
    ".github/workflows/atlas-stage2-train2-live-parity.yml",
    ".github/workflows/atlas-p11-baseline-b-readiness.yml",
    "scripts/rehearse-p11-baseline-b-readiness.mjs",
    "server/atlas-p11-baseline-b-production-service.js",
    "server/atlas-baseline-b.js",
    "tests/p11-baseline-b-digest.test.mjs",
    "tests/p11-baseline-b-readiness.test.mjs",
    "tests/p11-baseline-b-schema-coverage.test.mjs",
    "tests/atlas-p11-reviewed-null-relation-constraint.test.mjs",
    "server/atlas-p11-baseline-b-capture-handler.js",
    "server/atlas-p11-baseline-b-github-oidc.js",
    "server/atlas-stage2-reviewed-role-authoring.js",
    "scripts/build-stage2-train2-correction-plan-list.mjs",
    "scripts/rehearse-stage2-train2-live-schema-parity.mjs",
    "docs/stage2/.train2-ci-trigger",
    "server/atlas-stage2-correction-ledger-compat.js",
    "tests/stage2-correction-ledger-compat.test.mjs",
    "scripts/build-p11-semantic-v2-backfill-execution.mjs",
    "tests/p11-current-delta-backfill.test.mjs",
    "tests/p11-semantic-v2-backfill-execution.test.mjs",
    "scripts/build-stage2-p5-reviewed-identity-source-authoring.mjs",
    "scripts/rehearse-stage2-p5-reviewed-entity-authoring.mjs",
    "server/atlas-stage2-reviewed-entity-authoring.js",
    "server/atlas-stage2-reviewed-governance-authoring.js",
    "server/atlas-stage2-reviewed-polity-authoring.js",
    "server/atlas-stage2-reviewed-source-authoring.js",
    "tests/atlas-stage2-reviewed-governance-authoring.test.mjs",
    "tests/atlas-stage2-reviewed-polity-authoring.test.mjs",
    "tests/atlas-stage2-reviewed-source-authoring.test.mjs"
  ]) {
    assert.equal(fs.existsSync(path.join(root, relativePath)), false, `retired live surface must stay absent: ${relativePath}`);
  }

  for (const historicalEvidence of [
    "stage2/releases/p11-semantic-v2-backfill-release.v1.json",
    "stage2/contracts/p11-reviewed-semantic-v2-exceptions.v1.json"
  ]) {
    assert.equal(fs.existsSync(path.join(root, historicalEvidence)), true, `historical evidence missing: ${historicalEvidence}`);
  }

  const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  assert.equal(
    vercel.rewrites.some((row) => row.source === "/api/atlas-p11-baseline-b-capture"),
    false
  );

  const auditApi = fs.readFileSync(path.join(root, "api/atlas-audit-inventory.js"), "utf8");
  assert.doesNotMatch(auditApi, /p11-baseline-b-capture|createP11BaselineBCaptureHandler/);
});

test("retired P11 workflow can no longer mint audit or correction Production authority", () => {
  assert.deepEqual(auditOidc.ALLOWED_WORKFLOW_REFS, [
    auditOidc.EXPECTED_WORKFLOW_REF,
    auditOidc.SPATIAL_CANDIDATE_AUDIT_WORKFLOW_REF
  ]);
  assert.deepEqual(correctionOidc.ALLOWED_WORKFLOW_REFS, [
    correctionOidc.EXPECTED_WORKFLOW_REF
  ]);

  assert.throws(
    () => auditOidc.verifyTrustClaims(trustPayload(auditOidc, RETIRED_P11_WORKFLOW_REF), SHA),
    /GITHUB_OIDC_WORKFLOW_MISMATCH/
  );
  assert.throws(
    () => correctionOidc.verifyTrustClaims(trustPayload(correctionOidc, RETIRED_P11_WORKFLOW_REF), SHA),
    /GITHUB_OIDC_WORKFLOW_MISMATCH/
  );
});
