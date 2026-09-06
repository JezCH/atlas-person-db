"use strict";

const { createCorrectionApplyHandler } = require("../server/atlas-correction-apply-handler.js");
const { createCorrectionMigrationsHandler } = require("../server/atlas-correction-migrations-handler.js");

const correctionApplyHandler = createCorrectionApplyHandler();
const correctionMigrationsHandler = createCorrectionMigrationsHandler();
const MIGRATIONS_SURFACE = "migrations";

function normalizedSurface(req) {
  const value = req?.query?.__atlas_correction_surface;
  if (Array.isArray(value)) return "__invalid__";
  return String(value || "").trim();
}

async function handler(req, res) {
  const surface = normalizedSurface(req);
  if (!surface) return correctionApplyHandler(req, res);
  if (surface === MIGRATIONS_SURFACE) return correctionMigrationsHandler(req, res);

  res.statusCode = 404;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  return res.end(JSON.stringify({ ok: false, code: "ATLAS_CORRECTION_SURFACE_NOT_FOUND" }));
}

module.exports = handler;
module.exports.MIGRATIONS_SURFACE = MIGRATIONS_SURFACE;
module.exports.normalizedSurface = normalizedSurface;
module.exports.createCorrectionApplyHandler = createCorrectionApplyHandler;
module.exports.createCorrectionMigrationsHandler = createCorrectionMigrationsHandler;
