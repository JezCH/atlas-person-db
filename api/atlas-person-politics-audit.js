"use strict";

const { createPostgresClient } = require("../server/atlas-postgres-client.js");
const { requireDatabaseUrl } = require("../server/atlas-normalized-read-handler.js");

const MAX_NAMES = 60;

function send(res, status, body) {
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
  } catch { return ""; }
}

module.exports = async function handler(req, res) {
  if (String(req?.method || "GET").toUpperCase() !== "GET") return send(res, 405, { ok: false, code: "METHOD_NOT_ALLOWED" });
  const names = [...new Set(queryValue(req, "names").split("|").map((x) => x.trim()).filter(Boolean))];
  if (!names.length || names.length > MAX_NAMES || names.some((x) => x.length > 120)) {
    return send(res, 400, { ok: false, code: "INVALID_NAMES" });
  }

  let client;
  try {
    client = await createPostgresClient(requireDatabaseUrl(process.env));
    const result = await client.query(`
      select pp.id::text as activity_id,
             pp.person_id::text,
             coalesce((select pn.name from atlas_v2.person_names pn where pn.person_id=pp.person_id and pn.locale='en' and pn.is_preferred=true order by pn.id limit 1), p.canonical_key) as person_name_en,
             coalesce((select pn.name from atlas_v2.person_names pn where pn.person_id=pp.person_id and pn.locale='ko' and pn.is_preferred=true order by pn.id limit 1), '') as person_name_ko,
             pp.polity_id::text,
             po.canonical_key as polity_key,
             coalesce((select n.name from atlas_v2.polity_names n where n.polity_id=pp.polity_id and n.locale='en' and n.is_preferred=true order by n.id limit 1), po.canonical_key) as polity_name_en,
             coalesce((select n.name from atlas_v2.polity_names n where n.polity_id=pp.polity_id and n.locale='ko' and n.is_preferred=true order by n.id limit 1), '') as polity_name_ko,
             pp.relation_type_id::text,
             rt.code as relation_code,
             rt.category as relation_category,
             pp.role_id::text,
             r.code as role_code,
             pp.period_basis_id::text,
             pb.code as period_basis,
             pp.activity_start, pp.activity_start_month, pp.activity_start_day,
             pp.activity_start_granularity, pp.activity_start_certainty, pp.activity_start_calendar,
             pp.activity_end, pp.activity_end_month, pp.activity_end_day,
             pp.activity_end_granularity, pp.activity_end_certainty, pp.activity_end_calendar,
             pp.confidence, pp.chronology_status, pp.legacy_source_key, pp.notes, pp.source_locator, pp.content_hash,
             (select count(*)::int from atlas_v2.person_politics_sources s where s.person_politics_id=pp.id) as source_count,
             (select count(*)::int from atlas_v2.chronology_claims c where c.person_politics_id=pp.id) as chronology_claim_count,
             (select count(*)::int from atlas_v2.relationship_descriptions d where d.person_politics_id=pp.id) as description_count
        from atlas_v2.person_politics_v2 pp
        join atlas_v2.persons p on p.id=pp.person_id
        join atlas_v2.polities po on po.id=pp.polity_id
        left join atlas_v2.person_polity_relation_types rt on rt.id=pp.relation_type_id
        left join atlas_v2.roles r on r.id=pp.role_id
        join atlas_v2.period_bases pb on pb.id=pp.period_basis_id
       where exists (
         select 1 from atlas_v2.person_names pn
          where pn.person_id=pp.person_id
            and lower(pn.name)=any($1::text[])
       ) or lower(p.canonical_key)=any($1::text[])
       order by person_name_en, pp.activity_start, pp.id`, [names.map((x) => x.toLowerCase())]);
    return send(res, 200, { ok: true, deployment_sha: process.env.VERCEL_GIT_COMMIT_SHA || null, requested_names: names, row_count: result.rows.length, rows: result.rows });
  } catch (error) {
    console.error("ATLAS scoped person-politics audit failed", error);
    return send(res, 500, { ok: false, code: "AUDIT_FAILED" });
  } finally {
    if (client && typeof client.end === "function") await client.end();
  }
};
