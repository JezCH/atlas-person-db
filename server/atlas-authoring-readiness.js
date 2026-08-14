"use strict";

const { requireP5Schema } = require("./atlas-stage2-reviewed-entity-authoring.js");
const { inspectP9Cutover } = require("./atlas-stage2-p9-db-cutover.js");
const { personMergeExecutionState } = require("./atlas-person-merge-interlock.js");

async function inspectCoreAuthoringSchema(client) {
  const result = await client.query(`
    select
      to_regclass('atlas_v2.persons') as persons,
      to_regclass('atlas_v2.polities') as polities,
      to_regclass('atlas_v2.roles') as roles,
      to_regclass('atlas_v2.period_bases') as period_bases,
      to_regclass('atlas_v2.person_polity_relation_types') as relation_types,
      to_regclass('atlas_v2.person_politics_v2') as activities,
      to_regclass('atlas_v2.person_politics_sources') as activity_sources,
      to_regclass('atlas_v2.authoring_manifest_runs') as authoring_ledger,
      exists(
        select 1 from information_schema.columns
         where table_schema='atlas_v2' and table_name='authoring_manifest_runs' and column_name='manifest_schema'
      ) as ledger_manifest_schema,
      exists(
        select 1 from information_schema.columns
         where table_schema='atlas_v2' and table_name='authoring_manifest_runs' and column_name='result_snapshot'
      ) as ledger_result_snapshot,
      exists(
        select 1 from information_schema.columns
         where table_schema='atlas_v2' and table_name='person_politics_v2' and column_name='relation_type_id'
      ) as relation_type_id,
      exists(
        select 1 from information_schema.columns
         where table_schema='atlas_v2' and table_name='person_politics_v2' and column_name='activity_start_granularity'
      ) as activity_start_granularity,
      exists(
        select 1 from information_schema.columns
         where table_schema='atlas_v2' and table_name='person_politics_v2' and column_name='activity_end_granularity'
      ) as activity_end_granularity,
      exists(
        select 1 from information_schema.columns
         where table_schema='atlas_v2' and table_name='person_politics_v2' and column_name='activity_start_calendar'
      ) as activity_start_calendar,
      exists(
        select 1 from information_schema.columns
         where table_schema='atlas_v2' and table_name='person_politics_v2' and column_name='activity_end_calendar'
      ) as activity_end_calendar
  `);
  const row = result.rows[0] || {};
  const tablesReady = [
    "persons","polities","roles","period_bases","relation_types","activities","activity_sources","authoring_ledger"
  ].every((field) => Boolean(row[field]));
  const columnsReady = [
    "ledger_manifest_schema","ledger_result_snapshot","relation_type_id",
    "activity_start_granularity","activity_end_granularity","activity_start_calendar","activity_end_calendar"
  ].every((field) => row[field] === true);
  return Object.freeze({ tables_ready: tablesReady, columns_ready: columnsReady });
}

async function inspectAuthoringReadiness(client) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");

  let p5Ready = true;
  try {
    await requireP5Schema(client);
  } catch (error) {
    if (String(error?.message || "") === "P5_ADDITIVE_SCHEMA_REQUIRED") p5Ready = false;
    else throw error;
  }

  const [core, p9] = await Promise.all([
    inspectCoreAuthoringSchema(client),
    inspectP9Cutover(client)
  ]);
  const merge = personMergeExecutionState();
  const p9Ready = p9.old_index_present === false
    && p9.new_index_present === true
    && p9.duplicate_groups === 0;
  const p10Blocked = merge.allowed === false
    && merge.person_merge_lifecycle_version === "pre-p10-blocked";

  return Object.freeze({
    ready: p5Ready && core.tables_ready && core.columns_ready && p9Ready && p10Blocked,
    p5_ready: p5Ready,
    core,
    p9,
    person_merge: merge
  });
}

module.exports = Object.freeze({ inspectCoreAuthoringSchema, inspectAuthoringReadiness });
