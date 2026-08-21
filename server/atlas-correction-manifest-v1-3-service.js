"use strict";

const {
  manifestHash,
  correctionLedgerExists,
  readLedger
} = require("./atlas-correction-manifest-service.js");

const MANIFEST_V1_3 = "atlas-correction-manifest/v1.3";
const MARKER_V1_3 = "ATLAS_CORRECTION_MANIFEST_V1_3";
const MAX_OPERATIONS_V1_3 = 20;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPERATION_TYPE = "replace_person_preferred_name";
const POLITY_OPERATION_TYPE = "replace_polity_preferred_name";

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function requireUuid(value, code) {
  const id = String(value || "").trim().toLowerCase();
  if (!UUID_RE.test(id)) throw new Error(code);
  return id;
}

function normalizeNameState(raw, label) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`CORRECTION_V13_${label}_NAME_REQUIRED`);
  const locale = normalizeText(raw.locale);
  const name = normalizeText(raw.name);
  const nameType = normalizeText(raw.name_type);
  if (!locale) throw new Error(`CORRECTION_V13_${label}_LOCALE_REQUIRED`);
  if (!name) throw new Error(`CORRECTION_V13_${label}_NAME_VALUE_REQUIRED`);
  if (!nameType) throw new Error(`CORRECTION_V13_${label}_NAME_TYPE_REQUIRED`);
  if (raw.is_preferred !== true) throw new Error(`CORRECTION_V13_${label}_PREFERRED_REQUIRED`);
  return Object.freeze({ locale, name, name_type: nameType, is_preferred: true });
}

function requireOperation(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_V13_OPERATION_OBJECT_REQUIRED");
  const type = normalizeText(raw.type);
  if (type !== OPERATION_TYPE && type !== POLITY_OPERATION_TYPE) throw new Error("CORRECTION_V13_OPERATION_UNSUPPORTED");
  const before = normalizeNameState(raw.expected_before, `OP${index}_BEFORE`);
  const after = normalizeNameState(raw.expected_after, `OP${index}_AFTER`);
  if (before.locale !== after.locale) throw new Error("CORRECTION_V13_LOCALE_DRIFT");
  if (before.name_type !== after.name_type) throw new Error("CORRECTION_V13_NAME_TYPE_DRIFT");
  if (before.name === after.name) throw new Error("CORRECTION_V13_NO_CHANGE");
  if (type === OPERATION_TYPE) {
    const personId = requireUuid(raw.person_id, `CORRECTION_V13_OP${index}_PERSON_ID_REQUIRED`);
    return Object.freeze({ type, person_id: personId, expected_before: before, expected_after: after });
  }
  const polityId = requireUuid(raw.polity_id, `CORRECTION_V13_OP${index}_POLITY_ID_REQUIRED`);
  return Object.freeze({ type, polity_id: polityId, expected_before: before, expected_after: after });
}

function requireManifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_MANIFEST_OBJECT_REQUIRED");
  if (normalizeText(raw.schema) !== MANIFEST_V1_3) throw new Error("UNSUPPORTED_CORRECTION_MANIFEST_SCHEMA");
  if (normalizeText(raw.review_status).toLowerCase() !== "approved") throw new Error("CORRECTION_MANIFEST_NOT_APPROVED");
  const requestId = normalizeText(raw.request_id);
  if (!requestId) throw new Error("CORRECTION_REQUEST_ID_REQUIRED");
  if (!Array.isArray(raw.operations) || raw.operations.length === 0 || raw.operations.length > MAX_OPERATIONS_V1_3) {
    throw new Error("CORRECTION_V13_OPERATIONS_INVALID");
  }
  const operations = raw.operations.map((operation, index) => requireOperation(operation, index + 1));
  const seen = new Set();
  for (const operation of operations) {
    const targetId = operation.type === OPERATION_TYPE ? operation.person_id : operation.polity_id;
    const key = `${operation.type}|${targetId}|${operation.expected_before.locale}`;
    if (seen.has(key)) throw new Error("CORRECTION_V13_TARGET_LOCALE_REUSED");
    seen.add(key);
  }
  return Object.freeze({ schema: MANIFEST_V1_3, requestId, operations });
}

async function loadPreferredName(client, personId, locale, { forUpdate = false } = {}) {
  const result = await client.query(`
    select id::text,person_id::text,locale,name,name_type,is_preferred
      from atlas_v2.person_names
     where person_id=$1::uuid and locale=$2 and is_preferred=true
     order by id${forUpdate ? " for update" : ""}`, [personId, locale]);
  if (result.rowCount !== 1) throw new Error("CORRECTION_V13_PREFERRED_NAME_CARDINALITY_DRIFT");
  const row = result.rows[0];
  return {
    id: String(row.id).toLowerCase(),
    person_id: String(row.person_id).toLowerCase(),
    locale: String(row.locale),
    name: String(row.name),
    name_type: String(row.name_type),
    is_preferred: row.is_preferred === true
  };
}

