import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  AUTHORING_MIGRATION_PATHS,
  AUTHORING_APPLY_MIGRATION_PATHS,
  readAuthoringMigrations
} = require('../server/atlas-authoring-migrations.js');

const root = path.resolve(new URL('..', import.meta.url).pathname);
const baseline = fs.readFileSync(path.join(root, 'db/schema/atlas_v2.current.sql'), 'utf8');

test('authoring migration registry is ordered and contains durable lifecycle-safe Person migrations', () => {
  assert.equal(AUTHORING_MIGRATION_PATHS.length, 29);
  assert.equal(AUTHORING_APPLY_MIGRATION_PATHS.length, 27);
  assert.match(AUTHORING_MIGRATION_PATHS[0], /20260811_authoring_manifest_runs\.sql$/);
  assert.match(AUTHORING_MIGRATION_PATHS[1], /20260811_authoring_result_snapshot\.sql$/);
  assert.match(AUTHORING_MIGRATION_PATHS[2], /20260814_authoring_ledger_live_reference_lifecycle\.sql$/);
  assert.match(AUTHORING_MIGRATION_PATHS[3], /20260815_human_authoring_manifest_schema\.sql$/);
  assert.match(AUTHORING_MIGRATION_PATHS[4], /20260821_person_external_references\.sql$/);
  assert.match(AUTHORING_MIGRATION_PATHS[5], /20260821_human_authoring_external_reference_sync\.sql$/);
  assert.match(AUTHORING_MIGRATION_PATHS[6], /20260902_ongoing_activity_terms\.sql$/);
  assert.match(AUTHORING_MIGRATION_PATHS[7], /20260904_person_representative_domains\.sql$/);
  assert.match(AUTHORING_MIGRATION_PATHS[8], /20260905_person_representative_domain_standard_v1\.sql$/);
  assert.equal(AUTHORING_MIGRATION_PATHS[9].endsWith("20260919_person_representative_domain_standard_replay_safe.sql"), true);
  assert.match(AUTHORING_MIGRATION_PATHS[10], /20260906_p13a_temporal_unknown_boundaries\.sql$/);
  assert.match(AUTHORING_MIGRATION_PATHS[11], /20260906_p13_source_place_objects\.sql$/);
  assert.match(AUTHORING_MIGRATION_PATHS[12], /20260920_person_portraits\.sql$/);
  assert.equal(AUTHORING_MIGRATION_PATHS[13].endsWith("20260921_person_portrait_history_v2.sql"), true);
  assert.equal(AUTHORING_MIGRATION_PATHS[14].endsWith("20260924_person_portraits_simple_v3.sql"), true);
  assert.equal(AUTHORING_MIGRATION_PATHS[15].endsWith("20260928_polity_identity_retirements.sql"), true);
  assert.equal(AUTHORING_MIGRATION_PATHS[16].endsWith("20260928_person_timeline_dispositions.sql"), true);
  assert.equal(AUTHORING_MIGRATION_PATHS[17].endsWith("20260930_external_reference_decision_state.sql"), true);
  assert.equal(AUTHORING_MIGRATION_PATHS[18].endsWith("20260930_source_bibliographic_completion.sql"), true);
  assert.equal(AUTHORING_MIGRATION_PATHS[19].endsWith("20260930_place_historical_relations.sql"), true);
  assert.equal(AUTHORING_MIGRATION_PATHS[20].endsWith("20260930_human_person_authoring_manifest_schema.sql"), true);
  assert.equal(AUTHORING_MIGRATION_PATHS[21].endsWith("20260930_reviewed_candidate_boundary.sql"), true);
  assert.equal(AUTHORING_MIGRATION_PATHS[22].endsWith("20261001_spatial_registration_dispositions.sql"), true);
  assert.equal(AUTHORING_MIGRATION_PATHS[23].endsWith("20261001_polity_place_function_authority.sql"), true);
  assert.equal(AUTHORING_MIGRATION_PATHS[24].endsWith("20260930_unit16_retire_external_reference_sync_trigger.sql"), true);
  assert.equal(AUTHORING_MIGRATION_PATHS[25].endsWith("20261003_person_registration_queue_authority.sql"), true);
  assert.equal(AUTHORING_MIGRATION_PATHS[26].endsWith("20261003_shah_abbas_registration_queue_binding.sql"), true);
  assert.equal(AUTHORING_MIGRATION_PATHS[27].endsWith("20261004_person_representative_domain_standard_v2_replay_safe.sql"), true);
  assert.equal(AUTHORING_MIGRATION_PATHS[28].endsWith("20261006_user_selected_person_registration_queue_07.sql"), true);
  assert.equal(AUTHORING_APPLY_MIGRATION_PATHS[8].endsWith("20261004_person_representative_domain_standard_v2_replay_safe.sql"), true);
  assert.equal(AUTHORING_APPLY_MIGRATION_PATHS.some((value)=>value.endsWith("20260919_person_representative_domain_standard_replay_safe.sql")), false);
  assert.equal(AUTHORING_APPLY_MIGRATION_PATHS.at(-7).endsWith("20260930_reviewed_candidate_boundary.sql"), true);
  assert.equal(AUTHORING_APPLY_MIGRATION_PATHS.at(-6).endsWith("20261001_spatial_registration_dispositions.sql"), true);
  assert.equal(AUTHORING_APPLY_MIGRATION_PATHS.at(-5).endsWith("20261001_polity_place_function_authority.sql"), true);
  assert.equal(AUTHORING_APPLY_MIGRATION_PATHS.at(-4).endsWith("20260930_unit16_retire_external_reference_sync_trigger.sql"), true);
  assert.equal(AUTHORING_APPLY_MIGRATION_PATHS.at(-3).endsWith("20261003_person_registration_queue_authority.sql"), true);
  assert.equal(AUTHORING_APPLY_MIGRATION_PATHS.at(-2).endsWith("20261003_shah_abbas_registration_queue_binding.sql"), true);
  assert.equal(AUTHORING_APPLY_MIGRATION_PATHS.at(-1).endsWith("20261006_user_selected_person_registration_queue_07.sql"), true);
  const migrations = readAuthoringMigrations();
  assert.match(migrations[1].sql, /ADD COLUMN IF NOT EXISTS manifest_schema text/i);
  assert.match(migrations[1].sql, /ADD COLUMN IF NOT EXISTS result_snapshot jsonb/i);
  assert.match(migrations[1].sql, /authoring_manifest_runs_result_snapshot_check/i);

  const lifecycle = migrations[2].sql;
  assert.match(lifecycle, /pg_advisory_xact_lock/i);
  assert.match(lifecycle, /pg_constraint/i);
  assert.match(lifecycle, /confdeltype/i);
  assert.match(lifecycle, /authoring_manifest_runs_person_id_fkey/i);
  assert.match(lifecycle, /authoring_manifest_runs_relationship_id_fkey/i);
  assert.equal((lifecycle.match(/ON DELETE SET NULL/gi) || []).length, 2);

  const humanSchema = migrations[3].sql;
  assert.match(humanSchema, /pg_advisory_xact_lock/i);
  assert.match(humanSchema, /authoring_manifest_runs_manifest_schema_check/i);
  assert.match(humanSchema, /atlas-authoring-manifest\/v1/);
  assert.match(humanSchema, /atlas-authoring-manifest\/v2/);
  assert.match(humanSchema, /atlas-human-authoring\/v1/);
  assert.match(humanSchema, /AUTHORING_MANIFEST_SCHEMA_CHECK_DRIFT/);
  assert.match(humanSchema, /HUMAN_AUTHORING_MANIFEST_SCHEMA_NOT_ALLOWED/);

  const personOnlySchema = migrations[20].sql;
  assert.match(personOnlySchema, /pg_advisory_xact_lock/i);
  assert.match(personOnlySchema, /authoring_manifest_runs_manifest_schema_check/i);
  assert.match(personOnlySchema, /atlas-human-person-authoring\/v1/);
  assert.match(personOnlySchema, /AUTHORING_MANIFEST_SCHEMA_CHECK_DRIFT/);

  const personReferences = migrations[4].sql;
  assert.match(personReferences, /CREATE TABLE IF NOT EXISTS atlas_v2\.person_external_references/i);
  assert.match(personReferences, /CREATE TABLE IF NOT EXISTS atlas_v2\.person_profile_mutation_audits/i);
  assert.match(personReferences, /person_id uuid NOT NULL REFERENCES atlas_v2\.persons\(id\) ON DELETE RESTRICT/i);
  assert.match(personReferences, /ADD COLUMN IF NOT EXISTS review_state text/i);
  assert.match(personReferences, /ADD COLUMN IF NOT EXISTS review_reason text/i);
  assert.match(personReferences, /document_title, url, review_state, review_reason/i);

  const humanAuthoringReferenceSync = migrations[5].sql;
  assert.match(humanAuthoringReferenceSync, /sync_human_authoring_external_references/i);
  assert.match(humanAuthoringReferenceSync, /person_external_references/i);
  assert.match(humanAuthoringReferenceSync, /checked_at/i);
  assert.match(humanAuthoringReferenceSync, /ref_review_state/i);
  assert.match(humanAuthoringReferenceSync, /ref_review_reason/i);
  assert.match(humanAuthoringReferenceSync, /review_state\s*=\s*EXCLUDED\.review_state/i);
  assert.match(humanAuthoringReferenceSync, /review_reason\s*=\s*EXCLUDED\.review_reason/i);

  const representativeDomain = migrations[7].sql;
  assert.match(representativeDomain, /ADD COLUMN IF NOT EXISTS representative_domain text/i);
  assert.match(representativeDomain, /persons_representative_domain_check/i);
  assert.match(representativeDomain, /set_person_representative_domain/i);
  assert.match(representativeDomain, /set_person_timeline_disposition/i);
  assert.doesNotMatch(representativeDomain, /CREATE TABLE\s+atlas_v2\.person_representative_domains/i);

  const representativeDomainStandard = migrations[8].sql;
  assert.match(representativeDomainStandard, /WHEN 'ruler' THEN 'governance'/i);
  assert.match(representativeDomainStandard, /WHEN 'science' THEN 'knowledge'/i);
  assert.match(representativeDomainStandard, /DROP CONSTRAINT IF EXISTS persons_representative_domain_check/i);
  for (const domain of ['governance','military','knowledge','technology','commerce','culture','religion','exploration']) {
    assert.match(representativeDomainStandard, new RegExp(`'${domain}'`));
  }

  const temporalUnknown = migrations[10].sql;
  assert.match(temporalUnknown, /ALTER COLUMN activity_start DROP NOT NULL/i);
  assert.match(temporalUnknown, /person_politics_v2_start_boundary_shape_check/i);
  assert.match(temporalUnknown, /person_politics_v2_unknown_semantic_identity_uq/i);

  const sourcePlace = migrations[11].sql;
  assert.match(sourcePlace, /CREATE TABLE IF NOT EXISTS atlas_v2\.places/i);
  assert.match(sourcePlace, /CREATE TABLE IF NOT EXISTS atlas_v2\.place_names/i);
  assert.match(sourcePlace, /CREATE TABLE IF NOT EXISTS atlas_v2\.place_sources/i);
  assert.match(sourcePlace, /REFERENCES atlas_v2\.sources\(id\) ON DELETE RESTRICT/i);

  const personPortraits = migrations[12].sql;
  assert.match(personPortraits, /CREATE TABLE IF NOT EXISTS atlas_v2\.person_portraits/i);
  assert.match(personPortraits, /CREATE TABLE IF NOT EXISTS atlas_v2\.person_portrait_sources/i);
  assert.match(personPortraits, /PRIMARY KEY \(person_id\)/i);
  assert.match(personPortraits, /REFERENCES atlas_v2\.sources\(id\) ON DELETE RESTRICT/i);

  const portraitSimple = migrations[14].sql;
  assert.match(portraitSimple, /DROP COLUMN IF EXISTS portrait_kind/i);
  assert.match(portraitSimple, /DROP COLUMN IF EXISTS evidence_level/i);
  assert.match(portraitSimple, /DROP TABLE IF EXISTS atlas_v2\.person_portrait_sources/i);

  const polityRetirement = migrations[15].sql;
  assert.match(polityRetirement, /CREATE TABLE IF NOT EXISTS atlas_v2\.polity_identity_retirements/i);
  assert.match(polityRetirement, /survivor_polity_id uuid NULL/i);
  assert.match(polityRetirement, /REFERENCES atlas_v2\.polities\(id\)[\s\S]*ON DELETE RESTRICT/i);
  assert.match(polityRetirement, /CREATE TABLE IF NOT EXISTS atlas_v2\.polity_identity_retirement_names/i);
  assert.match(polityRetirement, /atlas-correction-polity-retirement\/v1/i);
  assert.match(polityRetirement, /ON CONFLICT \(retired_polity_id\) DO NOTHING/i);

  const timelineDisposition = migrations[16].sql;
  assert.match(timelineDisposition, /CREATE TABLE IF NOT EXISTS atlas_v2\.person_timeline_dispositions/i);
  for (const disposition of ['timeline','chronology_unresolved','legendary','mythical','other_reviewed_exclusion']) {
    assert.match(timelineDisposition, new RegExp(`'${disposition}'`));
  }
  assert.match(timelineDisposition, /set_person_timeline_disposition/i);
  for (const operation of ['set_person_korean_name','set_person_external_reference','set_person_representative_domain','set_person_timeline_disposition']) {
    assert.match(representativeDomain, new RegExp(`'${operation}'`));
    assert.match(timelineDisposition, new RegExp(`'${operation}'`));
  }
  assert.match(timelineDisposition, /REFERENCES atlas_v2\.persons\(id\)[\s\S]*ON DELETE CASCADE/i);

  const reviewedCandidateBoundary = migrations[21].sql;
  assert.match(reviewedCandidateBoundary, /CREATE TABLE IF NOT EXISTS atlas_v2\.person_candidate_review_revisions/i);
  assert.match(reviewedCandidateBoundary, /CREATE TABLE IF NOT EXISTS atlas_v2\.person_candidate_registration_states/i);
  assert.match(reviewedCandidateBoundary, /human_authorized = true/i);
  assert.match(reviewedCandidateBoundary, /FOREIGN KEY\(candidate_id,review_revision\)/i);

  const spatialRegistration = migrations[22].sql;
  assert.match(spatialRegistration, /CREATE TABLE IF NOT EXISTS atlas_v2\.spatial_registration_dispositions/i);
  assert.match(spatialRegistration, /polity_id uuid PRIMARY KEY REFERENCES atlas_v2\.polities\(id\) ON DELETE RESTRICT/i);
  assert.match(spatialRegistration, /authoring_request_id text NOT NULL UNIQUE/i);
  assert.match(spatialRegistration, /reviewed_hold/i);

  const polityPlaceFunctionAuthority = migrations[23].sql;
  assert.match(polityPlaceFunctionAuthority, /CREATE TABLE IF NOT EXISTS atlas_v2\.polity_place_functions/i);
  assert.match(polityPlaceFunctionAuthority, /CREATE TABLE IF NOT EXISTS atlas_v2\.polity_place_function_sources/i);
  assert.match(polityPlaceFunctionAuthority, /REFERENCES atlas_v2\.places\(id\) ON DELETE RESTRICT/i);
  assert.match(polityPlaceFunctionAuthority, /source_id uuid NOT NULL REFERENCES atlas_v2\.sources\(id\) ON DELETE RESTRICT/i);
  assert.match(polityPlaceFunctionAuthority, /UNIQUE NULLS NOT DISTINCT/i);
  assert.doesNotMatch(polityPlaceFunctionAuthority, /INSERT\s+INTO\s+atlas_v2\.(?:places|place_names|sources|place_sources)/i);

  const unit16Retirement = migrations[24].sql;
  assert.match(unit16Retirement, /DROP TRIGGER IF EXISTS authoring_manifest_runs_external_reference_sync/i);
  assert.match(unit16Retirement, /DROP FUNCTION IF EXISTS atlas_v2\.sync_human_authoring_external_references\(\)/i);

  const registrationQueueAuthority = migrations[25].sql;
  assert.match(registrationQueueAuthority, /CREATE TABLE IF NOT EXISTS atlas_v2\.person_registration_candidates/i);
  assert.match(registrationQueueAuthority, /person_id uuid REFERENCES atlas_v2\.persons\(id\) ON DELETE RESTRICT/i);
  assert.match(registrationQueueAuthority, /WHERE person_id IS NULL/i);

  const shahAbbasBinding = migrations[26].sql;
  assert.match(shahAbbasBinding, /gplist3-20260921-071/i);
  assert.match(shahAbbasBinding, /ba5b60c5-ac74-41ad-9158-aacfb77b7ac6/i);
  assert.match(shahAbbasBinding, /UPDATE atlas_v2\.person_registration_candidates/i);
  assert.match(shahAbbasBinding, /pn\.name = 'Abbas I'/i);

  const domainV2Replay = migrations[27].sql;
  assert.match(domainV2Replay, /PERSON_DOMAIN_V2_REPLAY_MIXED_LEGACY_AND_V2_STATE/);
  assert.match(domainV2Replay, /'science'/);
  assert.doesNotMatch(domainV2Replay, /UPDATE\s+atlas_v2\.persons/i);

  const userQueue07 = migrations[28].sql;
  assert.match(userQueue07, /USER-QUEUE07-20261006/);
  assert.match(userQueue07, /user-20261006-roxana/);
  assert.match(userQueue07, /user-20261006-damocles/);
  assert.match(userQueue07, /where atlas_v2\.person_registration_candidates\.person_id is null/i);
});

