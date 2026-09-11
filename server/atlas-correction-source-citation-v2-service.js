"use strict";

const {
  manifestHash,
  correctionLedgerExists,
  readLedger
} = require("./atlas-correction-manifest-service.js");
const {
  MANIFEST_V2,
  MARKER_V2
} = require("./atlas-correction-role-merge-v2-service.js");
const {
  activityFingerprint
} = require("./atlas-stage2-reviewed-entity-authoring.js");

const OPERATION_TYPE = "rewrite_source_citation";
const MAX_OPERATIONS = 20;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireNonEmpty(value, code) {
  const text = String(value == null ? "" : value).trim();
  if (!text) throw new Error(code);
  return text;
}

function requireUuid(value, code) {
  const id = requireNonEmpty(value, code).toLowerCase();
  if (!UUID_RE.test(id)) throw new Error(code);
  return id;
}

function requireOperation(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("CORRECTION_SOURCE_CITATION_OPERATION_OBJECT_REQUIRED");
  }
  if (String(raw.type || "").trim() !== OPERATION_TYPE) {
    throw new Error("CORRECTION_SOURCE_CITATION_OPERATION_UNSUPPORTED");
  }

  const caseId = requireNonEmpty(raw.case_id, `CORRECTION_SOURCE_CITATION_OP${index}_CASE_ID_REQUIRED`);
  const sourceId = requireUuid(raw.source_id, `CORRECTION_SOURCE_CITATION_OP${index}_SOURCE_ID_INVALID`);
  const expectedCanonicalUrl = requireNonEmpty(raw.expected_canonical_url, `CORRECTION_SOURCE_CITATION_OP${index}_EXPECTED_URL_REQUIRED`);
  const expectedCitationText = requireNonEmpty(raw.expected_citation_text, `CORRECTION_SOURCE_CITATION_OP${index}_EXPECTED_CITATION_REQUIRED`);
  const replacementCitationText = requireNonEmpty(raw.replacement_citation_text, `CORRECTION_SOURCE_CITATION_OP${index}_REPLACEMENT_CITATION_REQUIRED`);

  if (!expectedCanonicalUrl.startsWith("https://")) {
    throw new Error(`CORRECTION_SOURCE_CITATION_OP${index}_EXPECTED_URL_INVALID`);
  }
  if (expectedCitationText === replacementCitationText) {
    throw new Error(`CORRECTION_SOURCE_CITATION_OP${index}_NO_CHANGE`);
  }

  return Object.freeze({
    type: OPERATION_TYPE,
    case_id: caseId,
    source_id: sourceId,
    expected_canonical_url: expectedCanonicalUrl,
    expected_citation_text: expectedCitationText,
    replacement_citation_text: replacementCitationText
  });
}

function requireManifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("CORRECTION_MANIFEST_OBJECT_REQUIRED");
  }
  if (String(raw.schema || "").trim() !== MANIFEST_V2) {
    throw new Error("UNSUPPORTED_CORRECTION_MANIFEST_SCHEMA");
  }
  if (String(raw.review_status || "").trim().toLowerCase() !== "approved") {
    throw new Error("CORRECTION_MANIFEST_NOT_APPROVED");
  }
  const requestId = requireNonEmpty(raw.request_id, "CORRECTION_REQUEST_ID_REQUIRED");
  if (!Array.isArray(raw.operations) || raw.operations.length === 0 || raw.operations.length > MAX_OPERATIONS) {
    throw new Error("CORRECTION_SOURCE_CITATION_OPERATIONS_INVALID");
  }

  const operations = raw.operations.map((operation, index) => requireOperation(operation, index + 1));
  const sourceIds = new Set();
  for (const operation of operations) {
    if (sourceIds.has(operation.source_id)) throw new Error("CORRECTION_SOURCE_CITATION_SOURCE_REUSED");
    sourceIds.add(operation.source_id);
  }
  return Object.freeze({ schema: MANIFEST_V2, requestId, operations });
}

function normalizeSource(row) {
  if (!row) return null;
  return Object.freeze({
    id: String(row.id).toLowerCase(),
    canonical_url: String(row.canonical_url || ""),
    citation_text: String(row.citation_text || "")
  });
}

async function loadSource(client, sourceId, { forUpdate = false } = {}) {
  const result = await client.query(
    `select id::text,canonical_url,citation_text
       from atlas_v2.sources
      where id=$1::uuid${forUpdate ? " for update" : ""}`,
    [sourceId]
  );
  if (result.rowCount > 1) throw new Error(`CORRECTION_SOURCE_CITATION_SOURCE_ID_NONUNIQUE:${sourceId}`);
  return normalizeSource(result.rows[0]);
}

async function sourceCount(client) {
  const result = await client.query(`select count(*)::bigint as count from atlas_v2.sources`);
  return String(result.rows[0].count);
}

function assertExpectedSource(actual, operation, prefix) {
  if (!actual) throw new Error(`${prefix}_SOURCE_MISSING:${operation.source_id}`);
  if (actual.canonical_url !== operation.expected_canonical_url) {
    throw new Error(`${prefix}_CANONICAL_URL_DRIFT:${operation.source_id}`);
  }
  if (actual.citation_text !== operation.expected_citation_text) {
    throw new Error(`${prefix}_CITATION_DRIFT:${operation.source_id}`);
  }
}

