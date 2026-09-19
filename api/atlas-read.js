"use strict";

const { createPostgresClient } = require("../server/atlas-postgres-client.js");
const { createNormalizedReadHandler, requireDatabaseUrl, sendJson } = require("../server/atlas-normalized-read-handler.js");
const { createPersonReadHandler } = require("../server/atlas-person-read-handler.js");
const { createPolityReadHandler } = require("../server/atlas-polity-read-handler.js");
const { createCatalogReadHandler } = require("../server/atlas-catalog-read-handler.js");
const { createAdminInspectorHandler } = require("../server/atlas-admin-inspector-handler.js");
const { createAdminSystemStatusHandler } = require("../server/atlas-admin-system-status-handler.js");
const { runtimeIdentity } = require("../server/atlas-admin-system-status-service.js");

const normalizedReadHandler = createNormalizedReadHandler({ clientFactory: createPostgresClient });
const personReadHandler = createPersonReadHandler({ clientFactory: createPostgresClient });
const polityReadHandler = createPolityReadHandler({ clientFactory: createPostgresClient });
const catalogReadHandler = createCatalogReadHandler({ clientFactory: createPostgresClient });
const adminInspectorHandler = createAdminInspectorHandler({ clientFactory: createPostgresClient });
const adminSystemStatusHandler = createAdminSystemStatusHandler({ clientFactory: createPostgresClient });

const RECENT_DELTA_SCHEMA = "atlas-recent-delta/v1";
const RECENT_DELTA_LIMIT = 12;
const PUBLIC_RUNTIME_IDENTITY_SCHEMA = "atlas-runtime-identity/v1";

function publicRuntimeIdentity(env = process.env) {
  const runtime = runtimeIdentity(env);
  return Object.freeze({
    provider:runtime.provider || null,
    environment:runtime.environment || null,
    git_commit_sha:runtime.git_commit_sha || null,
    git_commit_ref:runtime.git_commit_ref || null,
    region:runtime.region || null
  });
}

function createPublicRuntimeIdentityHandler({ env = process.env } = {}) {
  return async function publicRuntimeIdentityHandler(req,res) {
    if (String(req?.method || "GET").toUpperCase() !== "GET") {
      sendJson(res,405,{ ok:false, schema:PUBLIC_RUNTIME_IDENTITY_SCHEMA, code:"METHOD_NOT_ALLOWED" });
      return;
    }
    sendJson(res,200,{
      ok:true,
      schema:PUBLIC_RUNTIME_IDENTITY_SCHEMA,
      source:"runtime-environment",
      identity:publicRuntimeIdentity(env)
    });
  };
}

const publicRuntimeIdentityHandler = createPublicRuntimeIdentityHandler();

async function recentDeltaTableCoverage(client) {
  const result = await client.query(`
    select
      to_regclass('atlas_v2.authoring_manifest_runs') is not null as authoring,
      to_regclass('atlas_v2.person_profile_mutation_audits') is not null as profile,
      to_regclass('atlas_v2.correction_manifest_runs') is not null as correction,
      to_regclass('atlas_v2.person_merge_audits') is not null as merge
  `);
  const row = result.rows?.[0] || {};
  return Object.freeze({
    authoring:row.authoring === true,
    profile:row.profile === true,
    correction:row.correction === true,
    merge:row.merge === true,
    delete_person:false
  });
}

async function readRecentDelta(client, { limit = RECENT_DELTA_LIMIT } = {}) {
  const coverage = await recentDeltaTableCoverage(client);
  const rows = [];

  if (coverage.authoring) {
    const result = await client.query(`
      select amr.applied_at as occurred_at,
             'authoring'::text as kind,
             'create_activity'::text as operation,
             amr.person_id::text as person_id,
             coalesce(
               (select pn.name from atlas_v2.person_names pn where pn.person_id=amr.person_id and pn.locale='ko' and pn.is_preferred=true order by pn.id limit 1),
               (select pn.name from atlas_v2.person_names pn where pn.person_id=amr.person_id and pn.locale='en' and pn.is_preferred=true order by pn.id limit 1),
               amr.result_snapshot #>> '{entities,person,display_name_ko}',
               amr.result_snapshot #>> '{entities,person,canonical_name_en}',
               amr.person_id::text
             ) as display_name,
             1::int as change_count
        from atlas_v2.authoring_manifest_runs amr
       order by amr.applied_at desc, amr.request_id desc
       limit $1`, [limit]);
    rows.push(...(result.rows || []));
  }

  if (coverage.profile) {
    const result = await client.query(`
      select pma.mutated_at as occurred_at,
             'profile'::text as kind,
             pma.operation::text as operation,
             pma.person_id::text as person_id,
             coalesce(
               (select pn.name from atlas_v2.person_names pn where pn.person_id=pma.person_id and pn.locale='ko' and pn.is_preferred=true order by pn.id limit 1),
               (select pn.name from atlas_v2.person_names pn where pn.person_id=pma.person_id and pn.locale='en' and pn.is_preferred=true order by pn.id limit 1),
               pma.person_id::text
             ) as display_name,
             1::int as change_count
        from atlas_v2.person_profile_mutation_audits pma
       order by pma.mutated_at desc, pma.request_id desc
       limit $1`, [limit]);
    rows.push(...(result.rows || []));
  }

  if (coverage.correction) {
    const result = await client.query(`
      select cmr.applied_at as occurred_at,
             'correction'::text as kind,
             'relationship_correction'::text as operation,
             null::text as person_id,
             null::text as display_name,
             greatest(1,coalesce(jsonb_array_length(cmr.result_snapshot->'operations'),0))::int as change_count
        from atlas_v2.correction_manifest_runs cmr
       order by cmr.applied_at desc, cmr.request_id desc
       limit $1`, [limit]);
    rows.push(...(result.rows || []));
  }

  if (coverage.merge) {
    const result = await client.query(`
      select pma.merged_at as occurred_at,
             'merge'::text as kind,
             'person_merge'::text as operation,
             pma.survivor_person_id::text as person_id,
             coalesce(
               (select pn.name from atlas_v2.person_names pn where pn.person_id=pma.survivor_person_id and pn.locale='ko' and pn.is_preferred=true order by pn.id limit 1),
               (select pn.name from atlas_v2.person_names pn where pn.person_id=pma.survivor_person_id and pn.locale='en' and pn.is_preferred=true order by pn.id limit 1),
               pma.survivor_person_id::text
             ) as display_name,
             1::int as change_count
        from atlas_v2.person_merge_audits pma
       order by pma.merged_at desc, pma.id desc
       limit $1`, [limit]);
    rows.push(...(result.rows || []));
  }

  const normalized = rows.map((row) => Object.freeze({
    occurred_at:row.occurred_at == null ? null : new Date(row.occurred_at).toISOString(),
    kind:String(row.kind || ""),
    operation:String(row.operation || ""),
    person_id:row.person_id == null ? null : String(row.person_id),
    display_name:row.display_name == null ? null : String(row.display_name),
    change_count:Number(row.change_count || 0)
  })).filter((row) => row.occurred_at && row.kind && row.operation)
    .sort((a,b) => b.occurred_at.localeCompare(a.occurred_at) || a.kind.localeCompare(b.kind))
    .slice(0,limit);

  return Object.freeze({
    schema:RECENT_DELTA_SCHEMA,
    source:"v2-mutation-ledgers",
    limit,
    rows:Object.freeze(normalized),
    coverage:Object.freeze({
      ...coverage,
      delete_person_reason:"PERSON_DELETE_IMMUTABLE_AUDIT_NOT_EXPOSED"
    })
  });
}

