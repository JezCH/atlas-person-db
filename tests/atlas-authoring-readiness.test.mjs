import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { inspectAuthoringReadiness } = require('../server/atlas-authoring-readiness.js');
const { OLD_INDEX, NEW_INDEX } = require('../server/atlas-stage2-p9-db-cutover.js');

const NEW_INDEX_DEF = `CREATE UNIQUE INDEX ${NEW_INDEX} ON atlas_v2.person_politics_v2
  (person_id, polity_id, relation_type_id, role_id, period_basis_id,
   activity_start, activity_start_month, activity_start_day, activity_start_granularity, activity_start_calendar,
   activity_end, activity_end_month, activity_end_day, activity_end_granularity, activity_end_calendar)
  NULLS NOT DISTINCT WHERE relation_type_id IS NOT NULL`;

function clientFor({
  oldIndex = false,
  newIndex = true,
  duplicates = 0,
  baseTablesReady = true,
  ledgerTableReady = true,
  activityColumnsReady = true,
  ledgerColumnsReady = true,
  humanSchemaAllowed = true,
  personReferenceSchemaReady = true,
  personReferenceSyncReady = true,
  p5Ready = true
} = {}) {
  return {
    async query(sql, params = []) {
      const text = String(sql);
      if (text.includes("to_regclass('atlas_v2.person_polity_relation_types') as relation_catalog")) {
        return { rows: [{
          relation_catalog: p5Ready ? 'atlas_v2.person_polity_relation_types' : null,
          polity_relations: p5Ready ? 'atlas_v2.polity_relations' : null,
          semantic_name_kind: p5Ready,
          source_url: p5Ready
        }] };
      }
      if (text.includes("to_regclass('atlas_v2.persons') as persons")) {
        return { rows: [{
          persons: baseTablesReady ? 'atlas_v2.persons' : null,
          polities: baseTablesReady ? 'atlas_v2.polities' : null,
          roles: baseTablesReady ? 'atlas_v2.roles' : null,
          period_bases: baseTablesReady ? 'atlas_v2.period_bases' : null,
          relation_types: baseTablesReady ? 'atlas_v2.person_polity_relation_types' : null,
          activities: baseTablesReady ? 'atlas_v2.person_politics_v2' : null,
          activity_sources: baseTablesReady ? 'atlas_v2.person_politics_sources' : null,
          authoring_ledger: ledgerTableReady ? 'atlas_v2.authoring_manifest_runs' : null,
          person_external_references: personReferenceSchemaReady ? 'atlas_v2.person_external_references' : null,
          person_profile_mutation_audits: personReferenceSchemaReady ? 'atlas_v2.person_profile_mutation_audits' : null,
          ledger_manifest_schema: ledgerTableReady && ledgerColumnsReady,
          ledger_result_snapshot: ledgerTableReady && ledgerColumnsReady,
          ledger_human_authoring_schema_allowed: ledgerTableReady && ledgerColumnsReady && humanSchemaAllowed,
          relation_type_id: activityColumnsReady,
          activity_start_granularity: activityColumnsReady,
          activity_end_granularity: activityColumnsReady,
          activity_start_calendar: activityColumnsReady,
          activity_end_calendar: activityColumnsReady,
          person_external_reference_columns: personReferenceSchemaReady,
          person_profile_mutation_audit_columns: personReferenceSchemaReady,
          person_external_reference_fk_restrict: personReferenceSchemaReady,
          person_external_reference_pkey: personReferenceSchemaReady,
          person_external_reference_checks: personReferenceSchemaReady,
          person_profile_mutation_audit_pkey: personReferenceSchemaReady,
          person_profile_mutation_audit_checks: personReferenceSchemaReady,
          person_external_reference_sync_function: personReferenceSyncReady ? 'atlas_v2.sync_human_authoring_external_references()' : null,
          person_external_reference_sync_trigger: personReferenceSyncReady
        }] };
      }
      if (text.includes('from pg_indexes')) {
        const name = params[0];
        if (name === OLD_INDEX) return { rows: oldIndex ? [{ indexname: OLD_INDEX, indexdef: 'CREATE UNIQUE INDEX legacy' }] : [] };
        if (name === NEW_INDEX) return { rows: newIndex ? [{ indexname: NEW_INDEX, indexdef: NEW_INDEX_DEF }] : [] };
      }
      if (text.includes('select count(*)::int as count from (')) return { rows: [{ count: duplicates }] };
      throw new Error(`Unexpected readiness query: ${text.slice(0, 80)}`);
    }
  };
}

