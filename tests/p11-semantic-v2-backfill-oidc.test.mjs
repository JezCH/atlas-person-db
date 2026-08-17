import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const auditOidc = require("../server/atlas-audit-github-oidc.js");
const correctionOidc = require("../server/atlas-correction-github-oidc.js");

const SHA = "a".repeat(40);
const P11_WORKFLOW_REF = "JezCH/atlas-person-db/.github/workflows/atlas-p11-semantic-v2-backfill.yml@refs/heads/main";
const UNRELATED_WORKFLOW_REF = "JezCH/atlas-person-db/.github/workflows/atlas-authoring-apply.yml@refs/heads/main";

function trustPayload(oidc, workflowRef, eventName = "push") {
  return {
    iss: oidc.ISSUER,
    aud: oidc.EXPECTED_AUDIENCE,
    repository: oidc.EXPECTED_REPOSITORY,
    repository_id: oidc.EXPECTED_REPOSITORY_ID,
    ref: oidc.EXPECTED_REF,
    workflow_ref: workflowRef,
    environment: "production",
    event_name: eventName,
    sha: SHA
  };
}

function assertBoundedP11Trust(oidc) {
  assert.deepEqual(oidc.ALLOWED_WORKFLOW_REFS, [oidc.EXPECTED_WORKFLOW_REF, P11_WORKFLOW_REF]);
  assert.deepEqual(oidc.ALLOWED_EVENTS, ["push", "workflow_dispatch"]);
  assert.equal(Object.isFrozen(oidc.ALLOWED_WORKFLOW_REFS), true);
  assert.equal(Object.isFrozen(oidc.ALLOWED_EVENTS), true);
  assert.doesNotThrow(() => oidc.verifyTrustClaims(trustPayload(oidc, oidc.EXPECTED_WORKFLOW_REF), SHA));
  assert.doesNotThrow(() => oidc.verifyTrustClaims(trustPayload(oidc, P11_WORKFLOW_REF), SHA));
  assert.doesNotThrow(() => oidc.verifyTrustClaims(trustPayload(oidc, P11_WORKFLOW_REF, "workflow_dispatch"), SHA));
  assert.throws(() => oidc.verifyTrustClaims(trustPayload(oidc, UNRELATED_WORKFLOW_REF), SHA), /GITHUB_OIDC_WORKFLOW_MISMATCH/);
  assert.throws(() => oidc.verifyTrustClaims(trustPayload(oidc, P11_WORKFLOW_REF, "pull_request"), SHA), /GITHUB_OIDC_EVENT_MISMATCH/);
}

test("P11 semantic-v2 backfill is explicitly authorized for the audit audience without widening workflow or event boundaries", () => {
  assertBoundedP11Trust(auditOidc);
});

test("P11 semantic-v2 backfill is explicitly authorized for the correction audience without widening workflow or event boundaries", () => {
  assertBoundedP11Trust(correctionOidc);
});
