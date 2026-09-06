"use strict";

const { requireDatabaseUrl, sendJson } = require("./atlas-normalized-read-handler.js");

const MAX_QUERY_LENGTH = 120;
const MAX_RESULTS = 20;
const SUPPORTED_KINDS = Object.freeze(["polity", "role", "source", "place"]);

const POLITY_LOOKUP_SQL = `
select p.id::text,
       p.canonical_key,
       p.polity_type,
       p.historicity,
       en.name as canonical_name_en,
       ko.name as display_name_ko
  from atlas_v2.polities p
  left join atlas_v2.polity_names en
    on en.polity_id=p.id and en.locale='en' and en.is_preferred=true
  left join atlas_v2.polity_names ko
    on ko.polity_id=p.id and ko.locale='ko' and ko.is_preferred=true
 where exists (
       select 1
         from atlas_v2.polity_names pn
        where pn.polity_id=p.id
          and pn.name ilike $1
      )
 order by case when en.name ilike $2 or ko.name ilike $2 then 0 else 1 end,
          en.name nulls last,
          ko.name nulls last
 limit $3`;

const ROLE_LOOKUP_SQL = `
select r.id::text,
       r.code,
       r.category,
       r.source_label,
       en.name as canonical_name_en,
       ko.name as display_name_ko
  from atlas_v2.roles r
  left join atlas_v2.role_names en
    on en.role_id=r.id and en.locale='en' and en.is_preferred=true
  left join atlas_v2.role_names ko
    on ko.role_id=r.id and ko.locale='ko' and ko.is_preferred=true
 where r.is_active=true
   and (
     r.code ilike $1
     or r.source_label ilike $1
     or exists (
       select 1
         from atlas_v2.role_names rn
        where rn.role_id=r.id
          and rn.name ilike $1
     )
   )
 order by case when r.code ilike $2 or r.source_label ilike $2 or en.name ilike $2 or ko.name ilike $2 then 0 else 1 end,
          r.code
 limit $3`;

const SOURCE_LOOKUP_SQL = `
select s.id::text,
       s.source_key,
       s.source_type,
       s.title,
       s.canonical_url,
       s.citation_text
  from atlas_v2.sources s
 where s.source_key ilike $1
    or s.title ilike $1
    or coalesce(s.canonical_url,'') ilike $1
    or coalesce(s.citation_text,'') ilike $1
 order by case when s.source_key ilike $2 or s.title ilike $2 or coalesce(s.canonical_url,'') ilike $2 then 0 else 1 end,
          s.title,
          s.id
 limit $3`;

const PLACE_LOOKUP_SQL = `
select p.id::text,
       p.canonical_key,
       p.place_type,
       p.historicity,
       en.name as canonical_name_en,
       ko.name as display_name_ko,
       coalesce((
         select jsonb_agg(
           jsonb_build_object('source_id',ps.source_id::text,'source_locator_key',ps.source_locator_key)
           order by ps.source_id::text,ps.source_locator_key
         )
           from atlas_v2.place_sources ps
          where ps.place_id=p.id
       ), '[]'::jsonb) as source_links
  from atlas_v2.places p
  left join atlas_v2.place_names en
    on en.place_id=p.id and en.locale='en' and en.is_preferred=true
  left join atlas_v2.place_names ko
    on ko.place_id=p.id and ko.locale='ko' and ko.is_preferred=true
 where p.canonical_key ilike $1
    or exists (
      select 1
        from atlas_v2.place_names pn
       where pn.place_id=p.id and pn.name ilike $1
    )
 order by case when p.canonical_key ilike $2 or en.name ilike $2 or ko.name ilike $2 then 0 else 1 end,
          en.name nulls last,
          p.id
 limit $3`;

const LOOKUP_SQL_BY_KIND = Object.freeze({
  polity: POLITY_LOOKUP_SQL,
  role: ROLE_LOOKUP_SQL,
  source: SOURCE_LOOKUP_SQL,
  place: PLACE_LOOKUP_SQL
});

function singleQueryValue(req, key) {
  const direct = req?.query?.[key];
  if (Array.isArray(direct)) return direct.length === 1 ? String(direct[0] || "").trim() : "__INVALID_MULTI__";
  if (direct != null) return String(direct).trim();
  const rawUrl = String(req?.url || "").trim();
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl, "http://atlas.local");
    if (!parsed.searchParams.has(key)) return null;
    const values = parsed.searchParams.getAll(key);
    return values.length === 1 ? String(values[0] || "").trim() : "__INVALID_MULTI__";
  } catch {
    return null;
  }
}

async function searchCatalog({ client, kind, query }) {
  const pattern = `%${query}%`;
  const exact = query;
  const sql = LOOKUP_SQL_BY_KIND[kind];
  if (!sql) throw new Error("INVALID_CATALOG_KIND");
  const result = await client.query(sql, [pattern, exact, MAX_RESULTS]);
  return result.rows || [];
}

function createCatalogReadHandler({ clientFactory, env = process.env, search = searchCatalog } = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");
  if (typeof search !== "function") throw new Error("search is required");

  return async function handler(req, res) {
    if (String(req?.method || "GET").toUpperCase() !== "GET") {
      sendJson(res, 405, { ok: false, schema: "atlas-catalog-read/v1", code: "METHOD_NOT_ALLOWED" });
      return;
    }

    const kind = singleQueryValue(req, "kind");
    const query = singleQueryValue(req, "q");
    if (!kind || kind === "__INVALID_MULTI__" || !SUPPORTED_KINDS.includes(kind)) {
      sendJson(res, 400, {
        ok: false,
        schema: "atlas-catalog-read/v1",
        code: "INVALID_CATALOG_KIND",
        supported_kinds: SUPPORTED_KINDS
      });
      return;
    }
    if (!query || query === "__INVALID_MULTI__" || query.length > MAX_QUERY_LENGTH) {
      sendJson(res, 400, {
        ok: false,
        schema: "atlas-catalog-read/v1",
        code: "INVALID_CATALOG_QUERY",
        error: `q must be a single non-empty string of at most ${MAX_QUERY_LENGTH} characters`
      });
      return;
    }

    let databaseUrl;
    try {
      databaseUrl = requireDatabaseUrl(env);
    } catch (error) {
      console.error("ATLAS catalog read configuration error", error);
      sendJson(res, 503, { ok: false, schema: "atlas-catalog-read/v1", code: "SERVER_CONFIGURATION_ERROR" });
      return;
    }

    let client = null;
    try {
      client = await clientFactory(databaseUrl);
      const results = await search({ client, kind, query });
      sendJson(res, 200, {
        ok: true,
        source: "v2-catalog-read",
        schema: "atlas-catalog-read/v1",
        mode: "search",
        kind,
        query,
        count: results.length,
        results
      });
    } catch (error) {
      console.error("ATLAS catalog read failed", error);
      sendJson(res, client ? 500 : 503, {
        ok: false,
        schema: "atlas-catalog-read/v1",
        code: client ? "CATALOG_READ_FAILED" : "DATABASE_UNAVAILABLE"
      });
    } finally {
      if (client && typeof client.end === "function") await client.end();
    }
  };
}

module.exports = Object.freeze({
  MAX_QUERY_LENGTH,
  MAX_RESULTS,
  SUPPORTED_KINDS,
  POLITY_LOOKUP_SQL,
  ROLE_LOOKUP_SQL,
  SOURCE_LOOKUP_SQL,
  PLACE_LOOKUP_SQL,
  LOOKUP_SQL_BY_KIND,
  singleQueryValue,
  searchCatalog,
  createCatalogReadHandler
});
