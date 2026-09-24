"use strict";

const backfill = require("../data/namuwiki-reviewed-not-found-backfill.v1.json");
const reasonBackfill = require("../data/namuwiki-reviewed-not-found-reasons.v1.json");

const REVIEWED_ABSENT = "reviewed_absent";
const LEGACY_UNVERIFIED = "legacy_unverified";
const REVIEWED_NOT_FOUND_BACKFILL_IDS = new Set(
  Array.isArray(backfill?.person_ids) ? backfill.person_ids.map((id) => String(id).toLowerCase()) : []
);
const REVIEWED_NOT_FOUND_REASON_BY_ID = Object.freeze(
  Object.fromEntries(Object.entries(reasonBackfill?.by_person_id || {}).map(([id,reason]) => [String(id).toLowerCase(), String(reason)]))
);

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

function reasonFor({ personId, status, audited = false } = {}) {
  if (stateFor({ personId, status, audited }) !== REVIEWED_ABSENT) return null;
  const id = String(personId || "").trim().toLowerCase();
  return REVIEWED_NOT_FOUND_REASON_BY_ID[id] || null;
}

module.exports = Object.freeze({
  REVIEWED_ABSENT,
  LEGACY_UNVERIFIED,
  REVIEWED_NOT_FOUND_BACKFILL_IDS,
  REVIEWED_NOT_FOUND_REASON_BY_ID,
  NOT_FOUND_REVIEW_AUDIT_SQL,
  stateFor,
  reasonFor
});
