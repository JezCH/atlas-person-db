"use strict";

const {
  manifestHash,
  correctionLedgerExists,
  readLedger
} = require("./atlas-correction-manifest-service.js");
const {
  MANIFEST_V2,
  MARKER_V2,
  normalizeRole,
  normalizeRoleName,
  loadRole,
  loadRoleNames,
  loadRoleUsage,
  loadAuthoringLedgers,
  snapshotRoleId,
  globalRoleCounts
} = require("./atlas-correction-role-merge-v2-service.js");

const OPERATION_TYPE = "merge_role_polity_qualifier";
const REVIEW_REASON = "POLITY_SCOPE_REDUNDANT_IN_ROLE";
const MAX_OPERATIONS = 20;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function normalizeNames(raw, roleId, label) {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error(`CORRECTION_ROLE_SCOPE_${label}_NAMES_REQUIRED`);
  const names = raw.map((row, index) => normalizeRoleName(row, roleId, `${label}_${index + 1}`));
  const ids = new Set();
  for (const row of names) {
    if (ids.has(row.id)) throw new Error(`CORRECTION_ROLE_SCOPE_${label}_NAME_ID_REUSED`);
    ids.add(row.id);
  }
  return Object.freeze(names.slice().sort((a, b) => a.id.localeCompare(b.id)));
}

function normalizeBindings(raw, label) {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("CORRECTION_ROLE_SCOPE_AFFECTED_BINDINGS_REQUIRED");
  const bindings = raw.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error("CORRECTION_ROLE_SCOPE_BINDING_OBJECT_REQUIRED");
    return Object.freeze({
      activity_id: requireUuid(row.activity_id, `CORRECTION_ROLE_SCOPE_${label}_${index + 1}_ACTIVITY_ID_INVALID`),
      polity_id: requireUuid(row.polity_id, `CORRECTION_ROLE_SCOPE_${label}_${index + 1}_POLITY_ID_INVALID`)
    });
  }).sort((a, b) => a.activity_id.localeCompare(b.activity_id));
  if (new Set(bindings.map((row) => row.activity_id)).size !== bindings.length) {
    throw new Error("CORRECTION_ROLE_SCOPE_ACTIVITY_ID_REUSED");
  }
  return Object.freeze(bindings);
}

function requireOperation(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_ROLE_SCOPE_OPERATION_OBJECT_REQUIRED");
  if (String(raw.type || "").trim() !== OPERATION_TYPE) throw new Error("CORRECTION_ROLE_SCOPE_OPERATION_UNSUPPORTED");
  if (String(raw.review_reason || "").trim() !== REVIEW_REASON) throw new Error("CORRECTION_ROLE_SCOPE_REVIEW_REASON_REQUIRED");

  const keepRole = normalizeRole(raw.expected_keep_role, `SCOPE_OP${index}_KEEP`);
  const dropRole = normalizeRole(raw.expected_drop_role, `SCOPE_OP${index}_DROP`);
  if (keepRole.id === dropRole.id) throw new Error("CORRECTION_ROLE_SCOPE_KEEP_DROP_MUST_DIFFER");
  if (!keepRole.is_active || !dropRole.is_active) throw new Error("CORRECTION_ROLE_SCOPE_INACTIVE_ROLE_FORBIDDEN");
  if (keepRole.source_label === dropRole.source_label) throw new Error("CORRECTION_ROLE_SCOPE_NO_CHANGE");

  const keepNames = normalizeNames(raw.expected_keep_names, keepRole.id, `OP${index}_KEEP`);
  const dropNames = normalizeNames(raw.expected_drop_names, dropRole.id, `OP${index}_DROP`);
  const bindings = normalizeBindings(raw.affected_activity_bindings, `OP${index}`);

  return Object.freeze({
    type: OPERATION_TYPE,
    case_id: String(raw.case_id || "").trim(),
    review_reason: REVIEW_REASON,
    keep_role: keepRole,
    drop_role: dropRole,
    keep_names: keepNames,
    drop_names: dropNames,
    bindings,
    affected_activity_ids: Object.freeze(bindings.map((row) => row.activity_id))
  });
}

function requireManifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_MANIFEST_OBJECT_REQUIRED");
  if (String(raw.schema || "").trim() !== MANIFEST_V2) throw new Error("UNSUPPORTED_CORRECTION_MANIFEST_SCHEMA");
  if (String(raw.review_status || "").trim().toLowerCase() !== "approved") throw new Error("CORRECTION_MANIFEST_NOT_APPROVED");
  const requestId = String(raw.request_id || "").trim();
  if (!requestId) throw new Error("CORRECTION_REQUEST_ID_REQUIRED");
  if (!Array.isArray(raw.operations) || raw.operations.length === 0 || raw.operations.length > MAX_OPERATIONS) {
    throw new Error("CORRECTION_ROLE_SCOPE_OPERATIONS_INVALID");
  }

  const operations = raw.operations.map((operation, index) => requireOperation(operation, index + 1));
  const dropRoleIds = new Set();
  const activityIds = new Set();
  const keepDeclarations = new Map();

  for (const operation of operations) {
    if (dropRoleIds.has(operation.drop_role.id)) throw new Error("CORRECTION_ROLE_SCOPE_DROP_ROLE_REUSED");
    dropRoleIds.add(operation.drop_role.id);

    const priorKeep = keepDeclarations.get(operation.keep_role.id);
    const declaration = { role: operation.keep_role, names: operation.keep_names };
    if (priorKeep && !exactEqual(priorKeep, declaration)) throw new Error("CORRECTION_ROLE_SCOPE_KEEP_ROLE_DECLARATION_DRIFT");
    keepDeclarations.set(operation.keep_role.id, declaration);

    for (const activityId of operation.affected_activity_ids) {
      if (activityIds.has(activityId)) throw new Error("CORRECTION_ROLE_SCOPE_ACTIVITY_REUSED_ACROSS_OPERATIONS");
      activityIds.add(activityId);
    }
  }

  for (const keepRoleId of keepDeclarations.keys()) {
    if (dropRoleIds.has(keepRoleId)) throw new Error("CORRECTION_ROLE_SCOPE_KEEP_ROLE_ALSO_DROPPED");
  }

  return Object.freeze({ schema: MANIFEST_V2, requestId, operations });
}

function normalizeDbBinding(row) {
  return Object.freeze({
    activity_id: String(row.id).toLowerCase(),
    polity_id: String(row.polity_id).toLowerCase(),
    role_id: row.role_id == null ? null : String(row.role_id).toLowerCase()
  });
}

async function loadActivityBindings(client, activityIds, { forUpdate = false } = {}) {
  const result = await client.query(
    `select id::text,polity_id::text,role_id::text
       from atlas_v2.person_politics_v2
      where id=any($1::uuid[])
      order by id${forUpdate ? " for update" : ""}`,
    [activityIds]
  );
  return result.rows.map(normalizeDbBinding);
}

function assertExactRole(actual, expected, code) {
  if (!actual || !exactEqual(actual, expected)) throw new Error(code);
}

function assertExactNames(actual, expected, code) {
  const sorted = actual.slice().sort((a, b) => a.id.localeCompare(b.id));
  if (!exactEqual(sorted, expected)) throw new Error(code);
}

function assertExactIdSet(actual, expected, code) {
  if (!exactEqual(actual.slice().sort(), expected.slice().sort())) throw new Error(code);
}

function assertExactBindings(actual, expected, dropRoleId, codePrefix) {
  assertExactIdSet(actual.map((row) => row.activity_id), expected.map((row) => row.activity_id), `${codePrefix}_ACTIVITY_SET_DRIFT`);
  const expectedById = new Map(expected.map((row) => [row.activity_id, row]));
  for (const row of actual) {
    const expectedRow = expectedById.get(row.activity_id);
    if (!expectedRow || row.polity_id !== expectedRow.polity_id) throw new Error(`${codePrefix}_POLITY_DRIFT:${row.activity_id}`);
    if (row.role_id !== dropRoleId) throw new Error(`${codePrefix}_ROLE_DRIFT:${row.activity_id}`);
  }
}

