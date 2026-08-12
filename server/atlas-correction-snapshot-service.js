"use strict";

const { snapshotRelationship } = require("./atlas-correction-manifest-service.js");

const MAX_SNAPSHOT_ACTIVITY_IDS = 20;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeSnapshotActivityIds(value) {
  if (!Array.isArray(value) || value.length === 0) throw new Error("CORRECTION_SNAPSHOT_ACTIVITY_IDS_REQUIRED");
  if (value.length > MAX_SNAPSHOT_ACTIVITY_IDS) throw new Error("CORRECTION_SNAPSHOT_ACTIVITY_IDS_LIMIT_EXCEEDED");
  const ids = [...new Set(value.map((item) => String(item || "").trim().toLowerCase()))].sort();
  if (ids.length === 0 || ids.some((id) => !UUID_RE.test(id))) throw new Error("CORRECTION_SNAPSHOT_ACTIVITY_ID_INVALID");
  return ids;
}

async function createCorrectionTargetSnapshot(client, activityIds) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const ids = normalizeSnapshotActivityIds(activityIds);
  await client.query("begin isolation level repeatable read read only");
  try {
    const readOnly = await client.query("select current_setting('transaction_read_only') as read_only");
    if (readOnly.rows[0]?.read_only !== "on") throw new Error("CORRECTION_SNAPSHOT_TRANSACTION_NOT_READ_ONLY");

    const snapshots = [];
    for (const id of ids) {
      const snapshot = await snapshotRelationship(client, id);
      if (!snapshot) {
        const error = new Error("CORRECTION_SNAPSHOT_TARGET_NOT_FOUND");
        error.missing_activity_ids = [id];
        throw error;
      }
      snapshots.push(snapshot);
    }

    const returnedIds = snapshots.map((item) => String(item.relationship?.id || "").toLowerCase());
    if (returnedIds.length !== ids.length || new Set(returnedIds).size !== ids.length) {
      throw new Error("CORRECTION_SNAPSHOT_TARGET_SET_DRIFT");
    }
    for (let index = 0; index < ids.length; index += 1) {
      if (returnedIds[index] !== ids[index]) throw new Error("CORRECTION_SNAPSHOT_TARGET_ORDER_DRIFT");
    }

    await client.query("commit");
    return Object.freeze({
      activity_ids: Object.freeze([...ids]),
      snapshots: Object.freeze(snapshots),
      read_only: true,
      committed: false
    });
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    throw error;
  }
}

module.exports = Object.freeze({
  MAX_SNAPSHOT_ACTIVITY_IDS,
  normalizeSnapshotActivityIds,
  createCorrectionTargetSnapshot
});
