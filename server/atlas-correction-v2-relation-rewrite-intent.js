"use strict";

const { sha256 } = require("./atlas-correction-v2-manifest-synthesizer.js");

const INTENT_SCHEMA = "atlas-correction-v2-relation-rewrite-intent/v1";
const FINAL_SCHEMA = "atlas-correction-manifest/v2";
const SNAPSHOT_MARKER = "ATLAS_CORRECTION_SNAPSHOT_V1";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuid(value, code) {
  const id = String(value || "").trim().toLowerCase();
  if (!UUID_RE.test(id)) throw new Error(code);
  return id;
}

function requireApprovedIntent(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_V2_RELATION_INTENT_OBJECT_REQUIRED");
  if (raw.schema !== INTENT_SCHEMA) throw new Error("CORRECTION_V2_RELATION_INTENT_SCHEMA_INVALID");
  if (String(raw.review_status || "").toLowerCase() !== "approved") throw new Error("CORRECTION_V2_RELATION_INTENT_NOT_APPROVED");
  const requestId = String(raw.request_id || "").trim();
  if (!requestId) throw new Error("CORRECTION_V2_RELATION_INTENT_REQUEST_ID_REQUIRED");
  if (!Number.isInteger(raw.release_order ?? 500)) throw new Error("CORRECTION_V2_RELATION_INTENT_RELEASE_ORDER_INVALID");
  const operation = raw.operation;
  if (!operation || operation.type !== "rewrite_activity_relation_type") throw new Error("CORRECTION_V2_RELATION_INTENT_OPERATION_INVALID");
  if (operation.same_activity_uuid_required !== true || operation.preserve_all_other_activity_fields !== true ||
      operation.preserve_all_normalized_source_links !== true || operation.preserve_all_chronology_claims !== true ||
      operation.preserve_all_relationship_descriptions !== true) {
    throw new Error("CORRECTION_V2_RELATION_INTENT_PRESERVATION_GUARDS_REQUIRED");
  }
  return Object.freeze({
    requestId,
    releaseOrder: raw.release_order ?? 500,
    activityId: uuid(operation.activity_id, "CORRECTION_V2_RELATION_INTENT_ACTIVITY_ID_INVALID"),
    afterRelationTypeId: uuid(operation.after_relation_type_id, "CORRECTION_V2_RELATION_INTENT_RELATION_TYPE_ID_INVALID")
  });
}

function normalizeSnapshot(raw, expectedActivityId) {
  if (!raw || raw.marker !== SNAPSHOT_MARKER || raw.mode !== "snapshot" || raw.read_only !== true || raw.committed !== false) {
    throw new Error("CORRECTION_V2_RELATION_SNAPSHOT_INVALID");
  }
  if (!Array.isArray(raw.snapshots) || raw.snapshots.length !== 1) throw new Error("CORRECTION_V2_RELATION_SNAPSHOT_CARDINALITY_INVALID");
  const snap = raw.snapshots[0];
  const activity = { ...(snap.relationship || {}) };
  activity.id = uuid(activity.id, "CORRECTION_V2_RELATION_SNAPSHOT_ACTIVITY_ID_INVALID");
  if (activity.id !== expectedActivityId) throw new Error("CORRECTION_V2_RELATION_SNAPSHOT_ACTIVITY_ID_MISMATCH");
  for (const field of ["person_id","polity_id","period_basis_id"]) activity[field] = uuid(activity[field], `CORRECTION_V2_RELATION_SNAPSHOT_${field.toUpperCase()}_INVALID`);
  activity.role_id = activity.role_id == null ? null : uuid(activity.role_id, "CORRECTION_V2_RELATION_SNAPSHOT_ROLE_ID_INVALID");
  activity.relation_type_id = activity.relation_type_id == null ? null : uuid(activity.relation_type_id, "CORRECTION_V2_RELATION_SNAPSHOT_RELATION_TYPE_ID_INVALID");

  const normalizedSourceLinks = (snap.sources || []).map((row) => ({
    person_politics_id: expectedActivityId,
    source_id: uuid(row.source_id, "CORRECTION_V2_RELATION_SNAPSHOT_SOURCE_ID_INVALID"),
    source_locator_key: String(row.source_locator_key || "")
  })).sort((a,b) => a.source_id.localeCompare(b.source_id));
  if (normalizedSourceLinks.some((row) => !row.source_locator_key)) throw new Error("CORRECTION_V2_RELATION_SNAPSHOT_SOURCE_LOCATOR_REQUIRED");

  const chronologyClaims = (snap.chronology_claims || []).map((row) => ({
    id: uuid(row.id, "CORRECTION_V2_RELATION_SNAPSHOT_CLAIM_ID_INVALID"),
    person_politics_id: uuid(row.person_politics_id, "CORRECTION_V2_RELATION_SNAPSHOT_CLAIM_ACTIVITY_ID_INVALID"),
    claim_type: String(row.claim_type || ""),
    start_year: row.start_year ?? null,
    end_year: row.end_year ?? null
  })).sort((a,b) => a.id.localeCompare(b.id));
  if (chronologyClaims.some((row) => row.person_politics_id !== expectedActivityId)) throw new Error("CORRECTION_V2_RELATION_SNAPSHOT_CLAIM_ACTIVITY_ID_MISMATCH");

  const descriptions = (snap.relationship_descriptions || []).map((row) => ({
    id: uuid(row.id, "CORRECTION_V2_RELATION_SNAPSHOT_DESCRIPTION_ID_INVALID"),
    person_politics_id: uuid(row.person_politics_id, "CORRECTION_V2_RELATION_SNAPSHOT_DESCRIPTION_ACTIVITY_ID_INVALID"),
    locale: String(row.locale || ""),
    content: String(row.content || "")
  })).sort((a,b) => a.id.localeCompare(b.id));
  if (descriptions.some((row) => row.person_politics_id !== expectedActivityId)) throw new Error("CORRECTION_V2_RELATION_SNAPSHOT_DESCRIPTION_ACTIVITY_ID_MISMATCH");

  return Object.freeze({
    activity,
    normalized_source_links: normalizedSourceLinks,
    chronology_claims: chronologyClaims,
    relationship_descriptions: descriptions
  });
}

