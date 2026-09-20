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
const RUNTIME_PUBLICATION_SCHEMA = "atlas-runtime-publication/v1";

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

async function readRuntimePublication(client) {
  const countsResult = await client.query(`
    select
      (select count(*)::int from atlas_v2.person_politics_v2) as authoring_activity_count,
      (select count(*)::int from atlas_v2.runtime_person_politics_v1) as runtime_activity_count,
      (select count(distinct compile_key)::int from atlas_v2.runtime_person_politics_v1) as runtime_compile_key_count,
      (select min(compile_key) from atlas_v2.runtime_person_politics_v1) as current_compile_key
  `);
  const counts = countsResult.rows?.[0] || {};
  const authoringActivityCount = Number(counts.authoring_activity_count || 0);
  const runtimeActivityCount = Number(counts.runtime_activity_count || 0);
  const runtimeCompileKeyCount = Number(counts.runtime_compile_key_count || 0);
  const currentCompileKey = counts.current_compile_key == null ? null : String(counts.current_compile_key);
  if (runtimeActivityCount > 0 && (runtimeCompileKeyCount !== 1 || !currentCompileKey)) {
    throw new Error("RUNTIME_PUBLICATION_PROJECTION_IDENTITY_INVALID");
  }

  let row = null;
  if (currentCompileKey) {
    const compileResult = await client.query(`
      select compiler_version, input_row_count, output_row_count, excluded_row_count,
             exclusion_summary, compiled_at
        from atlas_v2.runtime_compile_runs
       where compile_key=$1
       limit 1
    `, [currentCompileKey]);
    row = compileResult.rows?.[0] || null;
    if (!row) throw new Error("RUNTIME_PUBLICATION_COMPILE_LEDGER_MISSING");
  }

  const currentCompile = row ? Object.freeze({
    compiler_version:String(row.compiler_version || ""),
    input_row_count:Number(row.input_row_count || 0),
    output_row_count:Number(row.output_row_count || 0),
    excluded_row_count:Number(row.excluded_row_count || 0),
    exclusion_summary:Object.freeze(
      row.exclusion_summary && typeof row.exclusion_summary === "object" && !Array.isArray(row.exclusion_summary)
        ? Object.fromEntries(Object.entries(row.exclusion_summary).map(([code,count]) => [String(code),Number(count || 0)]))
        : {}
    ),
    compiled_at:row.compiled_at == null ? null : new Date(row.compiled_at).toISOString()
  }) : null;

  return Object.freeze({
    schema:RUNTIME_PUBLICATION_SCHEMA,
    source:"runtime-compile-ledger",
    current_authoring_activity_count:authoringActivityCount,
    current_runtime_activity_count:runtimeActivityCount,
    latest_compile:currentCompile,
    authoring_delta_since_compile:currentCompile == null ? null : authoringActivityCount-currentCompile.input_row_count,
    projection_matches_latest_compile:currentCompile == null ? null : runtimeActivityCount === currentCompile.output_row_count
  });
}

function createRuntimePublicationReadHandler({ clientFactory = createPostgresClient, env = process.env, read = readRuntimePublication } = {}) {
  return async function runtimePublicationReadHandler(req,res) {
    if (String(req?.method || "GET").toUpperCase() !== "GET") {
      sendJson(res,405,{ ok:false, schema:RUNTIME_PUBLICATION_SCHEMA, code:"METHOD_NOT_ALLOWED" });
      return;
    }
    let databaseUrl;
    try {
      databaseUrl=requireDatabaseUrl(env);
    } catch (error) {
      console.error("ATLAS runtime publication configuration error",error);
      sendJson(res,503,{ ok:false, schema:RUNTIME_PUBLICATION_SCHEMA, code:"SERVER_CONFIGURATION_ERROR" });
      return;
    }
    let client=null;
    try {
      client=await clientFactory(databaseUrl);
      const publication=await read(client);
      sendJson(res,200,{ ok:true, ...publication });
    } catch (error) {
      console.error("ATLAS runtime publication read failed",error);
      sendJson(res,client ? 500 : 503,{
        ok:false,
        schema:RUNTIME_PUBLICATION_SCHEMA,
        code:client ? "RUNTIME_PUBLICATION_READ_FAILED" : "DATABASE_UNAVAILABLE"
      });
    } finally {
      if (client && typeof client.end === "function") await client.end();
    }
  };
}

const runtimePublicationReadHandler = createRuntimePublicationReadHandler();

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
  if (surface === "runtime-publication") return runtimePublicationReadHandler(req, res);
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
module.exports.RUNTIME_PUBLICATION_SCHEMA = RUNTIME_PUBLICATION_SCHEMA;
module.exports.readRuntimePublication = readRuntimePublication;
module.exports.createRuntimePublicationReadHandler = createRuntimePublicationReadHandler;
