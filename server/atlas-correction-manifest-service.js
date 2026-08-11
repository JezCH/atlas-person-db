"use strict";

const crypto = require("node:crypto");
const { coalesceRelationship } = require("./atlas-person-merge-service.js");

const MANIFEST_V1 = "atlas-correction-manifest/v1";
const MARKER = "ATLAS_CORRECTION_MANIFEST_V1";
const MAX_OPERATIONS = 20;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function manifestHash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function requireUuid(value, code) {
  const id = String(value || "").trim().toLowerCase();
  if (!UUID_RE.test(id)) throw new Error(code);
  return id;
}

function normalizedNullableUuid(value, code) {
  if (value == null || String(value).trim() === "") return null;
  return requireUuid(value, code);
}

function normalizedNotes(value) {
  return value == null ? null : String(value);
}

function requireExpected(raw, label) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`CORRECTION_${label}_EXPECTED_REQUIRED`);
  const activityStart = Number(raw.activity_start);
  const activityEnd = Number(raw.activity_end);
  if (!Number.isInteger(activityStart) || !Number.isInteger(activityEnd)) throw new Error(`CORRECTION_${label}_CHRONOLOGY_REQUIRED`);
  if (activityEnd < activityStart) throw new Error(`CORRECTION_${label}_CHRONOLOGY_INVALID`);
  return Object.freeze({
    person_id: requireUuid(raw.person_id, `CORRECTION_${label}_PERSON_ID_REQUIRED`),
    polity_id: requireUuid(raw.polity_id, `CORRECTION_${label}_POLITY_ID_REQUIRED`),
    role_id: normalizedNullableUuid(raw.role_id, `CORRECTION_${label}_ROLE_ID_INVALID`),
    period_basis_id: requireUuid(raw.period_basis_id, `CORRECTION_${label}_PERIOD_BASIS_ID_REQUIRED`),
    activity_start: activityStart,
    activity_end: activityEnd,
    notes: normalizedNotes(raw.notes),
    legacy_source_key: raw.legacy_source_key == null ? null : String(raw.legacy_source_key)
  });
}

function semanticIdentity(expected) {
  return [
    expected.person_id,
    expected.polity_id,
    expected.role_id || "<NULL_ROLE>",
    expected.period_basis_id,
    expected.activity_start,
    expected.activity_end
  ].join("|");
}

function requireOperation(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_OPERATION_OBJECT_REQUIRED");
  if (String(raw.type || "").trim() !== "coalesce_relationship") throw new Error("CORRECTION_OPERATION_UNSUPPORTED");
  const keepId = requireUuid(raw.keep_relationship_id, "CORRECTION_KEEP_RELATIONSHIP_ID_REQUIRED");
  const dropId = requireUuid(raw.drop_relationship_id, "CORRECTION_DROP_RELATIONSHIP_ID_REQUIRED");
  if (keepId === dropId) throw new Error("CORRECTION_KEEP_DROP_MUST_DIFFER");
  const expectedKeep = requireExpected(raw.expected_keep, `OP${index}_KEEP`);
  const expectedDrop = requireExpected(raw.expected_drop, `OP${index}_DROP`);
  if (semanticIdentity(expectedKeep) !== semanticIdentity(expectedDrop)) {
    throw new Error("CORRECTION_COALESCE_SEMANTIC_IDENTITY_MISMATCH");
  }
  return Object.freeze({
    type: "coalesce_relationship",
    keep_relationship_id: keepId,
    drop_relationship_id: dropId,
    expected_keep: expectedKeep,
    expected_drop: expectedDrop
  });
}

function requireManifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_MANIFEST_OBJECT_REQUIRED");
  if (String(raw.schema || "").trim() !== MANIFEST_V1) throw new Error("UNSUPPORTED_CORRECTION_MANIFEST_SCHEMA");
  if (String(raw.review_status || "").trim().toLowerCase() !== "approved") throw new Error("CORRECTION_MANIFEST_NOT_APPROVED");
  const requestId = String(raw.request_id || "").trim();
  if (!requestId) throw new Error("CORRECTION_REQUEST_ID_REQUIRED");
  if (!Array.isArray(raw.operations) || raw.operations.length === 0) throw new Error("CORRECTION_OPERATIONS_REQUIRED");
  if (raw.operations.length > MAX_OPERATIONS) throw new Error("CORRECTION_OPERATIONS_LIMIT_EXCEEDED");
  const operations = raw.operations.map((operation, index) => requireOperation(operation, index + 1));
  const seen = new Set();
  for (const operation of operations) {
    for (const id of [operation.keep_relationship_id, operation.drop_relationship_id]) {
      if (seen.has(id)) throw new Error("CORRECTION_RELATIONSHIP_REUSED_ACROSS_OPERATIONS");
      seen.add(id);
    }
  }
  return Object.freeze({ schema: MANIFEST_V1, requestId, operations });
}

