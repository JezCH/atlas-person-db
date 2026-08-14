"use strict";

const crypto = require("node:crypto");

const MAX_V2_SNAPSHOT_ACTIVITY_IDS = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeV2SnapshotActivityIds(value) {
  if (!Array.isArray(value) || value.length === 0) throw new Error("CORRECTION_V2_SNAPSHOT_ACTIVITY_IDS_REQUIRED");
  if (value.length > MAX_V2_SNAPSHOT_ACTIVITY_IDS) throw new Error("CORRECTION_V2_SNAPSHOT_ACTIVITY_IDS_LIMIT_EXCEEDED");
  const ids = [...new Set(value.map((item) => String(item || "").trim().toLowerCase()))].sort();
  if (ids.length === 0 || ids.some((id) => !UUID_RE.test(id))) throw new Error("CORRECTION_V2_SNAPSHOT_ACTIVITY_ID_INVALID");
  return ids;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function snapshotDigest(snapshot) {
  const stable = JSON.stringify(canonicalize(snapshot));
  return `sha256:${crypto.createHash("sha256").update(stable, "utf8").digest("hex")}`;
}

function lowerUuidFields(row, fields) {
  const out = { ...row };
  for (const field of fields) if (out[field] != null) out[field] = String(out[field]).toLowerCase();
  return out;
}

async function createCorrectionV2TargetSnapshot(client, activityIds) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const ids = normalizeV2SnapshotActivityIds(activityIds);
  await client.query("begin isolation level repeatable read read only");
  try {
    const readOnly = await client.query("select current_setting('transaction_read_only') as read_only");
    if (readOnly.rows[0]?.read_only !== "on") throw new Error("CORRECTION_V2_SNAPSHOT_TRANSACTION_NOT_READ_ONLY");

    const activityResult = await client.query(`
      select
        id::text,
        person_id::text,
        polity_id::text,
        relation_type_id::text,
        role_id::text,
        period_basis_id::text,
        activity_start,
        activity_start_month,
        activity_start_day,
        activity_start_granularity,
        activity_start_certainty,
        activity_start_calendar,
        activity_end,
        activity_end_month,
        activity_end_day,
        activity_end_granularity,
        activity_end_certainty,
        activity_end_calendar,
        confidence,
        chronology_status,
        legacy_source_key,
        notes,
        source_locator,
        content_hash
      from atlas_v2.person_politics_v2
      where id = any($1::uuid[])
      order by id::text
    `, [ids]);

    const activities = activityResult.rows.map((row) => lowerUuidFields(row, ["id","person_id","polity_id","relation_type_id","role_id","period_basis_id"]));
    const returnedIds = activities.map((row) => row.id);
    if (returnedIds.length !== ids.length) {
      const missing = ids.filter((id) => !returnedIds.includes(id));
      const error = new Error("CORRECTION_V2_SNAPSHOT_TARGET_NOT_FOUND");
      error.missing_activity_ids = missing;
      throw error;
    }
    if (returnedIds.some((id, index) => id !== ids[index])) throw new Error("CORRECTION_V2_SNAPSHOT_TARGET_ORDER_DRIFT");

    const sourceResult = await client.query(`
      select person_politics_id::text, source_id::text, source_locator_key
        from atlas_v2.person_politics_sources
       where person_politics_id = any($1::uuid[])
       order by person_politics_id::text, source_id::text, source_locator_key
    `, [ids]);
    const sourceLinks = sourceResult.rows.map((row) => lowerUuidFields(row, ["person_politics_id","source_id"]));

    const chronologyResult = await client.query(`
      select id::text, person_politics_id::text, claim_type, start_year, end_year
        from atlas_v2.chronology_claims
       where person_politics_id = any($1::uuid[])
       order by person_politics_id::text, id::text
    `, [ids]);
    const chronologyClaims = chronologyResult.rows.map((row) => lowerUuidFields(row, ["id","person_politics_id"]));

    const descriptionResult = await client.query(`
      select id::text, person_politics_id::text, locale, content
        from atlas_v2.relationship_descriptions
       where person_politics_id = any($1::uuid[])
       order by person_politics_id::text, locale, id::text
    `, [ids]);
    const relationshipDescriptions = descriptionResult.rows.map((row) => lowerUuidFields(row, ["id","person_politics_id"]));

    const snapshotCore = Object.freeze({
      schema: "atlas-correction-v2-target-snapshot/v1",
      activity_ids: Object.freeze([...ids]),
      activities: Object.freeze(activities),
      normalized_activity_source_links: Object.freeze(sourceLinks),
      chronology_claims: Object.freeze(chronologyClaims),
      relationship_descriptions: Object.freeze(relationshipDescriptions)
    });
    const digest = snapshotDigest(snapshotCore);

    await client.query("commit");
    return Object.freeze({
      ...snapshotCore,
      snapshot_digest: digest,
      read_only: true,
      committed: false
    });
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    throw error;
  }
}

module.exports = Object.freeze({
  MAX_V2_SNAPSHOT_ACTIVITY_IDS,
  UUID_RE,
  normalizeV2SnapshotActivityIds,
  canonicalize,
  snapshotDigest,
  createCorrectionV2TargetSnapshot
});
