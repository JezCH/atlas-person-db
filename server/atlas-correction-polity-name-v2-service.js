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

const OPERATION_TYPE = "replace_polity_preferred_name";
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
    throw new Error("CORRECTION_POLITY_NAME_OPERATION_OBJECT_REQUIRED");
  }
  if (String(raw.type || "").trim() !== OPERATION_TYPE) {
    throw new Error("CORRECTION_POLITY_NAME_OPERATION_UNSUPPORTED");
  }

  const caseId = requireNonEmpty(raw.case_id, `CORRECTION_POLITY_NAME_OP${index}_CASE_ID_REQUIRED`);
  const polityId = requireUuid(raw.polity_id, `CORRECTION_POLITY_NAME_OP${index}_POLITY_ID_INVALID`);
  const locale = requireNonEmpty(raw.locale, `CORRECTION_POLITY_NAME_OP${index}_LOCALE_REQUIRED`);
  const expectedName = requireNonEmpty(raw.expected_name, `CORRECTION_POLITY_NAME_OP${index}_EXPECTED_NAME_REQUIRED`);
  const replacementName = requireNonEmpty(raw.replacement_name, `CORRECTION_POLITY_NAME_OP${index}_REPLACEMENT_NAME_REQUIRED`);
  if (expectedName === replacementName) {
    throw new Error(`CORRECTION_POLITY_NAME_OP${index}_NO_CHANGE`);
  }

  return Object.freeze({
    type: OPERATION_TYPE,
    case_id: caseId,
    polity_id: polityId,
    locale,
    expected_name: expectedName,
    replacement_name: replacementName
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
    throw new Error("CORRECTION_POLITY_NAME_OPERATIONS_INVALID");
  }

  const operations = raw.operations.map((operation, index) => requireOperation(operation, index + 1));
  const targets = new Set();
  for (const operation of operations) {
    const key = `${operation.polity_id}\u0000${operation.locale}`;
    if (targets.has(key)) throw new Error("CORRECTION_POLITY_NAME_TARGET_REUSED");
    targets.add(key);
  }
  return Object.freeze({ schema: MANIFEST_V2, requestId, operations });
}

function normalizePolity(row) {
  if (!row) return null;
  return Object.freeze({
    id: String(row.id).toLowerCase(),
    canonical_key: String(row.canonical_key || ""),
    polity_type: String(row.polity_type || ""),
    historicity: String(row.historicity || "")
  });
}

function normalizeName(row) {
  if (!row) return null;
  return Object.freeze({
    id: String(row.id).toLowerCase(),
    polity_id: String(row.polity_id).toLowerCase(),
    locale: String(row.locale),
    name: String(row.name),
    is_preferred: Boolean(row.is_preferred)
  });
}

async function loadPolity(client, polityId, { forUpdate = false } = {}) {
  const result = await client.query(
    `select id::text,canonical_key,polity_type,historicity
       from atlas_v2.polities
      where id=$1::uuid${forUpdate ? " for update" : ""}`,
    [polityId]
  );
  if (result.rowCount > 1) throw new Error(`CORRECTION_POLITY_NAME_POLITY_ID_NONUNIQUE:${polityId}`);
  return normalizePolity(result.rows[0]);
}

async function loadPreferredName(client, polityId, locale, { forUpdate = false } = {}) {
  const result = await client.query(
    `select id::text,polity_id::text,locale,name,is_preferred
       from atlas_v2.polity_names
      where polity_id=$1::uuid and locale=$2 and is_preferred=true${forUpdate ? " for update" : ""}`,
    [polityId, locale]
  );
  if (result.rowCount !== 1) {
    throw new Error(`CORRECTION_POLITY_NAME_PREFERRED_ROW_COUNT_DRIFT:${polityId}:${locale}:${result.rowCount}`);
  }
  return normalizeName(result.rows[0]);
}

async function assertReplacementAvailable(client, operation) {
  const result = await client.query(
    `select id::text,polity_id::text,locale,name,is_preferred
       from atlas_v2.polity_names
      where locale=$1 and name=$2
      order by polity_id,id
      for update`,
    [operation.locale, operation.replacement_name]
  );
  if (result.rowCount !== 0) {
    throw new Error(`CORRECTION_POLITY_NAME_REPLACEMENT_COLLISION:${operation.locale}:${operation.replacement_name}`);
  }
}

async function globalCounts(client) {
  const result = await client.query(`select
    (select count(*)::bigint from atlas_v2.polities) as polities,
    (select count(*)::bigint from atlas_v2.polity_names) as polity_names`);
  return Object.freeze({
    polities: String(result.rows[0].polities),
    polity_names: String(result.rows[0].polity_names)
  });
}

