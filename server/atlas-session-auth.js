"use strict";

const crypto = require("node:crypto");

const SESSION_COOKIE = "atlas_admin_session";
const SESSION_VERSION = 1;
const DEFAULT_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function requireEnv(env, name) {
  const value = String(env?.[name] || "").trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function optionalEnv(env, name) {
  const value = String(env?.[name] || "").trim();
  return value || null;
}

function sessionSecret(env = process.env) {
  return optionalEnv(env, "ATLAS_SESSION_SECRET") || requireEnv(env, "ATLAS_MUTATION_TOKEN");
}

function safeTokenEqual(provided, expected) {
  if (!provided || !expected) return false;
  const left = Buffer.from(String(provided));
  const right = Buffer.from(String(expected));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function bearerToken(headers = {}) {
  const raw = headers.authorization || headers.Authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(String(raw).trim());
  return match ? match[1] : null;
}

function parseCookies(headers = {}) {
  const raw = headers.cookie || headers.Cookie || "";
  const cookies = {};
  for (const segment of String(raw).split(";")) {
    const index = segment.indexOf("=");
    if (index <= 0) continue;
    const key = segment.slice(0, index).trim();
    const value = segment.slice(index + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }
  return cookies;
}

function sessionSignature(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function issueSessionToken(secret, {
  now = Date.now(),
  ttlMs = DEFAULT_SESSION_TTL_MS,
  nonce = crypto.randomBytes(16).toString("base64url")
} = {}) {
  if (!secret) throw new Error("session signing secret is required");
  const issuedAt = Number(now);
  const expiresAt = issuedAt + Number(ttlMs);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt <= issuedAt) {
    throw new Error("valid session lifetime is required");
  }
  const payload = Buffer.from(JSON.stringify({
    v: SESSION_VERSION,
    iat: issuedAt,
    exp: expiresAt,
    nonce: String(nonce)
  })).toString("base64url");
  return `${payload}.${sessionSignature(payload, secret)}`;
}

function verifySessionToken(token, secret, { now = Date.now() } = {}) {
  if (!token || !secret) return false;
  const parts = String(token).split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const expected = sessionSignature(parts[0], secret);
  if (!safeTokenEqual(parts[1], expected)) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return payload?.v === SESSION_VERSION
      && Number.isFinite(Number(payload.iat))
      && Number.isFinite(Number(payload.exp))
      && Number(payload.iat) <= Number(now)
      && Number(payload.exp) > Number(now)
      && typeof payload.nonce === "string"
      && payload.nonce.length > 0;
  } catch {
    return false;
  }
}

function sessionCookie(token, { maxAgeSeconds = Math.floor(DEFAULT_SESSION_TTL_MS / 1000) } = {}) {
  return `${SESSION_COOKIE}=${encodeURIComponent(String(token))}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.max(0, Math.floor(Number(maxAgeSeconds) || 0))}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function createHeaderAuthorizer({ env = process.env } = {}) {
  const expected = requireEnv(env, "ATLAS_MUTATION_TOKEN");
  return async function authorize(request = {}) {
    const provided = bearerToken(request.headers || {});
    return safeTokenEqual(provided, expected)
      ? { authorized: true }
      : { authorized: false, reason: "unauthorized" };
  };
}

function createMutationAuthorizer({ env = process.env, now = () => Date.now() } = {}) {
  const mutationSecret = requireEnv(env, "ATLAS_MUTATION_TOKEN");
  const browserSessionSecret = sessionSecret(env);
  return async function authorize(request = {}) {
    const headers = request.headers || {};
    const provided = bearerToken(headers);
    if (safeTokenEqual(provided, mutationSecret)) return { authorized: true, method: "bearer" };

    const cookies = parseCookies(headers);
    if (verifySessionToken(cookies[SESSION_COOKIE], browserSessionSecret, { now: now() })) {
      return { authorized: true, method: "session" };
    }
    return { authorized: false, reason: "unauthorized" };
  };
}

module.exports = Object.freeze({
  SESSION_COOKIE,
  SESSION_VERSION,
  DEFAULT_SESSION_TTL_MS,
  requireEnv,
  optionalEnv,
  sessionSecret,
  safeTokenEqual,
  bearerToken,
  parseCookies,
  issueSessionToken,
  verifySessionToken,
  sessionCookie,
  clearSessionCookie,
  createHeaderAuthorizer,
  createMutationAuthorizer
});
