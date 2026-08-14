"use strict";

const OLD_INDEX = "person_politics_v2_null_role_semantic_uidx";
const NEW_INDEX = "person_politics_v2_stage2_semantic_identity_uq";
const LOCK_KEY = "atlas-stage2:p9-semantic-key-v2-cutover:v1";
const CREATE_SQL = `CREATE UNIQUE INDEX person_politics_v2_stage2_semantic_identity_uq
  ON atlas_v2.person_politics_v2 (
    person_id, polity_id, relation_type_id, role_id, period_basis_id,
    activity_start, activity_start_month, activity_start_day, activity_start_granularity, activity_start_calendar,
    activity_end, activity_end_month, activity_end_day, activity_end_granularity, activity_end_calendar
  ) NULLS NOT DISTINCT
  WHERE relation_type_id IS NOT NULL
    AND activity_start_granularity IS NOT NULL
    AND activity_start_calendar IS NOT NULL
    AND activity_end_granularity IS NOT NULL
    AND activity_end_calendar IS NOT NULL`;

async function inspectIndex(client, name) {
  const result = await client.query(`select indexname,indexdef from pg_indexes where schemaname='atlas_v2' and tablename='person_politics_v2' and indexname=$1`, [name]);
  return result.rows[0] || null;
}

async function duplicateCount(client) {
  const result = await client.query(`select count(*)::int as count from (
    select person_id,polity_id,relation_type_id,role_id,period_basis_id,
      activity_start,activity_start_month,activity_start_day,activity_start_granularity,activity_start_calendar,
      activity_end,activity_end_month,activity_end_day,activity_end_granularity,activity_end_calendar,count(*)
    from atlas_v2.person_politics_v2
    where relation_type_id is not null
      and activity_start_granularity is not null and activity_start_calendar is not null
      and activity_end_granularity is not null and activity_end_calendar is not null
    group by person_id,polity_id,relation_type_id,role_id,period_basis_id,
      activity_start,activity_start_month,activity_start_day,activity_start_granularity,activity_start_calendar,
      activity_end,activity_end_month,activity_end_day,activity_end_granularity,activity_end_calendar
    having count(*) > 1
  ) d`);
  return Number(result.rows[0]?.count || 0);
}

function verifyNewIndex(row) {
  if (!row) return false;
  const def = String(row.indexdef || "").toLowerCase();
  for (const token of ["unique index","nulls not distinct","relation_type_id","role_id","period_basis_id","activity_start_month","activity_start_day","activity_start_granularity","activity_start_calendar","activity_end_month","activity_end_day","activity_end_granularity","activity_end_calendar"]) {
    if (!def.includes(token)) throw new Error(`P9_INDEX_DEFINITION_DRIFT:${token}`);
  }
  if (def.includes("activity_start_certainty") || def.includes("activity_end_certainty")) throw new Error("P9_INDEX_CERTAINTY_MUST_NOT_BE_IDENTITY");
  return true;
}

async function inspectP9Cutover(client) {
  const [oldIndex,newIndex,duplicates] = await Promise.all([inspectIndex(client,OLD_INDEX),inspectIndex(client,NEW_INDEX),duplicateCount(client)]);
  if (newIndex) verifyNewIndex(newIndex);
  return Object.freeze({ old_index_present:Boolean(oldIndex), new_index_present:Boolean(newIndex), duplicate_groups:duplicates, ready:duplicates===0 && (Boolean(oldIndex) !== Boolean(newIndex) || Boolean(newIndex)) });
}

async function applyP9Cutover(client, { dryRun = false } = {}) {
  await client.query("begin isolation level serializable");
  try {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [LOCK_KEY]);
    const before = await inspectP9Cutover(client);
    if (before.duplicate_groups !== 0) throw new Error(`P9_SEMANTIC_KEY_DUPLICATES:${before.duplicate_groups}`);
    if (before.new_index_present) {
      if (before.old_index_present) throw new Error("P9_SPLIT_BRAIN_INDEXES_PRESENT");
      if (dryRun) await client.query("rollback"); else await client.query("commit");
      return Object.freeze({ marker:"ATLAS_STAGE2_P9_DB_CUTOVER_V1", dry_run:Boolean(dryRun), committed:!dryRun, replay:true, before, after:before });
    }
    if (!before.old_index_present) throw new Error("P9_REVIEWED_LEGACY_INDEX_MISSING");
    await client.query(`DROP INDEX atlas_v2.${OLD_INDEX}`);
    await client.query(CREATE_SQL);
    const after = await inspectP9Cutover(client);
    if (after.old_index_present || !after.new_index_present || after.duplicate_groups !== 0) throw new Error("P9_DB_CUTOVER_POSTCONDITION_FAILED");
    const outcome = Object.freeze({ marker:"ATLAS_STAGE2_P9_DB_CUTOVER_V1", dry_run:Boolean(dryRun), committed:!dryRun, replay:false, before, after });
    if (dryRun) await client.query("rollback"); else await client.query("commit");
    return outcome;
  } catch (error) { try { await client.query("rollback"); } catch {} throw error; }
}

module.exports = Object.freeze({ OLD_INDEX, NEW_INDEX, LOCK_KEY, CREATE_SQL, inspectP9Cutover, applyP9Cutover, verifyNewIndex, duplicateCount });
