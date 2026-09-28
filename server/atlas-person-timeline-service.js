"use strict";

const DISPOSITIONS = Object.freeze([
  "timeline",
  "chronology_unresolved",
  "legendary",
  "mythical",
  "other_reviewed_exclusion"
]);
const DISPOSITION_SET = new Set(DISPOSITIONS);
const YEAR_MIN = -10000;
const YEAR_MAX = 9999;

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function normalizeYear(value, code) {
  if (value == null || value === "") return null;
  const year = Number(value);
  if (!Number.isInteger(year) || year < YEAR_MIN || year > YEAR_MAX || year === 0) throw new Error(code);
  return year;
}

function normalizeEvidence(value) {
  if (value == null) return Object.freeze({});
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("PERSON_TIMELINE_REVIEW_EVIDENCE_INVALID");
  return Object.freeze({ ...value });
}

function normalizeTimelineDisposition(raw = {}) {
  const disposition = normalizeText(raw.disposition).toLowerCase();
  if (!DISPOSITION_SET.has(disposition)) throw new Error("PERSON_TIMELINE_DISPOSITION_UNSUPPORTED");

  const reasonText = normalizeText(raw.reason);
  const basisText = normalizeText(raw.basis_code);
  const traditionalYear = normalizeYear(raw.traditional_year, "PERSON_TIMELINE_TRADITIONAL_YEAR_INVALID");
  const traditionalYearAlternative = normalizeYear(raw.traditional_year_alternative, "PERSON_TIMELINE_TRADITIONAL_YEAR_ALTERNATIVE_INVALID");
  const reviewEvidence = normalizeEvidence(raw.review_evidence);

  if (disposition === "timeline") {
    if (reasonText || basisText || traditionalYear != null || traditionalYearAlternative != null || Object.keys(reviewEvidence).length) {
      throw new Error("PERSON_TIMELINE_INCLUDED_PAYLOAD_MUST_BE_EMPTY");
    }
    return Object.freeze({
      disposition,
      reason:null,
      basis_code:null,
      traditional_year:null,
      traditional_year_alternative:null,
      review_evidence:Object.freeze({})
    });
  }

  if (!reasonText) throw new Error("PERSON_TIMELINE_EXCLUSION_REASON_REQUIRED");
  return Object.freeze({
    disposition,
    reason:reasonText,
    basis_code:basisText || null,
    traditional_year:traditionalYear,
    traditional_year_alternative:traditionalYearAlternative,
    review_evidence:reviewEvidence
  });
}

function normalizeRow(row) {
  if (!row) return null;
  return Object.freeze({
    person_id:String(row.person_id).toLowerCase(),
    disposition:String(row.disposition),
    reason:row.reason == null ? null : String(row.reason),
    basis_code:row.basis_code == null ? null : String(row.basis_code),
    traditional_year:row.traditional_year == null ? null : Number(row.traditional_year),
    traditional_year_alternative:row.traditional_year_alternative == null ? null : Number(row.traditional_year_alternative),
    review_evidence:Object.freeze(
      row.review_evidence && typeof row.review_evidence === "object" && !Array.isArray(row.review_evidence)
        ? { ...row.review_evidence }
        : {}
    )
  });
}

async function currentTimelineDisposition(client, personId, { forUpdate = false } = {}) {
  const result=await client.query(
    `select person_id::text,disposition,reason,basis_code,traditional_year,
            traditional_year_alternative,review_evidence
       from atlas_v2.person_timeline_dispositions
      where person_id=$1::uuid${forUpdate ? " for update" : ""}`,
    [personId]
  );
  return normalizeRow(result.rows?.[0] || null);
}

function sameTimelineDisposition(left, right) {
  if (!left || !right) return false;
  return left.disposition === right.disposition
    && left.reason === right.reason
    && left.basis_code === right.basis_code
    && left.traditional_year === right.traditional_year
    && left.traditional_year_alternative === right.traditional_year_alternative
    && JSON.stringify(left.review_evidence || {}) === JSON.stringify(right.review_evidence || {});
}

async function setTimelineDisposition(client, personId, raw) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");
  const next = normalizeTimelineDisposition(raw);
  const current = await currentTimelineDisposition(client, personId, { forUpdate:true });

  const expected = raw?.expected_current_disposition;
  if (expected != null) {
    const normalizedExpected = normalizeTimelineDisposition(expected);
    if (!sameTimelineDisposition(current, { person_id:personId, ...normalizedExpected })) {
      throw new Error("PERSON_TIMELINE_EXPECTED_CURRENT_MISMATCH");
    }
  }

  const nextRow = Object.freeze({ person_id:String(personId).toLowerCase(), ...next });
  if (sameTimelineDisposition(current, nextRow)) {
    return Object.freeze({ replay:true, before:current, after:current });
  }

  const result=await client.query(
    `insert into atlas_v2.person_timeline_dispositions(
       person_id,disposition,reason,basis_code,traditional_year,
       traditional_year_alternative,review_evidence,updated_at
     ) values($1::uuid,$2,$3,$4,$5,$6,$7::jsonb,now())
     on conflict (person_id) do update
       set disposition=excluded.disposition,
           reason=excluded.reason,
           basis_code=excluded.basis_code,
           traditional_year=excluded.traditional_year,
           traditional_year_alternative=excluded.traditional_year_alternative,
           review_evidence=excluded.review_evidence,
           updated_at=now()
     returning person_id::text,disposition,reason,basis_code,traditional_year,
               traditional_year_alternative,review_evidence`,
    [
      personId,
      next.disposition,
      next.reason,
      next.basis_code,
      next.traditional_year,
      next.traditional_year_alternative,
      JSON.stringify(next.review_evidence)
    ]
  );
  const after=normalizeRow(result.rows?.[0]);
  if (!sameTimelineDisposition(after, nextRow)) throw new Error("PERSON_TIMELINE_VERIFICATION_FAILED");
  return Object.freeze({ replay:false, before:current, after });
}

module.exports=Object.freeze({
  DISPOSITIONS,
  DISPOSITION_SET,
  normalizeTimelineDisposition,
  currentTimelineDisposition,
  sameTimelineDisposition,
  setTimelineDisposition
});
