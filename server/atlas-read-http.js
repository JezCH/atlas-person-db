"use strict";

function requireDatabaseUrl(env) {
  const value = String(env?.SUPABASE_DB_URL || "").trim();
  if (!/^postgres(?:ql)?:\/\//.test(value)) throw new Error("SUPABASE_DB_URL is required");
  return value;
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  const json = JSON.stringify(body);
  const bytes = Buffer.byteLength(json, "utf8");
  // Diagnostic header is *uncompressed* JSON bytes, not Vercel's billed
  // Fast Origin Transfer bytes. Never log response bodies or URL query values.
  res.setHeader("x-atlas-json-bytes", String(bytes));
  if (bytes >= 256 * 1024) {
    const route = String(res.req?.url || "unknown").split("?")[0].split("#")[0];
    console.warn("[ATLAS_LARGE_ORIGIN_JSON]", "route=" + route, "bytes=" + bytes, "status=" + status);
  }
  res.end(json);
}

module.exports = Object.freeze({ requireDatabaseUrl, sendJson });
