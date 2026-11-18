"use strict";

function requireDatabaseUrl(env) {
  const value = String(env?.SUPABASE_DB_URL || "").trim();
  if (!/^postgres(?:ql)?:\/\//.test(value)) throw new Error("SUPABASE_DB_URL is required");
  return value;
}

// Use only known response contract fields; do not log request query contents,
// names, IDs, notes, headers, or caller-provided arbitrary labels.
function largeJsonDisposition(body) {
  if (body?.schema !== "atlas-person-read/v1") return { mode: "other", rows: null };
  if (body.mode === "detail") return { mode: "person_detail", rows: body.person ? 1 : 0 };
  if (body.mode !== "list" || !Array.isArray(body.persons)) return { mode: "other", rows: null };
  if (body.projection === "identity") return { mode: "person_identity", rows: body.persons.length };
  if (body.query || body.namuwiki_status || Number.isInteger(body.limit)) {
    return { mode: "person_filtered_list", rows: body.persons.length };
  }
  return { mode: "person_full_list", rows: body.persons.length };
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
    const disposition = largeJsonDisposition(body);
    console.warn("[ATLAS_LARGE_ORIGIN_JSON]", "route=" + route, "bytes=" + bytes, "status=" + status,
      "mode=" + disposition.mode, "rows=" + (disposition.rows == null ? "unknown" : disposition.rows));
  }
  res.end(json);
}

module.exports = Object.freeze({ requireDatabaseUrl, sendJson, largeJsonDisposition });
