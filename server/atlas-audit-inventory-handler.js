"use strict";

const crypto = require("node:crypto");
const {
  verifyGitHubActionsOidc,
  EXPECTED_AUDIENCE: AUDIT_OIDC_AUDIENCE,
  EXPECTED_WORKFLOW_REF: AUDIT_WORKFLOW_REF
} = require("./atlas-audit-github-oidc.js");
const { createPostgresClient } = require("./atlas-postgres-client.js");

const MARKER = "ATLAS_AUDIT_INVENTORY_V1";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_ACTIVITY_IDS = 100;
const MODES = new Set(["targeted", "full_stage2_baseline"]);

const INVENTORY_SELECT = `
      select pp.id as activity_id,
             pp.person_id,
             pp.polity_id,
             pp.role_id,
             pp.period_basis_id,
             pp.activity_start,
             pp.activity_end,
             pp.confidence,
             pp.chronology_status,
             pp.legacy_source_key,
             pp.notes,
             p.canonical_key as person_canonical_key,
             p.person_type,
             p.historicity as person_historicity,
             (select pn.name from atlas_v2.person_names pn
               where pn.person_id=p.id and pn.locale='en' and pn.is_preferred=true
               order by pn.id limit 1) as person_name_en,
             (select pn.name from atlas_v2.person_names pn
               where pn.person_id=p.id and pn.locale='ko' and pn.is_preferred=true
               order by pn.id limit 1) as person_name_ko,
             po.canonical_key as polity_canonical_key,
             po.polity_type,
             po.historicity as polity_historicity,
             (select pn.name from atlas_v2.polity_names pn
               where pn.polity_id=po.id and pn.locale='en' and pn.is_preferred=true
               order by pn.id limit 1) as polity_name_en,
             (select pn.name from atlas_v2.polity_names pn
               where pn.polity_id=po.id and pn.locale='ko' and pn.is_preferred=true
               order by pn.id limit 1) as polity_name_ko,
             r.code as role_code,
             r.category as role_category,
             r.source_label as role_source_label,
             pb.code as period_basis,
             (select count(*)::int from atlas_v2.person_politics_sources s where s.person_politics_id=pp.id) as source_count,
             (select count(*)::int from atlas_v2.chronology_claims c where c.person_politics_id=pp.id) as chronology_claim_count,
             (select count(*)::int from atlas_v2.relationship_descriptions d where d.person_politics_id=pp.id) as description_count
        from atlas_v2.person_politics_v2 pp
        join atlas_v2.persons p on p.id=pp.person_id
        join atlas_v2.polities po on po.id=pp.polity_id
        left join atlas_v2.roles r on r.id=pp.role_id
        join atlas_v2.period_bases pb on pb.id=pp.period_basis_id`;

function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function bearerToken(req) {
  const value = String(req.headers?.authorization || "");
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function requireDeployment(req, env) {
  if (env.VERCEL_ENV !== "production") throw new Error("AUDIT_INVENTORY_NOT_PRODUCTION");
  if (env.VERCEL_GIT_REPO_OWNER !== "JezCH" || env.VERCEL_GIT_REPO_SLUG !== "atlas-person-db") {
    throw new Error("AUDIT_INVENTORY_DEPLOYMENT_REPOSITORY_MISMATCH");
  }
  const branch = String(env.VERCEL_GIT_COMMIT_REF || "");
  if (branch !== "main") throw new Error("AUDIT_INVENTORY_DEPLOYMENT_BRANCH_MISMATCH");
  const actualSha = String(env.VERCEL_GIT_COMMIT_SHA || "").toLowerCase();
  const expectedSha = String(req.body?.deployment_sha || "").toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(actualSha) || !/^[0-9a-f]{40}$/.test(expectedSha)) {
    throw new Error("AUDIT_INVENTORY_DEPLOYMENT_SHA_REQUIRED");
  }
  if (actualSha !== expectedSha) throw new Error("DEPLOYMENT_SHA_MISMATCH");
  return { actualSha, expectedSha, branch };
}

function normalizeActivityIds(value) {
  if (!Array.isArray(value) || value.length === 0) throw new Error("AUDIT_ACTIVITY_IDS_REQUIRED");
  if (value.length > MAX_ACTIVITY_IDS) throw new Error("AUDIT_ACTIVITY_IDS_LIMIT_EXCEEDED");
  const ids = [...new Set(value.map((id) => String(id || "").trim().toLowerCase()))];
  if (ids.length === 0 || ids.some((id) => !UUID_RE.test(id))) throw new Error("AUDIT_ACTIVITY_ID_INVALID");
  return ids.sort();
}

