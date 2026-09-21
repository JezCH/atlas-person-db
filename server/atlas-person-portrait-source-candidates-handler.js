"use strict";

const { createPostgresClient } = require("./atlas-postgres-client.js");
const { createMutationAuthorizer } = require("./atlas-session-auth.js");
const { normalizePersonId } = require("./atlas-person-portrait-service.js");

const PORTRAIT_SOURCE_CANDIDATES_SCHEMA = "atlas-person-portrait-source-candidates/v1";

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

async function readPersonPortraitSourceCandidates(client, personId) {
  const id = normalizePersonId(personId);
  const person = await client.query(
    "select id::text from atlas_v2.persons where id=$1::uuid limit 1",
    [id]
  );
  if (person.rowCount !== 1) {
    const error = new Error("PERSON_PORTRAIT_TARGET_NOT_FOUND");
    error.code = "PERSON_PORTRAIT_TARGET_NOT_FOUND";
    throw error;
  }
  const result = await client.query(`
    select s.id::text as source_id,
           s.source_type,
           s.title,
           s.canonical_url,
           s.citation_text
      from atlas_v2.person_sources ps
      join atlas_v2.sources s on s.id=ps.source_id
     where ps.person_id=$1::uuid
     order by coalesce(s.citation_text,s.title,s.canonical_url,s.id::text),s.id
  `, [id]);
  return Object.freeze((result.rows || []).map((row) => Object.freeze({
    source_id:String(row.source_id),
    source_type:row.source_type == null ? null : String(row.source_type),
    title:row.title == null ? null : String(row.title),
    canonical_url:row.canonical_url == null ? null : String(row.canonical_url),
    citation_text:row.citation_text == null ? null : String(row.citation_text)
  })));
}

function createPersonPortraitSourceCandidatesHandler({
  clientFactory = createPostgresClient,
  env = process.env,
  authorizer = null,
  read = readPersonPortraitSourceCandidates
} = {}) {
  return async function personPortraitSourceCandidatesHandler(req, res) {
    if (String(req?.method || "GET").toUpperCase() !== "GET") {
      sendJson(res, 405, { ok:false, schema:PORTRAIT_SOURCE_CANDIDATES_SCHEMA, code:"METHOD_NOT_ALLOWED" });
      return;
    }

    let authorize = authorizer;
    try {
      if (!authorize) authorize = createMutationAuthorizer({ env });
    } catch {
      sendJson(res, 503, { ok:false, schema:PORTRAIT_SOURCE_CANDIDATES_SCHEMA, code:"SERVER_CONFIGURATION_ERROR" });
      return;
    }
    const auth = await authorize({ method:"GET", headers:req?.headers || {} });
    if (!auth?.authorized) {
      sendJson(res, 401, { ok:false, schema:PORTRAIT_SOURCE_CANDIDATES_SCHEMA, code:"UNAUTHORIZED" });
      return;
    }

    let personId;
    try {
      personId = normalizePersonId(queryValue(req, "person_id"));
    } catch (error) {
      sendJson(res, 400, { ok:false, schema:PORTRAIT_SOURCE_CANDIDATES_SCHEMA, code:String(error?.code || "PERSON_PORTRAIT_PERSON_ID_REQUIRED") });
      return;
    }

    const databaseUrl = String(env?.SUPABASE_DB_URL || "").trim();
    if (!databaseUrl) {
      sendJson(res, 503, { ok:false, schema:PORTRAIT_SOURCE_CANDIDATES_SCHEMA, code:"PORTRAIT_DATABASE_NOT_CONFIGURED" });
      return;
    }

    let client = null;
    try {
      client = await clientFactory(databaseUrl);
      const candidates = await read(client, personId);
      sendJson(res, 200, {
        ok:true,
        schema:PORTRAIT_SOURCE_CANDIDATES_SCHEMA,
        person_id:personId,
        candidates
      });
    } catch (error) {
      const code = String(error?.code || error?.message || "PERSON_PORTRAIT_SOURCE_CANDIDATES_FAILED");
      sendJson(res, code === "PERSON_PORTRAIT_TARGET_NOT_FOUND" ? 404 : 500, {
        ok:false,
        schema:PORTRAIT_SOURCE_CANDIDATES_SCHEMA,
        code
      });
    } finally {
      if (client && typeof client.end === "function") await client.end();
    }
  };
}

module.exports = Object.freeze({
  PORTRAIT_SOURCE_CANDIDATES_SCHEMA,
  readPersonPortraitSourceCandidates,
  createPersonPortraitSourceCandidatesHandler
});
