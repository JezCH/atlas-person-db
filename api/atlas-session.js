"use strict";

const {
  SESSION_COOKIE,
  DEFAULT_SESSION_TTL_MS,
  requireEnv,
  sessionSecret,
  safeTokenEqual,
  parseCookies,
  issueSessionToken,
  verifySessionToken,
  sessionCookie,
  clearSessionCookie
} = require("../server/atlas-session-auth.js");

function parseBody(raw) {
  if (raw == null || raw === "") return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    const error = new Error("invalid JSON body");
    error.status = 400;
    throw error;
  }
}

function sendJson(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.end(JSON.stringify(body));
}

function createSessionHandler({
  env = process.env,
  now = () => Date.now(),
  nonceFactory,
  ttlMs = DEFAULT_SESSION_TTL_MS
} = {}) {
  return async function handler(req, res) {
    const method = String(req?.method || "GET").toUpperCase();

    try {
      const signingSecret = sessionSecret(env);
      const cookies = parseCookies(req?.headers || {});

      if (method === "GET") {
        const authenticated = verifySessionToken(cookies[SESSION_COOKIE], signingSecret, { now: now() });
        sendJson(res, 200, { ok: true, authenticated });
        return;
      }

      if (method === "DELETE") {
        sendJson(res, 200, { ok: true, authenticated: false }, { "set-cookie": clearSessionCookie() });
        return;
      }

      if (method !== "POST") {
        sendJson(res, 405, { ok: false, error: "method not allowed" }, { allow: "GET, POST, DELETE" });
        return;
      }

      const expectedPassword = requireEnv(env, "ATLAS_ADMIN_PASSWORD");
      const body = parseBody(req?.body);
      const providedPassword = String(body?.password || "");
      if (!safeTokenEqual(providedPassword, expectedPassword)) {
        sendJson(res, 401, { ok: false, error: "invalid administrator credentials" });
        return;
      }

      const issuedAt = now();
      const token = issueSessionToken(signingSecret, {
        now: issuedAt,
        ttlMs,
        ...(typeof nonceFactory === "function" ? { nonce: nonceFactory() } : {})
      });
      sendJson(
        res,
        200,
        { ok: true, authenticated: true, expires_at: issuedAt + ttlMs },
        { "set-cookie": sessionCookie(token, { maxAgeSeconds: Math.floor(ttlMs / 1000) }) }
      );
    } catch (error) {
      const message = error?.message || String(error);
      if (/^[A-Z0-9_]+ is required$/.test(message)) {
        console.error("ATLAS session configuration error", error);
        sendJson(res, 503, { ok: false, code: "SERVER_CONFIGURATION_ERROR", error: "administrator session service is not configured" });
        return;
      }
      sendJson(res, Number(error?.status) || 500, { ok: false, error: message });
    }
  };
}

async function handler(req, res) {
  return createSessionHandler({ env: process.env })(req, res);
}

module.exports = handler;
module.exports.createSessionHandler = createSessionHandler;
module.exports.parseBody = parseBody;
module.exports.sendJson = sendJson;
