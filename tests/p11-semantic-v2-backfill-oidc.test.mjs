import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const auditOidc = require("../server/atlas-audit-github-oidc.js");
const correctionOidc = require("../server/atlas-correction-github-oidc.js");

const SHA = "a".repeat(40);
const P11_WORKFLOW_REF = "JezCH/atlas-person-db/.github/workflows/atlas-p11-semantic-v2-backfill.yml@refs/heads/main";
const UNRELATED_WORKFLOW_REF = "JezCH/atlas-person-db/.github/workflows/atlas-authoring-apply.yml@refs/heads/main";

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

test("P11 semantic-v2 backfill is explicitly authorized for the audit audience without widening the workflow boundary", () => {
  assert.deepEqual(auditOidc.ALLOWED_WORKFLOW_REFS, [auditOidc.EXPECTED_WORKFLOW_REF, P11_WORKFLOW_REF]);
  assert.equal(Object.isFrozen(auditOidc.ALLOWED_WORKFLOW_REFS), true);
  assert.doesNotThrow(() => auditOidc.verifyTrustClaims(trustPayload(auditOidc, auditOidc.EXPECTED_WORKFLOW_REF), SHA));
  assert.doesNotThrow(() => auditOidc.verifyTrustClaims(trustPayload(auditOidc, P11_WORKFLOW_REF), SHA));
  assert.throws(() => auditOidc.verifyTrustClaims(trustPayload(auditOidc, UNRELATED_WORKFLOW_REF), SHA), /GITHUB_OIDC_WORKFLOW_MISMATCH/);
});

test("P11 semantic-v2 backfill is explicitly authorized for the correction audience without widening the workflow boundary", () => {
  assert.deepEqual(correctionOidc.ALLOWED_WORKFLOW_REFS, [correctionOidc.EXPECTED_WORKFLOW_REF, P11_WORKFLOW_REF]);
  assert.equal(Object.isFrozen(correctionOidc.ALLOWED_WORKFLOW_REFS), true);
  assert.doesNotThrow(() => correctionOidc.verifyTrustClaims(trustPayload(correctionOidc, correctionOidc.EXPECTED_WORKFLOW_REF), SHA));
  assert.doesNotThrow(() => correctionOidc.verifyTrustClaims(trustPayload(correctionOidc, P11_WORKFLOW_REF), SHA));
  assert.throws(() => correctionOidc.verifyTrustClaims(trustPayload(correctionOidc, UNRELATED_WORKFLOW_REF), SHA), /GITHUB_OIDC_WORKFLOW_MISMATCH/);
});
