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

const OPERATION_TYPE = "rewrite_polity_designation";
const SNAPSHOT_SCHEMA = "atlas-correction-polity-designation-rewrite/v1";
const REVIEW_REASON = "SOURCE_BACKED_TEMPORAL_PRECISION";
const MAX_OPERATIONS = 20;

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

function normalizeExactDesignationBundle(raw, index, caseId, side) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("CORRECTION_POLITY_DESIGNATION_REWRITE_OP" + index + "_" + side + "_REQUIRED");
  }
  const id = String(raw?.designation?.id || "").trim().toLowerCase();
  const normalized = normalizeStage2AssertionOperation({
    type:"assert_polity_designation",
    decision_id:caseId + ":" + side,
    exact_before:{ designation_absent_id:id },
    exact_after:raw
  }, index);
  return Object.freeze(normalized.exact_after);
}

function sourceLinkKey(link) {
  return String(link.source_id).toLowerCase() + "\u0000" + String(link.source_locator_key);
}

function requireOperation(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("CORRECTION_POLITY_DESIGNATION_REWRITE_OPERATION_OBJECT_REQUIRED");
  }
  if (String(raw.type || "").trim() !== OPERATION_TYPE) {
    throw new Error("CORRECTION_POLITY_DESIGNATION_REWRITE_OPERATION_UNSUPPORTED");
  }

  const caseId = requiredText(raw.case_id, "CORRECTION_POLITY_DESIGNATION_REWRITE_OP" + index + "_CASE_ID_REQUIRED");
  const reviewReason = requiredText(raw.review_reason, "CORRECTION_POLITY_DESIGNATION_REWRITE_OP" + index + "_REVIEW_REASON_REQUIRED");
  if (reviewReason !== REVIEW_REASON) {
    throw new Error("CORRECTION_POLITY_DESIGNATION_REWRITE_OP" + index + "_REVIEW_REASON_UNSUPPORTED");
  }

  const exactBefore = normalizeExactDesignationBundle(raw.exact_before, index, caseId, "EXACT_BEFORE");
  const exactAfter = normalizeExactDesignationBundle(raw.exact_after, index, caseId, "EXACT_AFTER");

  if (exactBefore.designation.id !== exactAfter.designation.id) {
    throw new Error("CORRECTION_POLITY_DESIGNATION_REWRITE_OP" + index + "_DESIGNATION_ID_CHANGE_FORBIDDEN");
  }
  if (exactBefore.designation.polity_id !== exactAfter.designation.polity_id) {
    throw new Error("CORRECTION_POLITY_DESIGNATION_REWRITE_OP" + index + "_POLITY_ID_CHANGE_FORBIDDEN");
  }
  if (exactBefore.designation.designation_type !== exactAfter.designation.designation_type) {
    throw new Error("CORRECTION_POLITY_DESIGNATION_REWRITE_OP" + index + "_TYPE_CHANGE_FORBIDDEN");
  }
  if (!exactEqual(exactBefore.names, exactAfter.names)) {
    throw new Error("CORRECTION_POLITY_DESIGNATION_REWRITE_OP" + index + "_NAME_CHANGE_FORBIDDEN");
  }

  const afterKeys = new Set(exactAfter.source_links.map(sourceLinkKey));
  for (const link of exactBefore.source_links) {
    if (!afterKeys.has(sourceLinkKey(link))) {
      throw new Error("CORRECTION_POLITY_DESIGNATION_REWRITE_OP" + index + "_SOURCE_REMOVAL_FORBIDDEN");
    }
  }
  if (exactEqual(exactBefore, exactAfter)) {
    throw new Error("CORRECTION_POLITY_DESIGNATION_REWRITE_OP" + index + "_NO_CHANGE");
  }

  const beforeKeys = new Set(exactBefore.source_links.map(sourceLinkKey));
  const addedSourceLinks = exactAfter.source_links.filter((link) => !beforeKeys.has(sourceLinkKey(link)));

  return Object.freeze({
    type:OPERATION_TYPE,
    case_id:caseId,
    review_reason:reviewReason,
    exact_before:exactBefore,
    exact_after:exactAfter,
    added_source_links:Object.freeze(addedSourceLinks)
  });
}

function requireManifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_MANIFEST_OBJECT_REQUIRED");
  if (String(raw.schema || "").trim() !== MANIFEST_V2) throw new Error("UNSUPPORTED_CORRECTION_MANIFEST_SCHEMA");
  if (String(raw.review_status || "").trim().toLowerCase() !== "approved") throw new Error("CORRECTION_MANIFEST_NOT_APPROVED");
  const requestId = requiredText(raw.request_id, "CORRECTION_REQUEST_ID_REQUIRED");
  if (!Array.isArray(raw.operations) || raw.operations.length === 0 || raw.operations.length > MAX_OPERATIONS) {
    throw new Error("CORRECTION_POLITY_DESIGNATION_REWRITE_OPERATIONS_INVALID");
  }
  const operations = raw.operations.map((operation, index) => requireOperation(operation, index + 1));
  const ids = operations.map((operation) => operation.exact_before.designation.id);
  if (new Set(ids).size !== ids.length) throw new Error("CORRECTION_POLITY_DESIGNATION_REWRITE_TARGET_REUSED");
  return Object.freeze({ schema:MANIFEST_V2, requestId, operations });
}

async function globalCounts(client) {
  const result = await client.query(
    "select " +
    "(select count(*)::bigint from atlas_v2.polity_designations) as designations," +
    "(select count(*)::bigint from atlas_v2.polity_designation_names) as designation_names," +
    "(select count(*)::bigint from atlas_v2.polity_designation_sources) as designation_sources"
  );
  return Object.freeze({
    designations:Number(result.rows[0].designations || 0),
    designation_names:Number(result.rows[0].designation_names || 0),
    designation_sources:Number(result.rows[0].designation_sources || 0)
  });
}

async function activityFingerprint(client) {
  const result = await client.query(
    "select count(*)::int as row_count, " +
    "md5(coalesce(string_agg(row_to_json(x)::text, '|' order by x.id::text), '')) as fingerprint " +
    "from (select id,person_id,polity_id,role_id,period_basis_id,activity_start,activity_end," +
    "confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash " +
    "from atlas_v2.person_politics_v2) x"
  );
  return Object.freeze(result.rows[0]);
}

async function assertAddedSourcesExist(client, operation) {
  for (const link of operation.added_source_links) {
    const result = await client.query("select id::text from atlas_v2.sources where id=$1::uuid", [link.source_id]);
    if (result.rowCount !== 1) {
      throw new Error("CORRECTION_POLITY_DESIGNATION_REWRITE_SOURCE_MISSING:" + link.source_id);
    }
  }
}

async function assertPreflight(client, operation) {
  const id = operation.exact_before.designation.id;
  const actual = await loadDesignationBundle(client, id, { forUpdate:true });
  if (!actual || !exactEqual(actual, operation.exact_before)) {
    throw new Error("CORRECTION_POLITY_DESIGNATION_REWRITE_EXACT_BEFORE_DRIFT:" + id);
  }
  await assertAddedSourcesExist(client, operation);
  return actual;
}

async function applyOperation(client, operation) {
  const row = operation.exact_after.designation;
  const result = await client.query(
    "update atlas_v2.polity_designations set " +
    "valid_from_year=$1,valid_from_month=$2,valid_from_day=$3,valid_from_granularity=$4,valid_from_certainty=$5,valid_from_calendar=$6," +
    "valid_to_year=$7,valid_to_month=$8,valid_to_day=$9,valid_to_granularity=$10,valid_to_certainty=$11,valid_to_calendar=$12," +
    "confidence=$13,notes=$14 " +
    "where id=$15::uuid and polity_id=$16::uuid and designation_type=$17",
    [
      row.valid_from_year,row.valid_from_month,row.valid_from_day,row.valid_from_granularity,row.valid_from_certainty,row.valid_from_calendar,
      row.valid_to_year,row.valid_to_month,row.valid_to_day,row.valid_to_granularity,row.valid_to_certainty,row.valid_to_calendar,
      row.confidence,row.notes,row.id,row.polity_id,row.designation_type
    ]
  );
  if (result.rowCount !== 1) {
    throw new Error("CORRECTION_POLITY_DESIGNATION_REWRITE_UPDATE_COUNT_DRIFT:" + row.id);
  }

  for (const link of operation.added_source_links) {
    const inserted = await client.query(
      "insert into atlas_v2.polity_designation_sources(polity_designation_id,source_id,source_locator_key) values($1::uuid,$2::uuid,$3)",
      [link.polity_designation_id, link.source_id, link.source_locator_key]
    );
    if (inserted.rowCount !== 1) {
      throw new Error("CORRECTION_POLITY_DESIGNATION_REWRITE_SOURCE_INSERT_COUNT_DRIFT:" + row.id);
    }
  }
}

