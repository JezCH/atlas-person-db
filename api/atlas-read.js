"use strict";

const { requireDatabaseUrl, sendJson } = require("../server/atlas-read-http.js");

let postgresClientFactory = null;

function getPostgresClientFactory() {
  if (postgresClientFactory) return postgresClientFactory;
  const { createPostgresClient } = require("../server/atlas-postgres-client.js");
  postgresClientFactory = createPostgresClient;
  return postgresClientFactory;
}

function createLazyHandler(factory) {
  if (typeof factory !== "function") throw new Error("lazy handler factory is required");
  let handler = null;
  return async function lazyHandler(req,res) {
    if (!handler) handler = factory();
    return handler(req,res);
  };
}

let runtimePublicationServiceModule = null;
let runtimePublicationHandlerModule = null;

function getRuntimePublicationServiceModule() {
  if (!runtimePublicationServiceModule) {
    runtimePublicationServiceModule = require("../server/atlas-runtime-publication-read-service.js");
  }
  return runtimePublicationServiceModule;
}

function getRuntimePublicationHandlerModule() {
  if (!runtimePublicationHandlerModule) {
    runtimePublicationHandlerModule = require("../server/atlas-runtime-publication-read-handler.js");
  }
  return runtimePublicationHandlerModule;
}

function defineLazyExport(name, load, exportName = name) {
  Object.defineProperty(module.exports,name,{
    enumerable:true,
    configurable:false,
    get() {
      return load()[exportName];
    }
  });
}

const normalizedReadHandler = createLazyHandler(() => {
  const { createNormalizedReadHandler } = require("../server/atlas-normalized-read-handler.js");
  return createNormalizedReadHandler({ clientFactory:getPostgresClientFactory() });
});
const personReadHandler = createLazyHandler(() => {
  const { createPersonReadHandler } = require("../server/atlas-person-read-handler.js");
  return createPersonReadHandler({ clientFactory:getPostgresClientFactory() });
});
const polityReadHandler = createLazyHandler(() => {
  const { createPolityReadHandler } = require("../server/atlas-polity-read-handler.js");
  return createPolityReadHandler({ clientFactory:getPostgresClientFactory() });
});
const catalogReadHandler = createLazyHandler(() => {
  const { createCatalogReadHandler } = require("../server/atlas-catalog-read-handler.js");
  return createCatalogReadHandler({ clientFactory:getPostgresClientFactory() });
});
const adminInspectorHandler = createLazyHandler(() => {
  const { createAdminInspectorHandler } = require("../server/atlas-admin-inspector-handler.js");
  return createAdminInspectorHandler({ clientFactory:getPostgresClientFactory() });
});
const adminSystemStatusHandler = createLazyHandler(() => {
  const { createAdminSystemStatusHandler } = require("../server/atlas-admin-system-status-handler.js");
  return createAdminSystemStatusHandler({ clientFactory:getPostgresClientFactory() });
});
const personPortraitHandler = createLazyHandler(() => {
  const { createPersonPortraitHandler } = require("../server/atlas-person-portrait-handler.js");
  return createPersonPortraitHandler({ clientFactory:getPostgresClientFactory(), allowedMethods:["GET"] });
});
const personPortraitSourceCandidatesHandler = createLazyHandler(() => {
  const { createPersonPortraitSourceCandidatesHandler } = require("../server/atlas-person-portrait-source-candidates-handler.js");
  return createPersonPortraitSourceCandidatesHandler({ clientFactory:getPostgresClientFactory() });
});

const RECENT_DELTA_SCHEMA = "atlas-recent-delta/v1";
const RECENT_DELTA_LIMIT = 12;
const PUBLIC_RUNTIME_IDENTITY_SCHEMA = "atlas-runtime-identity/v1";
const RUNTIME_EXCLUSIONS_SCHEMA = "atlas-runtime-exclusions/v1";

