"use strict";

const { readPolities, readPolityDetail } = require("./atlas-polity-read-service.js");
const { requireDatabaseUrl, sendJson } = require("./atlas-read-http.js");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requestQueryValue(req, key) {
  const direct = req?.query?.[key];
  if (Array.isArray(direct)) return direct.length === 1 ? String(direct[0] || "").trim() : "__INVALID_MULTI__";
  if (direct != null) return String(direct).trim();
  const rawUrl = String(req?.url || "").trim();
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl, "http://atlas.local");
    return parsed.searchParams.has(key) ? String(parsed.searchParams.get(key) || "").trim() : null;
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

      const data = await readList({ client });
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