async function readLedger(client, requestId) {
  const result = await client.query(`
    select request_id,manifest_hash,manifest_schema,result_snapshot,applied_at
      from atlas_v2.correction_manifest_runs
     where request_id=$1
     for update`, [requestId]);
  return result.rows[0] || null;
}

async function loadRelationship(client, id, forUpdate = true) {
  const result = await client.query(`
    select id,person_id,polity_id,role_id,period_basis_id,activity_start,activity_end,
           confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash
      from atlas_v2.person_politics_v2
     where id=$1${forUpdate ? " for update" : ""}`, [id]);
  return result.rows[0] || null;
}

function assertExpectedRelationship(row, expected, relationshipId, label) {
  if (!row) throw new Error(`CORRECTION_${label}_RELATIONSHIP_NOT_FOUND`);
  const checks = [
    [String(row.id), relationshipId, "ID"],
    [String(row.person_id), expected.person_id, "PERSON"],
    [String(row.polity_id), expected.polity_id, "POLITY"],
    [row.role_id == null ? null : String(row.role_id), expected.role_id, "ROLE"],
    [String(row.period_basis_id), expected.period_basis_id, "PERIOD_BASIS"],
    [Number(row.activity_start), expected.activity_start, "START"],
    [Number(row.activity_end), expected.activity_end, "END"],
    [row.notes == null ? null : String(row.notes), expected.notes, "NOTES"],
    [row.legacy_source_key == null ? null : String(row.legacy_source_key), expected.legacy_source_key, "LEGACY_SOURCE_KEY"]
  ];
  for (const [actual, wanted, field] of checks) {
    if (actual !== wanted) throw new Error(`CORRECTION_${label}_${field}_DRIFT`);
  }
}

async function snapshotRelationship(client, id) {
  const relationship = await loadRelationship(client, id, false);
  if (!relationship) return null;
  const [sources, chronologyClaims, descriptions] = await Promise.all([
    client.query(`select source_id,source_locator_key from atlas_v2.person_politics_sources where person_politics_id=$1 order by source_id`, [id]),
    client.query(`select id,claim_type,start_year,end_year from atlas_v2.chronology_claims where person_politics_id=$1 order by id`, [id]),
    client.query(`select id,locale,content from atlas_v2.relationship_descriptions where person_politics_id=$1 order by locale,id`, [id])
  ]);
  return Object.freeze({
    relationship,
    sources: sources.rows,
    chronology_claims: chronologyClaims.rows,
    relationship_descriptions: descriptions.rows
  });
}

async function globalCounts(client) {
  const result = await client.query(`select
    (select count(*)::int from atlas_v2.person_politics_v2) as relationships,
    (select count(*)::int from atlas_v2.person_politics_sources) as relationship_sources,
    (select count(*)::int from atlas_v2.chronology_claims) as chronology_claims,
    (select count(*)::int from atlas_v2.relationship_descriptions) as relationship_descriptions`);
  return result.rows[0];
}

function assertReplaySnapshot(snapshot, manifest) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) throw new Error("CORRECTION_LEDGER_RESULT_INVALID");
  if (snapshot.schema !== MANIFEST_V1 || snapshot.marker !== MARKER) throw new Error("CORRECTION_LEDGER_RESULT_SCHEMA_MISMATCH");
  const operations = Array.isArray(snapshot.operations) ? snapshot.operations : [];
  if (operations.length !== manifest.operations.length) throw new Error("CORRECTION_LEDGER_RESULT_OPERATION_DRIFT");
}

async function verifyAppliedState(client, manifest) {
  for (const operation of manifest.operations) {
    const keep = await loadRelationship(client, operation.keep_relationship_id, true);
    assertExpectedRelationship(keep, operation.expected_keep, operation.keep_relationship_id, "REPLAY_KEEP");
    const drop = await loadRelationship(client, operation.drop_relationship_id, true);
    if (drop) throw new Error("CORRECTION_REPLAY_DROP_RELATIONSHIP_REAPPEARED");
  }
}

