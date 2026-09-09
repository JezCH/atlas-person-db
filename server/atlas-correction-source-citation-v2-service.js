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

const OPERATION_TYPE = "rewrite_source_citation";
const MAX_OPERATIONS = 20;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUuid(value, code) {
  const id = String(value || "").trim().toLowerCase();
  if (!UUID_RE.test(id)) throw new Error(code);
  return id;
}

function requireText(value, code) {
  const text = String(value || "").trim();
  if (!text) throw new Error(code);
  return text;
}

function requireOperation(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_SOURCE_CITATION_OPERATION_OBJECT_REQUIRED");
  if (String(raw.type || "").trim() !== OPERATION_TYPE) throw new Error("CORRECTION_SOURCE_CITATION_OPERATION_UNSUPPORTED");
  const sourceId = requireUuid(raw.source_id, `CORRECTION_SOURCE_CITATION_OP${index}_SOURCE_ID_INVALID`);
  const expectedCitationText = requireText(raw.expected_citation_text, `CORRECTION_SOURCE_CITATION_OP${index}_EXPECTED_TEXT_REQUIRED`);
  const replacementCitationText = requireText(raw.replacement_citation_text, `CORRECTION_SOURCE_CITATION_OP${index}_REPLACEMENT_TEXT_REQUIRED`);
  if (expectedCitationText === replacementCitationText) throw new Error("CORRECTION_SOURCE_CITATION_NO_CHANGE");
  return Object.freeze({
    type: OPERATION_TYPE,
    case_id: String(raw.case_id || "").trim(),
    source_id: sourceId,
    expected_citation_text: expectedCitationText,
    replacement_citation_text: replacementCitationText
  });
}

function requireManifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_MANIFEST_OBJECT_REQUIRED");
  if (String(raw.schema || "").trim() !== MANIFEST_V2) throw new Error("UNSUPPORTED_CORRECTION_MANIFEST_SCHEMA");
  if (String(raw.review_status || "").trim().toLowerCase() !== "approved") throw new Error("CORRECTION_MANIFEST_NOT_APPROVED");
  const requestId = requireText(raw.request_id, "CORRECTION_REQUEST_ID_REQUIRED");
  if (!Array.isArray(raw.operations) || raw.operations.length === 0 || raw.operations.length > MAX_OPERATIONS) {
    throw new Error("CORRECTION_SOURCE_CITATION_OPERATIONS_INVALID");
  }
  const operations = raw.operations.map((operation, index) => requireOperation(operation, index + 1));
  if (new Set(operations.map((operation) => operation.source_id)).size !== operations.length) {
    throw new Error("CORRECTION_SOURCE_CITATION_SOURCE_REUSED");
  }
  return Object.freeze({ schema: MANIFEST_V2, requestId, operations });
}

async function loadSource(client, sourceId, { forUpdate = false } = {}) {
  const result = await client.query(
    `select id::text,citation_text
       from atlas_v2.sources
      where id=$1::uuid${forUpdate ? " for update" : ""}`,
    [sourceId]
  );
  if (result.rows.length !== 1) return null;
  return Object.freeze({
    id: String(result.rows[0].id).toLowerCase(),
    citation_text: result.rows[0].citation_text == null ? null : String(result.rows[0].citation_text)
  });
}

async function globalCounts(client) {
  const result = await client.query(`
    select
      (select count(*)::bigint from atlas_v2.sources) as sources,
      (select count(*)::bigint from atlas_v2.person_politics_v2) as relationships,
      (select count(*)::bigint from atlas_v2.authoring_manifest_runs) as authoring_manifest_runs
  `);
  const row = result.rows[0];
  return Object.freeze({
    sources: Number(row.sources),
    relationships: Number(row.relationships),
    authoring_manifest_runs: Number(row.authoring_manifest_runs)
  });
}

