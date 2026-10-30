"use strict";

const { readPolities, readPolityDetail } = require("./atlas-polity-read-service.js");
const { requireDatabaseUrl, sendJson } = require("./atlas-read-http.js");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requestQueryValue(req, key) {
  const rawUrl = String(req?.url || "").trim();
  let values = [];
  if (rawUrl) {
    try {
      values = new URL(rawUrl, "http://atlas.local").searchParams.getAll(key);
    } catch { /* Preserve framework-query handling for requests without a parseable URL. */ }
  }
  if (values.length > 1) return "__INVALID_MULTI__";
  const direct = req?.query?.[key];
  if (Array.isArray(direct) && direct.length !== 1) return "__INVALID_MULTI__";
  if (direct != null) {
    const value = String(Array.isArray(direct) ? direct[0] || "" : direct).trim();
    // A framework-parsed UUID may supplement a rewritten URL, but cannot
    // silently replace a different UUID that is still present in that URL.
    if (values.length && values[0].trim().toLowerCase() !== value.toLowerCase()) return "__INVALID_MULTI__";
    return value;
  }
  return values.length ? values[0].trim() : null;
}

function listSearchQuery(req) {
  try {
    const values = new URL(String(req?.url || "/"), "http://atlas.local").searchParams.getAll("q");
    if (values.length > 1) return null;
    const direct = req?.query?.q;
    const value = direct == null ? (values[0] || "") :
      Array.isArray(direct) && direct.length === 1 ? direct[0] : direct;
    if (typeof value !== "string") return null;
    const query = value.trim();
    return query.length <= 200 ? query : null;
  } catch {
    return null;
  }
}

function polityIdFromRequest(req) {
  return requestQueryValue(req, "polity_id");
}

function createPolityReadHandler({
  clientFactory,
  env = process.env,
  readList = readPolities,
  readDetail = readPolityDetail
} = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");
  if (typeof readList !== "function") throw new Error("readList is required");
  if (typeof readDetail !== "function") throw new Error("readDetail is required");

  return async function handler(req, res) {
    if (String(req?.method || "GET").toUpperCase() !== "GET") {
      sendJson(res, 405, { ok: false, schema: "atlas-polity-read/v1", code: "METHOD_NOT_ALLOWED" });
      return;
    }

    const polityId = polityIdFromRequest(req);
    if (polityId === "__INVALID_MULTI__" || (polityId != null && !UUID_PATTERN.test(polityId))) {
      sendJson(res, 400, {
        ok: false,
        schema: "atlas-polity-read/v1",
        code: "INVALID_POLITY_ID",
        error: "valid polity_id UUID is required"
      });
      return;
    }

    const query = polityId ? "" : listSearchQuery(req);
    if (query === null) {
      sendJson(res, 400, { ok: false, schema: "atlas-polity-read/v1", code: "INVALID_SEARCH_QUERY" });
      return;
    }

    let databaseUrl;
    try {
      databaseUrl = requireDatabaseUrl(env);
    } catch (error) {
      console.error("ATLAS Polity read configuration error", error);
      sendJson(res, 503, {
        ok: false,
        schema: "atlas-polity-read/v1",
        code: "SERVER_CONFIGURATION_ERROR"
      });
      return;
    }

    let client = null;
    try {
      client = await clientFactory(databaseUrl);
      if (polityId) {
        const polity = await readDetail({ client, polityId });
        if (!polity) {
          sendJson(res, 404, {
            ok: false,
            schema: "atlas-polity-read/v1",
            code: "POLITY_NOT_FOUND"
          });
          return;
        }
        sendJson(res, 200, {
          ok: true,
          source: "v2-polity-read",
          schema: "atlas-polity-read/v1",
          mode: "detail",
          polity
        });
        return;
      }

      const data = await readList({ client, query });
      sendJson(res, 200, {
        ok: true,
        source: "v2-polity-read",
        schema: "atlas-polity-read/v1",
        mode: "list",
        ...data
      });
    } catch (error) {
      console.error("ATLAS Polity read failed", error);
      sendJson(res, client ? 500 : 503, {
        ok: false,
        schema: "atlas-polity-read/v1",
        code: client ? "POLITY_READ_FAILED" : "DATABASE_UNAVAILABLE"
      });
    } finally {
      if (client && typeof client.end === "function") await client.end();
    }
  };
}

module.exports = Object.freeze({
  UUID_PATTERN,
  requestQueryValue,
  polityIdFromRequest,
  createPolityReadHandler
});


