"use strict";

const {
  createCorrectionManifestService: createV1Service,
  MANIFEST_V1,
  manifestHash,
  requireOperation: requireV1Operation,
  requireExpected,
  semanticIdentity,
  assertExpectedRelationship,
  snapshotRelationship,
  globalCounts,
  correctionLedgerExists,
  readLedger,
  lockRelationships
} = require("./atlas-correction-manifest-service.js");
const { coalesceRelationship } = require("./atlas-person-merge-service.js");

const MANIFEST_V1_1 = "atlas-correction-manifest/v1.1";
const MARKER_V1_1 = "ATLAS_CORRECTION_MANIFEST_V1_1";
const MAX_OPERATIONS_V1_1 = 20;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const V1_1_OPERATION_TYPES = new Set([
  "coalesce_relationship",
  "retire_activity",
  "update_activity_interval"
]);

function requireUuid(value, code) {
  const id = String(value || "").trim().toLowerCase();
  if (!UUID_RE.test(id)) throw new Error(code);
  return id;
}

function invariantIdentity(expected) {
  return JSON.stringify({
    person_id: expected.person_id,
    polity_id: expected.polity_id,
    role_id: expected.role_id,
    period_basis_id: expected.period_basis_id,
    notes: expected.notes,
    legacy_source_key: expected.legacy_source_key
  });
}

function requireV11Operation(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("CORRECTION_OPERATION_OBJECT_REQUIRED");
  }
  const type = String(raw.type || "").trim();
  if (!V1_1_OPERATION_TYPES.has(type)) throw new Error("CORRECTION_OPERATION_UNSUPPORTED");

  if (type === "coalesce_relationship") return requireV1Operation(raw, index);

  const relationshipId = requireUuid(raw.relationship_id, `CORRECTION_OP${index}_RELATIONSHIP_ID_REQUIRED`);
  if (type === "retire_activity") {
    return Object.freeze({
      type,
      relationship_id: relationshipId,
      expected: requireExpected(raw.expected, `OP${index}_RETIRE`)
    });
  }

  const expectedBefore = requireExpected(raw.expected_before, `OP${index}_BEFORE`);
  const expectedAfter = requireExpected(raw.expected_after, `OP${index}_AFTER`);
  if (invariantIdentity(expectedBefore) !== invariantIdentity(expectedAfter)) {
    throw new Error("CORRECTION_UPDATE_INTERVAL_NON_TEMPORAL_DRIFT");
  }
  if (
    expectedBefore.activity_start === expectedAfter.activity_start &&
    expectedBefore.activity_end === expectedAfter.activity_end
  ) {
    throw new Error("CORRECTION_UPDATE_INTERVAL_NO_CHANGE");
  }
  return Object.freeze({
    type,
    relationship_id: relationshipId,
    expected_before: expectedBefore,
    expected_after: expectedAfter
  });
}

function operationIds(operation) {
  if (operation.type === "coalesce_relationship") {
    return [operation.keep_relationship_id, operation.drop_relationship_id];
  }
  return [operation.relationship_id];
}

function requireV11Manifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_MANIFEST_OBJECT_REQUIRED");
  if (String(raw.schema || "").trim() !== MANIFEST_V1_1) throw new Error("UNSUPPORTED_CORRECTION_MANIFEST_SCHEMA");
  if (String(raw.review_status || "").trim().toLowerCase() !== "approved") throw new Error("CORRECTION_MANIFEST_NOT_APPROVED");
  const requestId = String(raw.request_id || "").trim();
  if (!requestId) throw new Error("CORRECTION_REQUEST_ID_REQUIRED");
  if (!Array.isArray(raw.operations) || raw.operations.length === 0) throw new Error("CORRECTION_OPERATIONS_REQUIRED");
  if (raw.operations.length > MAX_OPERATIONS_V1_1) throw new Error("CORRECTION_OPERATIONS_LIMIT_EXCEEDED");

  const operations = raw.operations.map((operation, index) => requireV11Operation(operation, index + 1));
  const seen = new Set();
  for (const operation of operations) {
    for (const id of operationIds(operation)) {
      if (seen.has(id)) throw new Error("CORRECTION_RELATIONSHIP_REUSED_ACROSS_OPERATIONS");
      seen.add(id);
    }
  }
  return Object.freeze({ schema: MANIFEST_V1_1, requestId, operations });
}

