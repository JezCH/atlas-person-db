"use strict";

const { createPostgresClient } = require("./atlas-postgres-client.js");
const { createMutationAuthorizer } = require("./atlas-session-auth.js");
const { createPortraitBlobStorage } = require("./atlas-person-portrait-storage.js");
const { createPersonPortraitService } = require("./atlas-person-portrait-service.js");

const PORTRAIT_API_SCHEMA = "atlas-person-portrait/v1";

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function queryValue(req, key) {
  const direct = req?.query?.[key];
  if (Array.isArray(direct)) return direct.length === 1 ? String(direct[0] || "").trim() : "";
  if (direct != null) return String(direct).trim();
  try {
    const parsed = new URL(String(req?.url || ""), "http://atlas.local");
    return String(parsed.searchParams.get(key) || "").trim();
  } catch {
    return "";
  }
}

function parseBody(raw) {
  if (raw == null || raw === "") return {};
  if (Buffer.isBuffer(raw)) raw = raw.toString("utf8");
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(String(raw));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("object required");
    return parsed;
  } catch {
    const error = new Error("PERSON_PORTRAIT_JSON_INVALID");
    error.code = "PERSON_PORTRAIT_JSON_INVALID";
    throw error;
  }
}

function databaseUrl(env = process.env) {
  const value = String(env?.SUPABASE_DB_URL || "").trim();
  if (!value) {
    const error = new Error("PORTRAIT_DATABASE_NOT_CONFIGURED");
    error.code = "PORTRAIT_DATABASE_NOT_CONFIGURED";
    throw error;
  }
  return value;
}

function statusForError(error) {
  const code = String(error?.code || error?.message || "");
  if (code === "PERSON_PORTRAIT_TARGET_NOT_FOUND" || code === "PERSON_PORTRAIT_NOT_FOUND") return 404;
  if (code === "PORTRAIT_BLOB_STORAGE_NOT_CONFIGURED" || code === "PORTRAIT_DATABASE_NOT_CONFIGURED" || code === "PERSON_PORTRAIT_HISTORY_SCHEMA_REQUIRED") return 503;
  if (code === "PERSON_PORTRAIT_ASSET_DUPLICATE_REVIEW_REQUIRED") return 409;
  if (/REQUIRED|INVALID|TOO_LARGE|TOO_MANY|WEBP_REQUIRED|SOURCE_NOT_FOUND/.test(code)) return 400;
  return 500;
}

function publicError(error) {
  const code = String(error?.code || error?.message || "PERSON_PORTRAIT_API_FAILED");
  const body = { ok:false, schema:PORTRAIT_API_SCHEMA, code };
  if (error?.detail && typeof error.detail === "object") body.detail = error.detail;
  return body;
}

function createPersonPortraitHandler({
  clientFactory = createPostgresClient,
  env = process.env,
  fetchImpl = globalThis.fetch,
  authorizer = null,
  storageFactory = createPortraitBlobStorage,
  serviceFactory = createPersonPortraitService,
  allowedMethods = ["GET", "PUT", "DELETE"]
} = {}) {
  const allowedMethodSet = new Set((allowedMethods || []).map((value) => String(value || "").toUpperCase()));
  return async function personPortraitHandler(req, res) {
    const method = String(req?.method || "GET").toUpperCase();
    if (!allowedMethodSet.has(method)) {
      sendJson(res, 405, { ok:false, schema:PORTRAIT_API_SCHEMA, code:"METHOD_NOT_ALLOWED" });
      return;
    }

    let body = {};
    if (method !== "GET") {
      let authorize = authorizer;
      try {
        if (!authorize) authorize = createMutationAuthorizer({ env });
      } catch (error) {
        sendJson(res, 503, { ok:false, schema:PORTRAIT_API_SCHEMA, code:"SERVER_CONFIGURATION_ERROR" });
        return;
      }
      const auth = await authorize({ method, headers:req?.headers || {}, body:req?.body });
      if (!auth?.authorized) {
        sendJson(res, 401, { ok:false, schema:PORTRAIT_API_SCHEMA, code:"UNAUTHORIZED" });
        return;
      }
      try {
        body = parseBody(req?.body);
      } catch (error) {
        sendJson(res, 400, publicError(error));
        return;
      }
    }

    const personId = method === "GET" ? queryValue(req, "person_id") : String(body?.person_id || "").trim();
    if (!personId) {
      sendJson(res, 400, { ok:false, schema:PORTRAIT_API_SCHEMA, code:"PERSON_PORTRAIT_PERSON_ID_REQUIRED" });
      return;
    }

    let dbUrl;
    try {
      dbUrl = databaseUrl(env);
    } catch (error) {
      sendJson(res, 503, publicError(error));
      return;
    }

    let client = null;
    try {
      client = await clientFactory(dbUrl);
      const storage = storageFactory({ env, fetchImpl });
      const service = serviceFactory({ client, storage });

      if (method === "GET") {
        const result = await service.read(personId);
        if (!result.found) {
          sendJson(res, 404, { ok:false, schema:PORTRAIT_API_SCHEMA, code:"PERSON_PORTRAIT_TARGET_NOT_FOUND" });
          return;
        }
        sendJson(res, 200, { ok:true, schema:PORTRAIT_API_SCHEMA, ...result });
        return;
      }

      if (method === "PUT") {
        const result = await service.put(body);
        sendJson(res, 200, { ok:true, schema:PORTRAIT_API_SCHEMA, ...result });
        return;
      }

      const result = await service.remove(personId);
      sendJson(res, 200, { ok:true, schema:PORTRAIT_API_SCHEMA, ...result });
    } catch (error) {
      console.error("ATLAS Person portrait API failed", error);
      sendJson(res, statusForError(error), publicError(error));
    } finally {
      if (client && typeof client.end === "function") await client.end();
    }
  };
}

module.exports = Object.freeze({
  PORTRAIT_API_SCHEMA,
  parseBody,
  databaseUrl,
  statusForError,
  createPersonPortraitHandler
});
