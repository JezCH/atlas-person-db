"use strict";

const { requiredUuid } = require("./atlas-activity-semantic-key-v2.js");
const { TERMINAL_STATES } = require("./atlas-spatial-fact-contract.js");

const AUTHORITY = "atlas_v2.spatial_registration_dispositions";

function text(value) {
  return value == null ? "" : String(value).trim();
}

function normalizeReview(review) {
  if (!review || review.required !== true) throw new Error("SPATIAL_REGISTRATION_REVIEW_REQUIRED");
  const state = text(review.state);
  if (!TERMINAL_STATES.has(state)) throw new Error("SPATIAL_REGISTRATION_STATE_INVALID");
  const evidence = text(review.evidence);
  if (!evidence) throw new Error("SPATIAL_REGISTRATION_EVIDENCE_REQUIRED");
  return Object.freeze({ state, evidence });
}

async function currentSpatialRegistrationDisposition(client, polityId, { forUpdate = false } = {}) {
  const id = requiredUuid(polityId, "spatial_registration.polity_id");
  const result = await client.query(
    `select polity_id::text,state,evidence,authoring_request_id,materialized_at
       from atlas_v2.spatial_registration_dispositions
      where polity_id=$1::uuid${forUpdate ? " for update" : ""}`,
    [id]
  );
  if (result.rowCount !== 1) return null;
  const row = result.rows[0];
  return Object.freeze({
    required:true,
    polity_id:String(row.polity_id).toLowerCase(),
    state:String(row.state),
    evidence:String(row.evidence),
    authoring_request_id:String(row.authoring_request_id),
    authority:AUTHORITY,
    materialized:true,
    materialized_at:row.materialized_at
  });
}

async function materializeSpatialRegistrationDisposition(client, { polityId, requestId, review } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const id = requiredUuid(polityId, "spatial_registration.polity_id");
  const authoringRequestId = text(requestId);
  if (!authoringRequestId) throw new Error("SPATIAL_REGISTRATION_REQUEST_ID_REQUIRED");
  const normalized = normalizeReview(review);

  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-spatial-registration:${id}`]);
  await client.query(
    `insert into atlas_v2.spatial_registration_dispositions(polity_id,state,evidence,authoring_request_id)
     values($1::uuid,$2,$3,$4)
     on conflict(polity_id) do nothing`,
    [id, normalized.state, normalized.evidence, authoringRequestId]
  );

  const live = await currentSpatialRegistrationDisposition(client, id, { forUpdate:true });
  if (!live) throw new Error("SPATIAL_REGISTRATION_MATERIALIZATION_MISSING");
  if (live.state !== normalized.state
    || live.evidence !== normalized.evidence
    || live.authoring_request_id !== authoringRequestId) {
    throw new Error("SPATIAL_REGISTRATION_MATERIALIZATION_CONFLICT");
  }
  return live;
}

async function verifySpatialRegistrationDisposition(client, snapshot) {
  if (!snapshot || snapshot.authority !== AUTHORITY || snapshot.materialized !== true) {
    throw new Error("SPATIAL_REGISTRATION_SNAPSHOT_INVALID");
  }
  const live = await currentSpatialRegistrationDisposition(client, snapshot.polity_id, { forUpdate:true });
  if (!live) throw new Error("SPATIAL_REGISTRATION_READBACK_MISSING");
  for (const key of ["polity_id","state","evidence","authoring_request_id","authority"]) {
    if (String(live[key]) !== String(snapshot[key])) throw new Error("SPATIAL_REGISTRATION_READBACK_DRIFT");
  }
  return live;
}

module.exports = Object.freeze({
  AUTHORITY,
  currentSpatialRegistrationDisposition,
  materializeSpatialRegistrationDisposition,
  verifySpatialRegistrationDisposition
});
