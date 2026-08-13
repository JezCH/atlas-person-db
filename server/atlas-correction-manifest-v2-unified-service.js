"use strict";

const { manifestHash, correctionLedgerExists, readLedger } = require("./atlas-correction-manifest-service.js");
const { sha256 } = require("./atlas-correction-v2-manifest-synthesizer.js");
const core = require("./atlas-correction-manifest-v2-service.js");
const assertions = require("./atlas-correction-v2-stage2-assertions.js");

const { MANIFEST_V2, MARKER_V2, MAX_OPERATIONS_V2 } = core;
const UNIFIED_OPERATION_TYPES = new Set([...core.OPERATION_TYPES, ...assertions.STAGE2_ASSERTION_TYPES]);

function normalizeUnifiedOperation(raw, index) {
  const type = String(raw?.type || "").trim();
  if (assertions.STAGE2_ASSERTION_TYPES.has(type)) return assertions.normalizeStage2AssertionOperation(raw, index);
  return core.normalizeOperation(raw, index);
}

function requireUnifiedV2Manifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_MANIFEST_OBJECT_REQUIRED");
  if (raw.schema !== MANIFEST_V2) throw new Error("UNSUPPORTED_CORRECTION_MANIFEST_SCHEMA");
  if (String(raw.review_status || "").toLowerCase() !== "approved") throw new Error("CORRECTION_MANIFEST_NOT_APPROVED");
  if (raw.production_executable !== true) throw new Error("CORRECTION_V2_MANIFEST_NOT_EXECUTABLE");
  const requestId = String(raw.request_id || "").trim();
  if (!requestId) throw new Error("CORRECTION_REQUEST_ID_REQUIRED");
  if (!/^sha256:[0-9a-f]{64}$/.test(String(raw.exact_live_snapshot_digest || ""))) throw new Error("CORRECTION_V2_SNAPSHOT_DIGEST_REQUIRED");
  if (!Array.isArray(raw.operations) || raw.operations.length === 0 || raw.operations.length > MAX_OPERATIONS_V2) throw new Error("CORRECTION_V2_OPERATIONS_INVALID");
  const declaredHash = String(raw.manifest_sha256 || "");
  const computedHash = sha256(core.manifestCore(raw));
  if (declaredHash !== computedHash) throw new Error("CORRECTION_V2_MANIFEST_SELF_HASH_DRIFT");
  const operations = raw.operations.map((operation, index) => normalizeUnifiedOperation(operation, index + 1));

  const existingActivityTargets = new Set();
  const newActivityIds = new Set();
  const assertionIds = new Set();
  const childIds = new Set();
  const provenanceKeys = new Set();

  for (const operation of operations) {
    if (!UNIFIED_OPERATION_TYPES.has(operation.type)) throw new Error("CORRECTION_V2_OPERATION_UNSUPPORTED");

    if (operation.type === "assert_polity_relation") {
      const id = operation.exact_after.relation.id;
      if (assertionIds.has(id)) throw new Error("CORRECTION_V2_ASSERTION_ID_REUSED");
      assertionIds.add(id);
      for (const link of operation.exact_after.source_links) {
        const key = `polity_relation|${link.polity_relation_id}|${link.source_id}|${link.source_locator_key}`;
        if (provenanceKeys.has(key)) throw new Error("CORRECTION_V2_ASSERTION_SOURCE_LINK_REUSED");
        provenanceKeys.add(key);
      }
      continue;
    }

    if (assertions.STAGE2_ASSERTION_TYPES.has(operation.type)) {
      const identity = assertions.stage2AssertionIdentity(operation);
      if (assertionIds.has(identity.id)) throw new Error("CORRECTION_V2_ASSERTION_ID_REUSED");
      assertionIds.add(identity.id);
      for (const nameId of identity.name_ids) {
        if (childIds.has(nameId)) throw new Error("CORRECTION_V2_ASSERTION_CHILD_ID_REUSED");
        childIds.add(nameId);
      }
      for (const link of identity.source_links) {
        const parentField = Object.keys(link).find((key) => key.endsWith("_id") && key !== "source_id");
        const key = `${operation.type}|${link[parentField]}|${link.source_id}|${link.source_locator_key}`;
        if (provenanceKeys.has(key)) throw new Error("CORRECTION_V2_ASSERTION_SOURCE_LINK_REUSED");
        provenanceKeys.add(key);
      }
      continue;
    }

    if (existingActivityTargets.has(operation.activity_id)) throw new Error("CORRECTION_V2_ACTIVITY_TARGET_REUSED");
    existingActivityTargets.add(operation.activity_id);
    if (operation.type === "split_activity") {
      for (const fragment of operation.new_fragments) {
        const id = fragment.activity.id;
        if (existingActivityTargets.has(id) || newActivityIds.has(id)) throw new Error("CORRECTION_V2_NEW_ACTIVITY_ID_REUSED");
        newActivityIds.add(id);
      }
    }
  }
  return { schema: MANIFEST_V2, requestId, declaredHash, operations, raw };
}

