"use strict";

const { createPostgresClient } = require("../server/atlas-postgres-client.js");
const { createNormalizedReadHandler } = require("../server/atlas-normalized-read-handler.js");
const { createPersonReadHandler } = require("../server/atlas-person-read-handler.js");
const { createCatalogReadHandler } = require("../server/atlas-catalog-read-handler.js");
const { createAdminInspectorHandler } = require("../server/atlas-admin-inspector-handler.js");
const { createAdminSystemStatusHandler } = require("../server/atlas-admin-system-status-handler.js");

const normalizedReadHandler = createNormalizedReadHandler({ clientFactory: createPostgresClient });
const personReadHandler = createPersonReadHandler({ clientFactory: createPostgresClient });
const catalogReadHandler = createCatalogReadHandler({ clientFactory: createPostgresClient });
const adminInspectorHandler = createAdminInspectorHandler({ clientFactory: createPostgresClient });
const adminSystemStatusHandler = createAdminSystemStatusHandler({ clientFactory: createPostgresClient });

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
  if (surface === "catalog") return catalogReadHandler(req, res);
  if (surface === "admin-inspector") return adminInspectorHandler(req, res);
  if (surface === "admin-system-status") return adminSystemStatusHandler(req, res);
  return normalizedReadHandler(req, res);
}

module.exports = consolidatedReadHandler;
module.exports.selectReadSurface = selectReadSurface;
