"use strict";

const {
  manifestHash,
  correctionLedgerExists,
  readLedger,
  globalCounts
} = require("./atlas-correction-manifest-service.js");

const MANIFEST_V1_2 = "atlas-correction-manifest/v1.2";
const MARKER_V1_2 = "ATLAS_CORRECTION_MANIFEST_V1_2";
const MAX_OPERATIONS_V1_2 = 20;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPERATION_TYPE = "update_activity_temporal_metadata";
const TEMPORAL_METADATA_FIELDS = Object.freeze([
  "activity_start_granularity",
  "activity_start_certainty",
  "activity_start_calendar",
  "activity_end_granularity",
  "activity_end_certainty",
  "activity_end_calendar"
]);
const ACTIVITY_FIELDS = Object.freeze([
  "id","person_id","polity_id","relation_type_id","role_id","period_basis_id",
  "activity_start","activity_start_month","activity_start_day","activity_start_granularity","activity_start_certainty","activity_start_calendar",
  "activity_end","activity_end_month","activity_end_day","activity_end_granularity","activity_end_certainty","activity_end_calendar",
  "confidence","chronology_status","legacy_source_key","notes","source_locator","content_hash"
]);
const UUID_FIELDS = new Set(["id","person_id","polity_id","relation_type_id","role_id","period_basis_id"]);
const ALLOWED = Object.freeze({
  activity_start_granularity: new Set(["year","month","day"]),
  activity_end_granularity: new Set(["year","month","day"]),
  activity_start_certainty: new Set(["exact","approximate","uncertain"]),
  activity_end_certainty: new Set(["exact","approximate","uncertain"]),
  activity_start_calendar: new Set(["gregorian","julian","unspecified_historical","source_calendar"]),
  activity_end_calendar: new Set(["gregorian","julian","unspecified_historical","source_calendar"])
});

function requireUuid(value, code, nullable = false) {
  if (nullable && (value == null || String(value).trim() === "")) return null;
  const id = String(value || "").trim().toLowerCase();
  if (!UUID_RE.test(id)) throw new Error(code);
  return id;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function exactEqual(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function normalizeActivity(raw, label) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`CORRECTION_V12_${label}_ACTIVITY_REQUIRED`);
  const activity = {};
  for (const field of ACTIVITY_FIELDS) {
    let value = raw[field] ?? null;
    if (UUID_FIELDS.has(field)) {
      value = requireUuid(value, `CORRECTION_V12_${label}_${field.toUpperCase()}_INVALID`, field === "relation_type_id" || field === "role_id");
    }
    activity[field] = value;
  }
  if (!Number.isInteger(activity.activity_start) || !Number.isInteger(activity.activity_end) || activity.activity_start === 0 || activity.activity_end === 0 || activity.activity_end < activity.activity_start) {
    throw new Error(`CORRECTION_V12_${label}_INTERVAL_INVALID`);
  }
  for (const field of ["activity_start_month","activity_start_day","activity_end_month","activity_end_day"]) {
    const value = activity[field];
    if (value != null && !Number.isInteger(value)) throw new Error(`CORRECTION_V12_${label}_${field.toUpperCase()}_INVALID`);
  }
  return activity;
}

function nonMetadataIdentity(activity) {
  return Object.fromEntries(ACTIVITY_FIELDS.filter((field) => !TEMPORAL_METADATA_FIELDS.includes(field)).map((field) => [field, activity[field]]));
}