async function unifiedCounts(client) {
  const result = await client.query(`select
    (select count(*)::int from atlas_v2.person_politics_v2) as activities,
    (select count(*)::int from atlas_v2.person_politics_sources) as activity_sources,
    (select count(*)::int from atlas_v2.chronology_claims) as chronology_claims,
    (select count(*)::int from atlas_v2.relationship_descriptions) as relationship_descriptions,
    (select count(*)::int from atlas_v2.polity_relations) as polity_relations,
    (select count(*)::int from atlas_v2.polity_relation_sources) as polity_relation_sources,
    (select count(*)::int from atlas_v2.polity_governance_periods) as governance_periods,
    (select count(*)::int from atlas_v2.polity_governance_period_sources) as governance_sources,
    (select count(*)::int from atlas_v2.polity_designations) as designations,
    (select count(*)::int from atlas_v2.polity_designation_names) as designation_names,
    (select count(*)::int from atlas_v2.polity_designation_sources) as designation_sources,
    (select count(*)::int from atlas_v2.polity_identity_relations) as identity_relations,
    (select count(*)::int from atlas_v2.polity_identity_relation_sources) as identity_relation_sources`);
  return result.rows[0];
}

function unifiedCountDeltas(operations) {
  const coreOperations = operations.filter((operation) => !assertions.STAGE2_ASSERTION_TYPES.has(operation.type));
  const delta = {
    ...core.expectedCountDeltas(coreOperations),
    governance_periods: 0,
    governance_sources: 0,
    designations: 0,
    designation_names: 0,
    designation_sources: 0,
    identity_relations: 0,
    identity_relation_sources: 0
  };
  for (const operation of operations) {
    if (!assertions.STAGE2_ASSERTION_TYPES.has(operation.type)) continue;
    const add = assertions.stage2AssertionCountDelta(operation);
    for (const [key, value] of Object.entries(add)) delta[key] += value;
  }
  return delta;
}

async function verifyUnifiedAppliedState(client, manifest) {
  for (const operation of manifest.operations) {
    if (assertions.STAGE2_ASSERTION_TYPES.has(operation.type)) {
      await assertions.verifyStage2AssertionApplied(client, operation);
      continue;
    }
    if (operation.type === "rewrite_activity") {
      core.assertExactBundle(await core.loadActivityBundle(client, operation.activity_id, { forUpdate: true }), operation.exact_after, `CORRECTION_V2_REPLAY_REWRITE_DRIFT:${operation.case_id}`);
    } else if (operation.type === "retire_activity") {
      if (await core.loadActivityBundle(client, operation.activity_id, { forUpdate: true })) throw new Error(`CORRECTION_V2_REPLAY_RETIRED_ACTIVITY_REAPPEARED:${operation.case_id}`);
    } else if (operation.type === "split_activity") {
      core.assertExactBundle(await core.loadActivityBundle(client, operation.activity_id, { forUpdate: true }), operation.survivor_fragment, `CORRECTION_V2_REPLAY_SURVIVOR_DRIFT:${operation.case_id}`);
      for (const fragment of operation.new_fragments) {
        core.assertExactBundle(await core.loadActivityBundle(client, fragment.activity.id, { forUpdate: true }), fragment, `CORRECTION_V2_REPLAY_NEW_FRAGMENT_DRIFT:${operation.case_id}`);
      }
    } else {
      core.assertExactBundle(await core.loadPolityRelationBundle(client, operation.exact_after.relation.id, { forUpdate: true }), operation.exact_after, `CORRECTION_V2_REPLAY_RELATION_DRIFT:${operation.decision_id}`);
    }
  }
}

