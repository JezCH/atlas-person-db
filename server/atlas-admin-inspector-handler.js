"use strict";

const { createPostgresClient } = require("./atlas-postgres-client.js");
const { requireEnv, sessionSecret, parseCookies, verifySessionToken, SESSION_COOKIE } = require("./atlas-session-auth.js");
const { SUPPORTED_KINDS, readAdminObject } = require("./atlas-admin-inspector-service.js");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INSPECTOR_SCHEMA = "atlas-admin-inspector/v1";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function singleQueryValue(req, key) {
  const direct = req?.query?.[key];
  if (Array.isArray(direct)) return direct.length === 1 ? String(direct[0] || "").trim() : "__INVALID_MULTI__";
  if (direct != null) return String(direct).trim();
  const rawUrl = String(req?.url || "").trim();
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl, "http://atlas.local");
    if (!parsed.searchParams.has(key)) return null;
    const values = parsed.searchParams.getAll(key);
    return values.length === 1 ? String(values[0] || "").trim() : "__INVALID_MULTI__";
  } catch {
    return null;
  }
}

function sessionAuthorized(req, { env = process.env, now = Date.now() } = {}) {
  const secret = sessionSecret(env);
  const cookies = parseCookies(req?.headers || {});
  return verifySessionToken(cookies[SESSION_COOKIE], secret, { now });
}

function createAdminInspectorHandler({
  env = process.env,
  clientFactory = createPostgresClient,
  readObject = readAdminObject,
  now = () => Date.now()
} = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");
  if (typeof readObject !== "function") throw new Error("readObject is required");

  return async function handler(req, res) {
    if (String(req?.method || "GET").toUpperCase() !== "GET") {
      return json(res, 405, { ok: false, schema: INSPECTOR_SCHEMA, code: "METHOD_NOT_ALLOWED" });
    }

    let databaseUrl;
    try {
      databaseUrl = requireEnv(env, "SUPABASE_DB_URL");
      sessionSecret(env);
    } catch (error) {
      console.error("ATLAS Admin inspector configuration error", error);
      return json(res, 503, { ok: false, schema: INSPECTOR_SCHEMA, code: "SERVER_CONFIGURATION_ERROR" });
    }

    let authorized = false;
    try {
      authorized = sessionAuthorized(req, { env, now: now() });
    } catch (error) {
      console.error("ATLAS Admin inspector authorization error", error);
      return json(res, 503, { ok: false, schema: INSPECTOR_SCHEMA, code: "SERVER_CONFIGURATION_ERROR" });
    }
    if (!authorized) {
      return json(res, 401, { ok: false, schema: INSPECTOR_SCHEMA, code: "ADMIN_SESSION_REQUIRED" });
    }

    const kind = singleQueryValue(req, "kind");
    const id = singleQueryValue(req, "id");

    if (kind == null && id == null) {
      return json(res, 200, {
        ok: true,
        schema: INSPECTOR_SCHEMA,
        mode: "capabilities",
        auth_method: "session",
        supported_kinds: SUPPORTED_KINDS
      });
    }

    if (!kind || kind === "__INVALID_MULTI__" || !SUPPORTED_KINDS.includes(kind)) {
      return json(res, 400, {
        ok: false,
        schema: INSPECTOR_SCHEMA,
        code: "INVALID_OBJECT_KIND",
        supported_kinds: SUPPORTED_KINDS
      });
    }
    if (!id || id === "__INVALID_MULTI__" || !UUID_PATTERN.test(id)) {
      return json(res, 400, { ok: false, schema: INSPECTOR_SCHEMA, code: "INVALID_OBJECT_ID" });
    }

    let client = null;
    try {
      client = await clientFactory(databaseUrl, { env });
      const result = await readObject({ client, kind, id });
      if (!result) {
        return json(res, 404, { ok: false, schema: INSPECTOR_SCHEMA, code: "OBJECT_NOT_FOUND", kind, id });
      }
      return json(res, 200, {
        ok: true,
        schema: INSPECTOR_SCHEMA,
        mode: "object",
        auth_method: "session",
        ...result
      });
    } catch (error) {
      console.error("ATLAS Admin inspector failed", error);
      return json(res, client ? 500 : 503, {
        ok: false,
        schema: INSPECTOR_SCHEMA,
        code: client ? "ADMIN_INSPECTOR_FAILED" : "DATABASE_UNAVAILABLE"
      });
    } finally {
      if (client && typeof client.end === "function") {
        try { await client.end(); } catch {}
      }
    }
  };
}

module.exports = Object.freeze({
  UUID_PATTERN,
  INSPECTOR_SCHEMA,
  singleQueryValue,
  sessionAuthorized,
  createAdminInspectorHandler
});
