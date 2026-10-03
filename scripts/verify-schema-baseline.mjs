import path from 'node:path';
import { createRequire } from 'node:module';
import pg from 'pg';

const require = createRequire(import.meta.url);
const { AUTHORING_MIGRATION_PATHS, AUTHORING_APPLY_MIGRATION_PATHS } = require('../server/atlas-authoring-migrations.js');
const { CORRECTION_MIGRATION_PATHS } = require('../server/atlas-correction-migrations.js');
const {
  readCurrentBaseline,
  applyCurrentBaseline,
  applyCurrentCorrectionSchema,
  applyReviewedStage2SchemaBodies,
  applyCurrentP9Cutover,
  applyCurrentAuthoringSchema
} = require('../server/atlas-current-schema-reconstruction.js');
const { inspectP9Cutover } = require('../server/atlas-stage2-p9-db-cutover.js');
const { Client } = pg;
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required for schema baseline verification');

const expectedAuthoringMigrations = [
  '20260811_authoring_manifest_runs.sql',
  '20260811_authoring_result_snapshot.sql',
  '20260814_authoring_ledger_live_reference_lifecycle.sql',
  '20260815_human_authoring_manifest_schema.sql',
  '20260821_person_external_references.sql',
  '20260821_human_authoring_external_reference_sync.sql',
  '20260902_ongoing_activity_terms.sql',
  '20260904_person_representative_domains.sql',
  '20260905_person_representative_domain_standard_v1.sql',
  '20260906_p13a_temporal_unknown_boundaries.sql',
  '20260906_p13_source_place_objects.sql',
  '20260920_person_portraits.sql',
  '20260921_person_portrait_history_v2.sql',
  '20260924_person_portraits_simple_v3.sql',
  '20260928_polity_identity_retirements.sql',
  '20260928_person_timeline_dispositions.sql',
  '20260930_external_reference_decision_state.sql',
  '20260930_source_bibliographic_completion.sql',
  '20260930_place_historical_relations.sql',
  '20260930_human_person_authoring_manifest_schema.sql',
  '20260930_reviewed_candidate_boundary.sql',
  '20261001_spatial_registration_dispositions.sql',
  '20261001_polity_place_function_authority.sql',
  '20260930_unit16_retire_external_reference_sync_trigger.sql',
  '20261003_person_registration_queue_canonical.sql'
];

const expectedAuthoringReplayMigrations = [
  '20260811_authoring_manifest_runs.sql',
  '20260811_authoring_result_snapshot.sql',
  '20260814_authoring_ledger_live_reference_lifecycle.sql',
  '20260815_human_authoring_manifest_schema.sql',
  '20260821_person_external_references.sql',
  '20260821_human_authoring_external_reference_sync.sql',
  '20260902_ongoing_activity_terms.sql',
  '20260904_person_representative_domains.sql',
  '20260919_person_representative_domain_standard_replay_safe.sql',
  '20260906_p13a_temporal_unknown_boundaries.sql',
  '20260906_p13_source_place_objects.sql',
  '20260920_person_portraits.sql',
  '20260921_person_portrait_history_v2.sql',
  '20260924_person_portraits_simple_v3.sql',
  '20260928_polity_identity_retirements.sql',
  '20260928_person_timeline_dispositions.sql',
  '20260930_external_reference_decision_state.sql',
  '20260930_source_bibliographic_completion.sql',
  '20260930_place_historical_relations.sql',
  '20260930_human_person_authoring_manifest_schema.sql',
  '20260930_reviewed_candidate_boundary.sql',
  '20261001_spatial_registration_dispositions.sql',
  '20261001_polity_place_function_authority.sql',
  '20260930_unit16_retire_external_reference_sync_trigger.sql',
  '20261003_person_registration_queue_canonical.sql'
];

const expectedCorrectionMigrations = [
  '20260811_correction_manifest_runs.sql',
  '20260812_correction_manifest_v1_1.sql',
  '20260813_correction_manifest_v2.sql',
  '20260815_correction_manifest_v1_2.sql',
  '20260821_correction_manifest_v1_3.sql',
  '20260827_correction_manifest_v1_4.sql',
  '20260928_polity_identity_retirements.sql'
];

