"use strict";

const { createPostgresClient } = require("../server/atlas-postgres-client.js");
const { createHumanAuthoringHandler } = require("../server/atlas-human-authoring-handler.js");
const { createNamuWikiLinkHandler } = require("../server/atlas-namuwiki-link-handler.js");

const humanAuthoringHandler = createHumanAuthoringHandler({ clientFactory:createPostgresClient });
const namuWikiLinkHandler = createNamuWikiLinkHandler({ createClient:createPostgresClient });

function selectAuthoringSurface(req) {
  const direct = req?.query?.__atlas_authoring_surface;
  if (Array.isArray(direct)) return direct.length === 1 ? String(direct[0] || "").trim() : "__INVALID_MULTI__";
  if (direct != null) return String(direct).trim();
  const rawUrl = String(req?.url || "").trim();
  if (!rawUrl) return "";
  try {
    const parsed = new URL(rawUrl, "http://atlas.local");
    return String(parsed.searchParams.get("__atlas_authoring_surface") || "").trim();
  } catch {
    return "";
  }
}

module.exports = async function consolidatedAuthoringHandler(req, res) {
  const surface = selectAuthoringSurface(req);
  let handler = humanAuthoringHandler;
  let failureLabel = "ATLAS_HUMAN_AUTHORING_FAILURE";
  if (surface === "namuwiki-link") {
    handler = namuWikiLinkHandler;
    failureLabel = "ATLAS_NAMUWIKI_LINK_FAILURE";
  } else if (surface) {
    res.statusCode = 404;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("cache-control", "no-store");
    res.end(JSON.stringify({ ok:false, code:"ATLAS_AUTHORING_SURFACE_NOT_FOUND" }));
    return;
  }

  const originalEnd = res.end.bind(res);
  res.end = function loggedEnd(body, ...args) {
    if (Number(res.statusCode) >= 400) {
      try {
        const failure = JSON.parse(String(body || "{}"));
        console.error(failureLabel, JSON.stringify({
          status:Number(res.statusCode),
          code:failure?.code || null,
          failed_index:Number.isInteger(failure?.failed_index) ? failure.failed_index : null,
          manifest_path:failure?.manifest_path || null,
          person_id:failure?.person_id || null
        }));
      } catch {
        console.error(failureLabel, JSON.stringify({ status:Number(res.statusCode), code:"UNPARSEABLE_ERROR_RESPONSE" }));
      }
    }
    return originalEnd(body, ...args);
  };
  return handler(req, res);
};

module.exports.selectAuthoringSurface = selectAuthoringSurface;
