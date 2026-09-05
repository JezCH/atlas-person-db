"use strict";

const {
  verifyGitHubActionsOidcWithPolicy,
  verifyTrustClaimsWithPolicy,
  EXPECTED_REPOSITORY,
  EXPECTED_REPOSITORY_ID,
  EXPECTED_REF
} = require("./atlas-github-oidc.js");

const EXPECTED_AUDIENCE = "atlas-person-domain-api";
const EXPECTED_WORKFLOW_REF = "JezCH/atlas-person-db/.github/workflows/atlas-person-domain-apply.yml@refs/heads/main";
const PERSON_DOMAIN_POLICY = Object.freeze({
  audience: EXPECTED_AUDIENCE,
  repository: EXPECTED_REPOSITORY,
  repositoryId: EXPECTED_REPOSITORY_ID,
  ref: EXPECTED_REF,
  workflowRef: EXPECTED_WORKFLOW_REF,
  environment: "production",
  allowedEvents: new Set(["push", "workflow_dispatch"])
});

function verifyPersonDomainTrustClaims(payload, expectedSha) {
  return verifyTrustClaimsWithPolicy(payload, expectedSha, PERSON_DOMAIN_POLICY);
}

async function verifyPersonDomainGithubOidc(token, options = {}) {
  return verifyGitHubActionsOidcWithPolicy(token, { ...options, policy: PERSON_DOMAIN_POLICY });
}

module.exports = Object.freeze({
  verifyPersonDomainGithubOidc,
  verifyPersonDomainTrustClaims,
  PERSON_DOMAIN_POLICY,
  EXPECTED_AUDIENCE,
  EXPECTED_WORKFLOW_REF
});
