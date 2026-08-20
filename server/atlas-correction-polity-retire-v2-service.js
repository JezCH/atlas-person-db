"use strict";

const {
  manifestHash,
  correctionLedgerExists,
  readLedger
} = require("./atlas-correction-manifest-service.js");
const {
  MANIFEST_V2,
  MARKER_V2
} = require("./atlas-correction-manifest-v2-service.js");
const {
  discoverPolityReferences,
  quoteIdentifier,
  referenceKey
} = require("./atlas-polity-reference-audit-handler.js");

const OPERATION_TYPE = "retire_polity_if_orphan";
const REVIEW_REASON = "GOVERNANCE_CONTEXT_DUPLICATE_POLITY";
const SNAPSHOT_SCHEMA = "atlas-correction-polity-retirement/v1";
const MAX_OPERATIONS = 20;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OWNED_COUNT_KEYS = Object.freeze({
  "atlas_v2.polity_names.polity_id": "polity_names",
  "atlas_v2.polity_descriptions.polity_id": "polity_descriptions",
  "atlas_v2.polity_sources.polity_id": "polity_sources"
});

function requireUuid(value, code) {
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

function requireExpectedPolity(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`CORRECTION_POLITY_RETIRE_OP${index}_EXPECTED_POLITY_REQUIRED`);
  const canonicalKey = String(raw.canonical_key || "").trim();
  const polityType = String(raw.polity_type || "").trim();
  const historicity = String(raw.historicity || "").trim();
  if (!canonicalKey) throw new Error(`CORRECTION_POLITY_RETIRE_OP${index}_CANONICAL_KEY_REQUIRED`);
  if (!polityType) throw new Error(`CORRECTION_POLITY_RETIRE_OP${index}_POLITY_TYPE_REQUIRED`);
  if (!historicity) throw new Error(`CORRECTION_POLITY_RETIRE_OP${index}_HISTORICITY_REQUIRED`);
  return Object.freeze({
    id: requireUuid(raw.id, `CORRECTION_POLITY_RETIRE_OP${index}_POLITY_ID_INVALID`),
    canonical_key: canonicalKey,
    polity_type: polityType,
    historicity
  });
}

function requirePreferredNames(raw, index) {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error(`CORRECTION_POLITY_RETIRE_OP${index}_PREFERRED_NAMES_REQUIRED`);
  const names = raw.map((row, nameIndex) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error(`CORRECTION_POLITY_RETIRE_OP${index}_NAME${nameIndex + 1}_OBJECT_REQUIRED`);
    const locale = String(row.locale || "").trim();
    const name = String(row.name || "").trim();
    if (!locale || !name) throw new Error(`CORRECTION_POLITY_RETIRE_OP${index}_NAME${nameIndex + 1}_INVALID`);
    if (row.is_preferred !== true) throw new Error(`CORRECTION_POLITY_RETIRE_OP${index}_NAME${nameIndex + 1}_MUST_BE_PREFERRED`);
    return Object.freeze({ locale, name, is_preferred: true });
  }).sort((a, b) => `${a.locale}\u0000${a.name}`.localeCompare(`${b.locale}\u0000${b.name}`));
  const keys = names.map((row) => `${row.locale}\u0000${row.name}`);
  if (new Set(keys).size !== keys.length) throw new Error(`CORRECTION_POLITY_RETIRE_OP${index}_PREFERRED_NAME_REUSED`);
  return Object.freeze(names);
}

