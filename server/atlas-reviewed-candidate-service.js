"use strict";

const crypto = require("node:crypto");
const { enqueueRegistrationQueueCandidate } = require("./atlas-registration-queue-service.js");

const REVIEW = new Set(["PENDING","IN_REVIEW","APPROVED","HOLD","REJECTED","DUPLICATE_EXISTING"]);
const REG = new Set(["NOT_READY","QUEUED","APPLYING","REGISTERED","VERIFIED_AUTHORING_ONLY","BLOCKED","NOT_APPLICABLE"]);
const TERMINAL_REGISTRATION = new Set(["REGISTERED","VERIFIED_AUTHORING_ONLY"]);
const REGISTRATION_TRANSITIONS = Object.freeze({
  NOT_READY:new Set(["NOT_READY","QUEUED","BLOCKED","NOT_APPLICABLE"]),
  QUEUED:new Set(["QUEUED","APPLYING","BLOCKED","NOT_APPLICABLE"]),
  APPLYING:new Set(["APPLYING","REGISTERED","VERIFIED_AUTHORING_ONLY","BLOCKED"]),
  REGISTERED:new Set(["REGISTERED"]),
  VERIFIED_AUTHORING_ONLY:new Set(["VERIFIED_AUTHORING_ONLY","REGISTERED"]),
  BLOCKED:new Set(["BLOCKED","QUEUED","NOT_APPLICABLE"]),
  NOT_APPLICABLE:new Set(["NOT_APPLICABLE","QUEUED"])
});

function text(value) {
  return String(value ?? "").normalize("NFC").trim();
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = stable(value[key]);
    return out;
  }
  return value;
}

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function normalizedCandidateRef(candidateId, reviewRevision) {
  const candidate_id = text(candidateId);
  const review_revision = Number(reviewRevision);
  if (!candidate_id) throw new Error("CANDIDATE_ID_REQUIRED");
  if (!Number.isInteger(review_revision) || review_revision < 1) throw new Error("REVIEW_REVISION_REQUIRED");
  return Object.freeze({ candidate_id, review_revision });
}

function normalizeReviewRevision(raw) {
  const { candidate_id, review_revision:revision } = normalizedCandidateRef(raw?.candidate_id, raw?.revision);
  const review_state = text(raw?.review_state).toUpperCase();
  const review_checkpoint = text(raw?.review_checkpoint);
  if (!REVIEW.has(review_state)) throw new Error("REVIEW_STATE_INVALID");
  if (!review_checkpoint) throw new Error("REVIEW_CHECKPOINT_REQUIRED");
  const human_authorized = raw?.human_authorized === true;
  if (review_state === "APPROVED" && !human_authorized) throw new Error("REVIEW_APPROVAL_REQUIRES_HUMAN_AUTHORIZATION");
  const reviewed_payload = stable(raw?.reviewed_payload ?? {});
  return Object.freeze({
    candidate_id,
    revision,
    review_state,
    review_checkpoint,
    reviewed_payload,
    payload_hash:hash(reviewed_payload),
    human_authorized
  });
}

