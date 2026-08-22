"use strict";

const crypto = require("node:crypto");
const contract = require("../contracts/stage2-domain-contract.v1.json");

const SEMANTIC_KEY_VERSION = "atlas-activity-semantic-key/v2";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GRANULARITIES = new Set(contract.temporal?.granularities || []);
const CALENDARS = new Set(contract.temporal?.calendars || []);
const CERTAINTIES = new Set(contract.temporal?.certainties || []);

function requiredUuid(value, label) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!UUID_RE.test(normalized)) throw new Error(`${label} must be a valid UUID`);
  return normalized;
}

function optionalUuid(value, label) {
  if (value == null || String(value).trim() === "") return null;
  return requiredUuid(value, label);
}

function historicalYear(value, label) {
  const year = Number(value);
  if (!Number.isInteger(year) || year === 0 || year < -10000 || year > 9999) {
    throw new Error(`${label} must be a signed non-zero historical year`);
  }
  return year;
}

function optionalComponent(value, label, min, max) {
  if (value == null || value === "") return null;
  const component = Number(value);
  if (!Number.isInteger(component) || component < min || component > max) {
    throw new Error(`${label} must be an integer from ${min} to ${max}`);
  }
  return component;
}

function normalizeBoundary(row, prefix, { requireCertainty = false } = {}) {
  const year = historicalYear(row?.[prefix], prefix);
  const month = optionalComponent(row?.[`${prefix}_month`], `${prefix}_month`, 1, 12);
  const day = optionalComponent(row?.[`${prefix}_day`], `${prefix}_day`, 1, 31);
  const granularity = String(row?.[`${prefix}_granularity`] || "").trim();
  const calendar = String(row?.[`${prefix}_calendar`] || "").trim();
  const certainty = row?.[`${prefix}_certainty`] == null ? null : String(row[`${prefix}_certainty`]).trim();

  if (!GRANULARITIES.has(granularity)) throw new Error(`${prefix}_granularity is outside the Stage 2 temporal contract`);
  if (!CALENDARS.has(calendar)) throw new Error(`${prefix}_calendar is outside the Stage 2 temporal contract`);
  if (requireCertainty && !CERTAINTIES.has(certainty)) throw new Error(`${prefix}_certainty is outside the Stage 2 temporal contract`);
  if (certainty != null && !CERTAINTIES.has(certainty)) throw new Error(`${prefix}_certainty is outside the Stage 2 temporal contract`);

  if (granularity === "year" && (month !== null || day !== null)) {
    throw new Error(`${prefix} year granularity cannot carry month/day components`);
  }
  if (granularity === "month" && (month === null || day !== null)) {
    throw new Error(`${prefix} month granularity requires month and forbids day`);
  }
  if (granularity === "day" && (month === null || day === null)) {
    throw new Error(`${prefix} day granularity requires month and day`);
  }

  return Object.freeze({ year, month, day, granularity, calendar, certainty });
}

function assertKnownBoundaryOrder(start, end) {
  if (end.year < start.year) throw new Error("activity_end precedes activity_start by historical year");
  if (end.year !== start.year || end.calendar !== start.calendar) return;
  if (start.month !== null && end.month !== null && end.month < start.month) {
    throw new Error("activity_end precedes activity_start by known month component");
  }
  if (start.month !== null && end.month !== null && end.month === start.month && start.day !== null && end.day !== null && end.day < start.day) {
    throw new Error("activity_end precedes activity_start by known day component");
  }
}

function boundaryToken(boundary) {
  return [
    boundary.year,
    boundary.month == null ? "_" : boundary.month,
    boundary.day == null ? "_" : boundary.day,
    boundary.granularity,
    boundary.calendar
  ].join(":");
}

function normalizePrimaryPolityPair(row) {
  const polityId = optionalUuid(row?.polity_id, "polity_id");
  const relationTypeId = optionalUuid(row?.relation_type_id, "relation_type_id");
  if ((polityId == null) !== (relationTypeId == null)) {
    throw new Error("polity_id and relation_type_id must both be null or both be UUIDs");
  }
  return Object.freeze({ polityId, relationTypeId });
}

function canonicalSemanticParts(row) {
  const start = normalizeBoundary(row, "activity_start");
  const end = normalizeBoundary(row, "activity_end");
  assertKnownBoundaryOrder(start, end);
  const primary = normalizePrimaryPolityPair(row);

  return Object.freeze([
    SEMANTIC_KEY_VERSION,
    requiredUuid(row?.person_id, "person_id"),
    primary.polityId || "<NULL_POLITY>",
    primary.relationTypeId || "<NULL_RELATION>",
    optionalUuid(row?.role_id, "role_id") || "<NULL_ROLE>",
    requiredUuid(row?.period_basis_id, "period_basis_id"),
    boundaryToken(start),
    boundaryToken(end)
  ]);
}

function semanticKey(row) {
  return canonicalSemanticParts(row).join("\u001f");
}

function semanticHash(row) {
  return crypto.createHash("sha256").update(semanticKey(row)).digest("hex");
}

function readiness(row) {
  try {
    const key = semanticKey(row);
    return Object.freeze({ ready: true, key, hash: crypto.createHash("sha256").update(key).digest("hex"), reasons: [] });
  } catch (error) {
    return Object.freeze({ ready: false, key: null, hash: null, reasons: [String(error?.message || error)] });
  }
}

module.exports = Object.freeze({
  SEMANTIC_KEY_VERSION,
  UUID_RE,
  GRANULARITIES,
  CALENDARS,
  CERTAINTIES,
  requiredUuid,
  optionalUuid,
  historicalYear,
  optionalComponent,
  normalizePrimaryPolityPair,
  canonicalSemanticParts,
  semanticKey,
  semanticHash,
  readiness,
  normalizeBoundary,
  assertKnownBoundaryOrder
});