async function assertPreflight(client, operation) {
  const polity = await loadPolity(client, operation.polity_id, { forUpdate: true });
  if (!polity) throw new Error(`CORRECTION_POLITY_NAME_POLITY_MISSING:${operation.polity_id}`);
  const name = await loadPreferredName(client, operation.polity_id, operation.locale, { forUpdate: true });
  if (name.name !== operation.expected_name) {
    throw new Error(`CORRECTION_POLITY_NAME_BEFORE_DRIFT:${operation.polity_id}:${operation.locale}`);
  }
  await assertReplacementAvailable(client, operation);
  return Object.freeze({ polity, name });
}

async function applyOperation(client, operation, prepared) {
  const result = await client.query(
    `update atlas_v2.polity_names
        set name=$1
      where id=$2::uuid
        and polity_id=$3::uuid
        and locale=$4
        and is_preferred=true
        and name=$5
      returning id::text,polity_id::text,locale,name,is_preferred`,
    [
      operation.replacement_name,
      prepared.name.id,
      operation.polity_id,
      operation.locale,
      operation.expected_name
    ]
  );
  if (result.rowCount !== 1) {
    throw new Error(`CORRECTION_POLITY_NAME_UPDATE_COUNT_DRIFT:${operation.polity_id}:${operation.locale}`);
  }
  return normalizeName(result.rows[0]);
}

async function verifyAppliedOperation(client, operation, expectedPolity, expectedNameId, { forUpdate = false } = {}) {
  const polity = await loadPolity(client, operation.polity_id, { forUpdate });
  if (!polity || JSON.stringify(polity) !== JSON.stringify(expectedPolity)) {
    throw new Error(`CORRECTION_POLITY_NAME_POLITY_IDENTITY_DRIFT:${operation.polity_id}`);
  }
  const name = await loadPreferredName(client, operation.polity_id, operation.locale, { forUpdate });
  if (name.id !== expectedNameId) {
    throw new Error(`CORRECTION_POLITY_NAME_ROW_IDENTITY_DRIFT:${operation.polity_id}:${operation.locale}`);
  }
  if (name.name !== operation.replacement_name) {
    throw new Error(`CORRECTION_POLITY_NAME_REPLAY_NAME_DRIFT:${operation.polity_id}:${operation.locale}`);
  }
  return name;
}

function createCorrectionPolityNameV2Service({ client } = {}) {
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
        if (!snapshot || !Array.isArray(snapshot.operations) || snapshot.operations.length !== manifest.operations.length) {
          throw new Error("CORRECTION_POLITY_NAME_LEDGER_RESULT_DRIFT");
        }
        for (let index = 0; index < manifest.operations.length; index += 1) {
          const operation = manifest.operations[index];
          const prior = snapshot.operations[index];
          await verifyAppliedOperation(client, operation, prior.polity, prior.preferred_name_row_id, { forUpdate: true });
        }
        if (dryRun) await client.query("rollback"); else await client.query("commit");
        return Object.freeze({
          marker: MARKER_V2,
          request_id: manifest.requestId,
          dry_run: Boolean(dryRun),
          committed: !dryRun,
          replay: true,
          result: snapshot
        });
      }

      const beforeCounts = await globalCounts(client);
      const outcomes = [];
      for (const operation of manifest.operations) {
        const before = await assertPreflight(client, operation);
        const after = await applyOperation(client, operation, before);
        await verifyAppliedOperation(client, operation, before.polity, before.name.id, { forUpdate: true });
        outcomes.push(Object.freeze({
          type: operation.type,
          case_id: operation.case_id,
          polity_id: operation.polity_id,
          locale: operation.locale,
          polity: before.polity,
          preferred_name_row_id: before.name.id,
          name_before: before.name.name,
          name_after: after.name
        }));
      }

      const afterCounts = await globalCounts(client);
      if (afterCounts.polities !== beforeCounts.polities) throw new Error("CORRECTION_POLITY_NAME_POLITY_COUNT_DRIFT");
      if (afterCounts.polity_names !== beforeCounts.polity_names) throw new Error("CORRECTION_POLITY_NAME_ROW_COUNT_DRIFT");

      const snapshot = Object.freeze({
        version: 1,
        schema: MANIFEST_V2,
        marker: MARKER_V2,
        correction_family: "polity_preferred_name",
        invariant: "Only one existing atlas_v2.polity_names preferred-name value may change; Polity identity and row cardinality remain unchanged.",
        operations: Object.freeze(outcomes),
        counts_before: beforeCounts,
        counts_after: afterCounts
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
  loadPolity,
  loadPreferredName,
  globalCounts,
  assertPreflight,
  applyOperation,
  verifyAppliedOperation,
  createCorrectionPolityNameV2Service
});
