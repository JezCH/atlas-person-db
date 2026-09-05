import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { ISSUER } = require("../server/atlas-github-oidc.js");
const {
  EXPECTED_AUDIENCE,
  EXPECTED_WORKFLOW_REF,
  verifyPersonDomainTrustClaims
} = require("../server/atlas-person-domain-github-oidc.js");
const { authorizePersonDomainPost } = require("../server/atlas-person-domain-handler.js");

const SHA = "a".repeat(40);
function trustedPayload(overrides = {}) {
  return {
    iss:ISSUER,
    aud:EXPECTED_AUDIENCE,
    repository:"JezCH/atlas-person-db",
    repository_id:"1319427399",
    ref:"refs/heads/main",
    workflow_ref:EXPECTED_WORKFLOW_REF,
    environment:"production",
    event_name:"push",
    sha:SHA,
    ...overrides
  };
}

test("Person domain OIDC policy accepts only the dedicated production main workflow", () => {
  assert.doesNotThrow(() => verifyPersonDomainTrustClaims(trustedPayload(), SHA));
  assert.doesNotThrow(() => verifyPersonDomainTrustClaims(trustedPayload({ event_name:"workflow_dispatch" }), SHA));

  const rejected = [
    [{ aud:"atlas-person-db-authoring" }, /GITHUB_OIDC_AUDIENCE_MISMATCH/],
    [{ repository:"someone/else" }, /GITHUB_OIDC_REPOSITORY_MISMATCH/],
    [{ repository_id:"1" }, /GITHUB_OIDC_REPOSITORY_ID_MISMATCH/],
    [{ ref:"refs/heads/feature" }, /GITHUB_OIDC_REF_MISMATCH/],
    [{ workflow_ref:"JezCH/atlas-person-db/.github/workflows/other.yml@refs/heads/main" }, /GITHUB_OIDC_WORKFLOW_MISMATCH/],
    [{ environment:"preview" }, /GITHUB_OIDC_ENVIRONMENT_MISMATCH/],
    [{ event_name:"pull_request" }, /GITHUB_OIDC_EVENT_MISMATCH/],
    [{ sha:"b".repeat(40) }, /GITHUB_OIDC_SHA_MISMATCH/]
  ];
  for (const [override, pattern] of rejected) {
    assert.throws(() => verifyPersonDomainTrustClaims(trustedPayload(override), SHA), pattern);
  }
});

test("Person domain POST can use dedicated OIDC when legacy admin auth is not configured", async () => {
  const seen = [];
  const auth = await authorizePersonDomainPost({
    req:{ method:"POST", headers:{ authorization:"Bearer github-oidc-token" } },
    body:{ workflow_sha:SHA },
    env:{},
    oidcVerifier:async (token, { expectedSha }) => {
      seen.push({ token, expectedSha });
      return trustedPayload();
    }
  });
  assert.equal(auth.authorized, true);
  assert.equal(auth.mode, "github_oidc");
  assert.deepEqual(seen, [{ token:"github-oidc-token", expectedSha:SHA }]);
});

test("Person domain POST rejects invalid OIDC instead of falling through", async () => {
  const auth = await authorizePersonDomainPost({
    req:{ method:"POST", headers:{ authorization:"Bearer invalid-token" } },
    body:{ workflow_sha:SHA },
    env:{},
    oidcVerifier:async () => { throw new Error("GITHUB_OIDC_SIGNATURE_INVALID"); }
  });
  assert.equal(auth.authorized, false);
  assert.equal(auth.mode, "github_oidc_rejected");
  assert.equal(auth.auth_not_configured, undefined);
});