const expectedStage2SchemaComponents = [
  'semantic_extensions',
  'relation_type_catalog',
  'source_model',
  'normalized_provenance',
  'entity_boundaries',
  'native_activity_provenance'
];

const expectedStage2Tables = [
  'governance_context_names','governance_contexts',
  'historical_event_names','historical_event_sources','historical_events',
  'people_group_names','people_group_sources','people_groups',
  'person_event_participation_sources','person_event_participations',
  'person_people_affiliation_sources','person_people_affiliations',
  'person_polity_relation_types',
  'polity_designation_names','polity_designation_sources','polity_designations',
  'polity_governance_period_sources','polity_governance_periods',
  'polity_identity_relation_sources','polity_identity_relation_types','polity_identity_relations',
  'polity_relation_sources','polity_relation_types','polity_relations'
].sort();

const expectedTables = [
  'authoring_manifest_runs','chronology_claims','correction_manifest_runs','migration_metadata','period_bases','period_basis_names','person_descriptions',
  'person_duplicate_candidates','person_duplicate_reviews','person_merge_audits','person_names',
  'person_politics_sources','person_politics_v2','person_sources','persons','polities','polity_descriptions',
  'polity_identity_retirement_names','polity_identity_retirements','polity_names','polity_sources',
  'relationship_descriptions','role_names','roles','sources'
].sort();

const expectedConstraints = [
  'authoring_manifest_runs_pkey','authoring_manifest_runs_person_id_fkey','authoring_manifest_runs_relationship_id_fkey',
  'authoring_manifest_runs_manifest_schema_check','authoring_manifest_runs_result_snapshot_check',
  'chronology_claims_pkey',
  'correction_manifest_runs_pkey','correction_manifest_runs_manifest_schema_check','correction_manifest_runs_result_snapshot_check',
  'migration_metadata_phase_check','migration_metadata_pkey','period_bases_pkey','period_bases_code_key',
  'period_basis_names_pkey','person_descriptions_pkey','person_duplicate_candidates_candidate_state_check',
  'person_duplicate_candidates_check','person_duplicate_candidates_confidence_check','person_duplicate_candidates_current_decision_check',
  'person_duplicate_candidates_review_count_check','person_duplicate_candidates_pkey',
  'person_duplicate_candidates_person_low_id_person_high_id_key','person_duplicate_reviews_decision_check',
  'person_duplicate_reviews_reviewer_kind_check','person_duplicate_reviews_pkey','person_duplicate_reviews_request_id_key',
  'person_merge_audits_check','person_merge_audits_reviewer_kind_check','person_merge_audits_pkey','person_merge_audits_request_id_key',
  'person_names_pkey','person_politics_sources_pkey','person_politics_v2_activity_end_check',
  'person_politics_v2_activity_start_check','person_politics_v2_check','person_politics_v2_pkey',
  'person_politics_v2_legacy_source_key_key','person_sources_pkey','persons_pkey','persons_canonical_key_key',
  'polities_pkey','polities_canonical_key_key','polity_descriptions_pkey',
  'polity_identity_retirement_names_locale_check','polity_identity_retirement_names_name_check',
  'polity_identity_retirement_names_pkey','polity_identity_retirement_names_retired_polity_id_fkey',
  'polity_identity_retirements_canonical_key_check','polity_identity_retirements_historicity_check',
  'polity_identity_retirements_not_self','polity_identity_retirements_pkey',
  'polity_identity_retirements_polity_type_check','polity_identity_retirements_review_reason_check',
  'polity_identity_retirements_source_case_id_check','polity_identity_retirements_source_request_id_check',
  'polity_identity_retirements_survivor_fkey',
  'polity_names_pkey','polity_sources_pkey',
  'relationship_descriptions_pkey','role_names_pkey','roles_pkey','roles_code_key','sources_bytes_check','sources_pkey',
  'sources_source_key_key','chronology_claims_person_politics_id_fkey','period_basis_names_period_basis_id_fkey',
  'person_descriptions_person_id_fkey','person_duplicate_reviews_candidate_id_fkey','person_names_person_id_fkey',
  'person_politics_sources_person_politics_id_fkey','person_politics_sources_source_id_fkey',
  'person_politics_v2_period_basis_id_fkey','person_politics_v2_person_id_fkey','person_politics_v2_polity_id_fkey',
  'person_politics_v2_role_id_fkey','person_sources_person_id_fkey','person_sources_source_id_fkey',
  'polity_descriptions_polity_id_fkey','polity_names_polity_id_fkey','polity_sources_polity_id_fkey',
  'polity_sources_source_id_fkey','relationship_descriptions_person_politics_id_fkey','role_names_role_id_fkey'
].sort();

