"use strict";

const { createAuditInventoryHandler } = require("../server/atlas-audit-inventory-handler.js");
const { createP11BaselineBCaptureHandler } = require("../server/atlas-p11-baseline-b-capture-handler.js");

const auditInventoryHandler = createAuditInventoryHandler();
const p11BaselineBCaptureHandler = createP11BaselineBCaptureHandler();
const P11_SURFACE = "p11-baseline-b-capture";

function normalizedSurface(req) {
  const value = req?.query?.__atlas_audit_surface;
  if (Array.isArray(value)) return "__invalid__";
  return String(value || "").trim();
}

async function handler(req, res) {
  const surface = normalizedSurface(req);
  if (!surface) return auditInventoryHandler(req, res);
  if (surface === P11_SURFACE) return p11BaselineBCaptureHandler(req, res);

  res.statusCode = 404;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  return res.end(JSON.stringify({ ok: false, code: "ATLAS_AUDIT_SURFACE_NOT_FOUND" }));
}

module.exports = handler;
module.exports.P11_SURFACE = P11_SURFACE;
module.exports.normalizedSurface = normalizedSurface;
module.exports.createAuditInventoryHandler = createAuditInventoryHandler;
module.exports.createP11BaselineBCaptureHandler = createP11BaselineBCaptureHandler;
