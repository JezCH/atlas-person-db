"use strict";

const {
  manifestHash,
  correctionLedgerExists,
  readLedger
} = require("./atlas-correction-manifest-service.js");

const MANIFEST_V2 = "atlas-correction-manifest/v2";
const MARKER_V2 = "ATLAS_CORRECTION_MANIFEST_V2";
const OPERATION_TYPE = "merge_role_case_duplicate";
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

function normalizeRole(raw, label) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`CORRECTION_ROLE_MERGE_${label}_ROLE_REQUIRED`);
  const code = String(raw.code || "");
  const category = String(raw.category || "");
  const sourceLabel = String(raw.source_label || "");
  if (!code || !category || !sourceLabel || typeof raw.is_active !== "boolean") {
    throw new Error(`CORRECTION_ROLE_MERGE_${label}_ROLE_INVALID`);
  }
  return Object.freeze({
    id: requireUuid(raw.id, `CORRECTION_ROLE_MERGE_${label}_ROLE_ID_INVALID`),
    code,
    category,
    source_label: sourceLabel,
    is_active: raw.is_active
  });
}

function normalizeRoleName(raw, expectedRoleId, label) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`CORRECTION_ROLE_MERGE_${label}_NAME_REQUIRED`);
  const roleId = requireUuid(raw.role_id, `CORRECTION_ROLE_MERGE_${label}_ROLE_ID_INVALID`);
  if (roleId !== expectedRoleId) throw new Error(`CORRECTION_ROLE_MERGE_${label}_ROLE_ID_MISMATCH`);
  const locale = String(raw.locale || "").trim();
  const name = String(raw.name || "");
  if (!locale || !name || typeof raw.is_preferred !== "boolean") throw new Error(`CORRECTION_ROLE_MERGE_${label}_NAME_INVALID`);
  return Object.freeze({
    id: requireUuid(raw.id, `CORRECTION_ROLE_MERGE_${label}_NAME_ID_INVALID`),
    role_id: roleId,
    locale,
    name,
    is_preferred: raw.is_preferred
  });
}

function normalizeNames(raw, roleId, label) {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error(`CORRECTION_ROLE_MERGE_${label}_NAMES_REQUIRED`);
  const names = raw.map((row, index) => normalizeRoleName(row, roleId, `${label}_${index + 1}`));
  const ids = new Set();
  for (const row of names) {
    if (ids.has(row.id)) throw new Error(`CORRECTION_ROLE_MERGE_${label}_NAME_ID_REUSED`);
    ids.add(row.id);
  }
  return Object.freeze(names.slice().sort((a, b) => a.id.localeCompare(b.id)));
}

function normalizedSemanticNames(names) {
  return names
    .map((row) => `${row.locale.toLowerCase()}|${row.is_preferred ? "1" : "0"}|${row.name.toLocaleLowerCase("en-US")}`)
    .sort();
}

function assertCaseOnlyDuplicate(keepRole, dropRole, keepNames, dropNames) {
  if (keepRole.id === dropRole.id) throw new Error("CORRECTION_ROLE_MERGE_KEEP_DROP_MUST_DIFFER");
  if (keepRole.category !== dropRole.category || keepRole.is_active !== dropRole.is_active) {
    throw new Error("CORRECTION_ROLE_MERGE_ROLE_CLASSIFICATION_MISMATCH");
  }
  if (keepRole.source_label === dropRole.source_label || keepRole.source_label.toLocaleLowerCase("en-US") !== dropRole.source_label.toLocaleLowerCase("en-US")) {
    throw new Error("CORRECTION_ROLE_MERGE_NOT_CASE_ONLY_DUPLICATE");
  }
  if (!exactEqual(normalizedSemanticNames(keepNames), normalizedSemanticNames(dropNames))) {
    throw new Error("CORRECTION_ROLE_MERGE_NAME_SEMANTICS_MISMATCH");
  }
}