async function assertPreflight(client, operation) {
  const keep = await loadRole(client, operation.keep_role.id, { forUpdate: true });
  const drop = await loadRole(client, operation.drop_role.id, { forUpdate: true });
  assertExactRole(keep, operation.keep_role, `CORRECTION_ROLE_SCOPE_KEEP_ROLE_DRIFT:${operation.keep_role.id}`);
  assertExactRole(drop, operation.drop_role, `CORRECTION_ROLE_SCOPE_DROP_ROLE_DRIFT:${operation.drop_role.id}`);

  const keepNames = await loadRoleNames(client, operation.keep_role.id, { forUpdate: true });
  const dropNames = await loadRoleNames(client, operation.drop_role.id, { forUpdate: true });
  assertExactNames(keepNames, operation.keep_names, `CORRECTION_ROLE_SCOPE_KEEP_NAMES_DRIFT:${operation.keep_role.id}`);
  assertExactNames(dropNames, operation.drop_names, `CORRECTION_ROLE_SCOPE_DROP_NAMES_DRIFT:${operation.drop_role.id}`);

  const dropUsage = await loadRoleUsage(client, operation.drop_role.id, { forUpdate: true });
  assertExactIdSet(dropUsage, operation.affected_activity_ids, `CORRECTION_ROLE_SCOPE_DROP_USAGE_DRIFT:${operation.drop_role.id}`);

  const bindings = await loadActivityBindings(client, operation.affected_activity_ids, { forUpdate: true });
  assertExactBindings(bindings, operation.bindings, operation.drop_role.id, "CORRECTION_ROLE_SCOPE_BINDING");

  const ledgers = await loadAuthoringLedgers(client, operation.affected_activity_ids, { forUpdate: true });
  for (const ledger of ledgers) {
    if (ledger.result_snapshot == null) continue;
    if (snapshotRoleId(ledger.result_snapshot) !== operation.drop_role.id) {
      throw new Error(`CORRECTION_ROLE_SCOPE_AUTHORING_LEDGER_ROLE_DRIFT:${ledger.request_id}`);
    }
  }

  return Object.freeze({ keep, drop, keep_names: keepNames, drop_names: dropNames, bindings, authoring_ledgers: ledgers });
}

async function applyOperation(client, operation) {
  const updatedActivities = await client.query(
    `update atlas_v2.person_politics_v2
        set role_id=$2::uuid
      where id=any($1::uuid[]) and role_id=$3::uuid
      returning id::text`,
    [operation.affected_activity_ids, operation.keep_role.id, operation.drop_role.id]
  );
  const updatedIds = updatedActivities.rows.map((row) => String(row.id).toLowerCase()).sort();
  assertExactIdSet(updatedIds, operation.affected_activity_ids, "CORRECTION_ROLE_SCOPE_ACTIVITY_UPDATE_COUNT_DRIFT");

  const updatedLedgers = await client.query(
    `update atlas_v2.authoring_manifest_runs
        set result_snapshot=jsonb_set(result_snapshot,'{entities,role,id}',to_jsonb($2::text),false)
      where relationship_id=any($1::uuid[])
        and result_snapshot is not null
        and (result_snapshot #>> '{entities,role,id}')=$3
      returning request_id`,
    [operation.affected_activity_ids, operation.keep_role.id, operation.drop_role.id]
  );

  const deletedRole = await client.query(`delete from atlas_v2.roles where id=$1::uuid returning id::text`, [operation.drop_role.id]);
  if (deletedRole.rowCount !== 1) throw new Error("CORRECTION_ROLE_SCOPE_DROP_DELETE_COUNT_DRIFT");

  return Object.freeze({
    activities_rebound: updatedIds,
    authoring_ledgers_rebound: updatedLedgers.rows.map((row) => String(row.request_id)).sort(),
    role_removed: operation.drop_role.id,
    role_names_removed: operation.drop_names.length
  });
}

