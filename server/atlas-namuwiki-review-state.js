"use strict";

const reviewedBackfill = require("../data/namuwiki-reviewed-not-found-backfill.v1.json");
const outcomeBackfill = require("../data/namuwiki-review-outcome-backfill.v1.json");

const REVIEWED_ABSENT = "reviewed_absent";
const LEGACY_UNVERIFIED = "legacy_unverified";
const TARGET_FOUND_URL_PENDING = "target_found_url_pending";
const TARGET_FOUND_LINK_PENDING = "target_found_link_pending";
const NO_EXACT_DOCUMENT = "no_exact_document";
const RELATED_OR_DERIVATIVE_ONLY = "related_or_derivative_only";
const REVIEWED_ABSENT_UNCLASSIFIED = "reviewed_absent_unclassified";

const REVIEWED_NOT_FOUND_BACKFILL_IDS = new Set(
  Array.isArray(reviewedBackfill?.person_ids) ? reviewedBackfill.person_ids.map((id) => String(id).toLowerCase()) : []
);
const REVIEW_OUTCOME_BY_PERSON_ID = new Map(
  Object.entries(outcomeBackfill?.outcomes || {}).map(([id, outcome]) => [String(id).toLowerCase(), String(outcome)])
);

const NOT_FOUND_REVIEW_AUDIT_SQL = `exists (
  select 1
    from atlas_v2.person_profile_mutation_audits pma
   where pma.person_id=p.id
     and pma.operation='set_person_external_reference'
     and pma.after_snapshot #>> '{external_reference,status}'='not_found'
)`;

function outcomeFor(personId) {
  const id = String(personId || "").trim().toLowerCase();
  return id ? REVIEW_OUTCOME_BY_PERSON_ID.get(id) || null : null;
}

function stateFor({ personId, status, audited = false } = {}) {
  const normalizedStatus = String(status || "").trim();
  if (normalizedStatus !== "not_found") return null;
  const id = String(personId || "").trim().toLowerCase();
  const outcome = outcomeFor(id);
  if (outcome === TARGET_FOUND_URL_PENDING) return TARGET_FOUND_URL_PENDING;
  if (outcome === TARGET_FOUND_LINK_PENDING) return TARGET_FOUND_LINK_PENDING;
  if (outcome === NO_EXACT_DOCUMENT || outcome === RELATED_OR_DERIVATIVE_ONLY) return REVIEWED_ABSENT;
  return audited || REVIEWED_NOT_FOUND_BACKFILL_IDS.has(id) ? REVIEWED_ABSENT : LEGACY_UNVERIFIED;
}

function reasonFor({ personId, status, audited = false } = {}) {
  const normalizedStatus = String(status || "").trim();
  if (normalizedStatus !== "not_found") return null;
  const outcome = outcomeFor(personId);
  if (outcome) return outcome;
  return stateFor({ personId, status, audited }) === REVIEWED_ABSENT
    ? REVIEWED_ABSENT_UNCLASSIFIED
    : LEGACY_UNVERIFIED;
}

module.exports = Object.freeze({
  REVIEWED_ABSENT,
  LEGACY_UNVERIFIED,
  TARGET_FOUND_URL_PENDING,
  TARGET_FOUND_LINK_PENDING,
  NO_EXACT_DOCUMENT,
  RELATED_OR_DERIVATIVE_ONLY,
  REVIEWED_ABSENT_UNCLASSIFIED,
  REVIEWED_NOT_FOUND_BACKFILL_IDS,
  REVIEW_OUTCOME_BY_PERSON_ID,
  NOT_FOUND_REVIEW_AUDIT_SQL,
  outcomeFor,
  stateFor,
  reasonFor
});