function synthesizeRelationRewriteManifest(intentRaw, snapshotRaw) {
  const intent = requireApprovedIntent(intentRaw);
  const exactBefore = normalizeSnapshot(snapshotRaw, intent.activityId);
  if (exactBefore.activity.relation_type_id === intent.afterRelationTypeId) throw new Error("CORRECTION_V2_RELATION_INTENT_ALREADY_APPLIED");
  if (exactBefore.activity.relation_type_id != null) throw new Error("CORRECTION_V2_RELATION_INTENT_NON_NULL_REWRITE_FORBIDDEN");

  const exactAfter = {
    activity: { ...exactBefore.activity, relation_type_id: intent.afterRelationTypeId },
    normalized_source_links: exactBefore.normalized_source_links.map((row) => ({ ...row })),
    chronology_claims: exactBefore.chronology_claims.map((row) => ({ ...row })),
    relationship_descriptions: exactBefore.relationship_descriptions.map((row) => ({ ...row }))
  };
  const exactLiveSnapshotDigest = sha256({ activity_ids: [intent.activityId], bundles: [exactBefore] });
  const manifestCore = {
    schema: FINAL_SCHEMA,
    request_id: intent.requestId,
    review_status: "approved",
    release_order: intent.releaseOrder,
    exact_live_snapshot_digest: exactLiveSnapshotDigest,
    exact_live_snapshot_activity_ids: [intent.activityId],
    execution_guards: {
      serializable_required: true,
      advisory_lock_required: true,
      manifest_hash_idempotency_required: true,
      dry_run_before_apply_required: true,
      exact_before_state_required: true,
      same_activity_uuid_required: true,
      preserve_all_other_activity_fields: true,
      preserve_all_normalized_source_links: true,
      preserve_all_chronology_claims: true,
      preserve_all_relationship_descriptions: true,
      physical_person_merge_forbidden: true,
      territory_geometry_mutation_forbidden: true
    },
    operations: [{
      case_id: intent.requestId,
      type: "rewrite_activity",
      activity_id: intent.activityId,
      exact_before: exactBefore,
      exact_after: exactAfter
    }]
  };
  return Object.freeze({ ...manifestCore, manifest_sha256: sha256(manifestCore), production_executable: true });
}

module.exports = Object.freeze({ INTENT_SCHEMA, FINAL_SCHEMA, requireApprovedIntent, normalizeSnapshot, synthesizeRelationRewriteManifest });