async function assertPreflight(client, operation) {
  const source = await loadSource(client, operation.source_id, { forUpdate: true });
  assertExpectedSource(source, operation, "CORRECTION_SOURCE_CITATION_PREFLIGHT");
  return source;
}

async function applyOperation(client, operation) {
  const result = await client.query(
    `update atlas_v2.sources
        set citation_text=$1
      where id=$2::uuid
        and canonical_url=$3
        and citation_text=$4
      returning id::text,canonical_url,citation_text`,
    [
      operation.replacement_citation_text,
      operation.source_id,
      operation.expected_canonical_url,
      operation.expected_citation_text
    ]
  );
  if (result.rowCount !== 1) throw new Error(`CORRECTION_SOURCE_CITATION_UPDATE_COUNT_DRIFT:${operation.source_id}`);
  return normalizeSource(result.rows[0]);
}

async function verifyAppliedOperation(client, operation, { forUpdate = false } = {}) {
  const source = await loadSource(client, operation.source_id, { forUpdate });
  if (!source) throw new Error(`CORRECTION_SOURCE_CITATION_REPLAY_SOURCE_MISSING:${operation.source_id}`);
  if (source.canonical_url !== operation.expected_canonical_url) {
    throw new Error(`CORRECTION_SOURCE_CITATION_REPLAY_CANONICAL_URL_DRIFT:${operation.source_id}`);
  }
  if (source.citation_text !== operation.replacement_citation_text) {
    throw new Error(`CORRECTION_SOURCE_CITATION_REPLAY_CITATION_DRIFT:${operation.source_id}`);
  }
  return source;
}

function createCorrectionSourceCitationV2Service({ client } = {}) {
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
        for (const operation of manifest.operations) {
          await verifyAppliedOperation(client, operation, { forUpdate: true });
        }
        if (dryRun) await client.query("rollback"); else await client.query("commit");
        return Object.freeze({
          marker: MARKER_V2,
          request_id: manifest.requestId,
          dry_run: Boolean(dryRun),
          committed: !dryRun,
          replay: true,
          result: ledger.result_snapshot
        });
      }

      const beforeSourceCount = await sourceCount(client);
      const beforeActivities = await activityFingerprint(client);
      const outcomes = [];

      for (const operation of manifest.operations) {
        const before = await assertPreflight(client, operation);
        const after = await applyOperation(client, operation);
        await verifyAppliedOperation(client, operation, { forUpdate: true });
        outcomes.push(Object.freeze({
          type: operation.type,
          case_id: operation.case_id,
          source_id: operation.source_id,
          canonical_url: operation.expected_canonical_url,
          citation_text_before: before.citation_text,
          citation_text_after: after.citation_text
        }));
      }

      const afterSourceCount = await sourceCount(client);
      const afterActivities = await activityFingerprint(client);
      if (afterSourceCount !== beforeSourceCount) throw new Error("CORRECTION_SOURCE_CITATION_SOURCE_COUNT_DRIFT");
      if (afterActivities.row_count !== beforeActivities.row_count || afterActivities.fingerprint !== beforeActivities.fingerprint) {
        throw new Error("CORRECTION_SOURCE_CITATION_ACTIVITY_MUTATION_DETECTED");
      }

      const snapshot = Object.freeze({
        version: 1,
        schema: MANIFEST_V2,
        marker: MARKER_V2,
        correction_family: "source_citation_metadata",
        invariant: "Only atlas_v2.sources.citation_text may change; Source identity/URL and Activity relationships remain unchanged.",
        operations: outcomes,
        source_count_before: beforeSourceCount,
        source_count_after: afterSourceCount,
        activity_fingerprint_before: beforeActivities,
        activity_fingerprint_after: afterActivities
      });

      if (dryRun) {
        await client.query("rollback");
        return Object.freeze({ marker: MARKER_V2, request_id: manifest.requestId, dry_run: true, committed: false, replay: false, result: snapshot });
      }
      if (!await correctionLedgerExists(client)) throw new Error("CORRECTION_LEDGER_SCHEMA_REQUIRED");
      await client.query(
        `insert into atlas_v2.correction_manifest_runs(request_id,manifest_hash,manifest_schema,result_snapshot)
         values($1,$2,$3,$4::jsonb)`,
        [manifest.requestId, hash, MANIFEST_V2, JSON.stringify(snapshot)]
      );
      await client.query("commit");
      return Object.freeze({ marker: MARKER_V2, request_id: manifest.requestId, dry_run: false, committed: true, replay: false, result: snapshot });
    } catch (error) {
      try { await client.query("rollback"); } catch {}
      throw error;
    }
  }

  return Object.freeze({ execute });
}

module.exports = Object.freeze({
  OPERATION_TYPE,
  MAX_OPERATIONS,
  requireManifest,
  requireOperation,
  loadSource,
  sourceCount,
  assertPreflight,
  applyOperation,
  verifyAppliedOperation,
  createCorrectionSourceCitationV2Service
});
