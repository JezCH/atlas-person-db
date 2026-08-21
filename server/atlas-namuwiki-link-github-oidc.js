"use strict";

const crypto = require("node:crypto");

const ISSUER = "https://token.actions.githubusercontent.com";
const JWKS_URL = `${ISSUER}/.well-known/jwks`;
const EXPECTED_AUDIENCE = "atlas-person-db-namuwiki-link";
const EXPECTED_REPOSITORY = "JezCH/atlas-person-db";
const EXPECTED_REPOSITORY_ID = "1319427399";
const EXPECTED_REF = "refs/heads/main";
const EXPECTED_WORKFLOW_REF = "JezCH/atlas-person-db/.github/workflows/atlas-namuwiki-link.yml@refs/heads/main";
const EXPECTED_ENVIRONMENT = "production";
const EXPECTED_EVENT_NAME = "issue_comment";
const EXPECTED_ACTOR = "JezCH";
const EXPECTED_SUB = "repo:JezCH/atlas-person-db:environment:production";

let cache = null;
let cachedAt = 0;

function decode(value) {
  try {
    return JSON.parse(Buffer.from(String(value || ""), "base64url").toString("utf8"));
  } catch {
    throw new Error("NAMUWIKI_LINK_OIDC_MALFORMED_TOKEN");
  }
}

async function keys(fetchImpl = globalThis.fetch, now = Date.now) {
  if (cache && now() - cachedAt < 300000) return cache;
  const response = await fetchImpl(JWKS_URL, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`NAMUWIKI_LINK_OIDC_JWKS_HTTP_${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body?.keys) || !body.keys.length) throw new Error("NAMUWIKI_LINK_OIDC_JWKS_INVALID");
  cache = body.keys;
  cachedAt = now();
  return cache;
}

function verifyClaims(payload, expectedSha, nowSeconds) {
  if (payload?.iss !== ISSUER) throw new Error("NAMUWIKI_LINK_OIDC_ISSUER_MISMATCH");
  const aud = Array.isArray(payload?.aud) ? payload.aud : [payload?.aud];
  if (!aud.includes(EXPECTED_AUDIENCE)) throw new Error("NAMUWIKI_LINK_OIDC_AUDIENCE_MISMATCH");
  if (payload?.repository !== EXPECTED_REPOSITORY || String(payload?.repository_id || "") !== EXPECTED_REPOSITORY_ID) {
    throw new Error("NAMUWIKI_LINK_OIDC_REPOSITORY_MISMATCH");
  }
  if (payload?.ref !== EXPECTED_REF || payload?.workflow_ref !== EXPECTED_WORKFLOW_REF) {
    throw new Error("NAMUWIKI_LINK_OIDC_WORKFLOW_MISMATCH");
  }
  if (payload?.environment !== EXPECTED_ENVIRONMENT || payload?.event_name !== EXPECTED_EVENT_NAME) {
    throw new Error("NAMUWIKI_LINK_OIDC_CONTEXT_MISMATCH");
  }
  if (payload?.actor !== EXPECTED_ACTOR) throw new Error("NAMUWIKI_LINK_OIDC_ACTOR_MISMATCH");
  if (payload?.sub !== EXPECTED_SUB) throw new Error("NAMUWIKI_LINK_OIDC_SUBJECT_MISMATCH");
  if (payload?.sha !== expectedSha) throw new Error("NAMUWIKI_LINK_OIDC_SHA_MISMATCH");
  if (!Number.isFinite(payload?.exp) || payload.exp < nowSeconds - 30) throw new Error("NAMUWIKI_LINK_OIDC_EXPIRED");
  if (Number.isFinite(payload?.nbf) && payload.nbf > nowSeconds + 30) throw new Error("NAMUWIKI_LINK_OIDC_NOT_ACTIVE");
}

async function verifyGitHubActionsOidc(token, { expectedSha, fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("NAMUWIKI_LINK_OIDC_MALFORMED_TOKEN");
  const header = decode(parts[0]);
  const payload = decode(parts[1]);
  if (header?.alg !== "RS256" || !header?.kid) throw new Error("NAMUWIKI_LINK_OIDC_UNSUPPORTED_HEADER");
  const jwk = (await keys(fetchImpl, now)).find((key) => key?.kid === header.kid && key?.kty === "RSA");
  if (!jwk) throw new Error("NAMUWIKI_LINK_OIDC_SIGNING_KEY_NOT_FOUND");
  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const verified = crypto.verify(
    "RSA-SHA256",
    Buffer.from(`${parts[0]}.${parts[1]}`),
    publicKey,
    Buffer.from(parts[2], "base64url")
  );
  if (!verified) throw new Error("NAMUWIKI_LINK_OIDC_SIGNATURE_INVALID");
  verifyClaims(payload, String(expectedSha || "").toLowerCase(), Math.floor(now() / 1000));
  return Object.freeze(payload);
}

function resetForTests() {
  cache = null;
  cachedAt = 0;
}

module.exports = Object.freeze({
  verifyGitHubActionsOidc,
  verifyClaims,
  resetForTests,
  ISSUER,
  JWKS_URL,
  EXPECTED_AUDIENCE,
  EXPECTED_REPOSITORY,
  EXPECTED_REPOSITORY_ID,
  EXPECTED_REF,
  EXPECTED_WORKFLOW_REF,
  EXPECTED_ENVIRONMENT,
  EXPECTED_EVENT_NAME,
  EXPECTED_ACTOR,
  EXPECTED_SUB
});
