"use strict";

const {
  manifestHash,
  correctionLedgerExists,
  readLedger
} = require("./atlas-correction-ledger-service.js");
const {
  MANIFEST_V2,
  MARKER_V2
} = require("./atlas-correction-manifest-v2-service.js");
const {
  normalizeStage2AssertionOperation,
  loadDesignationBundle
} = require("./atlas-correction-v2-stage2-assertions.js");

const OPERATION_TYPE = "retire_polity_designation";
const SNAPSHOT_SCHEMA = "atlas-correction-polity-designation-retirement/v1";
const MAX_OPERATIONS = 20;
const REVIEW_REASON_EDITORIAL = "OBSOLETE_EDITORIAL_DESIGNATION";
const REVIEW_REASON_UMBRELLA = "OBSOLETE_UMBRELLA_POLITY_DESIGNATION";
const REVIEW_REASONS = new Set([REVIEW_REASON_EDITORIAL, REVIEW_REASON_UMBRELLA]);

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

function requiredText(value, code) {
  const text = String(value == null ? "" : value).trim();
  if (!text) throw new Error(code);
  return text;
}

function normalizeExactDesignationBundle(raw, index, caseId) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`CORRECTION_POLITY_DESIGNATION_RETIRE_OP${index}_EXACT_BEFORE_REQUIRED`);
  }
  const id = String(raw?.designation?.id || "").trim().toLowerCase();
  const normalized = normalizeStage2AssertionOperation({
    type:"assert_polity_designation",
    decision_id:caseId,
    exact_before:{ designation_absent_id:id },
    exact_after:raw
  }, index);
  return Object.freeze(normalized.exact_after);
}

function requireOperation(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("CORRECTION_POLITY_DESIGNATION_RETIRE_OPERATION_OBJECT_REQUIRED");
  }
  if (String(raw.type || "").trim() !== OPERATION_TYPE) {
    throw new Error("CORRECTION_POLITY_DESIGNATION_RETIRE_OPERATION_UNSUPPORTED");
  }
  const caseId = requiredText(raw.case_id, `CORRECTION_POLITY_DESIGNATION_RETIRE_OP${index}_CASE_ID_REQUIRED`);
  const reviewReason = requiredText(raw.review_reason, `CORRECTION_POLITY_DESIGNATION_RETIRE_OP${index}_REVIEW_REASON_REQUIRED`);
  if (!REVIEW_REASONS.has(reviewReason)) {
    throw new Error(`CORRECTION_POLITY_DESIGNATION_RETIRE_OP${index}_REVIEW_REASON_UNSUPPORTED`);
  }
  return Object.freeze({
    type:OPERATION_TYPE,
    case_id:caseId,
    review_reason:reviewReason,
    exact_before:normalizeExactDesignationBundle(raw.exact_before, index, caseId)
  });
}

function requireManifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_MANIFEST_OBJECT_REQUIRED");
  if (String(raw.schema || "").trim() !== MANIFEST_V2) throw new Error("UNSUPPORTED_CORRECTION_MANIFEST_SCHEMA");
  if (String(raw.review_status || "").trim().toLowerCase() !== "approved") throw new Error("CORRECTION_MANIFEST_NOT_APPROVED");
  const requestId = requiredText(raw.request_id, "CORRECTION_REQUEST_ID_REQUIRED");
  if (!Array.isArray(raw.operations) || raw.operations.length === 0 || raw.operations.length > MAX_OPERATIONS) {
    throw new Error("CORRECTION_POLITY_DESIGNATION_RETIRE_OPERATIONS_INVALID");
  }
  const operations = raw.operations.map((operation, index) => requireOperation(operation, index + 1));
  const ids = operations.map((operation) => operation.exact_before.designation.id);
  if (new Set(ids).size !== ids.length) throw new Error("CORRECTION_POLITY_DESIGNATION_RETIRE_TARGET_REUSED");
  return Object.freeze({ schema:MANIFEST_V2, requestId, operations });
}

async function globalCounts(client) {
  const result = await client.query(`select
    (select count(*)::bigint from atlas_v2.polity_designations) as designations,
    (select count(*)::bigint from atlas_v2.polity_designation_names) as designation_names,
    (select count(*)::bigint from atlas_v2.polity_designation_sources) as designation_sources`);
  const row = result.rows[0] || {};
  return Object.freeze({
    designations:Number(row.designations || 0),
    designation_names:Number(row.designation_names || 0),
    designation_sources:Number(row.designation_sources || 0)
  });
}

async function assertPreflight(client, operation) {
  const id = operation.exact_before.designation.id;
  const actual = await loadDesignationBundle(client, id, { forUpdate:true });
  if (!actual || !exactEqual(actual, operation.exact_before)) {
    throw new Error(`CORRECTION_POLITY_DESIGNATION_RETIRE_EXACT_BEFORE_DRIFT:${id}`);
  }
  return actual;
}