async function loadPreferredPolityName(client, polityId, locale, { forUpdate = false } = {}) {
  const result = await client.query(`
    select id::text,polity_id::text,locale,name,name_type,is_preferred
      from atlas_v2.polity_names
     where polity_id=$1::uuid and locale=$2 and is_preferred=true
     order by id${forUpdate ? " for update" : ""}`, [polityId, locale]);
  if (result.rowCount !== 1) throw new Error("CORRECTION_V13_POLITY_PREFERRED_NAME_CARDINALITY_DRIFT");
  const row = result.rows[0];
  return {
    id: String(row.id).toLowerCase(),
    polity_id: String(row.polity_id).toLowerCase(),
    locale: String(row.locale),
    name: String(row.name),
    name_type: String(row.name_type),
    is_preferred: row.is_preferred === true
  };
}

function assertExpected(row, operation, expected, code) {
  if (!row || row.person_id !== operation.person_id
    || row.locale !== expected.locale
    || row.name !== expected.name
    || row.name_type !== expected.name_type
    || row.is_preferred !== true) throw new Error(code);
}

function assertPolityExpected(row, operation, expected, code) {
  if (!row || row.polity_id !== operation.polity_id
    || row.locale !== expected.locale
    || row.name !== expected.name
    || row.name_type !== expected.name_type
    || row.is_preferred !== true) throw new Error(code);
}

async function assertNoTargetCollision(client, operation) {
  const result = await client.query(`
    select person_id::text
      from atlas_v2.person_names
     where name=$1 and person_id<>$2::uuid
     group by person_id
     order by person_id
     limit 1`, [operation.expected_after.name, operation.person_id]);
  if (result.rowCount) throw new Error("CORRECTION_V13_TARGET_NAME_COLLISION");
}

async function assertNoPolityTargetCollision(client, operation) {
  const result = await client.query(`
    select polity_id::text
      from atlas_v2.polity_names
     where name=$1 and polity_id<>$2::uuid
     group by polity_id
     order by polity_id
     limit 1`, [operation.expected_after.name, operation.polity_id]);
  if (result.rowCount) throw new Error("CORRECTION_V13_POLITY_TARGET_NAME_COLLISION");
}

async function replacePreferredName(client, operation) {
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-identity:person:name:${operation.expected_before.name}`]);
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-identity:person:name:${operation.expected_after.name}`]);
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-identity:person:${operation.person_id}:locale:${operation.expected_before.locale}`]);
  await assertNoTargetCollision(client, operation);
  const before = await loadPreferredName(client, operation.person_id, operation.expected_before.locale, { forUpdate: true });
  assertExpected(before, operation, operation.expected_before, "CORRECTION_V13_EXACT_BEFORE_DRIFT");
  const result = await client.query(`
    update atlas_v2.person_names
       set name=$2
     where id=$1::uuid
     returning id::text`, [before.id, operation.expected_after.name]);
  if (result.rowCount !== 1) throw new Error("CORRECTION_V13_UPDATE_COUNT_DRIFT");
  const after = await loadPreferredName(client, operation.person_id, operation.expected_after.locale, { forUpdate: true });
  assertExpected(after, operation, operation.expected_after, "CORRECTION_V13_POSTWRITE_DRIFT");
  if (after.id !== before.id) throw new Error("CORRECTION_V13_NAME_ROW_ID_DRIFT");
  const stale = await client.query(`select count(*)::int as count from atlas_v2.person_names where person_id=$1::uuid and name=$2`, [operation.person_id, operation.expected_before.name]);
  if (Number(stale.rows[0]?.count || 0) !== 0) throw new Error("CORRECTION_V13_STALE_NAME_REMAINED");
  return Object.freeze({ person_id: operation.person_id, name_row_id: after.id, locale: after.locale, old_name: operation.expected_before.name, new_name: after.name });
}

async function replacePolityPreferredName(client, operation) {
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-identity:polity:name:${operation.expected_before.name}`]);
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-identity:polity:name:${operation.expected_after.name}`]);
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-identity:polity:${operation.polity_id}:locale:${operation.expected_before.locale}`]);
  await assertNoPolityTargetCollision(client, operation);
  const before = await loadPreferredPolityName(client, operation.polity_id, operation.expected_before.locale, { forUpdate: true });
  assertPolityExpected(before, operation, operation.expected_before, "CORRECTION_V13_POLITY_EXACT_BEFORE_DRIFT");
  const result = await client.query(`
    update atlas_v2.polity_names
       set name=$2
     where id=$1::uuid
     returning id::text`, [before.id, operation.expected_after.name]);
  if (result.rowCount !== 1) throw new Error("CORRECTION_V13_POLITY_UPDATE_COUNT_DRIFT");
  const after = await loadPreferredPolityName(client, operation.polity_id, operation.expected_after.locale, { forUpdate: true });
  assertPolityExpected(after, operation, operation.expected_after, "CORRECTION_V13_POLITY_POSTWRITE_DRIFT");
  if (after.id !== before.id) throw new Error("CORRECTION_V13_POLITY_NAME_ROW_ID_DRIFT");
  const stale = await client.query(`select count(*)::int as count from atlas_v2.polity_names where polity_id=$1::uuid and name=$2`, [operation.polity_id, operation.expected_before.name]);
  if (Number(stale.rows[0]?.count || 0) !== 0) throw new Error("CORRECTION_V13_POLITY_STALE_NAME_REMAINED");
  return Object.freeze({ polity_id: operation.polity_id, name_row_id: after.id, locale: after.locale, old_name: operation.expected_before.name, new_name: after.name });
}

