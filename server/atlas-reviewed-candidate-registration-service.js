"use strict";

const {
  admitRegistrationQueueCandidate,
  bindRegistrationQueueCandidate
} = require("./atlas-registration-queue-read-service.js");
const {
  recordReviewRevision,
  queueApprovedRevision,
  loadLatestReviewRevision,
  loadRegistrationState,
  assertHumanApproved,
  setRegistrationState,
  TERMINAL_REGISTRATION
} = require("./atlas-reviewed-candidate-service.js");
const {
  prepareAnyHumanAuthoringRequest,
  applyPreparedWithinTransaction,
  lockRequestIds
} = require("./atlas-human-authoring-service.js");
const { readLedger, manifestHash } = require("./atlas-authoring-manifest-service.js");

const NON_APPROVED_REGISTRATION_STATE = Object.freeze({
  PENDING:"NOT_READY",
  IN_REVIEW:"NOT_READY",
  HOLD:"BLOCKED",
  REJECTED:"NOT_APPLICABLE",
  DUPLICATE_EXISTING:"NOT_APPLICABLE"
});

function text(value) {
  return String(value ?? "").normalize("NFC").trim();
}

function requiredCandidateRef(raw) {
  const candidate_id = text(raw?.candidate_id);
  const review_revision = Number(raw?.review_revision ?? raw?.revision);
  if (!candidate_id) throw new Error("CANDIDATE_ID_REQUIRED");
  if (!Number.isInteger(review_revision) || review_revision < 1) throw new Error("REVIEW_REVISION_REQUIRED");
  return Object.freeze({ candidate_id, review_revision });
}

function registrationQueueCandidateFromReview(review) {
  const payload = review?.reviewed_payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("CANDIDATE_REVIEWED_PAYLOAD_INVALID");
  }
  const request = payload.authoring_request && typeof payload.authoring_request === "object" && !Array.isArray(payload.authoring_request)
    ? payload.authoring_request
    : {};
  const person = request.person && typeof request.person === "object" && !Array.isArray(request.person)
    ? request.person
    : {};
  const name = text(payload.name || person.canonical_name_en || person.display_name_ko);
  if (!name) throw new Error("REGISTRATION_QUEUE_CANDIDATE_NAME_REQUIRED");
  const representativeDomain = text(
    payload.representative_domain ?? request.representative_domain ?? person.representative_domain
  ) || null;
  const priority = text(payload.priority ?? payload.legacy_priority) || null;
  return Object.freeze({
    candidate_id:text(review.candidate_id),
    name,
    representative_domain:representativeDomain,
    priority,
    review_metadata:Object.freeze({
      review_state:text(review.review_state) || null,
      review_checkpoint:text(review.review_checkpoint) || null,
      payload_hash:text(review.payload_hash) || null,
      origin:payload.origin == null ? null : text(payload.origin) || null
    })
  });
}

function reviewedAuthoringRequest(review) {
  const payload = review?.reviewed_payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("CANDIDATE_REVIEWED_PAYLOAD_INVALID");
  }
  const request = payload.authoring_request;
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new Error("CANDIDATE_AUTHORING_REQUEST_REQUIRED");
  }
  return request;
}

async function rollbackQuietly(client) {
  try { await client.query("rollback"); } catch {}
}

