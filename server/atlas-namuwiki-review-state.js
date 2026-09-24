"use strict";

const backfill = require("../data/namuwiki-reviewed-not-found-backfill.v1.json");
const reasonBackfill = require("../data/namuwiki-reviewed-not-found-reasons.v1.json");

const REVIEWED_ABSENT = "reviewed_absent";
const LEGACY_UNVERIFIED = "legacy_unverified";
const REVIEWED_ABSENT_UNCLASSIFIED = "reviewed_absent_unclassified";
const REVIEWED_NOT_FOUND_BACKFILL_IDS = new Set(
  Array.isArray(backfill?.person_ids) ? backfill.person_ids.map((id) => String(id).toLowerCase()) : []
);

const ABSENCE_REASON_BY_PERSON_ID = new Map();
for (const [reason, ids] of Object.entries(reasonBackfill?.categories || {})) {
  for (const id of Array.isArray(ids) ? ids : []) {
    const normalizedId = String(id || "").trim().toLowerCase();
    if (normalizedId) ABSENCE_REASON_BY_PERSON_ID.set(normalizedId, reason);
  }
}

const NOT_FOUND_REVIEW_AUDIT_SQL = `exists (
  select 1
    from atlas_v2.person_profile_mutation_audits pma
   where pma.person_id=p.id
     and pma.operation='set_person_external_reference'
     and pma.after_snapshot #>> '{external_reference,status}'='not_found'
)`;

function stateFor({ personId, status, audited = false } = {}) {
  const normalizedStatus = String(status || "").trim();
  if (normalizedStatus !== "not_found") return null;
  const id = String(personId || "").trim().toLowerCase();
  return audited || REVIEWED_NOT_FOUND_BACKFILL_IDS.has(id) ? REVIEWED_ABSENT : LEGACY_UNVERIFIED;
}

function absenceReasonFor({ personId, status, reviewed = false } = {}) {
  if (String(status || "").trim() !== "not_found" || reviewed !== true) return null;
  const id = String(personId || "").trim().toLowerCase();
  return ABSENCE_REASON_BY_PERSON_ID.get(id) || REVIEWED_ABSENT_UNCLASSIFIED;
}

module.exports = Object.freeze({
  REVIEWED_ABSENT,
  LEGACY_UNVERIFIED,
  REVIEWED_ABSENT_UNCLASSIFIED,
  REVIEWED_NOT_FOUND_BACKFILL_IDS,
  ABSENCE_REASON_BY_PERSON_ID,
  NOT_FOUND_REVIEW_AUDIT_SQL,
  stateFor,
  absenceReasonFor
});
