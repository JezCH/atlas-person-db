"use strict";

const { readPersonPolitics } = require("./atlas-normalized-read-service.js");

function requireDatabaseUrl(env) {
  const value = String(env?.SUPABASE_DB_URL || "").trim();
  if (!/^postgres(?:ql)?:\/\//.test(value)) throw new Error("SUPABASE_DB_URL is required");
  return value;
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function createNormalizedReadHandler({ clientFactory, env = process.env } = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");
  const databaseUrl = requireDatabaseUrl(env);

  return async function handler(req, res) {
    const method = String(req?.method || "GET").toUpperCase();
    if (method !== "GET") {
      sendJson(res, 405, { ok: false, error: "method not allowed" });
      return;
    }

    const client = await clientFactory(databaseUrl);
    try {
      const data = await readPersonPolitics({ client });
      sendJson(res, 200, { ok: true, source: "v2-direct", data });
    } catch (error) {
      console.error("ATLAS normalized read failed", error);
      sendJson(res, 500, { ok: false, error: "normalized read failed" });
    } finally {
      if (client && typeof client.end === "function") await client.end();
    }
  };
}

module.exports = Object.freeze({ createNormalizedReadHandler, requireDatabaseUrl, sendJson });