async function lockCandidate(client, candidateId) {
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-candidate-registration:${candidateId}`]);
}

function exactLedgerSnapshot(ledger, prepared, outcome) {
  if (!ledger) throw new Error("CANDIDATE_AUTHORING_READBACK_LEDGER_MISSING");
  if (String(ledger.request_id) !== String(prepared.request.requestId)) throw new Error("CANDIDATE_AUTHORING_READBACK_REQUEST_DRIFT");
  if (String(ledger.manifest_hash) !== String(prepared.hash)) throw new Error("CANDIDATE_AUTHORING_READBACK_HASH_DRIFT");
  if (String(ledger.manifest_schema) !== String(prepared.schema)) throw new Error("CANDIDATE_AUTHORING_READBACK_SCHEMA_DRIFT");
  if (String(ledger.person_id) !== String(outcome.person_id)) throw new Error("CANDIDATE_AUTHORING_READBACK_PERSON_DRIFT");
  const actualRelationship = ledger.relationship_id == null ? null : String(ledger.relationship_id);
  const expectedRelationship = outcome.relationship_id == null ? null : String(outcome.relationship_id);
  if (actualRelationship !== expectedRelationship) throw new Error("CANDIDATE_AUTHORING_READBACK_RELATIONSHIP_DRIFT");
  if (manifestHash(ledger.result_snapshot) !== manifestHash(outcome.result)) throw new Error("CANDIDATE_AUTHORING_READBACK_SNAPSHOT_DRIFT");
  return Object.freeze({
    request_id:String(ledger.request_id),
    person_id:String(ledger.person_id),
    relationship_id:actualRelationship,
    manifest_schema:String(ledger.manifest_schema),
    exact_snapshot:true
  });
}

async function markNonApprovedDecision(client, review) {
  const nextState = NON_APPROVED_REGISTRATION_STATE[review.review_state];
  if (!nextState) throw new Error("CANDIDATE_NON_APPROVED_STATE_INVALID");

  const current = await loadRegistrationState(client, {
    candidate_id:review.candidate_id,
    forUpdate:true
  });
  if (current && TERMINAL_REGISTRATION.has(String(current.registration_state))) {
    throw new Error("CANDIDATE_REVIEW_AFTER_TERMINAL_REGISTRATION");
  }

  if (!current) {
    await client.query(
      `insert into atlas_v2.person_candidate_registration_states(
         candidate_id,review_revision,registration_state,person_id,authoring_request_id,result_snapshot
       ) values($1,$2,$3,null,null,null)`,
      [review.candidate_id, review.revision, nextState]
    );
  } else {
    await client.query(
      `update atlas_v2.person_candidate_registration_states
          set review_revision=$2,
              registration_state=$3,
              person_id=null,
              authoring_request_id=null,
              result_snapshot=null,
              updated_at=now()
        where candidate_id=$1`,
      [review.candidate_id, review.revision, nextState]
    );
  }
  return Object.freeze({
    candidate_id:review.candidate_id,
    review_revision:review.revision,
    registration_state:nextState
  });
}

function createReviewedCandidateRegistrationService({
  client,
  prepare = prepareAnyHumanAuthoringRequest,
  applyPrepared = applyPreparedWithinTransaction,
  admitQueueCandidate = admitRegistrationQueueCandidate,
  bindQueueCandidate = bindRegistrationQueueCandidate
} = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  if (typeof prepare !== "function" || typeof applyPrepared !== "function") throw new Error("Candidate authoring primitives are required");
  if (typeof admitQueueCandidate !== "function") throw new Error("Candidate queue admission writer is required");
  if (typeof bindQueueCandidate !== "function") throw new Error("Candidate queue binder is required");

  return Object.freeze({
    async recordHumanReview(rawReview) {
      const state = text(rawReview?.review_state).toUpperCase();
      await client.query("begin isolation level serializable");
      try {
        const recorded = await recordReviewRevision(client, {
          ...rawReview,
          human_authorized:state === "APPROVED"
        });
        const latest = await loadLatestReviewRevision(client, {
          candidate_id:recorded.candidate_id,
          forUpdate:true
        });
        if (!latest || Number(latest.revision) < recorded.revision) throw new Error("CANDIDATE_LATEST_REVIEW_READBACK_FAILED");

        let registration = null;
        if (Number(latest.revision) === recorded.revision) {
          if (state === "APPROVED") {
            registration = await queueApprovedRevision(client, {
              candidate_id:recorded.candidate_id,
              review_revision:recorded.revision
            });
            await admitQueueCandidate(client, registrationQueueCandidateFromReview(latest));
          } else {
            registration = await markNonApprovedDecision(client, recorded);
          }
        }

        await client.query("commit");
        return Object.freeze({
          candidate_id:recorded.candidate_id,
          review_revision:recorded.revision,
          review_state:recorded.review_state,
          review_checkpoint:recorded.review_checkpoint,
          payload_hash:recorded.payload_hash,
          human_authorized:recorded.human_authorized,
          review_replay:recorded.replay,
          latest_revision:Number(latest.revision),
          registration_state:registration?.registration_state || null
        });
      } catch (error) {
        await rollbackQuietly(client);
        throw error;
      }
    },

    async applyQueued({ candidate_id, review_revision, transport = null } = {}) {
      const ref = requiredCandidateRef({ candidate_id, review_revision });
      await client.query("begin isolation level serializable");
      try {
        await lockCandidate(client, ref.candidate_id);
        const latest = await loadLatestReviewRevision(client, {
          candidate_id:ref.candidate_id,
          forUpdate:true
        });
        if (!latest) throw new Error("REVIEW_REVISION_NOT_FOUND");
        if (Number(latest.revision) !== ref.review_revision) throw new Error("CANDIDATE_REVIEW_REVISION_STALE");
        assertHumanApproved(latest);

        const registration = await loadRegistrationState(client, {
          candidate_id:ref.candidate_id,
          forUpdate:true
        });
        if (!registration) throw new Error("REGISTRATION_STATE_NOT_FOUND");
        if (Number(registration.review_revision) !== ref.review_revision) throw new Error("REGISTRATION_REVIEW_REVISION_STALE");

        const rawRequest = reviewedAuthoringRequest(latest);
        const prepared = prepare(rawRequest, { allowLegacyNamuWikiOmission:false });
        await lockRequestIds(client, [prepared.request.requestId]);

        if (TERMINAL_REGISTRATION.has(String(registration.registration_state))) {
          if (String(registration.authoring_request_id || "") !== String(prepared.request.requestId)) {
            throw new Error("CANDIDATE_REGISTERED_AUTHORING_REQUEST_DRIFT");
          }
          const replay = await applyPrepared(client, prepared, {
            transport,
            catalogCache:new Map(),
            allowLegacyNamuWikiOmission:false
          });
          if (replay.replay !== true) throw new Error("CANDIDATE_REGISTERED_AUTHORING_REPLAY_REQUIRED");
          const ledger = await readLedger(client, prepared.request.requestId);
          const readback = exactLedgerSnapshot(ledger, prepared, replay);
          if (String(registration.person_id || "") !== readback.person_id) {
            throw new Error("CANDIDATE_REGISTERED_PERSON_DRIFT");
          }
          await bindQueueCandidate(client, {
            candidate_id:ref.candidate_id,
            person_id:readback.person_id,
            required:false
          });
          await client.query("commit");
          return Object.freeze({
            candidate_id:ref.candidate_id,
            review_revision:ref.review_revision,
            review_checkpoint:String(latest.review_checkpoint),
            registration_state:String(registration.registration_state),
            person_id:readback.person_id,
            relationship_id:readback.relationship_id,
            authoring_request_id:readback.request_id,
            replay:true,
            exact_readback:true
          });
        }

        if (String(registration.registration_state) !== "QUEUED") {
          throw new Error(`CANDIDATE_REGISTRATION_NOT_QUEUED:${registration.registration_state}`);
        }

        await setRegistrationState(client, {
          ...ref,
          registration_state:"APPLYING"
        });

        const first = await applyPrepared(client, prepared, {
          transport,
          catalogCache:new Map(),
          allowLegacyNamuWikiOmission:false
        });
        const replay = await applyPrepared(client, prepared, {
          transport,
          catalogCache:new Map(),
          allowLegacyNamuWikiOmission:false
        });
        if (replay.replay !== true) throw new Error("CANDIDATE_AUTHORING_EXACT_READBACK_REPLAY_REQUIRED");

        const ledger = await readLedger(client, prepared.request.requestId);
        const readback = exactLedgerSnapshot(ledger, prepared, replay);
        if (String(first.person_id) !== readback.person_id) throw new Error("CANDIDATE_AUTHORING_PERSON_DRIFT");
        await bindQueueCandidate(client, {
          candidate_id:ref.candidate_id,
          person_id:readback.person_id,
          required:false
        });

        const resultSnapshot = Object.freeze({
          version:1,
          candidate_id:ref.candidate_id,
          review_revision:ref.review_revision,
          review_checkpoint:String(latest.review_checkpoint),
          review_payload_hash:String(latest.payload_hash),
          authoring:Object.freeze({
            request_id:readback.request_id,
            manifest_schema:readback.manifest_schema,
            person_id:readback.person_id,
            relationship_id:readback.relationship_id,
            first_apply_replay:first.replay === true,
            exact_readback_replay:true
          })
        });

        await setRegistrationState(client, {
          ...ref,
          registration_state:"REGISTERED",
          person_id:readback.person_id,
          authoring_request_id:readback.request_id,
          result_snapshot:resultSnapshot
        });

        await client.query("commit");
        return Object.freeze({
          candidate_id:ref.candidate_id,
          review_revision:ref.review_revision,
          review_checkpoint:String(latest.review_checkpoint),
          registration_state:"REGISTERED",
          person_id:readback.person_id,
          relationship_id:readback.relationship_id,
          authoring_request_id:readback.request_id,
          replay:false,
          exact_readback:true,
          result_snapshot:resultSnapshot
        });
      } catch (error) {
        await rollbackQuietly(client);
        throw error;
      }
    }
  });
}

module.exports = Object.freeze({
  NON_APPROVED_REGISTRATION_STATE,
  requiredCandidateRef,
  registrationQueueCandidateFromReview,
  reviewedAuthoringRequest,
  exactLedgerSnapshot,
  createReviewedCandidateRegistrationService
});
