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
        select 1
          from pg_constraint c
         where c.conrelid=to_regclass('atlas_v2.authoring_manifest_runs')
           and c.conname='authoring_manifest_runs_manifest_schema_check'
           and strpos(pg_get_constraintdef(c.oid), 'atlas-human-authoring/v1') > 0
      ) as ledger_human_authoring_schema_allowed,
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
  const baseTablesReady = [
    "persons","polities","roles","period_bases","relation_types","activities","activity_sources"
  ].every((field) => Boolean(row[field]));
  const ledgerTableReady = Boolean(row.authoring_ledger);
  const columns = Object.freeze({
    ledger_manifest_schema: row.ledger_manifest_schema === true,
    ledger_result_snapshot: row.ledger_result_snapshot === true,
    relation_type_id: row.relation_type_id === true,
    activity_start_granularity: row.activity_start_granularity === true,
    activity_end_granularity: row.activity_end_granularity === true,
    activity_start_calendar: row.activity_start_calendar === true,
    activity_end_calendar: row.activity_end_calendar === true
  });
  const activityColumnsReady = [
    "relation_type_id","activity_start_granularity","activity_end_granularity",
    "activity_start_calendar","activity_end_calendar"
  ].every((field) => columns[field] === true);
  const ledgerColumnsReady = ledgerTableReady
    && columns.ledger_manifest_schema === true
    && columns.ledger_result_snapshot === true;
  const ledgerHumanAuthoringSchemaAllowed = row.ledger_human_authoring_schema_allowed === true;
  const ledgerContractReady = ledgerColumnsReady && ledgerHumanAuthoringSchemaAllowed;
  return Object.freeze({
    base_tables_ready: baseTablesReady,
    ledger_table_ready: ledgerTableReady,
    tables_ready: baseTablesReady && ledgerTableReady,
    activity_columns_ready: activityColumnsReady,
    ledger_columns_ready: ledgerColumnsReady,
    ledger_human_authoring_schema_allowed: ledgerHumanAuthoringSchemaAllowed,
    ledger_contract_ready: ledgerContractReady,
    columns_ready: activityColumnsReady && ledgerColumnsReady,
    columns
  });
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

  // pg.Client serializes work internally today, but concurrent client.query()
  // calls are deprecated and will become unsafe in pg@9. This readiness path
  // does not need parallelism, so keep one client strictly sequential.
  const core = await inspectCoreAuthoringSchema(client);
  const p9 = await inspectP9Cutover(client);
  const merge = personMergeExecutionState();
  const p9Ready = p9.old_index_present === false
    && p9.new_index_present === true
    && p9.duplicate_groups === 0;
  const mergeContractReady = merge.reconciliation_semantic_version === merge.required_reconciliation_semantic_version
    && merge.person_merge_lifecycle_version === merge.required_person_merge_lifecycle_version;
  const ready = p5Ready
    && core.tables_ready
    && core.columns_ready
    && core.ledger_contract_ready
    && p9Ready
    && mergeContractReady;
  const bootstrapReady = p5Ready
    && core.base_tables_ready
    && core.activity_columns_ready
    && p9Ready
    && mergeContractReady;

  return Object.freeze({
    ready,
    bootstrap_ready: bootstrapReady,
    bootstrap_required: bootstrapReady && !ready,
    p5_ready: p5Ready,
    core,
    p9,
    person_merge: merge,
    person_merge_contract_ready: mergeContractReady
  });
}

module.exports = Object.freeze({ inspectCoreAuthoringSchema, inspectAuthoringReadiness });