const expectedIndexes = [
  'person_duplicate_candidates_queue_idx','person_duplicate_reviews_candidate_idx','person_merge_audits_candidate_idx',
  'person_merge_audits_source_idx','person_merge_audits_survivor_idx','person_names_preferred_locale_uq',
  'person_politics_v2_null_role_semantic_uidx','polity_names_preferred_locale_uq',
  'idx_polity_identity_retirement_names_lookup','idx_polity_identity_retirements_canonical_key',
  'idx_polity_identity_retirements_survivor'
].sort();

function same(actual, expected, label) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw new Error(`${label} mismatch\nactual=${JSON.stringify(left)}\nexpected=${JSON.stringify(right)}`);
  }
}

function assertAuthoringMigrationRegistry(result, label) {
  const registered = AUTHORING_MIGRATION_PATHS.map((item) => path.basename(item));
  if (JSON.stringify(registered) !== JSON.stringify(expectedAuthoringMigrations)) {
    throw new Error(`${label} full registry drift\nactual=${JSON.stringify(registered)}\nexpected=${JSON.stringify(expectedAuthoringMigrations)}`);
  }
  const replayRegistered = AUTHORING_APPLY_MIGRATION_PATHS.map((item) => path.basename(item));
  if (JSON.stringify(replayRegistered) !== JSON.stringify(expectedAuthoringReplayMigrations)) {
    throw new Error(`${label} replay registry drift\nactual=${JSON.stringify(replayRegistered)}\nexpected=${JSON.stringify(expectedAuthoringReplayMigrations)}`);
  }
  if (JSON.stringify(result.applied) !== JSON.stringify(expectedAuthoringReplayMigrations)) {
    throw new Error(`${label} apply drift\nactual=${JSON.stringify(result.applied)}\nexpected=${JSON.stringify(expectedAuthoringReplayMigrations)}`);
  }
}

function assertCorrectionMigrationRegistry(result, label) {
  const registered = CORRECTION_MIGRATION_PATHS.map((item) => path.basename(item));
  if (JSON.stringify(registered) !== JSON.stringify(expectedCorrectionMigrations)) {
    throw new Error(`${label} registry drift\nactual=${JSON.stringify(registered)}\nexpected=${JSON.stringify(expectedCorrectionMigrations)}`);
  }
  if (JSON.stringify(result.applied) !== JSON.stringify(expectedCorrectionMigrations)) {
    throw new Error(`${label} apply drift\nactual=${JSON.stringify(result.applied)}\nexpected=${JSON.stringify(expectedCorrectionMigrations)}`);
  }
}

