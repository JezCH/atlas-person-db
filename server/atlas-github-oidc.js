"use strict";

const crypto = require("node:crypto");

const ISSUER = "https://token.actions.githubusercontent.com";
const JWKS_URL = `${ISSUER}/.well-known/jwks`;
const EXPECTED_AUDIENCE = "atlas-person-db-authoring";
const EXPECTED_REPOSITORY = "JezCH/atlas-person-db";
const EXPECTED_REPOSITORY_ID = "1319427399";
const EXPECTED_REF = "refs/heads/main";
const EXPECTED_WORKFLOW_REF = "JezCH/atlas-person-db/.github/workflows/atlas-authoring-apply.yml@refs/heads/main";
const ALLOWED_EVENTS = new Set(["push", "workflow_dispatch"]);
const AUTHORING_POLICY = Object.freeze({
  audience: EXPECTED_AUDIENCE,
  repository: EXPECTED_REPOSITORY,
  repositoryId: EXPECTED_REPOSITORY_ID,
  ref: EXPECTED_REF,
  workflowRef: EXPECTED_WORKFLOW_REF,
  environment: "production",
  allowedEvents: ALLOWED_EVENTS
});

let jwksCache = null;
let jwksCachedAt = 0;
const JWKS_TTL_MS = 5 * 60 * 1000;

function decodeJsonPart(value) {
  try {
    return JSON.parse(Buffer.from(String(value || ""), "base64url").toString("utf8"));
  } catch {
    throw new Error("GITHUB_OIDC_MALFORMED_TOKEN");
  }
}

function requireString(value, code) {
  const text = String(value || "").trim();
  if (!text) throw new Error(code);
  return text;
}

