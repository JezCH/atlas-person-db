"use strict";

const MAX_SNAPSHOT_ACTIVITY_IDS = 20;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeSnapshotActivityIds(value) {
  if (!Array.isArray(value) || value.length === 0) throw new Error("CORRECTION_SNAPSHOT_ACTIVITY_IDS_REQUIRED");
  if (value.length > MAX_SNAPSHOT_ACTIVITY_IDS) throw new Error("CORRECTION_SNAPSHOT_ACTIVITY_IDS_LIMIT_EXCEEDED");
  const ids = [...new Set(value.map((item) => String(item || "").trim().toLowerCase()))].sort();
  if (ids.length === 0 || ids.some((id) => !UUID_RE.test(id))) throw new Error("CORRECTION_SNAPSHOT_ACTIVITY_ID_INVALID");
  return ids;
}

async function snapshotRelationship(client, id) {
  const relationship = await client.query(`
    select id::text,person_id::text,polity_id::text,relation_type_id::text,role_id::text,period_basis_id::text,
           activity_start,activity_start_month,activity_start_day,activity_start_granularity,activity_start_certainty,activity_start_calendar,
           activity_end,activity_end_month,activity_end_day,activity_end_granularity,activity_end_certainty,activity_end_calendar,
           confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash
      from atlas_v2.person_politics_v2
     where id=$1::uuid`, [id]);
  if (!relationship.rowCount) return null;
  const [sources, chronologyClaims, descriptions] = await Promise.all([
    client.query(`select source_id::text as source_id,source_locator_key from atlas_v2.person_politics_sources where person_politics_id=$1::uuid order by source_id::text`, [id]),
    client.query(`select id::text as id,person_politics_id::text as person_politics_id,claim_type,start_year,end_year from atlas_v2.chronology_claims where person_politics_id=$1::uuid order by id::text`, [id]),
    client.query(`select id::text as id,person_politics_id::text as person_politics_id,locale,content from atlas_v2.relationship_descriptions where person_politics_id=$1::uuid order by locale,id::text`, [id])
  ]);
  return Object.freeze({
    relationship: relationship.rows[0],
    sources: sources.rows,
    chronology_claims: chronologyClaims.rows,
    relationship_descriptions: descriptions.rows
  });
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
  snapshotRelationship,
  createCorrectionTargetSnapshot
});