async function verifyApplied(client, operation, { forUpdate = false } = {}) {
  const id = operation.exact_after.designation.id;
  const actual = await loadDesignationBundle(client, id, { forUpdate });
  if (!actual || !exactEqual(actual, operation.exact_after)) {
    throw new Error("CORRECTION_POLITY_DESIGNATION_REWRITE_AFTER_DRIFT:" + id);
  }
  return actual;
}

function expectedSourceAdditions(operations) {
  return operations.reduce((sum, operation) => sum + operation.added_source_links.length, 0);
}

function createCorrectionPolityDesignationRewriteV2Service({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");

  async function execute(rawManifest, { dryRun = false } = {}) {
    const manifest = requireManifest(rawManifest);
    const hash = manifestHash(rawManifest);
    await client.query("begin isolation level serializable");
    try {
      await client.query("select pg_advisory_xact_lock(hashtext($1))", ["atlas-correction-manifest:" + manifest.requestId]);
      const ledger = await readLedger(client, manifest.requestId);
      if (ledger) {
        if (ledger.manifest_hash !== hash) throw new Error("CORRECTION_REQUEST_ID_COLLISION");
        if (ledger.manifest_schema !== MANIFEST_V2) throw new Error("CORRECTION_LEDGER_SCHEMA_MISMATCH");
        const snapshot = ledger.result_snapshot;
        if (!snapshot || snapshot.schema !== SNAPSHOT_SCHEMA || !Array.isArray(snapshot.operations) || snapshot.operations.length !== manifest.operations.length) {
          throw new Error("CORRECTION_POLITY_DESIGNATION_REWRITE_LEDGER_RESULT_DRIFT");
        }
        for (const operation of manifest.operations) await verifyApplied(client, operation, { forUpdate:true });
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
      const beforeActivities = await activityFingerprint(client);
      for (const operation of manifest.operations) await assertPreflight(client, operation);
      for (const operation of manifest.operations) {
        await applyOperation(client, operation);
        await verifyApplied(client, operation, { forUpdate:true });
      }

      const afterCounts = await globalCounts(client);
      const afterActivities = await activityFingerprint(client);
      const sourceAdditions = expectedSourceAdditions(manifest.operations);
      if (afterCounts.designations !== beforeCounts.designations) throw new Error("CORRECTION_POLITY_DESIGNATION_REWRITE_DESIGNATION_COUNT_DRIFT");
      if (afterCounts.designation_names !== beforeCounts.designation_names) throw new Error("CORRECTION_POLITY_DESIGNATION_REWRITE_NAME_COUNT_DRIFT");
      if (afterCounts.designation_sources !== beforeCounts.designation_sources + sourceAdditions) {
        throw new Error("CORRECTION_POLITY_DESIGNATION_REWRITE_SOURCE_COUNT_DRIFT");
      }
      if (afterActivities.row_count !== beforeActivities.row_count || afterActivities.fingerprint !== beforeActivities.fingerprint) {
        throw new Error("CORRECTION_POLITY_DESIGNATION_REWRITE_ACTIVITY_MUTATION_DETECTED");
      }

      const snapshot = Object.freeze({
        version:1,
        schema:SNAPSHOT_SCHEMA,
        marker:MARKER_V2,
        correction_family:"polity_designation_rewrite",
        invariant:"Existing designation UUID, Polity owner, type and names are immutable; existing provenance cannot be removed; only reviewed temporal metadata/notes and additive source links may change.",
        operations:Object.freeze(manifest.operations.map((operation) => Object.freeze({
          type:operation.type,
          case_id:operation.case_id,
          review_reason:operation.review_reason,
          exact_before:operation.exact_before,
          exact_after:operation.exact_after,
          added_source_links:operation.added_source_links
        }))),
        counts_before:beforeCounts,
        counts_after:afterCounts,
        activity_fingerprint_before:beforeActivities,
        activity_fingerprint_after:afterActivities
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
        "insert into atlas_v2.correction_manifest_runs(request_id,manifest_hash,manifest_schema,result_snapshot) values($1,$2,$3,$4::jsonb)",
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
  REVIEW_REASON,
  MAX_OPERATIONS,
  requireManifest,
  requireOperation,
  globalCounts,
  activityFingerprint,
  assertPreflight,
  applyOperation,
  verifyApplied,
  createCorrectionPolityDesignationRewriteV2Service
});
