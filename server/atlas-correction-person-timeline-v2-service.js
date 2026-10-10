"use strict";

// A narrowly-scoped, reviewed, GitHub-OIDC Correction Apply family.
// Uses the existing Person timeline writer; never rewrites Person or Activity identities.
const {
  normalizeTimelineDisposition,
  currentTimelineDisposition,
  sameTimelineDisposition,
  setTimelineDisposition
} = require("./atlas-person-timeline-service.js");
const {
  manifestHash, correctionLedgerExists, readLedger
} = require("./atlas-correction-ledger-service.js");

const MANIFEST_V2 = "atlas-correction-manifest/v2";
const MARKER_V2 = "ATLAS_CORRECTION_MANIFEST_V2";
const OPERATION_TYPE = "set_person_timeline_disposition";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredText(value, code) {
  const text = String(value == null ? "" : value).trim();
  if (!text) throw new Error(code);
  return text;
}
function uuid(value, code) {
  const id = requiredText(value, code).toLowerCase();
  if (!UUID_RE.test(id)) throw new Error(code);
  return id;
}
function requireOperation(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || raw.type !== OPERATION_TYPE) {
    throw new Error("CORRECTION_PERSON_TIMELINE_OPERATION_INVALID");
  }
  const personId = uuid(raw.person_id, "CORRECTION_PERSON_TIMELINE_PERSON_ID_INVALID");
  const expected = normalizeTimelineDisposition(raw.expected_current_disposition);
  if (expected.disposition !== "chronology_unresolved") {
    throw new Error("CORRECTION_PERSON_TIMELINE_EXPECTED_UNRESOLVED_REQUIRED");
  }
  const next = normalizeTimelineDisposition({ disposition: raw.replacement_disposition });
  if (next.disposition !== "timeline") throw new Error("CORRECTION_PERSON_TIMELINE_TARGET_NOT_TIMELINE");
  const activityIds = raw.expected_activity_ids;
  if (!Array.isArray(activityIds) || activityIds.length !== 3) {
    throw new Error("CORRECTION_PERSON_TIMELINE_THREE_ACTIVITIES_REQUIRED");
  }
  const ids = activityIds.map((value) => uuid(value, "CORRECTION_PERSON_TIMELINE_ACTIVITY_ID_INVALID")).sort();
  if (new Set(ids).size !== 3) throw new Error("CORRECTION_PERSON_TIMELINE_ACTIVITY_DUPLICATE");
  return Object.freeze({
    type: OPERATION_TYPE,
    case_id: requiredText(raw.case_id, "CORRECTION_PERSON_TIMELINE_CASE_REQUIRED"),
    person_id: personId,
    expected_current_disposition: expected,
    replacement_disposition: next.disposition,
    expected_activity_ids: Object.freeze(ids)
  });
}
function requireManifest(raw) {
  if (!raw || raw.schema !== MANIFEST_V2 || raw.review_status !== "approved") {
    throw new Error("CORRECTION_PERSON_TIMELINE_APPROVED_V2_REQUIRED");
  }
  const requestId = requiredText(raw.request_id, "CORRECTION_PERSON_TIMELINE_REQUEST_ID_REQUIRED");
  if (!Array.isArray(raw.operations) || raw.operations.length !== 1) {
    throw new Error("CORRECTION_PERSON_TIMELINE_SINGLE_OPERATION_REQUIRED");
  }
  return Object.freeze({ request_id: requestId, operation: requireOperation(raw.operations[0]) });
}
async function personSnapshot(client, op) {
  const result = await client.query(
    "select id::text,historicity,representative_domain from atlas_v2.persons where id=$1::uuid for update",
    [op.person_id]
  );
  if (result.rows.length !== 1 || String(result.rows[0].id).toLowerCase() !== op.person_id) {
    throw new Error("CORRECTION_PERSON_TIMELINE_PERSON_MISSING");
  }
  const row = result.rows[0];
  if (row.historicity !== "historical" || row.representative_domain !== "religion") {
    throw new Error("CORRECTION_PERSON_TIMELINE_PERSON_METADATA_DRIFT");
  }
  return Object.freeze({ id:op.person_id, historicity:row.historicity, representative_domain:row.representative_domain });
}
async function activityIdsSnapshot(client, op) {
  const result = await client.query(
    "select id::text from atlas_v2.person_politics_v2 where person_id=$1::uuid order by id",
    [op.person_id]
  );
  const actual = result.rows.map((r) => String(r.id).toLowerCase()).sort();
  if (JSON.stringify(actual) !== JSON.stringify(op.expected_activity_ids)) {
    throw new Error("CORRECTION_PERSON_TIMELINE_ACTIVITY_SET_DRIFT");
  }
  return actual;
}
async function verifyAfter(client, op) {
  const disposition = await currentTimelineDisposition(client, op.person_id, { forUpdate:true });
  const expected = { person_id:op.person_id, ...normalizeTimelineDisposition({ disposition:"timeline" }) };
  if (!sameTimelineDisposition(disposition, expected)) throw new Error("CORRECTION_PERSON_TIMELINE_AFTER_MISMATCH");
  await personSnapshot(client, op);
  await activityIdsSnapshot(client, op);
  return disposition;
}
function createCorrectionPersonTimelineV2Service({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client required");

  async function execute(rawManifest, { dryRun = false } = {}) {
    const manifest = requireManifest(rawManifest);
    const op = manifest.operation;
    const hash = manifestHash(rawManifest);
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    try {
      await client.query("select pg_advisory_xact_lock(hashtext($1))", ["atlas-correction-manifest:" + manifest.request_id]);
      await client.query("select pg_advisory_xact_lock(hashtext($1))", ["atlas-person-profile:" + op.person_id]);
      const ledger = await readLedger(client, manifest.request_id);
      if (ledger) {
        if (ledger.manifest_hash !== hash || ledger.manifest_schema !== MANIFEST_V2) {
          throw new Error("CORRECTION_PERSON_TIMELINE_LEDGER_COLLISION");
        }
        await verifyAfter(client, op);
        await client.query(dryRun ? "ROLLBACK" : "COMMIT");
        return Object.freeze({
          marker:MARKER_V2, request_id:manifest.request_id, dry_run:Boolean(dryRun),
          committed:!dryRun, replay:true, result:ledger.result_snapshot
        });
      }
      const beforePerson = await personSnapshot(client, op);
      const beforeActivities = await activityIdsSnapshot(client, op);
      const before = await currentTimelineDisposition(client, op.person_id, { forUpdate:true });
      if (!sameTimelineDisposition(before, { person_id:op.person_id, ...op.expected_current_disposition })) {
        throw new Error("CORRECTION_PERSON_TIMELINE_EXACT_BEFORE_DRIFT");
      }
      const changed = await setTimelineDisposition(client, op.person_id, {
        disposition:op.replacement_disposition,
        expected_current_disposition:op.expected_current_disposition
      });
      if (changed.replay) throw new Error("CORRECTION_PERSON_TIMELINE_UNEXPECTED_REPLAY");
      const after = await verifyAfter(client, op);
      const snapshot = Object.freeze({
        version:1, schema:MANIFEST_V2, marker:MARKER_V2,
        correction_family:"person_timeline_disposition",
        case_id:op.case_id, person_id:op.person_id,
        timeline_disposition_before:before, timeline_disposition_after:after,
        person_before:beforePerson, person_after:beforePerson,
        activity_ids_before:beforeActivities, activity_ids_after:beforeActivities,
        invariant:"Only the reviewed Person timeline disposition and its audit may change"
      });
      if (dryRun) {
        await client.query("ROLLBACK");
        return Object.freeze({
          marker:MARKER_V2, request_id:manifest.request_id, dry_run:true,
          committed:false, replay:false, result:snapshot
        });
      }
      await client.query(
        "insert into atlas_v2.person_profile_mutation_audits(request_id,person_id,operation,before_snapshot,after_snapshot) values($1,$2::uuid,$3,$4::jsonb,$5::jsonb)",
        [manifest.request_id + ":" + op.case_id, op.person_id, OPERATION_TYPE,
         JSON.stringify({ timeline_disposition:before }), JSON.stringify({ timeline_disposition:after })]
      );
      if (!await correctionLedgerExists(client)) throw new Error("CORRECTION_LEDGER_SCHEMA_REQUIRED");
      await client.query(
        "insert into atlas_v2.correction_manifest_runs(request_id,manifest_hash,manifest_schema,result_snapshot) values($1,$2,$3,$4::jsonb)",
        [manifest.request_id, hash, MANIFEST_V2, JSON.stringify(snapshot)]
      );
      await client.query("COMMIT");
      return Object.freeze({
        marker:MARKER_V2, request_id:manifest.request_id, dry_run:false,
        committed:true, replay:false, result:snapshot
      });
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      throw error;
    }
  }
  return Object.freeze({ execute });
}
module.exports = Object.freeze({
  OPERATION_TYPE, requireOperation, requireManifest,
  personSnapshot, activityIdsSnapshot, createCorrectionPersonTimelineV2Service
});