test('current clean schema baseline remains the measured pre-lifecycle Production shape', () => {
  assert.match(baseline, /manifest_schema text/);
  assert.match(baseline, /result_snapshot jsonb/);
  assert.match(baseline, /authoring_manifest_runs_manifest_schema_check/);
  assert.match(baseline, /authoring_manifest_runs_result_snapshot_check/);
  assert.match(baseline, /CONSTRAINT authoring_manifest_runs_person_id_fkey[\s\S]*?ON DELETE RESTRICT/i);
  assert.match(baseline, /CONSTRAINT authoring_manifest_runs_relationship_id_fkey[\s\S]*?ON DELETE RESTRICT/i);
  assert.doesNotMatch(baseline, /atlas-human-authoring\/v1/);
});


test('pre-Unit 8 external-reference writes remain replay-safe after canonical decision-state cutover', () => {
  const base = fs.readFileSync(path.join(root, 'db/migrations/20260821_person_external_references.sql'), 'utf8');
  const sync = fs.readFileSync(path.join(root, 'db/migrations/20260821_human_authoring_external_reference_sync.sql'), 'utf8');
  const decision = fs.readFileSync(path.join(root, 'db/migrations/20260930_external_reference_decision_state.sql'), 'utf8');
  assert.match(decision, /ALTER COLUMN review_state SET NOT NULL/i);
  for (const sql of [base, sync]) {
    const inserts=[...sql.matchAll(/INSERT INTO atlas_v2\.person_external_references\s*\(([^)]*)\)/gi)];
    assert.ok(inserts.length > 0);
    for (const match of inserts) {
      assert.match(match[1], /review_state/i);
      assert.match(match[1], /review_reason/i);
    }
  }
});