function createRecentDeltaReadHandler({ clientFactory = createPostgresClient, env = process.env, read = readRecentDelta } = {}) {
  return async function recentDeltaReadHandler(req,res) {
    if (String(req?.method || "GET").toUpperCase() !== "GET") {
      sendJson(res,405,{ ok:false, schema:RECENT_DELTA_SCHEMA, code:"METHOD_NOT_ALLOWED" });
      return;
    }
    let databaseUrl;
    try {
      databaseUrl=requireDatabaseUrl(env);
    } catch (error) {
      console.error("ATLAS recent delta configuration error",error);
      sendJson(res,503,{ ok:false, schema:RECENT_DELTA_SCHEMA, code:"SERVER_CONFIGURATION_ERROR" });
      return;
    }
    let client=null;
    try {
      client=await clientFactory(databaseUrl);
      const delta=await read(client);
      sendJson(res,200,{ ok:true, ...delta });
    } catch (error) {
      console.error("ATLAS recent delta read failed",error);
      sendJson(res,client ? 500 : 503,{
        ok:false,
        schema:RECENT_DELTA_SCHEMA,
        code:client ? "RECENT_DELTA_READ_FAILED" : "DATABASE_UNAVAILABLE"
      });
    } finally {
      if (client && typeof client.end === "function") await client.end();
    }
  };
}

const recentDeltaReadHandler = createRecentDeltaReadHandler();

function selectReadSurface(req) {
  const direct = req?.query?.__atlas_read_surface;
  if (Array.isArray(direct)) return direct.length === 1 ? String(direct[0] || "").trim() : "";
  if (direct != null) return String(direct).trim();

  const rawUrl = String(req?.url || "").trim();
  if (!rawUrl) return "";
  try {
    const parsed = new URL(rawUrl, "http://atlas.local");
    return String(parsed.searchParams.get("__atlas_read_surface") || "").trim();
  } catch {
    return "";
  }
}

async function consolidatedReadHandler(req, res) {
  const surface = selectReadSurface(req);
  if (surface === "person") return personReadHandler(req, res);
  if (surface === "polity") return polityReadHandler(req, res);
  if (surface === "catalog") return catalogReadHandler(req, res);
  if (surface === "recent-delta") return recentDeltaReadHandler(req, res);
  if (surface === "runtime-identity") return publicRuntimeIdentityHandler(req, res);
  if (surface === "admin-inspector") return adminInspectorHandler(req, res);
  if (surface === "admin-system-status") return adminSystemStatusHandler(req, res);
  return normalizedReadHandler(req, res);
}

module.exports = consolidatedReadHandler;
module.exports.selectReadSurface = selectReadSurface;
module.exports.RECENT_DELTA_SCHEMA = RECENT_DELTA_SCHEMA;
module.exports.RECENT_DELTA_LIMIT = RECENT_DELTA_LIMIT;
module.exports.recentDeltaTableCoverage = recentDeltaTableCoverage;
module.exports.readRecentDelta = readRecentDelta;
module.exports.createRecentDeltaReadHandler = createRecentDeltaReadHandler;
module.exports.PUBLIC_RUNTIME_IDENTITY_SCHEMA = PUBLIC_RUNTIME_IDENTITY_SCHEMA;
module.exports.publicRuntimeIdentity = publicRuntimeIdentity;
module.exports.createPublicRuntimeIdentityHandler = createPublicRuntimeIdentityHandler;
