"use strict";

const {
  verifyGitHubActionsOidcWithPolicy,
  verifyTrustClaimsWithPolicy,
  EXPECTED_REPOSITORY,
  EXPECTED_REPOSITORY_ID,
  EXPECTED_REF
} = require("./atlas-github-oidc.js");

const EXPECTED_AUDIENCE = "atlas-person-db-live-person-hard-delete";
const EXPECTED_WORKFLOW_REF = "JezCH/atlas-person-db/.github/workflows/atlas-oneoff-live-person-hard-delete.yml@refs/heads/main";
const PERSON_HARD_DELETE_POLICY = Object.freeze({
  audience: EXPECTED_AUDIENCE,
  repository: EXPECTED_REPOSITORY,
  repositoryId: EXPECTED_REPOSITORY_ID,
  ref: EXPECTED_REF,
  workflowRef: EXPECTED_WORKFLOW_REF,
  environment: "production",
  allowedEvents: new Set(["push"])
});

function verifyPersonHardDeleteTrustClaims(payload, expectedSha) {
  return verifyTrustClaimsWithPolicy(payload, expectedSha, PERSON_HARD_DELETE_POLICY);
}

async function verifyPersonHardDeleteGithubOidc(token, options = {}) {
  return verifyGitHubActionsOidcWithPolicy(token, { ...options, policy: PERSON_HARD_DELETE_POLICY });
}

module.exports = Object.freeze({
  verifyPersonHardDeleteGithubOidc,
  verifyPersonHardDeleteTrustClaims,
  PERSON_HARD_DELETE_POLICY,
  EXPECTED_AUDIENCE,
  EXPECTED_WORKFLOW_REF
});
