"use strict";

const {
  verifyGitHubActionsOidc,
  EXPECTED_AUDIENCE: AUDIT_OIDC_AUDIENCE,
  EXPECTED_WORKFLOW_REF: AUDIT_WORKFLOW_REF
} = require("./atlas-audit-github-oidc.js");
const { createPostgresClient } = require("./atlas-postgres-client.js");

const MARKER = "ATLAS_AUDIT_INVENTORY_V1";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_ACTIVITY_IDS = 100;

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

async function queryInventory(client, activityIds) {
  await client.query("begin isolation level repeatable read read only");
  try {
    const readOnly = await client.query("select current_setting('transaction_read_only') as read_only");
    if (readOnly.rows[0]?.read_only !== "on") throw new Error("AUDIT_TRANSACTION_NOT_READ_ONLY");

    const result = await client.query(`
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
        join atlas_v2.period_bases pb on pb.id=pp.period_basis_id
       where pp.id = any($1::uuid[])
       order by pp.id`, [activityIds]);

    if (result.rows.length !== activityIds.length) {
      const found = new Set(result.rows.map((row) => String(row.activity_id).toLowerCase()));
      const missing = activityIds.filter((id) => !found.has(id));
      const error = new Error("AUDIT_INVENTORY_TARGET_MISSING");
      error.missing_activity_ids = missing;
      throw error;
    }

    await client.query("commit");
    return result.rows;
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    throw error;
  }
}

function statusForError(code) {
  if (code === "DEPLOYMENT_SHA_MISMATCH") return 409;
  if (code === "GITHUB_OIDC_INVALID" || String(code).startsWith("GITHUB_OIDC_")) return 401;
  if (code === "AUDIT_INVENTORY_TARGET_MISSING") return 409;
  if (String(code).startsWith("AUDIT_ACTIVITY_")) return 400;
  if (String(code).startsWith("AUDIT_INVENTORY_DEPLOYMENT_") || code === "AUDIT_INVENTORY_NOT_PRODUCTION") return 403;
  if (code === "SERVER_CONFIGURATION_ERROR") return 503;
  return 500;
}

function createAuditInventoryHandler({
  env = process.env,
  verifyOidc = verifyGitHubActionsOidc,
  createClient = createPostgresClient
} = {}) {
  return async function handler(req, res) {
    if (req.method !== "POST") return json(res, 405, { ok: false, marker: MARKER, code: "METHOD_NOT_ALLOWED" });

    let client = null;
    try {
      const token = bearerToken(req);
      if (!token) throw new Error("GITHUB_OIDC_INVALID");
      const deployment = requireDeployment(req, env);
      await verifyOidc(token, { expectedSha: deployment.actualSha });
      const activityIds = normalizeActivityIds(req.body?.activity_ids);
      const connectionString = String(env.SUPABASE_DB_URL || "").trim();
      if (!connectionString) throw new Error("SERVER_CONFIGURATION_ERROR");

      client = await createClient(connectionString, { env });
      const rows = await queryInventory(client, activityIds);
      return json(res, 200, {
        ok: true,
        marker: MARKER,
        read_only: true,
        committed: false,
        deployment_sha: deployment.actualSha,
        requested_count: activityIds.length,
        row_count: rows.length,
        rows
      });
    } catch (error) {
      return json(res, statusForError(error?.message), {
        ok: false,
        marker: MARKER,
        code: error?.message || "AUDIT_INVENTORY_FAILED",
        ...(Array.isArray(error?.missing_activity_ids) ? { missing_activity_ids: error.missing_activity_ids } : {})
      });
    } finally {
      if (client) {
        try { await client.end(); } catch {}
      }
    }
  };
}

module.exports = Object.freeze({
  MARKER,
  MAX_ACTIVITY_IDS,
  AUDIT_OIDC_AUDIENCE,
  AUDIT_WORKFLOW_REF,
  createAuditInventoryHandler,
  normalizeActivityIds,
  queryInventory,
  requireDeployment,
  bearerToken,
  statusForError
});