async function verifyAppliedState(client, manifest) {
  for (const operation of manifest.operations) {
    if (operation.type === OPERATION_TYPE) {
      const row = await loadPreferredName(client, operation.person_id, operation.expected_after.locale, { forUpdate: true });
      assertExpected(row, operation, operation.expected_after, `CORRECTION_V13_REPLAY_DRIFT:${operation.person_id}`);
      const stale = await client.query(`select count(*)::int as count from atlas_v2.person_names where person_id=$1::uuid and name=$2`, [operation.person_id, operation.expected_before.name]);
      if (Number(stale.rows[0]?.count || 0) !== 0) throw new Error(`CORRECTION_V13_REPLAY_STALE_NAME:${operation.person_id}`);
      continue;
    }
    const row = await loadPreferredPolityName(client, operation.polity_id, operation.expected_after.locale, { forUpdate: true });
    assertPolityExpected(row, operation, operation.expected_after, `CORRECTION_V13_POLITY_REPLAY_DRIFT:${operation.polity_id}`);
    const stale = await client.query(`select count(*)::int as count from atlas_v2.polity_names where polity_id=$1::uuid and name=$2`, [operation.polity_id, operation.expected_before.name]);
    if (Number(stale.rows[0]?.count || 0) !== 0) throw new Error(`CORRECTION_V13_POLITY_REPLAY_STALE_NAME:${operation.polity_id}`);
  }
}

function createCorrectionManifestV13Service({ client } = {}) {
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
        if (ledger.manifest_schema !== MANIFEST_V1_3) throw new Error("CORRECTION_LEDGER_SCHEMA_MISMATCH");
        await verifyAppliedState(client, manifest);
        if (dryRun) await client.query("rollback"); else await client.query("commit");
        return Object.freeze({ marker: MARKER_V1_3, request_id: manifest.requestId, dry_run: Boolean(dryRun), committed: !dryRun, replay: true, result: ledger.result_snapshot });
      }

      const outcomes = [];
      for (const operation of manifest.operations) {
        outcomes.push(operation.type === OPERATION_TYPE
          ? await replacePreferredName(client, operation)
          : await replacePolityPreferredName(client, operation));
      }
      const snapshot = Object.freeze({ version: 1, schema: MANIFEST_V1_3, marker: MARKER_V1_3, operations: outcomes });
      if (dryRun) {
        await client.query("rollback");
        return Object.freeze({ marker: MARKER_V1_3, request_id: manifest.requestId, dry_run: true, committed: false, replay: false, result: snapshot });
      }
      if (!await correctionLedgerExists(client)) throw new Error("CORRECTION_LEDGER_SCHEMA_REQUIRED");
      await client.query(`insert into atlas_v2.correction_manifest_runs(request_id,manifest_hash,manifest_schema,result_snapshot) values($1,$2,$3,$4::jsonb)`, [manifest.requestId, hash, MANIFEST_V1_3, JSON.stringify(snapshot)]);
      await client.query("commit");
      return Object.freeze({ marker: MARKER_V1_3, request_id: manifest.requestId, dry_run: false, committed: true, replay: false, result: snapshot });
    } catch (error) {
      try { await client.query("rollback"); } catch {}
      throw error;
    }
  }

  return Object.freeze({ execute });
}

module.exports = Object.freeze({
  MANIFEST_V1_3,
  MARKER_V1_3,
  MAX_OPERATIONS_V1_3,
  OPERATION_TYPE,
  POLITY_OPERATION_TYPE,
  requireManifest,
  requireOperation,
  loadPreferredName,
  loadPreferredPolityName,
  replacePreferredName,
  replacePolityPreferredName,
  verifyAppliedState,
  createCorrectionManifestV13Service
});