async function applyOperation(client, operation) {
  const id = operation.exact_before.designation.id;
  const sourceDelete = await client.query(
    "delete from atlas_v2.polity_designation_sources where polity_designation_id=$1::uuid",
    [id]
  );
  if (sourceDelete.rowCount !== operation.exact_before.source_links.length) {
    throw new Error(`CORRECTION_POLITY_DESIGNATION_RETIRE_SOURCE_DELETE_COUNT_DRIFT:${id}`);
  }
  const nameDelete = await client.query(
    "delete from atlas_v2.polity_designation_names where polity_designation_id=$1::uuid",
    [id]
  );
  if (nameDelete.rowCount !== operation.exact_before.names.length) {
    throw new Error(`CORRECTION_POLITY_DESIGNATION_RETIRE_NAME_DELETE_COUNT_DRIFT:${id}`);
  }
  const designationDelete = await client.query(
    "delete from atlas_v2.polity_designations where id=$1::uuid returning id::text",
    [id]
  );
  if (designationDelete.rowCount !== 1 || String(designationDelete.rows[0]?.id || "").toLowerCase() !== id) {
    throw new Error(`CORRECTION_POLITY_DESIGNATION_RETIRE_DELETE_COUNT_DRIFT:${id}`);
  }
}

async function verifyRetired(client, operation, { forUpdate = false } = {}) {
  const id = operation.exact_before.designation.id;
  const actual = await loadDesignationBundle(client, id, { forUpdate });
  if (actual) throw new Error(`CORRECTION_POLITY_DESIGNATION_RETIRE_TARGET_REAPPEARED:${id}`);
}

function expectedDecrements(operations) {
  return Object.freeze({
    designations:operations.length,
    designation_names:operations.reduce((sum, operation) => sum + operation.exact_before.names.length, 0),
    designation_sources:operations.reduce((sum, operation) => sum + operation.exact_before.source_links.length, 0)
  });
}

function assertCountDelta(before, after, expected) {
  for (const key of Object.keys(expected)) {
    if (after[key] !== before[key] - expected[key]) {
      throw new Error(`CORRECTION_POLITY_DESIGNATION_RETIRE_${key.toUpperCase()}_COUNT_DRIFT`);
    }
  }
}

function createCorrectionPolityDesignationRetireV2Service({ client } = {}) {
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
        if (ledger.manifest_schema !== MANIFEST_V2) throw new Error("CORRECTION_LEDGER_SCHEMA_MISMATCH");
        const snapshot = ledger.result_snapshot;
        if (!snapshot || snapshot.schema !== SNAPSHOT_SCHEMA || !Array.isArray(snapshot.operations) || snapshot.operations.length !== manifest.operations.length) {
          throw new Error("CORRECTION_POLITY_DESIGNATION_RETIRE_LEDGER_RESULT_DRIFT");
        }
        for (const operation of manifest.operations) await verifyRetired(client, operation, { forUpdate:true });
        if (dryRun) await client.query("rollback"); else await client.query("commit");
        return Object.freeze({
          marker:MARKER_V2,
          request_id:manifest.requestId,
          dry_run:Boolean(dryRun),
          committed:!dryRun,
          replay:true,
          result:snapshot
        });
      }

      const beforeCounts = await globalCounts(client);
      for (const operation of manifest.operations) await assertPreflight(client, operation);
      for (const operation of manifest.operations) {
        await applyOperation(client, operation);
        await verifyRetired(client, operation, { forUpdate:true });
      }
      const afterCounts = await globalCounts(client);
      const decrements = expectedDecrements(manifest.operations);
      assertCountDelta(beforeCounts, afterCounts, decrements);

      const snapshot = Object.freeze({
        version:1,
        schema:SNAPSHOT_SCHEMA,
        marker:MARKER_V2,
        correction_family:"polity_designation_retirement",
        operations:Object.freeze(manifest.operations.map((operation) => Object.freeze({
          type:operation.type,
          case_id:operation.case_id,
          review_reason:operation.review_reason,
          retired_designation:operation.exact_before
        }))),
        before_counts:beforeCounts,
        after_counts:afterCounts,
        decrements
      });

      if (dryRun) {
        await client.query("rollback");
        return Object.freeze({
          marker:MARKER_V2,
          request_id:manifest.requestId,
          dry_run:true,
          committed:false,
          replay:false,
          result:snapshot
        });
      }

      if (!await correctionLedgerExists(client)) throw new Error("CORRECTION_LEDGER_SCHEMA_REQUIRED");
      await client.query(
        `insert into atlas_v2.correction_manifest_runs(request_id,manifest_hash,manifest_schema,result_snapshot)
         values($1,$2,$3,$4::jsonb)`,
        [manifest.requestId, hash, MANIFEST_V2, JSON.stringify(snapshot)]
      );
      await client.query("commit");
      return Object.freeze({
        marker:MARKER_V2,
        request_id:manifest.requestId,
        dry_run:false,
        committed:true,
        replay:false,
        result:snapshot
      });
    } catch (error) {
      try { await client.query("rollback"); } catch {}
      throw error;
    }
  }

  return Object.freeze({ execute });
}

module.exports = Object.freeze({
  OPERATION_TYPE,
  SNAPSHOT_SCHEMA,
  MAX_OPERATIONS,
  REVIEW_REASON_EDITORIAL,
  REVIEW_REASON_UMBRELLA,
  REVIEW_REASONS,
  requireManifest,
  requireOperation,
  globalCounts,
  assertPreflight,
  applyOperation,
  verifyRetired,
  expectedDecrements,
  createCorrectionPolityDesignationRetireV2Service
});