function requireOperation(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_POLITY_RETIRE_OPERATION_OBJECT_REQUIRED");
  if (String(raw.type || "").trim() !== OPERATION_TYPE) throw new Error("CORRECTION_POLITY_RETIRE_OPERATION_UNSUPPORTED");
  if (String(raw.review_reason || "").trim() !== REVIEW_REASON) throw new Error("CORRECTION_POLITY_RETIRE_REVIEW_REASON_REQUIRED");
  const caseId = String(raw.case_id || "").trim();
  if (!caseId) throw new Error("CORRECTION_POLITY_RETIRE_CASE_ID_REQUIRED");
  const expectedOwned = Number(raw.expected_owned_reference_total);
  const expectedExternal = Number(raw.expected_external_reference_total);
  if (!Number.isInteger(expectedOwned) || expectedOwned < 0) throw new Error("CORRECTION_POLITY_RETIRE_EXPECTED_OWNED_REFERENCE_TOTAL_INVALID");
  if (expectedExternal !== 0) throw new Error("CORRECTION_POLITY_RETIRE_EXPECTED_EXTERNAL_REFERENCE_TOTAL_MUST_BE_ZERO");
  return Object.freeze({
    type: OPERATION_TYPE,
    case_id: caseId,
    review_reason: REVIEW_REASON,
    expected_polity: requireExpectedPolity(raw.expected_polity, index),
    expected_preferred_names: requirePreferredNames(raw.expected_preferred_names, index),
    expected_owned_reference_total: expectedOwned,
    expected_external_reference_total: 0
  });
}

function requireManifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_MANIFEST_OBJECT_REQUIRED");
  if (String(raw.schema || "").trim() !== MANIFEST_V2) throw new Error("UNSUPPORTED_CORRECTION_MANIFEST_SCHEMA");
  if (String(raw.review_status || "").trim().toLowerCase() !== "approved") throw new Error("CORRECTION_MANIFEST_NOT_APPROVED");
  const requestId = String(raw.request_id || "").trim();
  if (!requestId) throw new Error("CORRECTION_REQUEST_ID_REQUIRED");
  if (!Array.isArray(raw.operations) || raw.operations.length === 0 || raw.operations.length > MAX_OPERATIONS) {
    throw new Error("CORRECTION_POLITY_RETIRE_OPERATIONS_INVALID");
  }
  const operations = raw.operations.map((operation, index) => requireOperation(operation, index + 1));
  const ids = operations.map((operation) => operation.expected_polity.id);
  if (new Set(ids).size !== ids.length) throw new Error("CORRECTION_POLITY_RETIRE_POLITY_REUSED");
  return Object.freeze({ schema: MANIFEST_V2, requestId, operations });
}

function normalizePolity(row) {
  if (!row) return null;
  return Object.freeze({
    id: String(row.id).toLowerCase(),
    canonical_key: String(row.canonical_key),
    polity_type: String(row.polity_type),
    historicity: String(row.historicity)
  });
}

async function loadPolity(client, id, { forUpdate = false } = {}) {
  const result = await client.query(
    `select id::text,canonical_key,polity_type,historicity
       from atlas_v2.polities
      where id=$1::uuid${forUpdate ? " for update" : ""}`,
    [id]
  );
  return normalizePolity(result.rows[0] || null);
}

async function loadPreferredNames(client, polityId, { forUpdate = false } = {}) {
  const result = await client.query(
    `select locale,name,is_preferred
       from atlas_v2.polity_names
      where polity_id=$1::uuid and is_preferred=true
      order by locale,name${forUpdate ? " for update" : ""}`,
    [polityId]
  );
  return Object.freeze(result.rows.map((row) => Object.freeze({
    locale: String(row.locale),
    name: String(row.name),
    is_preferred: Boolean(row.is_preferred)
  })));
}

async function loadReferenceCounts(client, polityId) {
  const references = await discoverPolityReferences(client);
  const rows = [];
  let ownedTotal = 0;
  let externalTotal = 0;
  for (const ref of references) {
    const schema = quoteIdentifier(ref.source_schema);
    const table = quoteIdentifier(ref.source_table);
    const column = quoteIdentifier(ref.source_column);
    const countResult = await client.query(
      `select count(*)::int as reference_count from ${schema}.${table} where ${column}=$1::uuid`,
      [polityId]
    );
    const count = Number(countResult.rows[0]?.reference_count || 0);
    const row = Object.freeze({
      reference_key: referenceKey(ref),
      classification: ref.classification,
      constraint_name: ref.constraint_name,
      constraint_backed: ref.constraint_backed,
      count
    });
    rows.push(row);
    if (ref.classification === "owned") ownedTotal += count;
    else externalTotal += count;
  }
  return Object.freeze({
    owned_reference_total: ownedTotal,
    external_reference_total: externalTotal,
    references: Object.freeze(rows)
  });
}