async function loadRelationship(client, id, forUpdate = true) {
  const result = await client.query(`
    select id,person_id,polity_id,role_id,period_basis_id,activity_start,activity_end,
           confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash
      from atlas_v2.person_politics_v2
     where id=$1${forUpdate ? " for update" : ""}`, [id]);
  return result.rows[0] || null;
}

function assertReplaySnapshot(snapshot, manifest) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) throw new Error("CORRECTION_LEDGER_RESULT_INVALID");
  if (snapshot.schema !== MANIFEST_V1_1 || snapshot.marker !== MARKER_V1_1) {
    throw new Error("CORRECTION_LEDGER_RESULT_SCHEMA_MISMATCH");
  }
  const operations = Array.isArray(snapshot.operations) ? snapshot.operations : [];
  if (operations.length !== manifest.operations.length) throw new Error("CORRECTION_LEDGER_RESULT_OPERATION_DRIFT");
}

async function verifyAppliedState(client, manifest) {
  const ids = manifest.operations.flatMap(operationIds);
  const locked = await lockRelationships(client, ids);
  for (const operation of manifest.operations) {
    if (operation.type === "coalesce_relationship") {
      const keep = locked.get(operation.keep_relationship_id) || null;
      assertExpectedRelationship(keep, operation.expected_keep, operation.keep_relationship_id, "REPLAY_KEEP");
      if (locked.has(operation.drop_relationship_id)) throw new Error("CORRECTION_REPLAY_DROP_RELATIONSHIP_REAPPEARED");
    } else if (operation.type === "retire_activity") {
      if (locked.has(operation.relationship_id)) throw new Error("CORRECTION_REPLAY_RETIRED_RELATIONSHIP_REAPPEARED");
    } else {
      const row = locked.get(operation.relationship_id) || null;
      assertExpectedRelationship(row, operation.expected_after, operation.relationship_id, "REPLAY_UPDATED");
    }
  }
}

async function retireActivity(client, relationshipId) {
  const deleted = await client.query(`delete from atlas_v2.person_politics_v2 where id=$1 returning id`, [relationshipId]);
  if (deleted.rowCount !== 1) throw new Error("CORRECTION_RETIRE_DID_NOT_DELETE_EXACTLY_ONE_RELATIONSHIP");
  return Object.freeze({ relationship_id: relationshipId, retired: true });
}

async function updateActivityInterval(client, relationshipId, expectedAfter) {
  const updated = await client.query(`
    update atlas_v2.person_politics_v2
       set activity_start=$2, activity_end=$3
     where id=$1
     returning id`, [relationshipId, expectedAfter.activity_start, expectedAfter.activity_end]);
  if (updated.rowCount !== 1) throw new Error("CORRECTION_UPDATE_DID_NOT_CHANGE_EXACTLY_ONE_RELATIONSHIP");
  return Object.freeze({
    relationship_id: relationshipId,
    activity_start: expectedAfter.activity_start,
    activity_end: expectedAfter.activity_end
  });
}