async function assertPreflight(client, operation) {
  const source = await loadSource(client, operation.source_id, { forUpdate: true });
  if (!source) throw new Error(`CORRECTION_SOURCE_CITATION_SOURCE_NOT_FOUND:${operation.source_id}`);
  if (source.citation_text !== operation.expected_citation_text) {
    throw new Error(`CORRECTION_SOURCE_CITATION_BEFORE_DRIFT:${operation.source_id}`);
  }
  return source;
}

async function applyOperation(client, operation) {
  const result = await client.query(
    `update atlas_v2.sources
        set citation_text=$2
      where id=$1::uuid and citation_text=$3
      returning id::text,citation_text`,
    [operation.source_id, operation.replacement_citation_text, operation.expected_citation_text]
  );
  if (result.rowCount !== 1) throw new Error(`CORRECTION_SOURCE_CITATION_UPDATE_COUNT_DRIFT:${operation.source_id}`);
  return Object.freeze({
    id: String(result.rows[0].id).toLowerCase(),
    citation_text: String(result.rows[0].citation_text)
  });
}

async function verifyAppliedOperation(client, operation, { forUpdate = false } = {}) {
  const source = await loadSource(client, operation.source_id, { forUpdate });
  if (!source) throw new Error(`CORRECTION_SOURCE_CITATION_REPLAY_SOURCE_NOT_FOUND:${operation.source_id}`);
  if (source.citation_text !== operation.replacement_citation_text) {
    throw new Error(`CORRECTION_SOURCE_CITATION_AFTER_DRIFT:${operation.source_id}`);
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
      for (const operation of manifest.operations) {
        await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-source:${operation.source_id}`]);
      }

      const ledger = await readLedger(client, manifest.requestId);
      if (ledger) {
        if (ledger.manifest_hash !== hash) throw new Error("CORRECTION_REQUEST_ID_COLLISION");
        if (ledger.manifest_schema !== MANIFEST_V2) throw new Error("CORRECTION_LEDGER_SCHEMA_MISMATCH");
        for (const operation of manifest.operations) await verifyAppliedOperation(client, operation, { forUpdate: true });
        if (dryRun) await client.query("rollback"); else await client.query("commit");
        return Object.freeze({ marker: MARKER_V2, request_id: manifest.requestId, dry_run: Boolean(dryRun), committed: !dryRun, replay: true, result: ledger.result_snapshot });
      }

      const beforeCounts = await globalCounts(client);
      const outcomes = [];
      for (const operation of manifest.operations) {
        const before = await assertPreflight(client, operation);
        const mutation = await applyOperation(client, operation);
        const after = await verifyAppliedOperation(client, operation, { forUpdate: true });
        outcomes.push(Object.freeze({
          type: operation.type,
          case_id: operation.case_id,
          source_id: operation.source_id,
          before,
          mutation,
          after
        }));
      }

      const afterCounts = await globalCounts(client);
      if (afterCounts.sources !== beforeCounts.sources) throw new Error("CORRECTION_SOURCE_CITATION_SOURCE_COUNT_DRIFT");
      if (afterCounts.relationships !== beforeCounts.relationships) throw new Error("CORRECTION_SOURCE_CITATION_RELATIONSHIP_COUNT_DRIFT");
      if (afterCounts.authoring_manifest_runs !== beforeCounts.authoring_manifest_runs) throw new Error("CORRECTION_SOURCE_CITATION_AUTHORING_LEDGER_COUNT_DRIFT");

      const snapshot = Object.freeze({
        version: 1,
        schema: MANIFEST_V2,
        marker: MARKER_V2,
        correction_family: "source_citation_metadata",
        invariant: "Only atlas_v2.sources.citation_text may change; Person, Activity, Polity, Role, temporal data, source identity and relationship cardinality remain unchanged.",
        operations: outcomes,
        before_counts: beforeCounts,
        after_counts: afterCounts
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
  globalCounts,
  assertPreflight,
  applyOperation,
  verifyAppliedOperation,
  createCorrectionSourceCitationV2Service
});