test('authoring readiness requires P5, core Stage 2 schema, human-compatible ledger, Person profile schema, NamuWiki sync, completed P9 and current P10 merge contract', async () => {
  const result = await inspectAuthoringReadiness(clientFor());
  assert.equal(result.ready, true);
  assert.equal(result.bootstrap_ready, true);
  assert.equal(result.bootstrap_required, false);
  assert.equal(result.p5_ready, true);
  assert.equal(result.core.base_tables_ready, true);
  assert.equal(result.core.ledger_table_ready, true);
  assert.equal(result.core.tables_ready, true);
  assert.equal(result.core.activity_columns_ready, true);
  assert.equal(result.core.ledger_columns_ready, true);
  assert.equal(result.core.ledger_human_authoring_schema_allowed, true);
  assert.equal(result.core.ledger_contract_ready, true);
  assert.equal(result.core.columns_ready, true);
  assert.equal(result.core.person_reference_tables_ready, true);
  assert.equal(result.core.person_reference_columns_ready, true);
  assert.equal(result.core.person_reference_constraints_ready, true);
  assert.equal(result.core.person_external_reference_sync_function_ready, true);
  assert.equal(result.core.person_external_reference_sync_trigger_ready, true);
  assert.equal(result.core.person_external_reference_sync_ready, true);
  assert.equal(result.core.person_reference_contract_ready, true);
  assert.equal(result.p9.old_index_present, false);
  assert.equal(result.p9.new_index_present, true);
  assert.equal(result.p9.duplicate_groups, 0);
  assert.equal(result.person_merge_contract_ready, true);
  assert.equal(result.person_merge.allowed, true);
  assert.equal(result.person_merge.person_merge_lifecycle_version, 'p10-v2-revalidated');
});

test('missing authoring ledger schema is explicitly bootstrappable without weakening P9/P10 contracts', async () => {
  const missingColumns = await inspectAuthoringReadiness(clientFor({ ledgerColumnsReady: false }));
  assert.equal(missingColumns.ready, false);
  assert.equal(missingColumns.bootstrap_ready, true);
  assert.equal(missingColumns.bootstrap_required, true);
  assert.equal(missingColumns.core.activity_columns_ready, true);
  assert.equal(missingColumns.core.ledger_columns_ready, false);
  assert.equal(missingColumns.core.ledger_contract_ready, false);
  assert.equal(missingColumns.core.columns.ledger_manifest_schema, false);
  assert.equal(missingColumns.core.columns.ledger_result_snapshot, false);

  const missingLedger = await inspectAuthoringReadiness(clientFor({ ledgerTableReady: false, ledgerColumnsReady: false, personReferenceSyncReady: false }));
  assert.equal(missingLedger.ready, false);
  assert.equal(missingLedger.bootstrap_ready, true);
  assert.equal(missingLedger.bootstrap_required, true);
  assert.equal(missingLedger.core.ledger_table_ready, false);
});

test('missing Person external-reference/profile-audit schema is explicitly bootstrappable', async () => {
  const result = await inspectAuthoringReadiness(clientFor({ personReferenceSchemaReady: false, personReferenceSyncReady: false }));
  assert.equal(result.ready, false);
  assert.equal(result.bootstrap_ready, true);
  assert.equal(result.bootstrap_required, true);
  assert.equal(result.core.person_reference_tables_ready, false);
  assert.equal(result.core.person_reference_columns_ready, false);
  assert.equal(result.core.person_reference_constraints_ready, false);
  assert.equal(result.core.person_external_reference_sync_ready, false);
  assert.equal(result.core.person_reference_contract_ready, false);
});

test('missing NamuWiki external-reference sync trigger is explicitly bootstrappable', async () => {
  const result = await inspectAuthoringReadiness(clientFor({ personReferenceSyncReady: false }));
  assert.equal(result.ready, false);
  assert.equal(result.bootstrap_ready, true);
  assert.equal(result.bootstrap_required, true);
  assert.equal(result.core.person_reference_tables_ready, true);
  assert.equal(result.core.person_reference_columns_ready, true);
  assert.equal(result.core.person_reference_constraints_ready, true);
  assert.equal(result.core.person_external_reference_sync_function_ready, false);
  assert.equal(result.core.person_external_reference_sync_trigger_ready, false);
  assert.equal(result.core.person_external_reference_sync_ready, false);
  assert.equal(result.core.person_reference_contract_ready, false);
});

test('legacy authoring ledger CHECK without human schema is bootstrappable, not ready', async () => {
  const result = await inspectAuthoringReadiness(clientFor({ humanSchemaAllowed: false }));
  assert.equal(result.ready, false);
  assert.equal(result.bootstrap_ready, true);
  assert.equal(result.bootstrap_required, true);
  assert.equal(result.core.ledger_columns_ready, true);
  assert.equal(result.core.ledger_human_authoring_schema_allowed, false);
  assert.equal(result.core.ledger_contract_ready, false);
});

test('authoring readiness and bootstrap both fail closed when P9 is not complete', async () => {
  const result = await inspectAuthoringReadiness(clientFor({ oldIndex: true, newIndex: false }));
  assert.equal(result.ready, false);
  assert.equal(result.bootstrap_ready, false);
  assert.equal(result.p9.old_index_present, true);
  assert.equal(result.p9.new_index_present, false);
});

test('bootstrap never masks duplicate groups, base-table gaps, or Stage 2 Activity column gaps', async () => {
  const duplicates = await inspectAuthoringReadiness(clientFor({ duplicates: 1, ledgerColumnsReady: false }));
  assert.equal(duplicates.ready, false);
  assert.equal(duplicates.bootstrap_ready, false);
  const missingBase = await inspectAuthoringReadiness(clientFor({ baseTablesReady: false, ledgerColumnsReady: false }));
  assert.equal(missingBase.ready, false);
  assert.equal(missingBase.bootstrap_ready, false);
  const missingActivityColumns = await inspectAuthoringReadiness(clientFor({ activityColumnsReady: false, ledgerColumnsReady: false }));
  assert.equal(missingActivityColumns.ready, false);
  assert.equal(missingActivityColumns.bootstrap_ready, false);
});