async function fetchJwks({ fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  if (jwksCache && now() - jwksCachedAt < JWKS_TTL_MS) return jwksCache;
  if (typeof fetchImpl !== "function") throw new Error("GITHUB_OIDC_FETCH_UNAVAILABLE");
  const response = await fetchImpl(JWKS_URL, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`GITHUB_OIDC_JWKS_HTTP_${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body?.keys) || body.keys.length === 0) throw new Error("GITHUB_OIDC_JWKS_INVALID");
  jwksCache = body.keys;
  jwksCachedAt = now();
  return jwksCache;
}

function verifyTemporalClaims(payload, nowSeconds) {
  const skew = 30;
  if (!Number.isFinite(payload?.exp) || payload.exp < nowSeconds - skew) throw new Error("GITHUB_OIDC_EXPIRED");
  if (Number.isFinite(payload?.nbf) && payload.nbf > nowSeconds + skew) throw new Error("GITHUB_OIDC_NOT_ACTIVE");
  if (Number.isFinite(payload?.iat) && payload.iat > nowSeconds + skew) throw new Error("GITHUB_OIDC_IAT_IN_FUTURE");
}

function normalizePolicy(policy = {}) {
  const allowedEvents = policy.allowedEvents instanceof Set
    ? policy.allowedEvents
    : new Set(Array.isArray(policy.allowedEvents) ? policy.allowedEvents : []);
  return Object.freeze({
    audience: requireString(policy.audience, "GITHUB_OIDC_POLICY_AUDIENCE_REQUIRED"),
    repository: requireString(policy.repository, "GITHUB_OIDC_POLICY_REPOSITORY_REQUIRED"),
    repositoryId: requireString(policy.repositoryId, "GITHUB_OIDC_POLICY_REPOSITORY_ID_REQUIRED"),
    ref: requireString(policy.ref, "GITHUB_OIDC_POLICY_REF_REQUIRED"),
    workflowRef: requireString(policy.workflowRef, "GITHUB_OIDC_POLICY_WORKFLOW_REQUIRED"),
    environment: requireString(policy.environment, "GITHUB_OIDC_POLICY_ENVIRONMENT_REQUIRED"),
    allowedEvents
  });
}

function verifyTrustClaimsWithPolicy(payload, expectedSha, policy) {
  const expected = normalizePolicy(policy);
  if (payload?.iss !== ISSUER) throw new Error("GITHUB_OIDC_ISSUER_MISMATCH");
  const audiences = Array.isArray(payload?.aud) ? payload.aud : [payload?.aud];
  if (!audiences.includes(expected.audience)) throw new Error("GITHUB_OIDC_AUDIENCE_MISMATCH");
  if (payload?.repository !== expected.repository) throw new Error("GITHUB_OIDC_REPOSITORY_MISMATCH");
  if (String(payload?.repository_id || "") !== expected.repositoryId) throw new Error("GITHUB_OIDC_REPOSITORY_ID_MISMATCH");
  if (payload?.ref !== expected.ref) throw new Error("GITHUB_OIDC_REF_MISMATCH");
  if (payload?.workflow_ref !== expected.workflowRef) throw new Error("GITHUB_OIDC_WORKFLOW_MISMATCH");
  if (payload?.environment !== expected.environment) throw new Error("GITHUB_OIDC_ENVIRONMENT_MISMATCH");
  if (!expected.allowedEvents.has(payload?.event_name)) throw new Error("GITHUB_OIDC_EVENT_MISMATCH");
  if (payload?.sha !== expectedSha) throw new Error("GITHUB_OIDC_SHA_MISMATCH");
}

function verifyTrustClaims(payload, expectedSha) {
  return verifyTrustClaimsWithPolicy(payload, expectedSha, AUTHORING_POLICY);
}

async function verifyGitHubActionsOidcWithPolicy(token, { expectedSha, policy, fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  const jwt = requireString(token, "GITHUB_OIDC_TOKEN_REQUIRED");
  const sha = requireString(expectedSha, "GITHUB_OIDC_EXPECTED_SHA_REQUIRED");
  const parts = jwt.split(".");
  if (parts.length !== 3) throw new Error("GITHUB_OIDC_MALFORMED_TOKEN");

  const header = decodeJsonPart(parts[0]);
  const payload = decodeJsonPart(parts[1]);
  if (header?.alg !== "RS256" || !header?.kid) throw new Error("GITHUB_OIDC_UNSUPPORTED_HEADER");

  const keys = await fetchJwks({ fetchImpl, now });
  const jwk = keys.find((key) => key?.kid === header.kid && key?.kty === "RSA");
  if (!jwk) throw new Error("GITHUB_OIDC_SIGNING_KEY_NOT_FOUND");

  let publicKey;
  try {
    publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  } catch {
    throw new Error("GITHUB_OIDC_SIGNING_KEY_INVALID");
  }

  const signingInput = Buffer.from(`${parts[0]}.${parts[1]}`);
  const signature = Buffer.from(parts[2], "base64url");
  if (!crypto.verify("RSA-SHA256", signingInput, publicKey, signature)) throw new Error("GITHUB_OIDC_SIGNATURE_INVALID");

  const nowSeconds = Math.floor(now() / 1000);
  verifyTemporalClaims(payload, nowSeconds);
  verifyTrustClaimsWithPolicy(payload, sha, policy);
  return Object.freeze(payload);
}

async function verifyGitHubActionsOidc(token, options = {}) {
  return verifyGitHubActionsOidcWithPolicy(token, { ...options, policy: AUTHORING_POLICY });
}

function resetJwksCacheForTests() {
  jwksCache = null;
  jwksCachedAt = 0;
}

module.exports = Object.freeze({
  verifyGitHubActionsOidc,
  verifyGitHubActionsOidcWithPolicy,
  verifyTrustClaims,
  verifyTrustClaimsWithPolicy,
  verifyTemporalClaims,
  normalizePolicy,
  resetJwksCacheForTests,
  AUTHORING_POLICY,
  ISSUER,
  JWKS_URL,
  EXPECTED_AUDIENCE,
  EXPECTED_REPOSITORY,
  EXPECTED_REPOSITORY_ID,
  EXPECTED_REF,
  EXPECTED_WORKFLOW_REF
});
