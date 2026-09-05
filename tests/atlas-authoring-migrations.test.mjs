import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  AUTHORING_MIGRATION_PATHS,
  readAuthoringMigrations
} = require('../server/atlas-authoring-migrations.js');

const root = path.resolve(new URL('..', import.meta.url).pathname);
const baseline = fs.readFileSync(path.join(root, 'db/schema/atlas_v2.current.sql'), 'utf8');

test('authoring migration registry is ordered and contains durable lifecycle-safe Person migrations', () => {
  assert.equal(AUTHORING_MIGRATION_PATHS.length, 9);
  assert.match(AUTHORING_MIGRATION_PATHS[0], /20260811_authoring_manifest_runs\.sql$/);
  assert.match(AUTHORING_MIGRATION_PATHS[1], /20260811_authoring_result_snapshot\.sql$/);
  assert.match(AUTHORING_MIGRATION_PATHS[2], /20260814_authoring_ledger_live_reference_lifecycle\.sql$/);
  assert.match(AUTHORING_MIGRATION_PATHS[3], /20260815_human_authoring_manifest_schema\.sql$/);
  assert.match(AUTHORING_MIGRATION_PATHS[4], /20260821_person_external_references\.sql$/);
  assert.match(AUTHORING_MIGRATION_PATHS[5], /20260821_human_authoring_external_reference_sync\.sql$/);
  assert.match(AUTHORING_MIGRATION_PATHS[6], /20260902_ongoing_activity_terms\.sql$/);
  assert.match(AUTHORING_MIGRATION_PATHS[7], /20260904_person_representative_domains\.sql$/);
  assert.match(AUTHORING_MIGRATION_PATHS[8], /20260905_person_representative_domain_standard_v1\.sql$/);
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

  const personReferences = migrations[4].sql;
  assert.match(personReferences, /CREATE TABLE IF NOT EXISTS atlas_v2\.person_external_references/i);
  assert.match(personReferences, /CREATE TABLE IF NOT EXISTS atlas_v2\.person_profile_mutation_audits/i);
  assert.match(personReferences, /person_id uuid NOT NULL REFERENCES atlas_v2\.persons\(id\) ON DELETE RESTRICT/i);

  const humanAuthoringReferenceSync = migrations[5].sql;
  assert.match(humanAuthoringReferenceSync, /sync_human_authoring_external_references/i);
  assert.match(humanAuthoringReferenceSync, /person_external_references/i);
  assert.match(humanAuthoringReferenceSync, /checked_at/i);

  const representativeDomain = migrations[7].sql;
  assert.match(representativeDomain, /ADD COLUMN IF NOT EXISTS representative_domain text/i);
  assert.match(representativeDomain, /persons_representative_domain_check/i);
  assert.match(representativeDomain, /set_person_representative_domain/i);
  assert.doesNotMatch(representativeDomain, /CREATE TABLE\s+atlas_v2\.person_representative_domains/i);

  const representativeDomainStandard = migrations[8].sql;
  assert.match(representativeDomainStandard, /WHEN 'ruler' THEN 'governance'/i);
  assert.match(representativeDomainStandard, /WHEN 'science' THEN 'knowledge'/i);
  assert.match(representativeDomainStandard, /DROP CONSTRAINT IF EXISTS persons_representative_domain_check/i);
  for (const domain of ['governance','military','knowledge','technology','commerce','culture','religion','exploration']) {
    assert.match(representativeDomainStandard, new RegExp(`'${domain}'`));
  }
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
