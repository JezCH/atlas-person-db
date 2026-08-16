"use strict";

const { createCorrectionApplyHandler } = require("../server/atlas-correction-apply-handler.js");
const { createAuthoritativeKoRepairHandler } = require("../server/atlas-authoritative-ko-repair-handler.js");

const correctionApplyHandler = createCorrectionApplyHandler();
const authoritativeKoRepairHandler = createAuthoritativeKoRepairHandler();
const KO_REPAIR_SURFACE = "authoritative-ko-repair";
const SURFACE_PARAM = "__atlas_correction_surface";

function normalizedSurface(req) {
  const queryValue = req?.query?.[SURFACE_PARAM];
  if (Array.isArray(queryValue)) return "__invalid__";
  const normalizedQuery = String(queryValue || "").trim();
  if (normalizedQuery) return normalizedQuery;

  try {
    const parsed = new URL(String(req?.url || ""), "https://atlas.invalid");
    const values = parsed.searchParams.getAll(SURFACE_PARAM);
    if (values.length > 1) return "__invalid__";
    return String(values[0] || "").trim();
  } catch {
    return "";
  }
}

async function handler(req, res) {
  const surface = normalizedSurface(req);
  if (!surface) return correctionApplyHandler(req, res);
  if (surface === KO_REPAIR_SURFACE) return authoritativeKoRepairHandler(req, res);

  res.statusCode = 404;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  return res.end(JSON.stringify({ ok: false, code: "ATLAS_CORRECTION_SURFACE_NOT_FOUND" }));
}

module.exports = handler;
module.exports.KO_REPAIR_SURFACE = KO_REPAIR_SURFACE;
module.exports.SURFACE_PARAM = SURFACE_PARAM;
module.exports.normalizedSurface = normalizedSurface;
module.exports.createCorrectionApplyHandler = createCorrectionApplyHandler;
module.exports.createAuthoritativeKoRepairHandler = createAuthoritativeKoRepairHandler;