async function verifyAppliedOperation(client, operation, { forUpdate = false } = {}) {
  const keep = await loadRole(client, operation.keep_role.id, { forUpdate });
  assertExactRole(keep, operation.keep_role, `CORRECTION_ROLE_SCOPE_REPLAY_KEEP_ROLE_DRIFT:${operation.keep_role.id}`);
  assertExactNames(await loadRoleNames(client, operation.keep_role.id, { forUpdate }), operation.keep_names, `CORRECTION_ROLE_SCOPE_REPLAY_KEEP_NAMES_DRIFT:${operation.keep_role.id}`);
  if (await loadRole(client, operation.drop_role.id, { forUpdate })) throw new Error("CORRECTION_ROLE_SCOPE_REPLAY_DROP_ROLE_REAPPEARED");
  if ((await loadRoleUsage(client, operation.drop_role.id, { forUpdate })).length) throw new Error("CORRECTION_ROLE_SCOPE_REPLAY_DROP_USAGE_REAPPEARED");

  const bindings = await loadActivityBindings(client, operation.affected_activity_ids, { forUpdate });
  assertExactIdSet(bindings.map((row) => row.activity_id), operation.affected_activity_ids, "CORRECTION_ROLE_SCOPE_REPLAY_ACTIVITY_SET_DRIFT");
  const expectedById = new Map(operation.bindings.map((row) => [row.activity_id, row]));
  for (const row of bindings) {
    const expected = expectedById.get(row.activity_id);
    if (!expected || row.polity_id !== expected.polity_id) throw new Error(`CORRECTION_ROLE_SCOPE_REPLAY_POLITY_DRIFT:${row.activity_id}`);
    if (row.role_id !== operation.keep_role.id) throw new Error(`CORRECTION_ROLE_SCOPE_REPLAY_ROLE_DRIFT:${row.activity_id}`);
  }

  const ledgers = await loadAuthoringLedgers(client, operation.affected_activity_ids, { forUpdate });
  for (const ledger of ledgers) {
    if (ledger.result_snapshot == null) continue;
    if (snapshotRoleId(ledger.result_snapshot) !== operation.keep_role.id) {
      throw new Error(`CORRECTION_ROLE_SCOPE_REPLAY_AUTHORING_LEDGER_ROLE_DRIFT:${ledger.request_id}`);
    }
  }
}

function createCorrectionRoleScopeV2Service({ client } = {}) {
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
        for (const operation of manifest.operations) await verifyAppliedOperation(client, operation, { forUpdate: true });
        if (dryRun) await client.query("rollback"); else await client.query("commit");
        return Object.freeze({ marker: MARKER_V2, request_id: manifest.requestId, dry_run: Boolean(dryRun), committed: !dryRun, replay: true, result: ledger.result_snapshot });
      }

      const beforeCounts = await globalRoleCounts(client);
      const prepared = [];
      for (const operation of manifest.operations) prepared.push(await assertPreflight(client, operation));

      const outcomes = [];
      let removedNames = 0;
      for (let index = 0; index < manifest.operations.length; index += 1) {
        const operation = manifest.operations[index];
        const mutation = await applyOperation(client, operation);
        removedNames += operation.drop_names.length;
        await verifyAppliedOperation(client, operation, { forUpdate: true });
        outcomes.push(Object.freeze({
          type: operation.type,
          case_id: operation.case_id,
          review_reason: operation.review_reason,
          keep_role: operation.keep_role,
          drop_role: operation.drop_role,
          affected_activity_bindings: operation.bindings,
          preflight: prepared[index],
          mutation
        }));
      }

      const afterCounts = await globalRoleCounts(client);
      if (Number(afterCounts.relationships) !== Number(beforeCounts.relationships)) throw new Error("CORRECTION_ROLE_SCOPE_RELATIONSHIP_COUNT_DRIFT");
      if (Number(afterCounts.roles) !== Number(beforeCounts.roles) - manifest.operations.length) throw new Error("CORRECTION_ROLE_SCOPE_ROLE_COUNT_DRIFT");
      if (Number(afterCounts.role_names) !== Number(beforeCounts.role_names) - removedNames) throw new Error("CORRECTION_ROLE_SCOPE_ROLE_NAME_COUNT_DRIFT");
      if (Number(afterCounts.authoring_manifest_runs) !== Number(beforeCounts.authoring_manifest_runs)) throw new Error("CORRECTION_ROLE_SCOPE_AUTHORING_LEDGER_COUNT_DRIFT");

      const snapshot = Object.freeze({
        version: 1,
        schema: MANIFEST_V2,
        marker: MARKER_V2,
        correction_family: "polity_scope_role_normalization",
        invariant: "Role stores reusable office/function/title semantics; target Polity identity is carried by Activity.polity_id. Multiple governed Polities require separate Activities.",
        operations: outcomes,
        before_counts: beforeCounts,
        after_counts: afterCounts,
        roles_removed: manifest.operations.length,
        role_names_removed: removedNames
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
  REVIEW_REASON,
  MAX_OPERATIONS,
  requireManifest,
  requireOperation,
  loadActivityBindings,
  assertPreflight,
  applyOperation,
  verifyAppliedOperation,
  createCorrectionRoleScopeV2Service
});