function requireOperation(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_V12_OPERATION_OBJECT_REQUIRED");
  if (String(raw.type || "").trim() !== OPERATION_TYPE) throw new Error("CORRECTION_V12_OPERATION_UNSUPPORTED");
  const activityId = requireUuid(raw.relationship_id || raw.activity_id, `CORRECTION_V12_OP${index}_ACTIVITY_ID_REQUIRED`);
  const before = normalizeActivity(raw.expected_before, `OP${index}_BEFORE`);
  const after = normalizeActivity(raw.expected_after, `OP${index}_AFTER`);
  if (before.id !== activityId || after.id !== activityId) throw new Error("CORRECTION_V12_ACTIVITY_ID_MISMATCH");
  if (!exactEqual(nonMetadataIdentity(before), nonMetadataIdentity(after))) throw new Error("CORRECTION_V12_NON_METADATA_DRIFT");

  const changedFields = TEMPORAL_METADATA_FIELDS.filter((field) => before[field] !== after[field]);
  if (!changedFields.length) throw new Error("CORRECTION_V12_NO_CHANGE");
  for (const field of changedFields) {
    if (!ALLOWED[field].has(String(after[field] || ""))) throw new Error(`CORRECTION_V12_${field.toUpperCase()}_INVALID`);
  }
  return Object.freeze({ type: OPERATION_TYPE, activity_id: activityId, expected_before: before, expected_after: after, changed_fields: Object.freeze(changedFields) });
}

function requireManifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_MANIFEST_OBJECT_REQUIRED");
  if (String(raw.schema || "").trim() !== MANIFEST_V1_2) throw new Error("UNSUPPORTED_CORRECTION_MANIFEST_SCHEMA");
  if (String(raw.review_status || "").trim().toLowerCase() !== "approved") throw new Error("CORRECTION_MANIFEST_NOT_APPROVED");
  const requestId = String(raw.request_id || "").trim();
  if (!requestId) throw new Error("CORRECTION_REQUEST_ID_REQUIRED");
  if (!Array.isArray(raw.operations) || raw.operations.length === 0 || raw.operations.length > MAX_OPERATIONS_V1_2) throw new Error("CORRECTION_V12_OPERATIONS_INVALID");
  const operations = raw.operations.map((operation, index) => requireOperation(operation, index + 1));
  const seen = new Set();
  for (const operation of operations) {
    if (seen.has(operation.activity_id)) throw new Error("CORRECTION_V12_ACTIVITY_REUSED");
    seen.add(operation.activity_id);
  }
  return Object.freeze({ schema: MANIFEST_V1_2, requestId, operations });
}

function normalizeDbActivity(row) {
  if (!row) return null;
  const activity = {};
  for (const field of ACTIVITY_FIELDS) {
    let value = row[field] ?? null;
    if (UUID_FIELDS.has(field) && value != null) value = String(value).toLowerCase();
    activity[field] = value;
  }
  return activity;
}

async function loadActivity(client, id, { forUpdate = false } = {}) {
  const result = await client.query(`
    select id::text,person_id::text,polity_id::text,relation_type_id::text,role_id::text,period_basis_id::text,
           activity_start,activity_start_month,activity_start_day,activity_start_granularity,activity_start_certainty,activity_start_calendar,
           activity_end,activity_end_month,activity_end_day,activity_end_granularity,activity_end_certainty,activity_end_calendar,
           confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash
      from atlas_v2.person_politics_v2
     where id=$1::uuid${forUpdate ? " for update" : ""}`, [id]);
  return result.rowCount ? normalizeDbActivity(result.rows[0]) : null;
}

function assertExactActivity(actual, expected, code) {
  if (!actual || !exactEqual(actual, expected)) throw new Error(code);
}

async function updateTemporalMetadata(client, operation) {
  const after = operation.expected_after;
  const result = await client.query(`
    update atlas_v2.person_politics_v2
       set activity_start_granularity=$2,
           activity_start_certainty=$3,
           activity_start_calendar=$4,
           activity_end_granularity=$5,
           activity_end_certainty=$6,
           activity_end_calendar=$7
     where id=$1::uuid
     returning id::text`, [
    operation.activity_id,
    after.activity_start_granularity,
    after.activity_start_certainty,
    after.activity_start_calendar,
    after.activity_end_granularity,
    after.activity_end_certainty,
    after.activity_end_calendar
  ]);
  if (result.rowCount !== 1) throw new Error("CORRECTION_V12_UPDATE_COUNT_DRIFT");
  return Object.freeze({ activity_id: operation.activity_id, changed_fields: operation.changed_fields });
}

