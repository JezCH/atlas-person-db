"use strict";

// An ongoing interval has no terminal boundary. Verification is provenance,
// never a substitute terminal date and never part of semantic identity.
const EMPTY_END = Object.freeze({ year:null, month:null, day:null, granularity:null, certainty:null, calendar:null });

function ongoingAsOf(raw) {
  return raw?.ongoing_as_of ?? raw?.source_locator?.ongoing_as_of ?? null;
}

function validateOngoingActivity(raw, { human = false, requireProvenance = true, today = new Date().toISOString().slice(0, 10) } = {}) {
  if (raw?.chronology_status !== "ongoing") return false;
  const prefix = human ? "end" : "activity_end";
  const yearField = human ? "end_year" : "activity_end";
  for (const field of [yearField, ...["month","day","granularity","certainty","calendar"].map(s => `${prefix}_${s}`)]) {
    if (raw?.[field] != null) throw new Error("ONGOING_ACTIVITY_END_MUST_BE_NULL");
  }
  if (!requireProvenance) return true;
  const asOf = ongoingAsOf(raw);
  if (typeof asOf !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new Error("ONGOING_ACTIVITY_AS_OF_REQUIRED");
  const parsed = new Date(`${asOf}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== asOf || asOf > today) throw new Error("ONGOING_ACTIVITY_AS_OF_INVALID");
  const startYear = raw?.[human ? "start_year" : "activity_start"];
  const startMonth = raw?.[human ? "start_month" : "activity_start_month"];
  const startDay = raw?.[human ? "start_day" : "activity_start_day"];
  const [year, month, day] = asOf.split("-").map(Number);
  if (startYear > year || (startYear === year && (startMonth > month || (startMonth === month && startDay > day)))) throw new Error("ONGOING_ACTIVITY_START_AFTER_AS_OF");
  return true;
}

module.exports = Object.freeze({ EMPTY_END, ongoingAsOf, validateOngoingActivity });
