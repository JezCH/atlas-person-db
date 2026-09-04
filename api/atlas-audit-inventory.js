"use strict";

// Read-only Production audit routing surface; this module performs no mutation.
// Operational no-op: force an exact-SHA Production deployment for reviewed Stage 2 audit evidence.
const { createAuditInventoryHandler } = require("../server/atlas-audit-inventory-handler.js");
const { createP11BaselineBCaptureHandler } = require("../server/atlas-p11-baseline-b-capture-handler.js");
const { createPolityReferenceAuditHandler } = require("../server/atlas-polity-reference-audit-handler.js");

const auditInventoryHandler = createAuditInventoryHandler();
const p11BaselineBCaptureHandler = createP11BaselineBCaptureHandler();
const polityReferenceAuditHandler = createPolityReferenceAuditHandler();
const P11_SURFACE = "p11-baseline-b-capture";
const POLITY_REFERENCE_SURFACE = "polity-reference-audit";
const POLITY_EVIDENCE_MARKER = "ATLAS_POLITY_REFERENCE_AUDIT_EVIDENCE_V1";
const MAX_EVIDENCE_TERMS = 20;
const MAX_EVIDENCE_TERM_LENGTH = 128;

function normalizedSurface(req) {
  const value = req?.query?.__atlas_audit_surface;
  if (Array.isArray(value)) return "__invalid__";
  return String(value || "").trim();
}

function normalizedEvidenceTerms(value) {
  if (!Array.isArray(value)) return [];
  const terms = [];
  const seen = new Set();
  for (const item of value.slice(0, MAX_EVIDENCE_TERMS)) {
    const term = String(item || "").trim().toLowerCase();
    if (!term || term.length > MAX_EVIDENCE_TERM_LENGTH || /[\u0000-\u001f\u007f]/.test(term) || seen.has(term)) continue;
    seen.add(term);
    terms.push(term);
  }
  return terms;
}

function polityEvidenceText(row) {
  const names = Array.isArray(row?.names) ? row.names.map((name) => String(name?.name || "")) : [];
  return [String(row?.canonical_key || ""), ...names].join("\n").toLowerCase();
}

function compactPolityEvidence(row) {
  return {
    polity_id: row.polity_id,
    canonical_key: row.canonical_key,
    polity_type: row.polity_type,
    historicity: row.historicity,
    names: Array.isArray(row.names) ? row.names.map((name) => ({ locale: name.locale, name: name.name, is_preferred: name.is_preferred })) : [],
    owned_reference_total: row.owned_reference_total,
    external_reference_total: row.external_reference_total,
    is_external_orphan: row.is_external_orphan,
    external_references: Array.isArray(row.external_references) ? row.external_references.filter((ref) => Number(ref?.count || 0) > 0) : []
  };
}

function withPolityEvidenceLogging(req, res, log = console.log) {
  const terms = normalizedEvidenceTerms(req?.body?.evidence_terms);
  if (terms.length === 0 || typeof res?.end !== "function") return res;
  const originalEnd = res.end.bind(res);
  let emitted = false;
  res.end = (body) => {
    if (!emitted) {
      emitted = true;
      try {
        const payload = JSON.parse(String(body || "{}"));
        if (payload?.ok === true && payload?.marker === "ATLAS_POLITY_REFERENCE_AUDIT_V1" && Array.isArray(payload.polities)) {
          const matches = payload.polities
            .filter((row) => terms.some((term) => polityEvidenceText(row).includes(term)))
            .map(compactPolityEvidence);
          log(`${POLITY_EVIDENCE_MARKER} ${JSON.stringify({ deployment_sha: payload.deployment_sha, terms, match_count: matches.length, matches })}`);
        }
      } catch {}
    }
    return originalEnd(body);
  };
  return res;
}

async function handler(req, res) {
  const surface = normalizedSurface(req);
  if (!surface) return auditInventoryHandler(req, res);
  if (surface === P11_SURFACE) return p11BaselineBCaptureHandler(req, res);
  if (surface === POLITY_REFERENCE_SURFACE) return polityReferenceAuditHandler(req, withPolityEvidenceLogging(req, res));

  res.statusCode = 404;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  return res.end(JSON.stringify({ ok: false, code: "ATLAS_AUDIT_SURFACE_NOT_FOUND" }));
}

module.exports = handler;
module.exports.P11_SURFACE = P11_SURFACE;
module.exports.POLITY_REFERENCE_SURFACE = POLITY_REFERENCE_SURFACE;
module.exports.POLITY_EVIDENCE_MARKER = POLITY_EVIDENCE_MARKER;
module.exports.normalizedSurface = normalizedSurface;
module.exports.normalizedEvidenceTerms = normalizedEvidenceTerms;
module.exports.polityEvidenceText = polityEvidenceText;
module.exports.compactPolityEvidence = compactPolityEvidence;
module.exports.withPolityEvidenceLogging = withPolityEvidenceLogging;
module.exports.createAuditInventoryHandler = createAuditInventoryHandler;
module.exports.createP11BaselineBCaptureHandler = createP11BaselineBCaptureHandler;
module.exports.createPolityReferenceAuditHandler = createPolityReferenceAuditHandler;