function publicRuntimeIdentity(env = process.env) {
  const { runtimeIdentity } = require("../server/atlas-admin-system-status-service.js");
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

const publicRuntimeIdentityHandler = createLazyHandler(() => createPublicRuntimeIdentityHandler());

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

function createRecentDeltaReadHandler({ clientFactory = getPostgresClientFactory(), env = process.env, read = readRecentDelta } = {}) {
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

const recentDeltaReadHandler = createLazyHandler(() => createRecentDeltaReadHandler());

async function readRuntimeExclusions(client) {
  const coverage=await client.query(`
    select to_regclass('atlas_v2.runtime_compile_exclusions') is not null as exclusion_targets
  `);
  if (coverage.rows?.[0]?.exclusion_targets !== true) {
    return Object.freeze({
      schema:RUNTIME_EXCLUSIONS_SCHEMA,
      source:"runtime-compile-exclusion-ledger",
      available:false,
      reason:"RUNTIME_EXCLUSION_TARGET_LEDGER_NOT_APPLIED",
      active_compile_key:null,
      total_count:null,
      reason_summary:null,
      targets:Object.freeze([])
    });
  }

  const identity=await client.query(`
    select count(*)::int as runtime_activity_count,
           count(distinct compile_key)::int as compile_key_count,
           min(compile_key)::text as compile_key
      from atlas_v2.runtime_person_politics_v1
  `);
  const current=identity.rows?.[0] || {};
  const runtimeCount=Number(current.runtime_activity_count || 0);
  const compileCount=Number(current.compile_key_count || 0);
  const compileKey=current.compile_key == null ? null : String(current.compile_key);
  if (runtimeCount === 0 || !compileKey) {
    return Object.freeze({
      schema:RUNTIME_EXCLUSIONS_SCHEMA,
      source:"runtime-compile-exclusion-ledger",
      available:false,
      reason:"RUNTIME_PROJECTION_EMPTY",
      active_compile_key:null,
      total_count:null,
      reason_summary:null,
      targets:Object.freeze([])
    });
  }
  if (compileCount !== 1) throw new Error("RUNTIME_EXCLUSION_PROJECTION_IDENTITY_INVALID");

  const compileResult=await client.query(`
    select excluded_row_count,exclusion_summary,compiled_at
      from atlas_v2.runtime_compile_runs
     where compile_key=$1
     limit 1
  `,[compileKey]);
  const compile=compileResult.rows?.[0];
  if (!compile) throw new Error("RUNTIME_EXCLUSION_COMPILE_LEDGER_MISSING");

  const result=await client.query(`
    select
      e.activity_id::text,
      e.person_id::text,
      e.polity_id::text,
      e.reason_code,
      coalesce(pko.name,pen.name,e.person_id::text) as person_display_name,
      coalesce(poko.name,poen.name,e.polity_id::text) as polity_display_name
      from atlas_v2.runtime_compile_exclusions e
      left join atlas_v2.person_names pko
        on pko.person_id=e.person_id and pko.locale='ko' and pko.is_preferred=true
      left join atlas_v2.person_names pen
        on pen.person_id=e.person_id and pen.locale='en' and pen.is_preferred=true
      left join atlas_v2.polity_names poko
        on poko.polity_id=e.polity_id and poko.locale='ko' and poko.is_preferred=true
      left join atlas_v2.polity_names poen
        on poen.polity_id=e.polity_id and poen.locale='en' and poen.is_preferred=true
     where e.compile_key=$1
     order by e.reason_code,person_display_name,e.activity_id
  `,[compileKey]);

  const targets=Object.freeze((result.rows || []).map((row)=>Object.freeze({
    activity_id:String(row.activity_id),
    person_id:String(row.person_id),
    person_display_name:String(row.person_display_name || row.person_id),
    polity_id:String(row.polity_id),
    polity_display_name:String(row.polity_display_name || row.polity_id),
    reason_code:String(row.reason_code)
  })));
  const reasonSummary=Object.freeze(Object.fromEntries(
    [...new Set(targets.map((row)=>row.reason_code))].sort().map((code)=>[
      code,targets.filter((row)=>row.reason_code===code).length
    ])
  ));
  const expectedSummary=compile.exclusion_summary && typeof compile.exclusion_summary==="object" && !Array.isArray(compile.exclusion_summary)
    ? Object.fromEntries(Object.entries(compile.exclusion_summary).map(([code,count])=>[String(code),Number(count || 0)]))
    : {};
  const expectedCount=Number(compile.excluded_row_count || 0);
  if (targets.length !== expectedCount || JSON.stringify(reasonSummary) !== JSON.stringify(Object.fromEntries(Object.entries(expectedSummary).sort(([a],[b])=>a.localeCompare(b))))) {
    return Object.freeze({
      schema:RUNTIME_EXCLUSIONS_SCHEMA,
      source:"runtime-compile-exclusion-ledger",
      available:false,
      reason:"RUNTIME_EXCLUSION_TARGET_SNAPSHOT_INCOMPLETE",
      active_compile_key:compileKey,
      compiled_at:compile.compiled_at == null ? null : new Date(compile.compiled_at).toISOString(),
      expected_count:expectedCount,
      observed_count:targets.length,
      total_count:null,
      reason_summary:null,
      targets:Object.freeze([])
    });
  }

  return Object.freeze({
    schema:RUNTIME_EXCLUSIONS_SCHEMA,
    source:"runtime-compile-exclusion-ledger",
    available:true,
    reason:null,
    active_compile_key:compileKey,
    compiled_at:compile.compiled_at == null ? null : new Date(compile.compiled_at).toISOString(),
    total_count:targets.length,
    reason_summary:reasonSummary,
    targets
  });
}

function createRuntimeExclusionsReadHandler({ clientFactory = getPostgresClientFactory(), env = process.env, read = readRuntimeExclusions } = {}) {
  return async function runtimeExclusionsReadHandler(req,res) {
    if (String(req?.method || "GET").toUpperCase() !== "GET") {
      sendJson(res,405,{ ok:false, schema:RUNTIME_EXCLUSIONS_SCHEMA, code:"METHOD_NOT_ALLOWED" });
      return;
    }
    let databaseUrl;
    try {
      databaseUrl=requireDatabaseUrl(env);
    } catch (error) {
      sendJson(res,503,{ ok:false, schema:RUNTIME_EXCLUSIONS_SCHEMA, code:"SERVER_CONFIGURATION_ERROR" });
      return;
    }
    let client=null;
    try {
      client=await clientFactory(databaseUrl);
      const exclusions=await read(client);
      sendJson(res,200,{ ok:true, ...exclusions });
    } catch (error) {
      console.error("ATLAS runtime exclusions read failed",error);
      sendJson(res,client ? 500 : 503,{
        ok:false,
        schema:RUNTIME_EXCLUSIONS_SCHEMA,
        code:client ? "RUNTIME_EXCLUSIONS_READ_FAILED" : "DATABASE_UNAVAILABLE"
      });
    } finally {
      if (client && typeof client.end === "function") await client.end();
    }
  };
}

const runtimeExclusionsReadHandler = createLazyHandler(() => createRuntimeExclusionsReadHandler());

const runtimePublicationReadHandler = createLazyHandler(() => {
  const { createRuntimePublicationReadHandler } = getRuntimePublicationHandlerModule();
  return createRuntimePublicationReadHandler({ clientFactory:getPostgresClientFactory() });
});

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
  if (surface === "person-portrait") return personPortraitHandler(req, res);
  if (surface === "person-portrait-source-candidates") return personPortraitSourceCandidatesHandler(req, res);
  if (surface === "polity") return polityReadHandler(req, res);
  if (surface === "catalog") return catalogReadHandler(req, res);
  if (surface === "recent-delta") return recentDeltaReadHandler(req, res);
  if (surface === "runtime-identity") return publicRuntimeIdentityHandler(req, res);
  if (surface === "runtime-publication") return runtimePublicationReadHandler(req, res);
  if (surface === "runtime-exclusions") return runtimeExclusionsReadHandler(req, res);
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
module.exports.RUNTIME_EXCLUSIONS_SCHEMA = RUNTIME_EXCLUSIONS_SCHEMA;
module.exports.readRuntimeExclusions = readRuntimeExclusions;
module.exports.createRuntimeExclusionsReadHandler = createRuntimeExclusionsReadHandler;
for (const name of [
  "RUNTIME_PUBLICATION_SCHEMA",
  "RUNTIME_ACTIVATION_PROJECTION",
  "normalizeActivationCompile",
  "normalizeActivationRecord",
  "exclusionDelta",
  "readRuntimeActivationHistory",
  "readRuntimePublication"
]) defineLazyExport(name,getRuntimePublicationServiceModule);
defineLazyExport("createRuntimePublicationReadHandler",getRuntimePublicationHandlerModule);
