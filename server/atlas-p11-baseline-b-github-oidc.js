"use strict";

const crypto = require("node:crypto");

const ISSUER = "https://token.actions.githubusercontent.com";
const JWKS_URL = `${ISSUER}/.well-known/jwks`;
const EXPECTED_AUDIENCE = "atlas-person-db-p11-baseline-b-capture";
const EXPECTED_REPOSITORY = "JezCH/atlas-person-db";
const EXPECTED_REPOSITORY_ID = "1319427399";
const EXPECTED_REF = "refs/heads/main";
const EXPECTED_WORKFLOW_REF = "JezCH/atlas-person-db/.github/workflows/atlas-p11-baseline-b-capture.yml@refs/heads/main";
const SHA_RE = /^[0-9a-f]{40}$/i;

let jwksCache = null;
let jwksCachedAt = 0;
const JWKS_TTL_MS = 5 * 60 * 1000;

function decodeJsonPart(value) {
  try {
    return JSON.parse(Buffer.from(String(value || ""), "base64url").toString("utf8"));
  } catch {
    throw new Error("P11_CAPTURE_OIDC_MALFORMED_TOKEN");
  }
}

async function fetchJwks({ fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  if (jwksCache && now() - jwksCachedAt < JWKS_TTL_MS) return jwksCache;
  if (typeof fetchImpl !== "function") throw new Error("P11_CAPTURE_OIDC_FETCH_UNAVAILABLE");
  const response = await fetchImpl(JWKS_URL, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`P11_CAPTURE_OIDC_JWKS_HTTP_${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body?.keys) || body.keys.length === 0) throw new Error("P11_CAPTURE_OIDC_JWKS_INVALID");
  jwksCache = body.keys;
  jwksCachedAt = now();
  return jwksCache;
}

function verifyTemporalClaims(payload, nowSeconds) {
  const skew = 30;
  if (!Number.isFinite(payload?.exp) || payload.exp < nowSeconds - skew) throw new Error("P11_CAPTURE_OIDC_EXPIRED");
  if (Number.isFinite(payload?.nbf) && payload.nbf > nowSeconds + skew) throw new Error("P11_CAPTURE_OIDC_NOT_ACTIVE");
  if (Number.isFinite(payload?.iat) && payload.iat > nowSeconds + skew) throw new Error("P11_CAPTURE_OIDC_IAT_IN_FUTURE");
}

function verifyTrustClaims(payload, expectedSha = null) {
  if (payload?.iss !== ISSUER) throw new Error("P11_CAPTURE_OIDC_ISSUER_MISMATCH");
  const audiences = Array.isArray(payload?.aud) ? payload.aud : [payload?.aud];
  if (!audiences.includes(EXPECTED_AUDIENCE)) throw new Error("P11_CAPTURE_OIDC_AUDIENCE_MISMATCH");
  if (payload?.repository !== EXPECTED_REPOSITORY || String(payload?.repository_id || "") !== EXPECTED_REPOSITORY_ID) {
    throw new Error("P11_CAPTURE_OIDC_REPOSITORY_MISMATCH");
  }
  if (payload?.ref !== EXPECTED_REF || payload?.workflow_ref !== EXPECTED_WORKFLOW_REF) {
    throw new Error("P11_CAPTURE_OIDC_WORKFLOW_MISMATCH");
  }
  if (payload?.environment !== "production" || payload?.event_name !== "workflow_dispatch") {
    throw new Error("P11_CAPTURE_OIDC_CONTEXT_MISMATCH");
  }

  const actualSha = String(payload?.sha || "").trim().toLowerCase();
  if (!SHA_RE.test(actualSha)) throw new Error("P11_CAPTURE_OIDC_SHA_INVALID");
  if (expectedSha !== null && expectedSha !== undefined) {
    const normalizedExpected = String(expectedSha || "").trim().toLowerCase();
    if (!SHA_RE.test(normalizedExpected)) throw new Error("P11_CAPTURE_EXPECTED_SHA_INVALID");
    if (actualSha !== normalizedExpected) throw new Error("P11_CAPTURE_OIDC_SHA_MISMATCH");
  }
}

async function verifyGitHubActionsOidc(token, { expectedSha = null, fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("P11_CAPTURE_OIDC_MALFORMED_TOKEN");
  const header = decodeJsonPart(parts[0]);
  const payload = decodeJsonPart(parts[1]);
  if (header?.alg !== "RS256" || !header?.kid) throw new Error("P11_CAPTURE_OIDC_UNSUPPORTED_HEADER");
  const jwk = (await fetchJwks({ fetchImpl, now })).find((key) => key?.kid === header.kid && key?.kty === "RSA");
  if (!jwk) throw new Error("P11_CAPTURE_OIDC_SIGNING_KEY_NOT_FOUND");
  let publicKey;
  try {
    publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  } catch {
    throw new Error("P11_CAPTURE_OIDC_SIGNING_KEY_INVALID");
  }
  const signingInput = Buffer.from(`${parts[0]}.${parts[1]}`);
  const signature = Buffer.from(parts[2], "base64url");
  if (!crypto.verify("RSA-SHA256", signingInput, publicKey, signature)) throw new Error("P11_CAPTURE_OIDC_SIGNATURE_INVALID");
  verifyTemporalClaims(payload, Math.floor(now() / 1000));
  verifyTrustClaims(payload, expectedSha);
  return Object.freeze(payload);
}

function resetJwksCacheForTests() {
  jwksCache = null;
  jwksCachedAt = 0;
}

module.exports = Object.freeze({
  verifyGitHubActionsOidc,
  verifyTrustClaims,
  verifyTemporalClaims,
  resetJwksCacheForTests,
  ISSUER,
  JWKS_URL,
  EXPECTED_AUDIENCE,
  EXPECTED_REPOSITORY,
  EXPECTED_REPOSITORY_ID,
  EXPECTED_REF,
  EXPECTED_WORKFLOW_REF,
  SHA_RE
});