function createCorrectionManifestService({ client } = {}) {
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
        if (ledger.manifest_schema !== MANIFEST_V1) throw new Error("CORRECTION_LEDGER_SCHEMA_MISMATCH");
        assertReplaySnapshot(ledger.result_snapshot, manifest);
        await verifyAppliedState(client, manifest);
        if (dryRun) await client.query("rollback");
        else await client.query("commit");
        return Object.freeze({
          marker: MARKER,
          request_id: manifest.requestId,
          dry_run: Boolean(dryRun),
          committed: !dryRun,
          replay: true,
          result: ledger.result_snapshot
        });
      }

      const beforeCounts = await globalCounts(client);
      const prepared = [];
      for (const operation of manifest.operations) {
        const keep = await loadRelationship(client, operation.keep_relationship_id, true);
        const drop = await loadRelationship(client, operation.drop_relationship_id, true);
        assertExpectedRelationship(keep, operation.expected_keep, operation.keep_relationship_id, "KEEP");
        assertExpectedRelationship(drop, operation.expected_drop, operation.drop_relationship_id, "DROP");
        const liveKeepSemantic = semanticIdentity({
          person_id: String(keep.person_id), polity_id: String(keep.polity_id), role_id: keep.role_id == null ? null : String(keep.role_id),
          period_basis_id: String(keep.period_basis_id), activity_start: Number(keep.activity_start), activity_end: Number(keep.activity_end)
        });
        const liveDropSemantic = semanticIdentity({
          person_id: String(drop.person_id), polity_id: String(drop.polity_id), role_id: drop.role_id == null ? null : String(drop.role_id),
          period_basis_id: String(drop.period_basis_id), activity_start: Number(drop.activity_start), activity_end: Number(drop.activity_end)
        });
        if (liveKeepSemantic !== liveDropSemantic) throw new Error("CORRECTION_LIVE_SEMANTIC_IDENTITY_MISMATCH");
        prepared.push({
          operation,
          keep_before: await snapshotRelationship(client, operation.keep_relationship_id),
          drop_before: await snapshotRelationship(client, operation.drop_relationship_id)
        });
      }

      const outcomes = [];
      let collapsedSourceLinks = 0;
      for (const item of prepared) {
        const outcome = await coalesceRelationship(
          client,
          item.operation.keep_relationship_id,
          item.operation.drop_relationship_id
        );
        collapsedSourceLinks += Number(outcome.collapsed_source_links || 0);
        outcomes.push({
          type: item.operation.type,
          keep_relationship_id: item.operation.keep_relationship_id,
          drop_relationship_id: item.operation.drop_relationship_id,
          keep_before: item.keep_before,
          drop_before: item.drop_before,
          mutation: outcome
        });
      }

      const afterCounts = await globalCounts(client);
      if (Number(afterCounts.relationships) !== Number(beforeCounts.relationships) - manifest.operations.length) {
        throw new Error("CORRECTION_RELATIONSHIP_COUNT_DRIFT");
      }
      if (Number(afterCounts.chronology_claims) !== Number(beforeCounts.chronology_claims)) {
        throw new Error("CORRECTION_CHRONOLOGY_CLAIM_COUNT_DRIFT");
      }
      if (Number(afterCounts.relationship_descriptions) !== Number(beforeCounts.relationship_descriptions)) {
        throw new Error("CORRECTION_RELATIONSHIP_DESCRIPTION_COUNT_DRIFT");
      }
      if (Number(afterCounts.relationship_sources) !== Number(beforeCounts.relationship_sources) - collapsedSourceLinks) {
        throw new Error("CORRECTION_RELATIONSHIP_SOURCE_COUNT_DRIFT");
      }

      for (const operation of manifest.operations) {
        const keep = await loadRelationship(client, operation.keep_relationship_id, true);
        assertExpectedRelationship(keep, operation.expected_keep, operation.keep_relationship_id, "POSTWRITE_KEEP");
        const drop = await loadRelationship(client, operation.drop_relationship_id, true);
        if (drop) throw new Error("CORRECTION_POSTWRITE_DROP_STILL_EXISTS");
      }

      const snapshot = Object.freeze({
        version: 1,
        schema: MANIFEST_V1,
        marker: MARKER,
        operations: outcomes,
        before_counts: beforeCounts,
        after_counts: afterCounts,
        relationships_removed: manifest.operations.length,
        duplicate_source_links_collapsed: collapsedSourceLinks
      });

      if (dryRun) {
        await client.query("rollback");
        return Object.freeze({
          marker: MARKER,
          request_id: manifest.requestId,
          dry_run: true,
          committed: false,
          replay: false,
          result: snapshot
        });
      }

      await client.query(`insert into atlas_v2.correction_manifest_runs(
        request_id,manifest_hash,manifest_schema,result_snapshot
      ) values($1,$2,$3,$4::jsonb)`, [manifest.requestId, hash, MANIFEST_V1, JSON.stringify(snapshot)]);
      await client.query("commit");
      return Object.freeze({
        marker: MARKER,
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
  MANIFEST_V1,
  MARKER,
  MAX_OPERATIONS,
  createCorrectionManifestService,
  manifestHash,
  requireManifest,
  requireOperation,
  requireExpected,
  semanticIdentity,
  assertExpectedRelationship,
  snapshotRelationship,
  globalCounts,
  readLedger,
  verifyAppliedState
});