async function globalCounts(client) {
  const result = await client.query(`select
    (select count(*)::int from atlas_v2.polities) as polities,
    (select count(*)::int from atlas_v2.polity_names) as polity_names,
    (select count(*)::int from atlas_v2.polity_descriptions) as polity_descriptions,
    (select count(*)::int from atlas_v2.polity_sources) as polity_sources`);
  const row = result.rows[0] || {};
  return Object.freeze({
    polities: Number(row.polities || 0),
    polity_names: Number(row.polity_names || 0),
    polity_descriptions: Number(row.polity_descriptions || 0),
    polity_sources: Number(row.polity_sources || 0)
  });
}

function assertExactPolity(actual, expected, code) {
  if (!actual || !exactEqual(actual, expected)) throw new Error(code);
}

function assertExactNames(actual, expected, code) {
  const sorted = actual.slice().sort((a, b) => `${a.locale}\u0000${a.name}`.localeCompare(`${b.locale}\u0000${b.name}`));
  if (!exactEqual(sorted, expected)) throw new Error(code);
}

async function assertPreflight(client, operation) {
  const polity = await loadPolity(client, operation.expected_polity.id, { forUpdate: true });
  assertExactPolity(polity, operation.expected_polity, `CORRECTION_POLITY_RETIRE_POLITY_DRIFT:${operation.expected_polity.id}`);
  const preferredNames = await loadPreferredNames(client, operation.expected_polity.id, { forUpdate: true });
  assertExactNames(preferredNames, operation.expected_preferred_names, `CORRECTION_POLITY_RETIRE_PREFERRED_NAMES_DRIFT:${operation.expected_polity.id}`);
  const references = await loadReferenceCounts(client, operation.expected_polity.id);
  if (references.external_reference_total !== 0) {
    throw new Error(`CORRECTION_POLITY_RETIRE_EXTERNAL_REFERENCES_PRESENT:${operation.expected_polity.id}`);
  }
  if (references.external_reference_total !== operation.expected_external_reference_total) {
    throw new Error(`CORRECTION_POLITY_RETIRE_EXTERNAL_REFERENCE_TOTAL_DRIFT:${operation.expected_polity.id}`);
  }
  if (references.owned_reference_total !== operation.expected_owned_reference_total) {
    throw new Error(`CORRECTION_POLITY_RETIRE_OWNED_REFERENCE_TOTAL_DRIFT:${operation.expected_polity.id}`);
  }
  return Object.freeze({ polity, preferred_names: preferredNames, references });
}

async function applyOperation(client, operation) {
  const result = await client.query(
    `delete from atlas_v2.polities
      where id=$1::uuid
      returning id::text,canonical_key,polity_type,historicity`,
    [operation.expected_polity.id]
  );
  if (result.rowCount !== 1) throw new Error("CORRECTION_POLITY_RETIRE_DELETE_COUNT_DRIFT");
  const removed = normalizePolity(result.rows[0]);
  assertExactPolity(removed, operation.expected_polity, "CORRECTION_POLITY_RETIRE_DELETE_IDENTITY_DRIFT");
  return removed;
}

async function verifyRetired(client, operation) {
  if (await loadPolity(client, operation.expected_polity.id, { forUpdate: true })) {
    throw new Error(`CORRECTION_POLITY_RETIRE_TARGET_REAPPEARED:${operation.expected_polity.id}`);
  }
  const references = await loadReferenceCounts(client, operation.expected_polity.id);
  if (references.owned_reference_total !== 0 || references.external_reference_total !== 0) {
    throw new Error(`CORRECTION_POLITY_RETIRE_POSTWRITE_REFERENCE_REAPPEARED:${operation.expected_polity.id}`);
  }
}

function expectedOwnedDecrements(prepared) {
  const totals = { polity_names: 0, polity_descriptions: 0, polity_sources: 0 };
  for (const item of prepared) {
    for (const ref of item.references.references) {
      const key = OWNED_COUNT_KEYS[ref.reference_key];
      if (key) totals[key] += Number(ref.count || 0);
    }
  }
  return totals;
}

