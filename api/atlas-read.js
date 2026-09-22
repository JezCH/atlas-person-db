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
let runtimeExclusionsServiceModule = null;
let runtimeExclusionsHandlerModule = null;
let recentDeltaServiceModule = null;
let recentDeltaHandlerModule = null;

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

function getRuntimeExclusionsServiceModule() {
  if (!runtimeExclusionsServiceModule) {
    runtimeExclusionsServiceModule = require("../server/atlas-runtime-exclusions-read-service.js");
  }
  return runtimeExclusionsServiceModule;
}

function getRuntimeExclusionsHandlerModule() {
  if (!runtimeExclusionsHandlerModule) {
    runtimeExclusionsHandlerModule = require("../server/atlas-runtime-exclusions-read-handler.js");
  }
  return runtimeExclusionsHandlerModule;
}

function getRecentDeltaServiceModule() {
  if (!recentDeltaServiceModule) {
    recentDeltaServiceModule = require("../server/atlas-recent-delta-read-service.js");
  }
  return recentDeltaServiceModule;
}

function getRecentDeltaHandlerModule() {
  if (!recentDeltaHandlerModule) {
    recentDeltaHandlerModule = require("../server/atlas-recent-delta-read-handler.js");
  }
  return recentDeltaHandlerModule;
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

const PUBLIC_RUNTIME_IDENTITY_SCHEMA = "atlas-runtime-identity/v1";

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

const recentDeltaReadHandler = createLazyHandler(() => {
  const { createRecentDeltaReadHandler } = getRecentDeltaHandlerModule();
  return createRecentDeltaReadHandler({ clientFactory:getPostgresClientFactory() });
});

const runtimeExclusionsReadHandler = createLazyHandler(() => {
  const { createRuntimeExclusionsReadHandler } = getRuntimeExclusionsHandlerModule();
  return createRuntimeExclusionsReadHandler({ clientFactory:getPostgresClientFactory() });
});

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
for (const name of [
  "RECENT_DELTA_SCHEMA",
  "RECENT_DELTA_LIMIT",
  "recentDeltaTableCoverage",
  "readRecentDelta"
]) defineLazyExport(name,getRecentDeltaServiceModule);
defineLazyExport("createRecentDeltaReadHandler",getRecentDeltaHandlerModule);
module.exports.PUBLIC_RUNTIME_IDENTITY_SCHEMA = PUBLIC_RUNTIME_IDENTITY_SCHEMA;
module.exports.publicRuntimeIdentity = publicRuntimeIdentity;
module.exports.createPublicRuntimeIdentityHandler = createPublicRuntimeIdentityHandler;
for (const name of [
  "RUNTIME_EXCLUSIONS_SCHEMA",
  "readRuntimeExclusions"
]) defineLazyExport(name,getRuntimeExclusionsServiceModule);
defineLazyExport("createRuntimeExclusionsReadHandler",getRuntimeExclusionsHandlerModule);
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