async function lockCandidate(client, candidateId) {
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-review:${candidateId}`]);
}

async function loadReviewRevision(client, { candidate_id, review_revision, forUpdate = false } = {}) {
  const ref = normalizedCandidateRef(candidate_id, review_revision);
  const result = await client.query(
    `select candidate_id,revision,review_state,review_checkpoint,reviewed_payload,payload_hash,human_authorized,reviewed_at
       from atlas_v2.person_candidate_review_revisions
      where candidate_id=$1 and revision=$2
      ${forUpdate ? "for update" : ""}`,
    [ref.candidate_id, ref.review_revision]
  );
  return result.rows[0] || null;
}

async function loadLatestReviewRevision(client, { candidate_id, forUpdate = false } = {}) {
  const id = text(candidate_id);
  if (!id) throw new Error("CANDIDATE_ID_REQUIRED");
  const result = await client.query(
    `select candidate_id,revision,review_state,review_checkpoint,reviewed_payload,payload_hash,human_authorized,reviewed_at
       from atlas_v2.person_candidate_review_revisions
      where candidate_id=$1
      order by revision desc
      limit 1
      ${forUpdate ? "for update" : ""}`,
    [id]
  );
  return result.rows[0] || null;
}

async function loadRegistrationState(client, { candidate_id, forUpdate = false } = {}) {
  const id = text(candidate_id);
  if (!id) throw new Error("CANDIDATE_ID_REQUIRED");
  const result = await client.query(
    `select candidate_id,review_revision,registration_state,person_id::text,authoring_request_id,result_snapshot,updated_at
       from atlas_v2.person_candidate_registration_states
      where candidate_id=$1
      ${forUpdate ? "for update" : ""}`,
    [id]
  );
  return result.rows[0] || null;
}

async function recordReviewRevision(client, raw) {
  const review = normalizeReviewRevision(raw);
  await lockCandidate(client, review.candidate_id);
  const existing = await loadReviewRevision(client, {
    candidate_id:review.candidate_id,
    review_revision:review.revision,
    forUpdate:true
  });
  if (existing) {
    if (
      existing.review_state !== review.review_state ||
      existing.review_checkpoint !== review.review_checkpoint ||
      existing.payload_hash !== review.payload_hash ||
      existing.human_authorized !== review.human_authorized
    ) throw new Error("REVIEW_REVISION_IMMUTABLE");
    return Object.freeze({ ...review, replay:true });
  }
  await client.query(
    `insert into atlas_v2.person_candidate_review_revisions(
       candidate_id,revision,review_state,review_checkpoint,reviewed_payload,payload_hash,human_authorized
     ) values($1,$2,$3,$4,$5::jsonb,$6,$7)`,
    [
      review.candidate_id,
      review.revision,
      review.review_state,
      review.review_checkpoint,
      JSON.stringify(review.reviewed_payload),
      review.payload_hash,
      review.human_authorized
    ]
  );
  return Object.freeze({ ...review, replay:false });
}

function assertHumanApproved(review) {
  if (!review) throw new Error("REVIEW_REVISION_NOT_FOUND");
  if (review.review_state !== "APPROVED" || review.human_authorized !== true) {
    throw new Error("REGISTRATION_REQUIRES_HUMAN_APPROVED_REVISION");
  }
}

async function queueApprovedRevision(client, { candidate_id, review_revision } = {}) {
  const ref = normalizedCandidateRef(candidate_id, review_revision);
  await lockCandidate(client, ref.candidate_id);
  const review = await loadReviewRevision(client, { ...ref, forUpdate:true });
  assertHumanApproved(review);

  const current = await loadRegistrationState(client, { candidate_id:ref.candidate_id, forUpdate:true });
  if (!current) {
    const payload = review.reviewed_payload && typeof review.reviewed_payload === "object" ? review.reviewed_payload : {};
    const authoring = payload.authoring_request && typeof payload.authoring_request === "object" ? payload.authoring_request : {};
    const person = authoring.person && typeof authoring.person === "object" ? authoring.person : {};
    const name = text(payload.name || person.canonical_name_en || person.display_name_ko);
    const representativeDomain = payload.representative_domain ?? authoring.representative_domain ?? person.representative_domain ?? null;
    await enqueueRegistrationQueueCandidate(client, {
      candidate_id:ref.candidate_id,
      review_revision:ref.review_revision,
      name,
      representative_domain:representativeDomain,
      priority:payload.priority ?? null,
      metadata:{ review_checkpoint:review.review_checkpoint, review_state:review.review_state }
    });
    return Object.freeze({ ...ref, registration_state:"QUEUED", replay:false });
  }

  const currentRevision = Number(current.review_revision);
  const currentState = String(current.registration_state);
  if (currentRevision === ref.review_revision && currentState === "QUEUED") {
    return Object.freeze({ ...ref, registration_state:"QUEUED", replay:true });
  }
  if (currentRevision === ref.review_revision && TERMINAL_REGISTRATION.has(currentState)) {
    return Object.freeze({
      ...ref,
      registration_state:currentState,
      person_id:current.person_id || null,
      authoring_request_id:current.authoring_request_id || null,
      replay:true
    });
  }
  if (currentState === "APPLYING") throw new Error("REGISTRATION_ALREADY_APPLYING");
  if (TERMINAL_REGISTRATION.has(currentState)) throw new Error("REGISTRATION_TERMINAL_REVISION_CONFLICT");

  await client.query(
    `update atlas_v2.person_candidate_registration_states
        set review_revision=$2,
            registration_state='QUEUED',
            authoring_request_id=null,
            result_snapshot=null,
            updated_at=now()
      where candidate_id=$1 and person_id is null`,
    [ref.candidate_id, ref.review_revision]
  );
  return Object.freeze({ ...ref, registration_state:"QUEUED", replay:false });
}

function assertRegistrationTransition(currentState, nextState) {
  if (!REG.has(nextState)) throw new Error("REGISTRATION_STATE_INVALID");
  const allowed = REGISTRATION_TRANSITIONS[currentState];
  if (!allowed || !allowed.has(nextState)) {
    throw new Error(`REGISTRATION_STATE_TRANSITION_INVALID:${currentState}->${nextState}`);
  }
}

async function setRegistrationState(client, {
  candidate_id,
  review_revision,
  registration_state,
  person_id = null,
  authoring_request_id = null,
  result_snapshot = null
} = {}) {
  const ref = normalizedCandidateRef(candidate_id, review_revision);
  const state = text(registration_state).toUpperCase();
  if (!REG.has(state)) throw new Error("REGISTRATION_STATE_INVALID");

  await lockCandidate(client, ref.candidate_id);
  const review = await loadReviewRevision(client, { ...ref, forUpdate:true });
  if (!review) throw new Error("REVIEW_REVISION_NOT_FOUND");
  if (["QUEUED","APPLYING","REGISTERED","VERIFIED_AUTHORING_ONLY"].includes(state)) assertHumanApproved(review);

  const current = await loadRegistrationState(client, { candidate_id:ref.candidate_id, forUpdate:true });
  if (!current) throw new Error("REGISTRATION_STATE_NOT_FOUND");
  if (Number(current.review_revision) !== ref.review_revision) throw new Error("REGISTRATION_REVIEW_REVISION_STALE");
  assertRegistrationTransition(String(current.registration_state), state);

  const result = await client.query(
    `update atlas_v2.person_candidate_registration_states
        set registration_state=$3,
            person_id=$4::uuid,
            authoring_request_id=$5,
            result_snapshot=$6::jsonb,
            updated_at=now()
      where candidate_id=$1 and review_revision=$2
      returning candidate_id`,
    [
      ref.candidate_id,
      ref.review_revision,
      state,
      person_id,
      authoring_request_id,
      result_snapshot == null ? null : JSON.stringify(result_snapshot)
    ]
  );
  if (result.rowCount !== 1) throw new Error("REGISTRATION_STATE_UPDATE_FAILED");
  return Object.freeze({ ...ref, registration_state:state });
}

module.exports = Object.freeze({
  REVIEW,
  REG,
  TERMINAL_REGISTRATION,
  REGISTRATION_TRANSITIONS,
  normalizeReviewRevision,
  loadReviewRevision,
  loadLatestReviewRevision,
  loadRegistrationState,
  recordReviewRevision,
  queueApprovedRevision,
  setRegistrationState,
  assertHumanApproved,
  assertRegistrationTransition
});