async function verifyAppliedState(client, manifest) {
  for (const operation of manifest.operations) {
    assertExactActivity(await loadActivity(client, operation.activity_id, { forUpdate: true }), operation.expected_after, `CORRECTION_V12_REPLAY_DRIFT:${operation.activity_id}`);
  }
}

function createCorrectionManifestV12Service({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");

  async function execute(rawManifest, { dryRun = false } = {}) {
    const manifest = requireManifest(rawManifest);
    const hash = manifestHash(rawManifest);
    await client.query("begin isolation level serializable");
    try {
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-correction-manifest:${manifest.requestId}`]);
      const ledger = await readLedger(client, manifest.requestId);
      if (ledger) {
        if (ledger.manifest_hash !== hash) throw new Error("CORRECTION_REQUEST_ID_COLLISION");
        if (ledger.manifest_schema !== MANIFEST_V1_2) throw new Error("CORRECTION_LEDGER_SCHEMA_MISMATCH");
        await verifyAppliedState(client, manifest);
        if (dryRun) await client.query("rollback"); else await client.query("commit");
        return Object.freeze({ marker: MARKER_V1_2, request_id: manifest.requestId, dry_run: Boolean(dryRun), committed: !dryRun, replay: true, result: ledger.result_snapshot });
      }

      const beforeCounts = await globalCounts(client);
      const outcomes = [];
      for (const operation of manifest.operations) {
        const live = await loadActivity(client, operation.activity_id, { forUpdate: true });
        assertExactActivity(live, operation.expected_before, `CORRECTION_V12_EXACT_BEFORE_DRIFT:${operation.activity_id}`);
        const mutation = await updateTemporalMetadata(client, operation);
        const after = await loadActivity(client, operation.activity_id, { forUpdate: true });
        assertExactActivity(after, operation.expected_after, `CORRECTION_V12_POSTWRITE_DRIFT:${operation.activity_id}`);
        outcomes.push({ type: operation.type, activity_id: operation.activity_id, changed_fields: operation.changed_fields, expected_before: operation.expected_before, expected_after: operation.expected_after, mutation });
      }
      const afterCounts = await globalCounts(client);
      if (!exactEqual(beforeCounts, afterCounts)) throw new Error("CORRECTION_V12_GLOBAL_COUNT_DRIFT");

      const snapshot = Object.freeze({ version: 1, schema: MANIFEST_V1_2, marker: MARKER_V1_2, operations: outcomes, before_counts: beforeCounts, after_counts: afterCounts });
      if (dryRun) {
        await client.query("rollback");
        return Object.freeze({ marker: MARKER_V1_2, request_id: manifest.requestId, dry_run: true, committed: false, replay: false, result: snapshot });
      }
      if (!await correctionLedgerExists(client)) throw new Error("CORRECTION_LEDGER_SCHEMA_REQUIRED");
      await client.query(`insert into atlas_v2.correction_manifest_runs(request_id,manifest_hash,manifest_schema,result_snapshot) values($1,$2,$3,$4::jsonb)`, [manifest.requestId, hash, MANIFEST_V1_2, JSON.stringify(snapshot)]);
      await client.query("commit");
      return Object.freeze({ marker: MARKER_V1_2, request_id: manifest.requestId, dry_run: false, committed: true, replay: false, result: snapshot });
    } catch (error) {
      try { await client.query("rollback"); } catch {}
      throw error;
    }
  }

  return Object.freeze({ execute });
}

module.exports = Object.freeze({
  MANIFEST_V1_2,
  MARKER_V1_2,
  MAX_OPERATIONS_V1_2,
  OPERATION_TYPE,
  TEMPORAL_METADATA_FIELDS,
  ACTIVITY_FIELDS,
  requireManifest,
  requireOperation,
  normalizeActivity,
  loadActivity,
  assertExactActivity,
  updateTemporalMetadata,
  verifyAppliedState,
  createCorrectionManifestV12Service
});
