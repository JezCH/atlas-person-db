"use strict";

const { readPersons } = require("./atlas-person-read-service.js");
const { requireDatabaseUrl, sendJson } = require("./atlas-normalized-read-handler.js");

function createPersonReadHandler({ clientFactory, env = process.env } = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");

  return async function handler(req, res) {
    const method = String(req?.method || "GET").toUpperCase();
    if (method !== "GET") {
      sendJson(res, 405, { ok: false, error: "method not allowed" });
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
      const data = await readPersons({ client });
      sendJson(res, 200, {
        ok: true,
        source: "v2-person-read",
        schema: "atlas-person-read/v1",
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

module.exports = Object.freeze({ createPersonReadHandler });