async function assertUnifiedBeforeState(client, operation) {
  if (assertions.STAGE2_ASSERTION_TYPES.has(operation.type)) {
    await assertions.assertStage2AssertionAbsent(client, operation);
    return;
  }
  if (operation.type === "assert_polity_relation") {
    await core.assertRelationAbsent(client, operation);
    return;
  }
  const actual = await core.loadActivityBundle(client, operation.activity_id, { forUpdate: true });
  core.assertExactBundle(actual, operation.exact_before, `CORRECTION_V2_EXACT_BEFORE_DRIFT:${operation.case_id}`);
  if (operation.type === "split_activity") {
    for (const fragment of operation.new_fragments) {
      if (await core.loadActivityBundle(client, fragment.activity.id, { forUpdate: true })) throw new Error(`CORRECTION_V2_NEW_FRAGMENT_ALREADY_EXISTS:${operation.case_id}`);
    }
  }
}

async function applyUnifiedOperation(client, operation) {
  if (assertions.STAGE2_ASSERTION_TYPES.has(operation.type)) {
    await assertions.insertStage2AssertionBundle(client, operation);
  } else if (operation.type === "rewrite_activity") {
    await core.updateActivityRow(client, operation.exact_after.activity);
  } else if (operation.type === "retire_activity") {
    await core.deleteActivity(client, operation.activity_id);
  } else if (operation.type === "split_activity") {
    await core.updateActivityRow(client, operation.survivor_fragment.activity);
    for (const fragment of operation.new_fragments) await core.insertActivityBundle(client, fragment);
  } else {
    await core.insertPolityRelationBundle(client, operation.exact_after);
  }
}

function createUnifiedCorrectionManifestV2Service({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");

  async function execute(rawManifest, { dryRun = false } = {}) {
    const manifest = requireUnifiedV2Manifest(rawManifest);
    const ledgerHash = manifestHash(rawManifest);
    await client.query("begin isolation level serializable");
    try {
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-correction-manifest:${manifest.requestId}`]);
      const ledger = await readLedger(client, manifest.requestId);
      if (ledger) {
        if (ledger.manifest_hash !== ledgerHash) throw new Error("CORRECTION_REQUEST_ID_COLLISION");
        if (ledger.manifest_schema !== MANIFEST_V2) throw new Error("CORRECTION_LEDGER_SCHEMA_MISMATCH");
        await verifyUnifiedAppliedState(client, manifest);
        if (dryRun) await client.query("rollback");
        else await client.query("commit");
        return Object.freeze({ marker: MARKER_V2, request_id: manifest.requestId, dry_run: Boolean(dryRun), committed: !dryRun, replay: true, result: ledger.result_snapshot });
      }

      for (const operation of manifest.operations) await assertUnifiedBeforeState(client, operation);

      const beforeCounts = await unifiedCounts(client);
      const delta = unifiedCountDeltas(manifest.operations);
      for (const operation of manifest.operations) await applyUnifiedOperation(client, operation);
      const afterCounts = await unifiedCounts(client);
      core.assertCounts(afterCounts, beforeCounts, delta);
      await verifyUnifiedAppliedState(client, manifest);

      const resultSnapshot = {
        version: 2,
        schema: MANIFEST_V2,
        marker: MARKER_V2,
        request_id: manifest.requestId,
        exact_live_snapshot_digest: rawManifest.exact_live_snapshot_digest,
        manifest_sha256: rawManifest.manifest_sha256,
        before_counts: beforeCounts,
        expected_count_delta: delta,
        after_counts: afterCounts,
        operations: manifest.operations
      };

      if (dryRun) {
        await client.query("rollback");
        return Object.freeze({ marker: MARKER_V2, request_id: manifest.requestId, dry_run: true, committed: false, replay: false, result: resultSnapshot });
      }

      if (!await correctionLedgerExists(client)) throw new Error("CORRECTION_LEDGER_SCHEMA_REQUIRED");
      await client.query(`insert into atlas_v2.correction_manifest_runs(request_id,manifest_hash,manifest_schema,result_snapshot) values($1,$2,$3,$4::jsonb)`, [manifest.requestId, ledgerHash, MANIFEST_V2, JSON.stringify(resultSnapshot)]);
      await client.query("commit");
      return Object.freeze({ marker: MARKER_V2, request_id: manifest.requestId, dry_run: false, committed: true, replay: false, result: resultSnapshot });
    } catch (error) {
      try { await client.query("rollback"); } catch {}
      throw error;
    }
  }

  return Object.freeze({ execute });
}

module.exports = Object.freeze({
  UNIFIED_OPERATION_TYPES,
  normalizeUnifiedOperation,
  requireUnifiedV2Manifest,
  unifiedCounts,
  unifiedCountDeltas,
  verifyUnifiedAppliedState,
  createUnifiedCorrectionManifestV2Service
});
