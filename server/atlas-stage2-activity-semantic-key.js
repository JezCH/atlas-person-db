"use strict";

const crypto = require("node:crypto");
const contract = require("../contracts/stage2-domain-contract.v1.json");

const SEMANTIC_KEY_VERSION = "atlas-activity-semantic-key/v2";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GRANULARITIES = new Set(contract.temporal?.granularities || []);
const CALENDARS = new Set(contract.temporal?.calendars || []);

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

function normalizeBoundary(row, prefix) {
  const year = historicalYear(row?.[prefix], prefix);
  const month = optionalComponent(row?.[`${prefix}_month`], `${prefix}_month`, 1, 12);
  const day = optionalComponent(row?.[`${prefix}_day`], `${prefix}_day`, 1, 31);
  const granularity = String(row?.[`${prefix}_granularity`] || "").trim();
  const calendar = String(row?.[`${prefix}_calendar`] || "").trim();

  if (!GRANULARITIES.has(granularity)) throw new Error(`${prefix}_granularity is outside the Stage 2 temporal contract`);
  if (!CALENDARS.has(calendar)) throw new Error(`${prefix}_calendar is outside the Stage 2 temporal contract`);

  if (granularity === "year" && (month !== null || day !== null)) {
    throw new Error(`${prefix} year granularity cannot carry month/day components`);
  }
  if (granularity === "month" && (month === null || day !== null)) {
    throw new Error(`${prefix} month granularity requires month and forbids day`);
  }
  if (granularity === "day" && (month === null || day === null)) {
    throw new Error(`${prefix} day granularity requires month and day`);
  }

  return Object.freeze({ year, month, day, granularity, calendar });
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

function canonicalSemanticParts(row) {
  const start = normalizeBoundary(row, "activity_start");
  const end = normalizeBoundary(row, "activity_end");
  if (end.year < start.year) throw new Error("activity_end must not precede activity_start by historical year");

  return Object.freeze([
    SEMANTIC_KEY_VERSION,
    requiredUuid(row?.person_id, "person_id"),
    requiredUuid(row?.polity_id, "polity_id"),
    requiredUuid(row?.relation_type_id, "relation_type_id"),
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
  canonicalSemanticParts,
  semanticKey,
  semanticHash,
  readiness,
  normalizeBoundary
});
