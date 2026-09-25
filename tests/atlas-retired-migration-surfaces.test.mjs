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
    "server/atlas-p11-baseline-b-capture-handler.js",
    "server/atlas-p11-baseline-b-github-oidc.js"
  ]) {
    assert.equal(fs.existsSync(path.join(root, relativePath)), false, `retired live surface must stay absent: ${relativePath}`);
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
