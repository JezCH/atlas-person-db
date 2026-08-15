"use strict";

const { DETECTOR_VERSION } = require("./atlas-duplicate-detector.js");

const REVALIDATION_REQUIREMENT_VERSION = "p10-revalidation-requirement/v1";
const TERMINAL_DECISIONS = Object.freeze(new Set(["MERGE", "KEEP_SEPARATE"]));

function pairKey(low, high) {
  return `${String(low)}|${String(high)}`;
}

function requirementEvidence(candidate, requirementKey, requirementVersion) {
  const evidence = Array.isArray(candidate?.evidence) ? candidate.evidence : [];
  return evidence.find((item) =>
    item?.kind === "P10_REVALIDATION_REQUIREMENT"
    && item.requirement_key === requirementKey
    && item.requirement_version === requirementVersion
  ) || null;
}

async function inspectPersonDuplicateRevalidationReadiness(client) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");

  const table = await client.query(`select to_regclass('atlas_v2.person_duplicate_revalidation_requirements')::text as requirements`);
  if (!table.rows[0]?.requirements) {
    return Object.freeze({
      ready: false,
      detector_version: DETECTOR_VERSION,
      requirement_version: REVALIDATION_REQUIREMENT_VERSION,
      blockers: Object.freeze(["P10_REVALIDATION_REQUIREMENT_SCHEMA_MISSING"]),
      summary: Object.freeze({ active_requirements: 0, active_candidates: 0, terminal_candidates: 0, pending_candidates: 0 })
    });
  }

  const requirementsResult = await client.query(`
    select requirement_key,person_low_id,person_high_id,requirement_state,requirement_version,
           prior_outcome,source_artifact,source_decision_id,evidence_snapshot
      from atlas_v2.person_duplicate_revalidation_requirements
     where requirement_state='ACTIVE'
     order by requirement_key`);
  const candidatesResult = await client.query(`
    select id,person_low_id,person_high_id,candidate_state,current_decision,confidence,evidence,
           evidence_fingerprint,decision_evidence_fingerprint,detector_version,reviewed_at,review_count
      from atlas_v2.person_duplicate_candidates
     where candidate_state='ACTIVE'
     order by person_low_id,person_high_id`);
  const latestReviewsResult = await client.query(`
    select distinct on (candidate_id)
           candidate_id,decision,rationale,evidence_fingerprint,reviewed_at,id
      from atlas_v2.person_duplicate_reviews
     order by candidate_id,reviewed_at desc,id desc`);

  const requirements = requirementsResult.rows || [];
  const candidates = candidatesResult.rows || [];
  const latestReviewByCandidate = new Map((latestReviewsResult.rows || []).map((row) => [String(row.candidate_id), row]));
  const candidateByPair = new Map(candidates.map((row) => [pairKey(row.person_low_id, row.person_high_id), row]));
  const blockers = [];

  const requirementPersonIds = [...new Set(requirements.flatMap((row) => [String(row.person_low_id), String(row.person_high_id)]))];
  const liveRequirementPersonIds = new Set();
  if (requirementPersonIds.length) {
    const live = await client.query(`select id from atlas_v2.persons where id=any($1::uuid[]) order by id`, [requirementPersonIds]);
    for (const row of live.rows || []) liveRequirementPersonIds.add(String(row.id));
  }

  for (const requirement of requirements) {
    const requirementKey = String(requirement.requirement_key);
    const version = String(requirement.requirement_version);
    const low = String(requirement.person_low_id);
    const high = String(requirement.person_high_id);
    if (version !== REVALIDATION_REQUIREMENT_VERSION) blockers.push(`REQUIREMENT_VERSION_DRIFT:${requirementKey}:${version}`);
    if (!liveRequirementPersonIds.has(low)) blockers.push(`REQUIREMENT_PERSON_MISSING:${requirementKey}:${low}`);
    if (!liveRequirementPersonIds.has(high)) blockers.push(`REQUIREMENT_PERSON_MISSING:${requirementKey}:${high}`);

    const candidate = candidateByPair.get(pairKey(low, high));
    if (!candidate) {
      blockers.push(`REQUIREMENT_CANDIDATE_MISSING:${requirementKey}`);
      continue;
    }
    if (!requirementEvidence(candidate, requirementKey, version)) {
      blockers.push(`REQUIREMENT_EVIDENCE_MISSING:${requirementKey}:${candidate.id}`);
    }
    const currentDecision = candidate.current_decision == null ? null : String(candidate.current_decision);
    if (currentDecision && currentDecision !== String(requirement.prior_outcome)) {
      const review = latestReviewByCandidate.get(String(candidate.id));
      if (!String(review?.rationale || "").trim()) blockers.push(`REQUIREMENT_PRIOR_OUTCOME_OVERRIDE_WITHOUT_RATIONALE:${requirementKey}`);
    }
  }

  let terminalCandidates = 0;
  for (const candidate of candidates) {
    const candidateId = String(candidate.id);
    const decision = candidate.current_decision == null ? null : String(candidate.current_decision);
    if (String(candidate.detector_version) !== DETECTOR_VERSION) blockers.push(`CANDIDATE_DETECTOR_VERSION_STALE:${candidateId}:${candidate.detector_version}`);
    if (!TERMINAL_DECISIONS.has(decision)) {
      blockers.push(decision === "REVIEW" ? `CANDIDATE_REVIEW_PENDING:${candidateId}` : `CANDIDATE_UNREVIEWED:${candidateId}`);
      continue;
    }
    if (candidate.decision_evidence_fingerprint == null || String(candidate.decision_evidence_fingerprint) !== String(candidate.evidence_fingerprint)) {
      blockers.push(`CANDIDATE_DECISION_EVIDENCE_STALE:${candidateId}`);
      continue;
    }
    const review = latestReviewByCandidate.get(candidateId);
    if (!review) {
      blockers.push(`CANDIDATE_LATEST_REVIEW_MISSING:${candidateId}`);
      continue;
    }
    if (String(review.decision) !== decision) blockers.push(`CANDIDATE_LATEST_REVIEW_DECISION_MISMATCH:${candidateId}`);
    if (String(review.evidence_fingerprint) !== String(candidate.evidence_fingerprint)) blockers.push(`CANDIDATE_LATEST_REVIEW_EVIDENCE_STALE:${candidateId}`);
    if (
      String(review.decision) === decision
      && String(review.evidence_fingerprint) === String(candidate.evidence_fingerprint)
      && String(candidate.detector_version) === DETECTOR_VERSION
    ) terminalCandidates += 1;
  }

  const uniqueBlockers = [...new Set(blockers)].sort();
  return Object.freeze({
    ready: uniqueBlockers.length === 0,
    detector_version: DETECTOR_VERSION,
    requirement_version: REVALIDATION_REQUIREMENT_VERSION,
    blockers: Object.freeze(uniqueBlockers),
    summary: Object.freeze({
      active_requirements: requirements.length,
      active_candidates: candidates.length,
      terminal_candidates: terminalCandidates,
      pending_candidates: candidates.length - terminalCandidates
    })
  });
}

async function assertPersonDuplicateRevalidationReadiness(client) {
  const readiness = await inspectPersonDuplicateRevalidationReadiness(client);
  if (!readiness.ready) {
    const error = new Error(`P10_PERSON_DUPLICATE_REVALIDATION_INCOMPLETE:${readiness.blockers.join(";")}`);
    error.code = "P10_PERSON_DUPLICATE_REVALIDATION_INCOMPLETE";
    error.readiness = readiness;
    throw error;
  }
  return readiness;
}

module.exports = Object.freeze({
  REVALIDATION_REQUIREMENT_VERSION,
  TERMINAL_DECISIONS,
  pairKey,
  requirementEvidence,
  inspectPersonDuplicateRevalidationReadiness,
  assertPersonDuplicateRevalidationReadiness
});
