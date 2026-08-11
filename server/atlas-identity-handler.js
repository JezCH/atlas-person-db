"use strict";

const { createIdentityService } = require("./atlas-identity-service.js");
const { createMutationAuthorizer } = require("./atlas-session-auth.js");

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function databaseUrl(env) {
  const value = String(env?.SUPABASE_DB_URL || "").trim();
  if (!/^postgres(?:ql)?:\/\//.test(value)) throw new Error("SUPABASE_DB_URL is required");
  return value;
}

function createIdentityHandler({ clientFactory, env = process.env, now } = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");

  return async function handler(req, res) {
    const method = String(req?.method || "POST").toUpperCase();
    if (method !== "POST") {
      sendJson(res, 405, { ok: false, error: "method not allowed" });
      return;
    }

    let authorize;
    let connectionString;
    try {
      connectionString = databaseUrl(env);
      authorize = createMutationAuthorizer({ env, ...(typeof now === "function" ? { now } : {}) });
    } catch (error) {
      console.error("ATLAS identity configuration error", error);
      sendJson(res, 503, { ok: false, code: "SERVER_CONFIGURATION_ERROR", error: "identity service is not configured" });
      return;
    }

    const auth = await authorize({ method, headers: req?.headers || {}, body: req?.body });
    if (!auth?.authorized) {
      sendJson(res, 401, { ok: false, error: auth?.reason || "unauthorized" });
      return;
    }

    const operation = String(req?.body?.operation || "").trim();
    const payload = req?.body?.payload;
    if (!operation || !payload || typeof payload !== "object" || Array.isArray(payload)) {
      sendJson(res, 400, { ok: false, error: "operation and object payload are required" });
      return;
    }

    let client = null;
    try {
      client = await clientFactory(connectionString);
      const service = createIdentityService({ client });
      const outcome = await service.mutate(operation, payload);
      sendJson(res, 200, { ok: true, outcome });
    } catch (error) {
      if (!client) {
        console.error("ATLAS identity database unavailable", error);
        sendJson(res, 503, { ok: false, code: "DATABASE_UNAVAILABLE", error: "database unavailable" });
        return;
      }
      const message = error?.message || String(error);
      const conflict = /(?:CONFLICT|COLLISION|REVIEW_REQUIRED)/.test(message);
      const invalid = /required|UNSUPPORTED/.test(message);
      sendJson(res, conflict ? 409 : invalid ? 400 : 500, {
        ok: false,
        code: conflict ? "IDENTITY_REVIEW_REQUIRED" : invalid ? "INVALID_IDENTITY_REQUEST" : "IDENTITY_MUTATION_FAILED",
        error: message
      });
    } finally {
      if (client && typeof client.end === "function") await client.end();
    }
  };
}

module.exports = Object.freeze({ createIdentityHandler, databaseUrl, sendJson });
