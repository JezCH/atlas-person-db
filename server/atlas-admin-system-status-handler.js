"use strict";

const { createPostgresClient } = require("./atlas-postgres-client.js");
const { requireEnv, sessionSecret, parseCookies, verifySessionToken, SESSION_COOKIE } = require("./atlas-session-auth.js");
const { SYSTEM_STATUS_SCHEMA, inspectAdminSystemStatus } = require("./atlas-admin-system-status-service.js");

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function sessionAuthorized(req, { env = process.env, now = Date.now() } = {}) {
  const secret = sessionSecret(env);
  const cookies = parseCookies(req?.headers || {});
  return verifySessionToken(cookies[SESSION_COOKIE], secret, { now });
}

function createAdminSystemStatusHandler({
  env = process.env,
  clientFactory = createPostgresClient,
  inspectStatus = inspectAdminSystemStatus,
  now = () => Date.now()
} = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");
  if (typeof inspectStatus !== "function") throw new Error("inspectStatus is required");

  return async function handler(req, res) {
    if (String(req?.method || "GET").toUpperCase() !== "GET") {
      return sendJson(res, 405, { ok: false, schema: SYSTEM_STATUS_SCHEMA, code: "METHOD_NOT_ALLOWED" });
    }

    try {
      sessionSecret(env);
    } catch (error) {
      console.error("ATLAS Admin system status authorization configuration error", error);
      return sendJson(res, 503, { ok: false, schema: SYSTEM_STATUS_SCHEMA, code: "SERVER_CONFIGURATION_ERROR" });
    }

    if (!sessionAuthorized(req, { env, now: now() })) {
      return sendJson(res, 401, { ok: false, schema: SYSTEM_STATUS_SCHEMA, code: "ADMIN_SESSION_REQUIRED" });
    }

    let databaseUrl;
    try {
      databaseUrl = requireEnv(env, "SUPABASE_DB_URL");
    } catch (error) {
      console.error("ATLAS Admin system status database configuration error", error);
      return sendJson(res, 503, { ok: false, schema: SYSTEM_STATUS_SCHEMA, code: "DATABASE_NOT_CONFIGURED" });
    }

    let client = null;
    try {
      client = await clientFactory(databaseUrl, { env });
      const status = await inspectStatus({ client, env });
      return sendJson(res, 200, {
        ok: true,
        auth_method: "session",
        ...status
      });
    } catch (error) {
      console.error("ATLAS Admin system status failed", error);
      return sendJson(res, client ? 500 : 503, {
        ok: false,
        schema: SYSTEM_STATUS_SCHEMA,
        code: client ? "ADMIN_SYSTEM_STATUS_FAILED" : "DATABASE_UNAVAILABLE"
      });
    } finally {
      if (client && typeof client.end === "function") {
        try { await client.end(); } catch {}
      }
    }
  };
}

module.exports = Object.freeze({
  SYSTEM_STATUS_SCHEMA,
  sendJson,
  sessionAuthorized,
  createAdminSystemStatusHandler
});
