"use strict";

const { readPersons, readPersonDetail } = require("./atlas-person-read-service.js");
const { requireDatabaseUrl, sendJson } = require("./atlas-normalized-read-handler.js");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function personIdFromRequest(req) {
  const direct = req?.query?.person_id;
  if (Array.isArray(direct)) return direct.length === 1 ? String(direct[0] || "").trim() : "__INVALID_MULTI__";
  if (direct != null) return String(direct).trim();
  const rawUrl = String(req?.url || "").trim();
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl, "http://atlas.local");
    return parsed.searchParams.has("person_id") ? String(parsed.searchParams.get("person_id") || "").trim() : null;
  } catch {
    return null;
  }
}

function createPersonReadHandler({ clientFactory, env = process.env } = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");

  return async function handler(req, res) {
    const method = String(req?.method || "GET").toUpperCase();
    if (method !== "GET") {
      sendJson(res, 405, { ok: false, error: "method not allowed" });
      return;
    }

    const requestedPersonId = personIdFromRequest(req);
    if (requestedPersonId != null && !UUID_PATTERN.test(requestedPersonId)) {
      sendJson(res, 400, {
        ok: false,
        code: "INVALID_PERSON_ID",
        error: "valid person_id UUID is required"
      });
      return;
    }

    let databaseUrl;
    try {
      databaseUrl = requireDatabaseUrl(env);
    } catch (error) {
      console.error("ATLAS Person read configuration error", error);
      sendJson(res, 503, { ok: false, code: "SERVER_CONFIGURATION_ERROR", error: "Person read service is not configured" });
      return;
    }

    let client = null;
    try {
      client = await clientFactory(databaseUrl);
      if (requestedPersonId) {
        const person = await readPersonDetail({ client, personId: requestedPersonId });
        if (!person) {
          sendJson(res, 404, { ok: false, code: "PERSON_NOT_FOUND", error: "Person not found" });
          return;
        }
        sendJson(res, 200, {
          ok: true,
          source: "v2-person-read",
          schema: "atlas-person-read/v1",
          mode: "detail",
          person
        });
        return;
      }

      const data = await readPersons({ client });
      sendJson(res, 200, {
        ok: true,
        source: "v2-person-read",
        schema: "atlas-person-read/v1",
        mode: "list",
        ...data
      });
    } catch (error) {
      console.error("ATLAS Person read failed", error);
      sendJson(res, client ? 500 : 503, {
        ok: false,
        code: client ? "PERSON_READ_FAILED" : "DATABASE_UNAVAILABLE",
        error: client ? "Person read failed" : "database unavailable"
      });
    } finally {
      if (client && typeof client.end === "function") await client.end();
    }
  };
}

module.exports = Object.freeze({ UUID_PATTERN, personIdFromRequest, createPersonReadHandler });