function assertGlobalCountDelta(beforeCounts, afterCounts, operationCount, ownedDecrements) {
  if (afterCounts.polities !== beforeCounts.polities - operationCount) throw new Error("CORRECTION_POLITY_RETIRE_POLITY_COUNT_DRIFT");
  for (const key of Object.keys(ownedDecrements)) {
    if (afterCounts[key] !== beforeCounts[key] - ownedDecrements[key]) {
      throw new Error(`CORRECTION_POLITY_RETIRE_${key.toUpperCase()}_COUNT_DRIFT`);
    }
  }
}

function assertReplaySnapshot(snapshot, manifest) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) throw new Error("CORRECTION_LEDGER_RESULT_INVALID");
  if (snapshot.schema !== SNAPSHOT_SCHEMA || snapshot.marker !== MARKER_V2) throw new Error("CORRECTION_POLITY_RETIRE_LEDGER_RESULT_SCHEMA_MISMATCH");
  if (!Array.isArray(snapshot.operations) || snapshot.operations.length !== manifest.operations.length) {
    throw new Error("CORRECTION_POLITY_RETIRE_LEDGER_OPERATION_DRIFT");
  }
}

function createCorrectionPolityRetireV2Service({ client } = {}) {
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
        assertReplaySnapshot(ledger.result_snapshot, manifest);
        for (const operation of manifest.operations) await verifyRetired(client, operation);
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

      const beforeCounts = await globalCounts(client);
      const prepared = [];
      for (const operation of manifest.operations) prepared.push(await assertPreflight(client, operation));
      const ownedDecrements = expectedOwnedDecrements(prepared);

      const outcomes = [];
      for (let index = 0; index < manifest.operations.length; index += 1) {
        const operation = manifest.operations[index];
        const before = prepared[index];
        const removed = await applyOperation(client, operation);
        await verifyRetired(client, operation);
        outcomes.push(Object.freeze({
          type: operation.type,
          case_id: operation.case_id,
          review_reason: operation.review_reason,
          expected_polity: operation.expected_polity,
          preferred_names: before.preferred_names,
          reference_snapshot: before.references,
          removed_polity: removed
        }));
      }

      const afterCounts = await globalCounts(client);
      assertGlobalCountDelta(beforeCounts, afterCounts, manifest.operations.length, ownedDecrements);
      const snapshot = Object.freeze({
        version: 1,
        schema: SNAPSHOT_SCHEMA,
        marker: MARKER_V2,
        operation_type: OPERATION_TYPE,
        operations: Object.freeze(outcomes),
        before_counts: beforeCounts,
        after_counts: afterCounts,
        polities_removed: manifest.operations.length,
        owned_rows_removed: Object.freeze({ ...ownedDecrements })
      });

      if (dryRun) {
        await client.query("rollback");
        return Object.freeze({
          marker: MARKER_V2,
          request_id: manifest.requestId,
          dry_run: true,
          committed: false,
          replay: false,
          result: snapshot
        });
      }

      if (!await correctionLedgerExists(client)) throw new Error("CORRECTION_LEDGER_SCHEMA_REQUIRED");
      await client.query(`insert into atlas_v2.correction_manifest_runs(
        request_id,manifest_hash,manifest_schema,result_snapshot
      ) values($1,$2,$3,$4::jsonb)`, [manifest.requestId, hash, MANIFEST_V2, JSON.stringify(snapshot)]);
      await client.query("commit");
      return Object.freeze({
        marker: MARKER_V2,
        request_id: manifest.requestId,
        dry_run: false,
        committed: true,
        replay: false,
        result: snapshot
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
  REVIEW_REASON,
  SNAPSHOT_SCHEMA,
  MAX_OPERATIONS,
  OWNED_COUNT_KEYS,
  requireManifest,
  loadPolity,
  loadPreferredNames,
  loadReferenceCounts,
  globalCounts,
  assertPreflight,
  applyOperation,
  verifyRetired,
  expectedOwnedDecrements,
  assertGlobalCountDelta,
  createCorrectionPolityRetireV2Service
});