const source = readCurrentBaseline();
const ddlWithoutLineComments = source.replace(/^\s*--.*$/gm, '');
if (/public\.person_politics|atlas_person_politics_compat_v1/i.test(ddlWithoutLineComments)) {
  throw new Error('current baseline DDL must not recreate legacy person-politics objects');
}

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await applyCurrentBaseline(client);

  const initialCorrectionMigration = await applyCurrentCorrectionSchema(client);
  assertCorrectionMigrationRegistry(initialCorrectionMigration, 'initial correction migration');

  const tables = await client.query(`
    select table_name
      from information_schema.tables
     where table_schema='atlas_v2' and table_type='BASE TABLE'
     order by table_name`);
  same(tables.rows.map((row) => row.table_name), expectedTables, 'table set');

  const constraints = await client.query(`
    select con.conname
      from pg_constraint con
      join pg_namespace n on n.oid=con.connamespace
     where n.nspname='atlas_v2'
     order by con.conname`);
  same(constraints.rows.map((row) => row.conname), expectedConstraints, 'constraint set');

  const indexes = await client.query(`
    select indexname
      from pg_indexes
     where schemaname='atlas_v2' and indexname = any($1::text[])
     order by indexname`, [expectedIndexes]);
  same(indexes.rows.map((row) => row.indexname), expectedIndexes, 'maintenance index set');

  const nullRole = await client.query(`
    select indexdef
      from pg_indexes
     where schemaname='atlas_v2' and indexname='person_politics_v2_null_role_semantic_uidx'`);
  const nullRoleDef = String(nullRole.rows[0]?.indexdef || '');
  if (!/NULLS NOT DISTINCT/i.test(nullRoleDef) || !/WHERE \(role_id IS NULL\)/i.test(nullRoleDef)) {
    throw new Error(`null-role semantic index definition drift: ${nullRoleDef}`);
  }

  const authoringColumns = await client.query(`
    select column_name
      from information_schema.columns
     where table_schema='atlas_v2'
       and table_name='authoring_manifest_runs'
       and column_name in ('manifest_schema','result_snapshot')
     order by column_name`);
  same(authoringColumns.rows.map((row) => row.column_name), ['manifest_schema','result_snapshot'], 'authoring provenance columns');

  const correctionColumns = await client.query(`
    select column_name
      from information_schema.columns
     where table_schema='atlas_v2'
       and table_name='correction_manifest_runs'
     order by column_name`);
  same(correctionColumns.rows.map((row) => row.column_name), ['applied_at','manifest_hash','manifest_schema','request_id','result_snapshot'], 'correction ledger columns');

  const correctionSchemaConstraint = await client.query(`
    select pg_get_constraintdef(con.oid) as definition
      from pg_constraint con
      join pg_namespace n on n.oid=con.connamespace
     where n.nspname='atlas_v2'
       and con.conname='correction_manifest_runs_manifest_schema_check'`);
  const correctionSchemaDefinition = String(correctionSchemaConstraint.rows[0]?.definition || '');
  for (const schema of ['atlas-correction-manifest/v1','atlas-correction-manifest/v1.1','atlas-correction-manifest/v1.2','atlas-correction-manifest/v1.3','atlas-correction-manifest/v2']) {
    if (!correctionSchemaDefinition.includes(schema)) {
      throw new Error(`correction manifest schema constraint missing ${schema}: ${correctionSchemaDefinition}`);
    }
  }

  const stage2Schema = await applyReviewedStage2SchemaBodies(client);
  same(stage2Schema.components, expectedStage2SchemaComponents, 'Stage 2 schema component order');

  const stage2Tables = await client.query(`
    select table_name
      from information_schema.tables
     where table_schema='atlas_v2'
       and table_name = any($1::text[])
     order by table_name`, [expectedStage2Tables]);
  same(stage2Tables.rows.map((row) => row.table_name), expectedStage2Tables, 'Stage 2 current table set');

  const obsoleteReleaseLedger = await client.query(`
    select to_regclass('atlas_v2.stage2_schema_release_components') as release_ledger`);
  if (obsoleteReleaseLedger.rows[0]?.release_ledger) {
    throw new Error('historical Stage 2 release ledger leaked into current clean-schema reconstruction');
  }

  const stage2ActivityColumns = await client.query(`
    select column_name,is_nullable
      from information_schema.columns
     where table_schema='atlas_v2'
       and table_name='person_politics_v2'
       and column_name = any($1::text[])
     order by column_name`, [[
       'relation_type_id',
       'activity_start_month','activity_start_day','activity_start_granularity','activity_start_certainty','activity_start_calendar',
       'activity_end_month','activity_end_day','activity_end_granularity','activity_end_certainty','activity_end_calendar',
       'legacy_source_key'
     ]]);
  same(
    stage2ActivityColumns.rows.map((row) => row.column_name),
    [
      'activity_end_calendar','activity_end_certainty','activity_end_day','activity_end_granularity','activity_end_month',
      'activity_start_calendar','activity_start_certainty','activity_start_day','activity_start_granularity','activity_start_month',
      'legacy_source_key','relation_type_id'
    ],
    'Stage 2 Activity columns'
  );
  if (stage2ActivityColumns.rows.find((row) => row.column_name === 'legacy_source_key')?.is_nullable !== 'YES') {
    throw new Error('Stage 2 native Activity legacy_source_key must be nullable');
  }

  const stage2SourceColumns = await client.query(`
    select column_name,is_nullable
      from information_schema.columns
     where table_schema='atlas_v2'
       and table_name='sources'
       and column_name = any($1::text[])
     order by column_name`, [['bytes','canonical_url','citation_text','sha256']]);
  same(stage2SourceColumns.rows.map((row) => row.column_name), ['bytes','canonical_url','citation_text','sha256'], 'Stage 2 Source columns');
  for (const key of ['bytes','sha256']) {
    if (stage2SourceColumns.rows.find((row) => row.column_name === key)?.is_nullable !== 'YES') {
      throw new Error(`Stage 2 Source ${key} must support unmaterialized bibliographic evidence`);
    }
  }

  const personRelationCatalog = await client.query(`select code from atlas_v2.person_polity_relation_types order by code`);
  same(personRelationCatalog.rows.map((row) => row.code), ['active_in','claims_rule','governs','opposes','rules','serves'], 'Person-Polity relation catalog');
  const polityRelationCatalog = await client.query(`select code from atlas_v2.polity_relation_types order by code`);
  same(polityRelationCatalog.rows.map((row) => row.code), ['colonial_dependency_of','constituent_of','dominion_of','nominally_subordinate_to','vassal_of'], 'Polity relation catalog');

  const firstP9Cutover = await applyCurrentP9Cutover(client);
  if (firstP9Cutover.replay !== false || firstP9Cutover.after?.old_index_present || !firstP9Cutover.after?.new_index_present) {
    throw new Error(`fresh P9 semantic-key cutover drift: ${JSON.stringify(firstP9Cutover)}`);
  }
  const secondP9Cutover = await applyCurrentP9Cutover(client);
  if (secondP9Cutover.replay !== true || secondP9Cutover.after?.old_index_present || !secondP9Cutover.after?.new_index_present) {
    throw new Error(`P9 semantic-key replay drift: ${JSON.stringify(secondP9Cutover)}`);
  }

  const firstAuthoringReplay = await applyCurrentAuthoringSchema(client);
  const secondAuthoringReplay = await applyCurrentAuthoringSchema(client);
  assertAuthoringMigrationRegistry(firstAuthoringReplay, 'first authoring replay');
  assertAuthoringMigrationRegistry(secondAuthoringReplay, 'second authoring replay');

  const p9Readback = await inspectP9Cutover(client);
  if (p9Readback.old_index_present || !p9Readback.new_index_present || p9Readback.duplicate_groups !== 0 || p9Readback.ready !== true) {
    throw new Error(`current P9 schema read-back failed: ${JSON.stringify(p9Readback)}`);
  }

  const temporalBoundaryColumns = await client.query(`
    select column_name,is_nullable
      from information_schema.columns
     where table_schema='atlas_v2'
       and table_name='person_politics_v2'
       and column_name in ('activity_start','activity_end')
     order by column_name`);
  same(
    temporalBoundaryColumns.rows.map((row) => `${row.column_name}:${row.is_nullable}`),
    ['activity_end:YES','activity_start:YES'],
    'P13 unknown Activity boundary nullability'
  );

  const temporalBoundaryConstraints = await client.query(`
    select conname
      from pg_constraint
     where conrelid='atlas_v2.person_politics_v2'::regclass
       and conname in (
         'person_politics_v2_start_boundary_shape_check',
         'person_politics_v2_end_boundary_shape_check',
         'person_politics_v2_ongoing_end_check'
       )
     order by conname`);
  same(
    temporalBoundaryConstraints.rows.map((row) => row.conname),
    [
      'person_politics_v2_end_boundary_shape_check',
      'person_politics_v2_ongoing_end_check',
      'person_politics_v2_start_boundary_shape_check'
    ],
    'P13 unknown Activity boundary constraints'
  );

  const semanticIndexes = await client.query(`
    select indexname
      from pg_indexes
     where schemaname='atlas_v2'
       and indexname in (
         'person_politics_v2_null_role_semantic_uidx',
         'person_politics_v2_stage2_semantic_identity_uq',
         'person_politics_v2_unknown_semantic_identity_uq'
       )
     order by indexname`);
  same(
    semanticIndexes.rows.map((row) => row.indexname),
    ['person_politics_v2_stage2_semantic_identity_uq','person_politics_v2_unknown_semantic_identity_uq'],
    'current Activity semantic identity indexes'
  );

  const timelineTables = await client.query(`
    select table_name
      from information_schema.tables
     where table_schema='atlas_v2'
       and table_name='person_timeline_dispositions'
     order by table_name`);
  same(timelineTables.rows.map((row) => row.table_name), ['person_timeline_dispositions'], 'Person timeline disposition table');

  const timelineConstraint = await client.query(`
    select conname
      from pg_constraint
     where conrelid='atlas_v2.person_timeline_dispositions'::regclass
       and conname='person_timeline_dispositions_disposition_check'`);
  same(timelineConstraint.rows.map((row) => row.conname), ['person_timeline_dispositions_disposition_check'], 'Person timeline disposition vocabulary constraint');

  const timelineIndex = await client.query(`
    select indexname
      from pg_indexes
     where schemaname='atlas_v2'
       and indexname='person_timeline_dispositions_disposition_idx'`);
  same(timelineIndex.rows.map((row) => row.indexname), ['person_timeline_dispositions_disposition_idx'], 'Person timeline disposition index');

  const profileTables = await client.query(`
    select table_name
      from information_schema.tables
     where table_schema='atlas_v2'
       and table_name in ('person_external_references','person_profile_mutation_audits')
     order by table_name`);
  same(profileTables.rows.map((row) => row.table_name), ['person_external_references','person_profile_mutation_audits'], 'person profile authoring tables');
  const profileAuditIndex = await client.query(`
    select indexname
      from pg_indexes
     where schemaname='atlas_v2' and indexname='person_profile_mutation_audits_person_idx'`);
  same(profileAuditIndex.rows.map((row) => row.indexname), ['person_profile_mutation_audits_person_idx'], 'person profile audit index');

  const candidateTables = await client.query(`
    select table_name
      from information_schema.tables
     where table_schema='atlas_v2'
       and table_name in ('person_candidate_review_revisions','person_candidate_registration_states')
     order by table_name`);
  same(
    candidateTables.rows.map((row) => row.table_name),
    ['person_candidate_registration_states','person_candidate_review_revisions'],
    'reviewed candidate boundary tables'
  );

  const candidateChecks = await client.query(`
    select conname
      from pg_constraint
     where connamespace='atlas_v2'::regnamespace
       and conname in (
         'person_candidate_review_state_ck',
         'person_candidate_review_human_approval_ck',
         'person_candidate_registration_state_ck'
       )
     order by conname`);
  same(
    candidateChecks.rows.map((row) => row.conname),
    [
      'person_candidate_registration_state_ck',
      'person_candidate_review_human_approval_ck',
      'person_candidate_review_state_ck'
    ],
    'reviewed candidate state constraints'
  );

  const candidateRevisionFk = await client.query(`
    select pg_get_constraintdef(oid) as definition
      from pg_constraint
     where conrelid='atlas_v2.person_candidate_registration_states'::regclass
       and contype='f'
       and pg_get_constraintdef(oid) ilike '%(candidate_id, review_revision)%person_candidate_review_revisions(candidate_id, revision)%'`);
  if (candidateRevisionFk.rows.length !== 1) {
    throw new Error(`reviewed candidate revision FK mismatch: ${JSON.stringify(candidateRevisionFk.rows)}`);
  }

  const candidatePayloadIndex = await client.query(`
    select indexname
      from pg_indexes
     where schemaname='atlas_v2'
       and indexname='person_candidate_review_payload_hash_uq'`);
  same(
    candidatePayloadIndex.rows.map((row) => row.indexname),
    ['person_candidate_review_payload_hash_uq'],
    'reviewed candidate immutable payload index'
  );

  const placeTables = await client.query(`
    select table_name
      from information_schema.tables
     where table_schema='atlas_v2'
       and table_name in ('places','place_names','place_sources')
     order by table_name`);
  same(placeTables.rows.map((row) => row.table_name), ['place_names','place_sources','places'], 'P13 Place authoring tables');
  const placeSourceDeleteRule = await client.query(`
    select rc.delete_rule
      from information_schema.referential_constraints rc
     where rc.constraint_schema='atlas_v2'
       and rc.constraint_name='place_sources_source_id_fkey'`);
  same(placeSourceDeleteRule.rows.map((row) => row.delete_rule), ['RESTRICT'], 'P13 Source provenance delete rule');

  const portraitTables = await client.query(`
    select table_name
      from information_schema.tables
     where table_schema='atlas_v2'
       and table_name in ('person_portraits','person_portrait_sources')
     order by table_name`);
  same(portraitTables.rows.map((row) => row.table_name), ['person_portraits'], 'Person portrait canonical tables');

  const portraitPersonDeleteRule = await client.query(`
    select rc.delete_rule
      from information_schema.referential_constraints rc
     where rc.constraint_schema='atlas_v2'
       and rc.constraint_name='person_portraits_person_id_fkey'`);
  same(portraitPersonDeleteRule.rows.map((row) => row.delete_rule), ['RESTRICT'], 'Person portrait Person delete rule');

  const portraitSourceRules = await client.query(`
    select rc.constraint_name,rc.update_rule,rc.delete_rule
      from information_schema.referential_constraints rc
     where rc.constraint_schema='atlas_v2'
       and rc.constraint_name in ('person_portrait_sources_person_id_fkey','person_portrait_sources_source_id_fkey')
     order by rc.constraint_name`);
  same(
    portraitSourceRules.rows.map((row) => `${row.constraint_name}:${row.update_rule}:${row.delete_rule}`),
    [],
    'Person portrait retired provenance reference rules'
  );

  const firstCorrectionReplay = await applyCurrentCorrectionSchema(client);
  const secondCorrectionReplay = await applyCurrentCorrectionSchema(client);
  assertCorrectionMigrationRegistry(firstCorrectionReplay, 'first correction replay');
  assertCorrectionMigrationRegistry(secondCorrectionReplay, 'second correction replay');

  const legacy = await client.query(`
    select to_regclass('public.person_politics') as legacy_table,
           to_regclass('public.atlas_person_politics_compat_v1') as legacy_compat`);
  if (legacy.rows[0]?.legacy_table || legacy.rows[0]?.legacy_compat) {
    throw new Error('legacy person-politics objects exist after baseline apply');
  }

  let secondApplyRejected = false;
  try {
    await applyCurrentBaseline(client);
  } catch (error) {
    secondApplyRejected = /already exists|clean target/i.test(String(error?.message || error));
    try { await client.query('rollback'); } catch {}
  }
  if (!secondApplyRejected) throw new Error('baseline must reject a non-clean atlas_v2 target');

  console.log(JSON.stringify({
    marker: 'ATLAS_CURRENT_SCHEMA_RECONSTRUCTION_V2',
    status: 'PASS',
    baseline_tables: expectedTables.length,
    stage2_schema_components: expectedStage2SchemaComponents.length,
    stage2_schema_tables: stage2Tables.rows.length,
    historical_stage2_release_ledger: false,
    p9_semantic_key_cutover: true,
    p9_semantic_key_replay: secondP9Cutover.replay === true,
    p13_unknown_activity_boundaries: true,
    constraints: expectedConstraints.length,
    maintenance_indexes: expectedIndexes.length,
    authoring_migrations: firstAuthoringReplay.applied.length,
    authoring_migration_replay: true,
    person_profile_authoring_tables: profileTables.rows.length,
    reviewed_candidate_boundary_tables: candidateTables.rows.length,
    person_timeline_disposition_table: timelineTables.rows.length,
    p13_place_authoring_tables: placeTables.rows.length,
    p13_source_provenance_restrict: true,
    correction_migrations: firstCorrectionReplay.applied.length,
    correction_migration_replay: true,
    correction_manifest_schemas: ['atlas-correction-manifest/v1','atlas-correction-manifest/v1.1','atlas-correction-manifest/v1.2','atlas-correction-manifest/v1.3','atlas-correction-manifest/v2'],
    clean_target_guard: true,
    legacy_objects: 0
  }, null, 2));
} finally {
  await client.end();
}