function createCorrectionManifestV11Service({
  client,
  coalesce = coalesceRelationship,
  retire = retireActivity,
  updateInterval = updateActivityInterval
} = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  if (typeof coalesce !== "function" || typeof retire !== "function" || typeof updateInterval !== "function") {
    throw new Error("Correction v1.1 mutation primitives are required");
  }

  async function execute(rawManifest, { dryRun = false } = {}) {
    const manifest = requireV11Manifest(rawManifest);
    const hash = manifestHash(rawManifest);
    await client.query("begin isolation level serializable");
    try {
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-correction-manifest:${manifest.requestId}`]);
      const ledger = await readLedger(client, manifest.requestId);
      if (ledger) {
        if (ledger.manifest_hash !== hash) throw new Error("CORRECTION_REQUEST_ID_COLLISION");
        if (ledger.manifest_schema !== MANIFEST_V1_1) throw new Error("CORRECTION_LEDGER_SCHEMA_MISMATCH");
        assertReplaySnapshot(ledger.result_snapshot, manifest);
        await verifyAppliedState(client, manifest);
        if (dryRun) await client.query("rollback");
        else await client.query("commit");
        return Object.freeze({
          marker: MARKER_V1_1,
          request_id: manifest.requestId,
          dry_run: Boolean(dryRun),
          committed: !dryRun,
          replay: true,
          result: ledger.result_snapshot
        });
      }

      const targetIds = manifest.operations.flatMap(operationIds);
      const locked = await lockRelationships(client, targetIds);
      if (locked.size !== targetIds.length) throw new Error("CORRECTION_TARGET_RELATIONSHIP_SET_DRIFT");

      const beforeCounts = await globalCounts(client);
      const prepared = [];
      for (const operation of manifest.operations) {
        if (operation.type === "coalesce_relationship") {
          const keep = locked.get(operation.keep_relationship_id) || null;
          const drop = locked.get(operation.drop_relationship_id) || null;
          assertExpectedRelationship(keep, operation.expected_keep, operation.keep_relationship_id, "KEEP");
          assertExpectedRelationship(drop, operation.expected_drop, operation.drop_relationship_id, "DROP");
          const keepSemantic = semanticIdentity(operation.expected_keep);
          const dropSemantic = semanticIdentity(operation.expected_drop);
          if (keepSemantic !== dropSemantic) throw new Error("CORRECTION_LIVE_SEMANTIC_IDENTITY_MISMATCH");
          prepared.push({
            operation,
            keep_before: await snapshotRelationship(client, operation.keep_relationship_id),
            drop_before: await snapshotRelationship(client, operation.drop_relationship_id)
          });
        } else {
          const row = locked.get(operation.relationship_id) || null;
          const expected = operation.type === "retire_activity" ? operation.expected : operation.expected_before;
          assertExpectedRelationship(row, expected, operation.relationship_id, operation.type === "retire_activity" ? "RETIRE" : "UPDATE");
          prepared.push({
            operation,
            relationship_before: await snapshotRelationship(client, operation.relationship_id)
          });
        }
      }

      const outcomes = [];
      let collapsedSourceLinks = 0;
      let retiredSourceLinks = 0;
      let retiredChronologyClaims = 0;
      let retiredDescriptions = 0;
      let relationshipsRemoved = 0;

      for (const item of prepared) {
        const operation = item.operation;
        if (operation.type === "coalesce_relationship") {
          const mutation = await coalesce(client, operation.keep_relationship_id, operation.drop_relationship_id);
          collapsedSourceLinks += Number(mutation.collapsed_source_links || 0);
          relationshipsRemoved += 1;
          outcomes.push({
            type: operation.type,
            keep_relationship_id: operation.keep_relationship_id,
            drop_relationship_id: operation.drop_relationship_id,
            keep_before: item.keep_before,
            drop_before: item.drop_before,
            mutation
          });
        } else if (operation.type === "retire_activity") {
          const before = item.relationship_before;
          retiredSourceLinks += before.sources.length;
          retiredChronologyClaims += before.chronology_claims.length;
          retiredDescriptions += before.relationship_descriptions.length;
          relationshipsRemoved += 1;
          const mutation = await retire(client, operation.relationship_id);
          outcomes.push({
            type: operation.type,
            relationship_id: operation.relationship_id,
            relationship_before: before,
            mutation
          });
        } else {
          const mutation = await updateInterval(client, operation.relationship_id, operation.expected_after);
          outcomes.push({
            type: operation.type,
            relationship_id: operation.relationship_id,
            relationship_before: item.relationship_before,
            expected_after: operation.expected_after,
            mutation
          });
        }
      }

      const afterCounts = await globalCounts(client);
      if (Number(afterCounts.relationships) !== Number(beforeCounts.relationships) - relationshipsRemoved) {
        throw new Error("CORRECTION_RELATIONSHIP_COUNT_DRIFT");
      }
      if (Number(afterCounts.relationship_sources) !== Number(beforeCounts.relationship_sources) - collapsedSourceLinks - retiredSourceLinks) {
        throw new Error("CORRECTION_RELATIONSHIP_SOURCE_COUNT_DRIFT");
      }
      if (Number(afterCounts.chronology_claims) !== Number(beforeCounts.chronology_claims) - retiredChronologyClaims) {
        throw new Error("CORRECTION_CHRONOLOGY_CLAIM_COUNT_DRIFT");
      }
      if (Number(afterCounts.relationship_descriptions) !== Number(beforeCounts.relationship_descriptions) - retiredDescriptions) {
        throw new Error("CORRECTION_RELATIONSHIP_DESCRIPTION_COUNT_DRIFT");
      }

      for (const operation of manifest.operations) {
        if (operation.type === "coalesce_relationship") {
          const keep = await loadRelationship(client, operation.keep_relationship_id, true);
          assertExpectedRelationship(keep, operation.expected_keep, operation.keep_relationship_id, "POSTWRITE_KEEP");
          if (await loadRelationship(client, operation.drop_relationship_id, true)) throw new Error("CORRECTION_POSTWRITE_DROP_STILL_EXISTS");
        } else if (operation.type === "retire_activity") {
          if (await loadRelationship(client, operation.relationship_id, true)) throw new Error("CORRECTION_POSTWRITE_RETIRED_RELATIONSHIP_STILL_EXISTS");
        } else {
          const updated = await loadRelationship(client, operation.relationship_id, true);
          assertExpectedRelationship(updated, operation.expected_after, operation.relationship_id, "POSTWRITE_UPDATED");
        }
      }

      const snapshot = Object.freeze({
        version: 1,
        schema: MANIFEST_V1_1,
        marker: MARKER_V1_1,
        operations: outcomes,
        before_counts: beforeCounts,
        after_counts: afterCounts,
        relationships_removed: relationshipsRemoved,
        duplicate_source_links_collapsed: collapsedSourceLinks,
        retired_source_links: retiredSourceLinks,
        retired_chronology_claims: retiredChronologyClaims,
        retired_relationship_descriptions: retiredDescriptions
      });

      if (dryRun) {
        await client.query("rollback");
        return Object.freeze({
          marker: MARKER_V1_1,
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
      ) values($1,$2,$3,$4::jsonb)`, [manifest.requestId, hash, MANIFEST_V1_1, JSON.stringify(snapshot)]);
      await client.query("commit");
      return Object.freeze({
        marker: MARKER_V1_1,
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

function createCorrectionManifestServiceForSchema({ client, schema, ...options } = {}) {
  if (schema === MANIFEST_V1) return createV1Service({ client, ...options });
  if (schema === MANIFEST_V1_1) return createCorrectionManifestV11Service({ client, ...options });
  throw new Error("UNSUPPORTED_CORRECTION_MANIFEST_SCHEMA");
}

module.exports = Object.freeze({
  MANIFEST_V1_1,
  MARKER_V1_1,
  MAX_OPERATIONS_V1_1,
  V1_1_OPERATION_TYPES,
  requireV11Manifest,
  requireV11Operation,
  retireActivity,
  updateActivityInterval,
  createCorrectionManifestV11Service,
  createCorrectionManifestServiceForSchema
});
