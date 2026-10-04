"use strict";

const { createPostgresClient } = require("../server/atlas-postgres-client.js");
const { createVercelMutationHandler } = require("../server/atlas-vercel-mutation-handler.js");
const { createPersonDomainHandler } = require("../server/atlas-person-domain-handler.js");
const { createPersonDomainV2CutoverHandler } = require("../server/atlas-person-domain-v2-cutover-handler.js");\nconst { createLegacyDomainRepairHandler } = require("../server/atlas-person-domain-v2-legacy-repair-handler.js");
const { createRuntimeCompileHandler } = require("../server/atlas-runtime-compile-handler.js");
const { createPersonPortraitHandler } = require("../server/atlas-person-portrait-handler.js");

const mutationHandler = createVercelMutationHandler({ clientFactory:createPostgresClient });
const personDomainHandler = createPersonDomainHandler({ clientFactory:createPostgresClient });
const personDomainV2CutoverHandler = createPersonDomainV2CutoverHandler({ clientFactory:createPostgresClient });\nconst legacyDomainRepairHandler = createLegacyDomainRepairHandler({ clientFactory:createPostgresClient });
const runtimeCompileHandler = createRuntimeCompileHandler({ clientFactory:createPostgresClient });
const personPortraitHandler = createPersonPortraitHandler({ clientFactory:createPostgresClient, allowedMethods:["PUT","DELETE"] });

function selectMutationSurface(req) {
  const direct = req?.query?.__atlas_mutation_surface;
  if (Array.isArray(direct)) return direct.length === 1 ? String(direct[0] || "").trim() : "";
  if (direct != null) return String(direct).trim();

  const rawUrl = String(req?.url || "").trim();
  if (!rawUrl) return "";
  try {
    const parsed = new URL(rawUrl, "http://atlas.local");
    return String(parsed.searchParams.get("__atlas_mutation_surface") || "").trim();
  } catch {
    return "";
  }
}

async function consolidatedMutationHandler(req, res) {
  const surface = selectMutationSurface(req);
  if (surface === "person-domain") return personDomainHandler(req, res);
  if (surface === "person-domain-v2-cutover") return personDomainV2CutoverHandler(req, res);\n  if (surface === "person-domain-v2-legacy-repair") return legacyDomainRepairHandler(req, res);
  if (surface === "person-portrait") return personPortraitHandler(req, res);
  if (surface === "runtime-compile") return runtimeCompileHandler(req, res);
  return mutationHandler(req, res);
}

module.exports = consolidatedMutationHandler;
module.exports.selectMutationSurface = selectMutationSurface;