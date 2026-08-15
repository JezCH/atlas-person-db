import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const readiness = require('../server/atlas-person-merge-reference-readiness.js');
const interlock = require('../server/atlas-person-merge-interlock.js');
const mergeSource = fs.readFileSync(new URL('../server/atlas-person-merge-service.js', import.meta.url), 'utf8');
const readinessSource = fs.readFileSync(new URL('../server/atlas-person-merge-reference-readiness.js', import.meta.url), 'utf8');

test('P10 Person merge reference policy is explicit and includes every reviewed live Person pointer', () => {
  assert.equal(readiness.PERSON_REFERENCE_POLICY_VERSION, 'p10-person-reference-surface/v1');
  assert.deepEqual(readiness.EXPECTED_PERSON_FKS.map((row) => [row.key, row.delete_action]), [
    ['atlas_v2.authoring_manifest_runs.person_id', 'SET NULL'],
    ['atlas_v2.person_descriptions.person_id', 'CASCADE'],
    ['atlas_v2.person_event_participations.person_id', 'RESTRICT'],
    ['atlas_v2.person_names.person_id', 'CASCADE'],
    ['atlas_v2.person_people_affiliations.person_id', 'RESTRICT'],
    ['atlas_v2.person_politics_v2.person_id', 'RESTRICT'],
    ['atlas_v2.person_sources.person_id', 'CASCADE']
  ]);
  assert.deepEqual(readiness.EXPECTED_RELATIONSHIP_FKS.map((row) => [row.key, row.delete_action]), [
    ['atlas_v2.authoring_manifest_runs.relationship_id', 'SET NULL'],
    ['atlas_v2.chronology_claims.person_politics_id', 'CASCADE'],
    ['atlas_v2.person_politics_sources.person_politics_id', 'CASCADE'],
    ['atlas_v2.relationship_descriptions.person_politics_id', 'CASCADE']
  ]);
});

test('P10-B base snapshots and optional P10-C requirement snapshots are both explicit', () => {
  assert.deepEqual(readiness.EXPECTED_NON_FK_PERSON_UUID_COLUMNS, [
    'atlas_v2.person_duplicate_candidates.person_high_id',
    'atlas_v2.person_duplicate_candidates.person_low_id',
    'atlas_v2.person_duplicate_reviews.person_high_id',
    'atlas_v2.person_duplicate_reviews.person_low_id',
    'atlas_v2.person_merge_audits.source_person_id',
    'atlas_v2.person_merge_audits.survivor_person_id'
  ]);
  assert.deepEqual(readiness.P10_REVALIDATION_REQUIREMENT_PERSON_UUID_COLUMNS, [
    'atlas_v2.person_duplicate_revalidation_requirements.person_high_id',
    'atlas_v2.person_duplicate_revalidation_requirements.person_low_id'
  ]);
  assert.deepEqual(readiness.EXPECTED_NON_FK_RELATIONSHIP_UUID_COLUMNS, []);
  assert.match(readinessSource, /requirement_ledger_present/);
  assert.match(readinessSource, /expected_non_fk_person_uuid_columns/);
  assert.match(readinessSource, /PERSON_UUID_REFERENCE_UNREVIEWED/);
  assert.match(readinessSource, /RELATIONSHIP_UUID_REFERENCE_UNREVIEWED/);
  assert.match(readinessSource, /MERGE_SURFACE_TRIGGER_UNREVIEWED/);
  assert.match(readinessSource, /P10_PERSON_MERGE_REFERENCE_SURFACE_DRIFT/);
});

test('dormant merge executor requires schema-derived readiness and locks full semantic-key v2 Activity state', () => {
  assert.match(mergeSource, /assertPersonMergeReferenceReadiness/);
  assert.match(mergeSource, /const referenceReadiness = await ensureMergeSchema/);
  for (const token of [
    'relation_type_id', 'period_basis_id',
    'activity_start_month', 'activity_start_day', 'activity_start_granularity', 'activity_start_calendar', 'activity_start_certainty',
    'activity_end_month', 'activity_end_day', 'activity_end_granularity', 'activity_end_calendar', 'activity_end_certainty'
  ]) assert.match(mergeSource, new RegExp(token));
  assert.match(mergeSource, /activities: liveState\.relationships/);
  assert.match(mergeSource, /authoring_person_pointers_cleared_by_lifecycle_fk/);
});

test('People affiliation and Event participation assertions are remapped without deleting assertion or provenance rows', () => {
  assert.match(mergeSource, /update atlas_v2\.person_people_affiliations set person_id=\$2 where person_id=\$1 returning id/);
  assert.match(mergeSource, /update atlas_v2\.person_event_participations set person_id=\$2 where person_id=\$1 returning id/);
  assert.match(mergeSource, /people affiliation count changed during person merge/);
  assert.match(mergeSource, /people affiliation provenance count changed during person merge/);
  assert.match(mergeSource, /event participation count changed during person merge/);
  assert.match(mergeSource, /event participation provenance count changed during person merge/);
  assert.match(mergeSource, /people_affiliations_moved/);
  assert.match(mergeSource, /event_participations_moved/);
});

test('P10-C still does not unlock physical Person merge', () => {
  const state = interlock.personMergeExecutionState();
  assert.equal(state.person_merge_lifecycle_version, 'pre-p10-blocked');
  assert.equal(state.required_person_merge_lifecycle_version, 'p10-v2-revalidated');
  assert.equal(state.allowed, false);
});