function requireOperation(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_ROLE_MERGE_OPERATION_OBJECT_REQUIRED");
  if (String(raw.type || "").trim() !== OPERATION_TYPE) throw new Error("CORRECTION_ROLE_MERGE_OPERATION_UNSUPPORTED");
  const keepRole = normalizeRole(raw.expected_keep_role, `OP${index}_KEEP`);
  const dropRole = normalizeRole(raw.expected_drop_role, `OP${index}_DROP`);
  const keepNames = normalizeNames(raw.expected_keep_names, keepRole.id, `OP${index}_KEEP`);
  const dropNames = normalizeNames(raw.expected_drop_names, dropRole.id, `OP${index}_DROP`);
  assertCaseOnlyDuplicate(keepRole, dropRole, keepNames, dropNames);
  if (!Array.isArray(raw.affected_activity_ids) || raw.affected_activity_ids.length === 0) {
    throw new Error("CORRECTION_ROLE_MERGE_AFFECTED_ACTIVITIES_REQUIRED");
  }
  const activityIds = raw.affected_activity_ids.map((id) => requireUuid(id, `CORRECTION_ROLE_MERGE_OP${index}_ACTIVITY_ID_INVALID`)).sort();
  if (new Set(activityIds).size !== activityIds.length) throw new Error("CORRECTION_ROLE_MERGE_ACTIVITY_ID_REUSED");
  return Object.freeze({
    type: OPERATION_TYPE,
    case_id: String(raw.case_id || "").trim(),
    keep_role: keepRole,
    drop_role: dropRole,
    keep_names: keepNames,
    drop_names: dropNames,
    affected_activity_ids: Object.freeze(activityIds)
  });
}

function requireManifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_MANIFEST_OBJECT_REQUIRED");
  if (String(raw.schema || "").trim() !== MANIFEST_V2) throw new Error("UNSUPPORTED_CORRECTION_MANIFEST_SCHEMA");
  if (String(raw.review_status || "").trim().toLowerCase() !== "approved") throw new Error("CORRECTION_MANIFEST_NOT_APPROVED");
  const requestId = String(raw.request_id || "").trim();
  if (!requestId) throw new Error("CORRECTION_REQUEST_ID_REQUIRED");
  if (!Array.isArray(raw.operations) || raw.operations.length === 0 || raw.operations.length > MAX_OPERATIONS) {
    throw new Error("CORRECTION_ROLE_MERGE_OPERATIONS_INVALID");
  }
  const operations = raw.operations.map((operation, index) => requireOperation(operation, index + 1));
  const roleIds = new Set();
  const activityIds = new Set();
  for (const operation of operations) {
    for (const roleId of [operation.keep_role.id, operation.drop_role.id]) {
      if (roleIds.has(roleId)) throw new Error("CORRECTION_ROLE_MERGE_ROLE_REUSED");
      roleIds.add(roleId);
    }
    for (const activityId of operation.affected_activity_ids) {
      if (activityIds.has(activityId)) throw new Error("CORRECTION_ROLE_MERGE_ACTIVITY_REUSED_ACROSS_OPERATIONS");
      activityIds.add(activityId);
    }
  }
  return Object.freeze({ schema: MANIFEST_V2, requestId, operations });
}

function normalizeDbRole(row) {
  if (!row) return null;
  return {
    id: String(row.id).toLowerCase(),
    code: String(row.code),
    category: String(row.category),
    source_label: String(row.source_label),
    is_active: Boolean(row.is_active)
  };
}

function normalizeDbName(row) {
  return {
    id: String(row.id).toLowerCase(),
    role_id: String(row.role_id).toLowerCase(),
    locale: String(row.locale),
    name: String(row.name),
    is_preferred: Boolean(row.is_preferred)
  };
}

async function loadRole(client, roleId, { forUpdate = false } = {}) {
  const result = await client.query(`select id::text,code,category,source_label,is_active from atlas_v2.roles where id=$1::uuid${forUpdate ? " for update" : ""}`, [roleId]);
  return result.rowCount ? normalizeDbRole(result.rows[0]) : null;
}

async function loadRoleNames(client, roleId, { forUpdate = false } = {}) {
  const result = await client.query(`select id::text,role_id::text,locale,name,is_preferred from atlas_v2.role_names where role_id=$1::uuid order by id${forUpdate ? " for update" : ""}`, [roleId]);
  return result.rows.map(normalizeDbName);
}

async function loadRoleUsage(client, roleId, { forUpdate = false } = {}) {
  const result = await client.query(`select id::text from atlas_v2.person_politics_v2 where role_id=$1::uuid order by id${forUpdate ? " for update" : ""}`, [roleId]);
  return result.rows.map((row) => String(row.id).toLowerCase()).sort();
}

async function loadAffectedActivityRoles(client, activityIds, { forUpdate = false } = {}) {
  const result = await client.query(`select id::text,role_id::text from atlas_v2.person_politics_v2 where id=any($1::uuid[]) order by id${forUpdate ? " for update" : ""}`, [activityIds]);
  return result.rows.map((row) => ({ id: String(row.id).toLowerCase(), role_id: row.role_id == null ? null : String(row.role_id).toLowerCase() }));
}