function normalizeMode(value) {
  const mode = value == null || String(value).trim() === "" ? "targeted" : String(value).trim().toLowerCase();
  if (!MODES.has(mode)) throw new Error("AUDIT_MODE_INVALID");
  return mode;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function digestBaseline(rows, counts, catalogs) {
  return `sha256:${crypto.createHash("sha256").update(JSON.stringify(stable({ rows, counts, catalogs }))).digest("hex")}`;
}

async function beginReadOnly(client) {
  await client.query("begin isolation level repeatable read read only");
  const readOnly = await client.query("select current_setting('transaction_read_only') as read_only");
  if (readOnly.rows[0]?.read_only !== "on") throw new Error("AUDIT_TRANSACTION_NOT_READ_ONLY");
}

async function queryRows(client, activityIds = null) {
  const targeted = Array.isArray(activityIds);
  const sql = `${INVENTORY_SELECT}\n       ${targeted ? "where pp.id = any($1::uuid[])" : ""}\n       order by pp.id`;
  const result = await client.query(sql, targeted ? [activityIds] : []);
  return result.rows;
}

async function queryIdentityCatalogs(client) {
  const persons = await client.query(`
      select p.id, p.canonical_key, p.person_type, p.historicity,
             coalesce((select jsonb_agg(jsonb_build_object('id',pn.id,'locale',pn.locale,'name',pn.name,'name_type',pn.name_type,'is_preferred',pn.is_preferred) order by pn.id)
                       from atlas_v2.person_names pn where pn.person_id=p.id), '[]'::jsonb) as names
        from atlas_v2.persons p order by p.id`);
  const polities = await client.query(`
      select p.id, p.canonical_key, p.polity_type, p.historicity,
             coalesce((select jsonb_agg(jsonb_build_object('id',pn.id,'locale',pn.locale,'name',pn.name,'name_type',pn.name_type,'is_preferred',pn.is_preferred) order by pn.id)
                       from atlas_v2.polity_names pn where pn.polity_id=p.id), '[]'::jsonb) as names
        from atlas_v2.polities p order by p.id`);
  const roles = await client.query(`
      select r.id, r.code, r.category, r.source_label, r.is_active,
             coalesce((select jsonb_agg(jsonb_build_object('id',rn.id,'locale',rn.locale,'name',rn.name,'is_preferred',rn.is_preferred) order by rn.id)
                       from atlas_v2.role_names rn where rn.role_id=r.id), '[]'::jsonb) as names
        from atlas_v2.roles r order by r.id`);
  const periodBases = await client.query(`
      select p.id, p.code, p.is_active,
             coalesce((select jsonb_agg(jsonb_build_object('id',pn.id,'locale',pn.locale,'name',pn.name,'is_preferred',pn.is_preferred) order by pn.id)
                       from atlas_v2.period_basis_names pn where pn.period_basis_id=p.id), '[]'::jsonb) as names
        from atlas_v2.period_bases p order by p.id`);
  const sources = await client.query(`
      select s.id, s.source_key, s.source_type, s.title, s.sha256, s.bytes
        from atlas_v2.sources s order by s.id`);
  return Object.freeze({ persons: persons.rows, polities: polities.rows, roles: roles.rows, period_bases: periodBases.rows, sources: sources.rows });
}

async function querySemanticV2Breakdown(client) {
  const totalsResult = await client.query(`
      select count(*)::int as activity_count,
             count(*) filter (where relation_type_id is null)::int as relation_type_id_null,
             count(*) filter (where period_basis_id is null)::int as period_basis_id_null,
             count(*) filter (where activity_start_granularity is null)::int as activity_start_granularity_null,
             count(*) filter (where activity_start_calendar is null)::int as activity_start_calendar_null,
             count(*) filter (where activity_end_granularity is null)::int as activity_end_granularity_null,
             count(*) filter (where activity_end_calendar is null)::int as activity_end_calendar_null,
             count(*) filter (
               where relation_type_id is null
                  or period_basis_id is null
                  or activity_start_granularity is null
                  or activity_start_calendar is null
                  or activity_end_granularity is null
                  or activity_end_calendar is null
             )::int as semantic_v2_incomplete
        from atlas_v2.person_politics_v2`);
  const patternsResult = await client.query(`
      select (relation_type_id is null) as relation_type_missing,
             (period_basis_id is null) as period_basis_missing,
             (activity_start_granularity is null) as activity_start_granularity_missing,
             (activity_start_calendar is null) as activity_start_calendar_missing,
             (activity_end_granularity is null) as activity_end_granularity_missing,
             (activity_end_calendar is null) as activity_end_calendar_missing,
             count(*)::int as count,
             jsonb_agg(jsonb_build_object(
               'activity_id', id,
               'person_id', person_id,
               'polity_id', polity_id,
               'relation_type_id', relation_type_id,
               'role_id', role_id,
               'period_basis_id', period_basis_id,
               'activity_start', activity_start,
               'activity_start_month', activity_start_month,
               'activity_start_day', activity_start_day,
               'activity_start_granularity', activity_start_granularity,
               'activity_start_calendar', activity_start_calendar,
               'activity_start_certainty', activity_start_certainty,
               'activity_end', activity_end,
               'activity_end_month', activity_end_month,
               'activity_end_day', activity_end_day,
               'activity_end_granularity', activity_end_granularity,
               'activity_end_calendar', activity_end_calendar,
               'activity_end_certainty', activity_end_certainty
             ) order by id) filter (
               where relation_type_id is null
                  or period_basis_id is null
                  or activity_start_granularity is null
                  or activity_start_calendar is null
                  or activity_end_granularity is null
                  or activity_end_calendar is null
             ) as incomplete_rows
        from atlas_v2.person_politics_v2
       group by 1,2,3,4,5,6
       order by count(*) desc, 1,2,3,4,5,6`);
  const totals = totalsResult.rows[0] || {};
  const incompleteRows = patternsResult.rows
    .flatMap((row) => Array.isArray(row.incomplete_rows) ? row.incomplete_rows : [])
    .sort((a, b) => String(a.activity_id).localeCompare(String(b.activity_id)));
  return Object.freeze({
    activity_count: Number(totals.activity_count || 0),
    semantic_v2_incomplete: Number(totals.semantic_v2_incomplete || 0),
    null_counts: Object.freeze({
      relation_type_id: Number(totals.relation_type_id_null || 0),
      period_basis_id: Number(totals.period_basis_id_null || 0),
      activity_start_granularity: Number(totals.activity_start_granularity_null || 0),
      activity_start_calendar: Number(totals.activity_start_calendar_null || 0),
      activity_end_granularity: Number(totals.activity_end_granularity_null || 0),
      activity_end_calendar: Number(totals.activity_end_calendar_null || 0)
    }),
    patterns: patternsResult.rows.map((row) => Object.freeze({
      relation_type_missing: Boolean(row.relation_type_missing),
      period_basis_missing: Boolean(row.period_basis_missing),
      activity_start_granularity_missing: Boolean(row.activity_start_granularity_missing),
      activity_start_calendar_missing: Boolean(row.activity_start_calendar_missing),
      activity_end_granularity_missing: Boolean(row.activity_end_granularity_missing),
      activity_end_calendar_missing: Boolean(row.activity_end_calendar_missing),
      count: Number(row.count || 0)
    })),
    incomplete_rows: Object.freeze(incompleteRows)
  });
}

function nestedNameCount(rows) {
  return rows.reduce((sum, row) => sum + (Array.isArray(row.names) ? row.names.length : 0), 0);
}

function assertCatalogCounts(catalogs, counts) {
  const checks = [
    ["persons", catalogs.persons.length], ["polities", catalogs.polities.length],
    ["roles", catalogs.roles.length], ["period_bases", catalogs.period_bases.length],
    ["sources", catalogs.sources.length], ["person_names", nestedNameCount(catalogs.persons)],
    ["polity_names", nestedNameCount(catalogs.polities)], ["role_names", nestedNameCount(catalogs.roles)],
    ["period_basis_names", nestedNameCount(catalogs.period_bases)]
  ];
  for (const [key, actual] of checks) {
    if (Number(counts[key]) !== actual) throw new Error(`AUDIT_BASELINE_${key.toUpperCase()}_COUNT_DRIFT`);
  }
}

async function queryInventory(client, activityIds) {
  await beginReadOnly(client);
  try {
    const rows = await queryRows(client, activityIds);
    if (rows.length !== activityIds.length) {
      const found = new Set(rows.map((row) => String(row.activity_id).toLowerCase()));
      const missing = activityIds.filter((id) => !found.has(id));
      const error = new Error("AUDIT_INVENTORY_TARGET_MISSING");
      error.missing_activity_ids = missing;
      throw error;
    }
    await client.query("commit");
    return rows;
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    throw error;
  }
}

async function queryFullStage2Baseline(client) {
  await beginReadOnly(client);
  try {
    const rows = await queryRows(client, null);
    const catalogs = await queryIdentityCatalogs(client);
    const countsResult = await client.query(`
      select (select count(*)::int from atlas_v2.persons) as persons,
             (select count(*)::int from atlas_v2.person_names) as person_names,
             (select count(*)::int from atlas_v2.polities) as polities,
             (select count(*)::int from atlas_v2.polity_names) as polity_names,
             (select count(*)::int from atlas_v2.roles) as roles,
             (select count(*)::int from atlas_v2.role_names) as role_names,
             (select count(*)::int from atlas_v2.period_bases) as period_bases,
             (select count(*)::int from atlas_v2.period_basis_names) as period_basis_names,
             (select count(*)::int from atlas_v2.sources) as sources,
             (select count(*)::int from atlas_v2.person_politics_v2) as activities,
             (select count(*)::int from atlas_v2.person_politics_sources) as activity_source_links,
             (select count(*)::int from atlas_v2.chronology_claims) as chronology_claims,
             (select count(*)::int from atlas_v2.relationship_descriptions) as relationship_descriptions`);
    const counts = countsResult.rows[0] || {};
    if (Number(counts.activities) !== rows.length) throw new Error("AUDIT_BASELINE_ACTIVITY_COUNT_DRIFT");
    const activityIds = rows.map((row) => String(row.activity_id).toLowerCase());
    if (new Set(activityIds).size !== activityIds.length) throw new Error("AUDIT_BASELINE_DUPLICATE_ACTIVITY_UUID");
    assertCatalogCounts(catalogs, counts);
    const semanticV2Breakdown = await querySemanticV2Breakdown(client);
    if (semanticV2Breakdown.activity_count !== Number(counts.activities)) throw new Error("AUDIT_BASELINE_SEMANTIC_V2_COUNT_DRIFT");
    await client.query("commit");
    return Object.freeze({ rows, counts, catalogs, semantic_v2_breakdown: semanticV2Breakdown,
      baseline_digest: digestBaseline(rows, counts, catalogs) });
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    throw error;
  }
}

function statusForError(code) {
  if (code === "DEPLOYMENT_SHA_MISMATCH") return 409;
  if (code === "GITHUB_OIDC_INVALID" || String(code).startsWith("GITHUB_OIDC_")) return 401;
  if (code === "AUDIT_INVENTORY_TARGET_MISSING" || String(code).startsWith("AUDIT_BASELINE_")) return 409;
  if (String(code).startsWith("AUDIT_ACTIVITY_") || code === "AUDIT_MODE_INVALID") return 400;
  if (String(code).startsWith("AUDIT_INVENTORY_DEPLOYMENT_") || code === "AUDIT_INVENTORY_NOT_PRODUCTION") return 403;
  if (code === "SERVER_CONFIGURATION_ERROR") return 503;
  return 500;
}

function createAuditInventoryHandler({ env = process.env, verifyOidc = verifyGitHubActionsOidc, createClient = createPostgresClient } = {}) {
  return async function handler(req, res) {
    if (req.method !== "POST") return json(res, 405, { ok: false, marker: MARKER, code: "METHOD_NOT_ALLOWED" });
    let client = null;
    try {
      const token = bearerToken(req);
      if (!token) throw new Error("GITHUB_OIDC_INVALID");
      const deployment = requireDeployment(req, env);
      await verifyOidc(token, { expectedSha: deployment.actualSha });
      const mode = normalizeMode(req.body?.mode);
      const connectionString = String(env.SUPABASE_DB_URL || "").trim();
      if (!connectionString) throw new Error("SERVER_CONFIGURATION_ERROR");
      client = await createClient(connectionString, { env });
      if (mode === "full_stage2_baseline") {
        if (req.body?.activity_ids != null) throw new Error("AUDIT_BASELINE_ACTIVITY_IDS_FORBIDDEN");
        const baseline = await queryFullStage2Baseline(client);
        return json(res, 200, { ok: true, marker: MARKER, mode, read_only: true, committed: false, deployment_sha: deployment.actualSha,
          row_count: baseline.rows.length, counts: baseline.counts, baseline_digest: baseline.baseline_digest,
          semantic_v2_breakdown: baseline.semantic_v2_breakdown, rows: baseline.rows, catalogs: baseline.catalogs });
      }
      const activityIds = normalizeActivityIds(req.body?.activity_ids);
      const rows = await queryInventory(client, activityIds);
      return json(res, 200, { ok: true, marker: MARKER, mode, read_only: true, committed: false, deployment_sha: deployment.actualSha,
        requested_count: activityIds.length, row_count: rows.length, rows });
    } catch (error) {
      return json(res, statusForError(error?.message), { ok: false, marker: MARKER, code: error?.message || "AUDIT_INVENTORY_FAILED",
        ...(Array.isArray(error?.missing_activity_ids) ? { missing_activity_ids: error.missing_activity_ids } : {}) });
    } finally {
      if (client) { try { await client.end(); } catch {} }
    }
  };
}

module.exports = Object.freeze({ MARKER, MAX_ACTIVITY_IDS, MODES, AUDIT_OIDC_AUDIENCE, AUDIT_WORKFLOW_REF,
  createAuditInventoryHandler, normalizeActivityIds, normalizeMode, queryInventory, queryIdentityCatalogs, querySemanticV2Breakdown,
  queryFullStage2Baseline, digestBaseline, requireDeployment, bearerToken, statusForError });