async function loadAuthoringLedgers(client, activityIds, { forUpdate = false } = {}) {
  const result = await client.query(`select request_id,relationship_id::text,result_snapshot from atlas_v2.authoring_manifest_runs where relationship_id=any($1::uuid[]) order by request_id${forUpdate ? " for update" : ""}`, [activityIds]);
  return result.rows.map((row) => ({
    request_id: String(row.request_id),
    relationship_id: String(row.relationship_id).toLowerCase(),
    result_snapshot: row.result_snapshot
  }));
}

function snapshotRoleId(snapshot) {
  const value = snapshot?.entities?.role?.id;
  return value == null ? null : String(value).toLowerCase();
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

async function globalRoleCounts(client) {
  const result = await client.query(`select
    (select count(*)::int from atlas_v2.person_politics_v2) as relationships,
    (select count(*)::int from atlas_v2.roles) as roles,
    (select count(*)::int from atlas_v2.role_names) as role_names,
    (select count(*)::int from atlas_v2.authoring_manifest_runs) as authoring_manifest_runs`);
  return result.rows[0];
}

async function assertPreflight(client, operation) {
  const keep = await loadRole(client, operation.keep_role.id, { forUpdate: true });
  const drop = await loadRole(client, operation.drop_role.id, { forUpdate: true });
  assertExactRole(keep, operation.keep_role, `CORRECTION_ROLE_MERGE_KEEP_ROLE_DRIFT:${operation.keep_role.id}`);
  assertExactRole(drop, operation.drop_role, `CORRECTION_ROLE_MERGE_DROP_ROLE_DRIFT:${operation.drop_role.id}`);
  const keepNames = await loadRoleNames(client, operation.keep_role.id, { forUpdate: true });
  const dropNames = await loadRoleNames(client, operation.drop_role.id, { forUpdate: true });
  assertExactNames(keepNames, operation.keep_names, `CORRECTION_ROLE_MERGE_KEEP_NAMES_DRIFT:${operation.keep_role.id}`);
  assertExactNames(dropNames, operation.drop_names, `CORRECTION_ROLE_MERGE_DROP_NAMES_DRIFT:${operation.drop_role.id}`);
  const dropUsage = await loadRoleUsage(client, operation.drop_role.id, { forUpdate: true });
  assertExactIdSet(dropUsage, operation.affected_activity_ids, `CORRECTION_ROLE_MERGE_DROP_USAGE_DRIFT:${operation.drop_role.id}`);
  const activities = await loadAffectedActivityRoles(client, operation.affected_activity_ids, { forUpdate: true });
  assertExactIdSet(activities.map((row) => row.id), operation.affected_activity_ids, "CORRECTION_ROLE_MERGE_ACTIVITY_SET_DRIFT");
  if (activities.some((row) => row.role_id !== operation.drop_role.id)) throw new Error("CORRECTION_ROLE_MERGE_ACTIVITY_ROLE_DRIFT");
  const ledgers = await loadAuthoringLedgers(client, operation.affected_activity_ids, { forUpdate: true });
  for (const ledger of ledgers) {
    if (ledger.result_snapshot == null) continue;
    if (snapshotRoleId(ledger.result_snapshot) !== operation.drop_role.id) {
      throw new Error(`CORRECTION_ROLE_MERGE_AUTHORING_LEDGER_ROLE_DRIFT:${ledger.request_id}`);
    }
  }
  return { keep, drop, keep_names: keepNames, drop_names: dropNames, authoring_ledgers: ledgers };
}

async function applyOperation(client, operation) {
  const updatedActivities = await client.query(`update atlas_v2.person_politics_v2 set role_id=$2::uuid where id=any($1::uuid[]) and role_id=$3::uuid returning id::text`, [operation.affected_activity_ids, operation.keep_role.id, operation.drop_role.id]);
  const updatedIds = updatedActivities.rows.map((row) => String(row.id).toLowerCase()).sort();
  assertExactIdSet(updatedIds, operation.affected_activity_ids, "CORRECTION_ROLE_MERGE_ACTIVITY_UPDATE_COUNT_DRIFT");

  const updatedLedgers = await client.query(`update atlas_v2.authoring_manifest_runs set result_snapshot=jsonb_set(result_snapshot,'{entities,role,id}',to_jsonb($2::text),false) where relationship_id=any($1::uuid[]) and result_snapshot is not null and (result_snapshot #>> '{entities,role,id}')=$3 returning request_id`, [operation.affected_activity_ids, operation.keep_role.id, operation.drop_role.id]);

  const deletedRole = await client.query(`delete from atlas_v2.roles where id=$1::uuid returning id::text`, [operation.drop_role.id]);
  if (deletedRole.rowCount !== 1) throw new Error("CORRECTION_ROLE_MERGE_DROP_DELETE_COUNT_DRIFT");

  return Object.freeze({
    activities_rebound: updatedIds,
    authoring_ledgers_rebound: updatedLedgers.rows.map((row) => String(row.request_id)).sort(),
    role_removed: operation.drop_role.id,
    role_names_removed: operation.drop_names.length
  });
}

async function verifyAppliedOperation(client, operation, { forUpdate = false } = {}) {
  const keep = await loadRole(client, operation.keep_role.id, { forUpdate });
  assertExactRole(keep, operation.keep_role, `CORRECTION_ROLE_MERGE_REPLAY_KEEP_ROLE_DRIFT:${operation.keep_role.id}`);
  assertExactNames(await loadRoleNames(client, operation.keep_role.id, { forUpdate }), operation.keep_names, `CORRECTION_ROLE_MERGE_REPLAY_KEEP_NAMES_DRIFT:${operation.keep_role.id}`);
  if (await loadRole(client, operation.drop_role.id, { forUpdate })) throw new Error("CORRECTION_ROLE_MERGE_REPLAY_DROP_ROLE_REAPPEARED");
  if ((await loadRoleUsage(client, operation.drop_role.id, { forUpdate })).length) throw new Error("CORRECTION_ROLE_MERGE_REPLAY_DROP_USAGE_REAPPEARED");
  const activities = await loadAffectedActivityRoles(client, operation.affected_activity_ids, { forUpdate });
  assertExactIdSet(activities.map((row) => row.id), operation.affected_activity_ids, "CORRECTION_ROLE_MERGE_REPLAY_ACTIVITY_SET_DRIFT");
  if (activities.some((row) => row.role_id !== operation.keep_role.id)) throw new Error("CORRECTION_ROLE_MERGE_REPLAY_ACTIVITY_ROLE_DRIFT");
  const ledgers = await loadAuthoringLedgers(client, operation.affected_activity_ids, { forUpdate });
  for (const ledger of ledgers) {
    if (ledger.result_snapshot == null) continue;
    if (snapshotRoleId(ledger.result_snapshot) !== operation.keep_role.id) {
      throw new Error(`CORRECTION_ROLE_MERGE_REPLAY_AUTHORING_LEDGER_ROLE_DRIFT:${ledger.request_id}`);
    }
  }
}

function createCorrectionRoleMergeV2Service({ client } = {}) {
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
          keep_role: operation.keep_role,
          drop_role: operation.drop_role,
          affected_activity_ids: operation.affected_activity_ids,
          preflight: prepared[index],
          mutation
        }));
      }

      const afterCounts = await globalRoleCounts(client);
      if (Number(afterCounts.relationships) !== Number(beforeCounts.relationships)) throw new Error("CORRECTION_ROLE_MERGE_RELATIONSHIP_COUNT_DRIFT");
      if (Number(afterCounts.roles) !== Number(beforeCounts.roles) - manifest.operations.length) throw new Error("CORRECTION_ROLE_MERGE_ROLE_COUNT_DRIFT");
      if (Number(afterCounts.role_names) !== Number(beforeCounts.role_names) - removedNames) throw new Error("CORRECTION_ROLE_MERGE_ROLE_NAME_COUNT_DRIFT");
      if (Number(afterCounts.authoring_manifest_runs) !== Number(beforeCounts.authoring_manifest_runs)) throw new Error("CORRECTION_ROLE_MERGE_AUTHORING_LEDGER_COUNT_DRIFT");

      const snapshot = Object.freeze({
        version: 1,
        schema: MANIFEST_V2,
        marker: MARKER_V2,
        correction_family: "case_only_role_merge",
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
      await client.query(`insert into atlas_v2.correction_manifest_runs(request_id,manifest_hash,manifest_schema,result_snapshot) values($1,$2,$3,$4::jsonb)`, [manifest.requestId, hash, MANIFEST_V2, JSON.stringify(snapshot)]);
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
  MANIFEST_V2,
  MARKER_V2,
  OPERATION_TYPE,
  MAX_OPERATIONS,
  requireManifest,
  requireOperation,
  assertCaseOnlyDuplicate,
  normalizeRole,
  normalizeRoleName,
  loadRole,
  loadRoleNames,
  loadRoleUsage,
  loadAuthoringLedgers,
  snapshotRoleId,
  globalRoleCounts,
  assertPreflight,
  applyOperation,
  verifyAppliedOperation,
  createCorrectionRoleMergeV2Service
});
