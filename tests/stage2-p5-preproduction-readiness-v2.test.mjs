import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const read = (rel) => JSON.parse(fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const readiness = read('stage2/integration/p5-preproduction-schema-readiness.v2.json');
const closure = read('stage2/integration/p6-effective-prebinding-closure.v1.json');
const amendment = read('stage2/integration/baseline-a-politic-resolution-amendments.v1.json');
const allocation = read('stage2/execution/p6-execution-identity-allocations.v1.json');
const authoring = read('stage2/execution/p5-reviewed-identity-source-authoring.v1.json');
const release = read('stage2/releases/p5-additive-schema-release.v1.json');
const sourcePackage = read('stage2/authoring/p5-polity-relation-sources.v1.json');
const sourceSupplement = read('stage2/authoring/p5-source-authoring-supplement.v1.json');

const expectedDigest = 'sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const expectedSha = 'ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';

test('P5 readiness v2 is current execution authority while v1 remains historical evidence', () => {
  assert.equal(readiness.schema, 'atlas-stage2-p5-preproduction-schema-readiness/v2');
  assert.equal(readiness.status, 'P5_CURRENT_EXECUTION_READINESS_BRANCH_ONLY_NO_PRODUCTION_MUTATION');
  assert.equal(readiness.supersedes_for_current_execution, 'stage2/integration/p5-preproduction-schema-readiness.v1.json');
  assert.equal(readiness.historical_v1_preserved_as_audit_evidence, true);
  assert.equal(readiness.baseline.deployment_sha, expectedSha);
  assert.equal(readiness.baseline.baseline_digest, expectedDigest);
  assert.deepEqual([readiness.baseline.activities, readiness.baseline.persons, readiness.baseline.polities, readiness.baseline.sources], [338, 302, 212, 20]);
});

test('current P5 frontier is exactly the corrected 17 Polity / 54 Activity authority', () => {
  assert.equal(readiness.current_frontier.effective_new_polity_targets, 17);
  assert.equal(readiness.current_frontier.literal_new_polity_uuid_assignments, allocation.polities.length);
  assert.equal(readiness.current_frontier.literal_preferred_polity_name_uuid_assignments, allocation.polities.length);
  assert.equal(readiness.current_frontier.literal_relation_source_uuid_assignments, allocation.sources.length);
  assert.equal(readiness.current_frontier.supplemental_reviewed_source_uuid_assignments, sourceSupplement.sources.length);
  assert.equal(readiness.current_frontier.total_reviewed_new_source_uuid_assignments, allocation.sources.length + sourceSupplement.sources.length);
  assert.equal(readiness.current_frontier.effective_correction_v2_activities, closure.closure.effective_correction_v2_activity_count);
  assert.equal(readiness.current_frontier.completed_prebinding_activities, closure.closure.completed_effective_prebinding_activity_count);
  assert.equal(readiness.current_frontier.remaining_prebinding_activities, closure.closure.remaining_effective_prebinding_activity_count);
  assert.equal(readiness.current_frontier.superseded_overgranular_polity_targets, amendment.superseded_new_polity_identity_classes.length);
  assert.equal(readiness.current_frontier.reviewed_polity_relation_assertions, 10);
  assert.equal(readiness.current_frontier.relation_source_candidates, sourcePackage.sources.length);
  assert.equal(readiness.current_frontier.relation_source_links, sourcePackage.links.length);
  assert.equal(readiness.current_frontier.mandatory_people_event_governance_migrations_for_person_corrections, 0);
  assert.equal(readiness.current_frontier.physical_person_merges, 0);
});

test('six-component schema release includes native Activity provenance compatibility without data mutation', () => {
  assert.equal(readiness.schema_release.release_id, release.release_id);
  assert.equal(readiness.schema_release.component_count, 6);
  assert.deepEqual(readiness.schema_release.components, release.components.map((row) => row.id));
  assert.equal(release.components.at(-1).id, 'native_activity_provenance');
  assert.equal(release.safety.non_destructive_schema_only, true);
  assert.equal(release.safety.additive_objects_and_backward_compatible_relaxations_only, true);
  assert.equal(release.safety.legacy_source_key_nullability_relaxation, true);
  assert.equal(release.safety.fake_legacy_source_key_for_stage2_native_activity_forbidden, true);
  assert.equal(release.safety.person_activity_data_mutation, false);
  assert.equal(readiness.schema_release.native_activity_legacy_source_key_nullable, true);
  assert.equal(readiness.schema_release.fake_legacy_source_key_for_stage2_native_activity_forbidden, true);
  assert.equal(readiness.schema_release.manual_production_transport_executed, false);
});

test('literal entity and Source authoring exactly matches base plus supplemental allocated rows', () => {
  assert.equal(authoring.polities.length, 17);
  assert.equal(authoring.sources.length, sourcePackage.sources.length + sourceSupplement.sources.length);
  assert.equal(readiness.exact_entity_source_authoring.new_polity_rows, authoring.polities.length);
  assert.equal(readiness.exact_entity_source_authoring.new_preferred_polity_name_rows, authoring.polities.length);
  assert.equal(readiness.exact_entity_source_authoring.new_bibliographic_source_rows, authoring.sources.length);
  assert.equal(readiness.exact_entity_source_authoring.base_relation_source_rows, sourcePackage.sources.length);
  assert.equal(readiness.exact_entity_source_authoring.supplemental_reviewed_source_rows, sourceSupplement.sources.length);
  assert.equal(readiness.exact_entity_source_authoring.literal_uuid_only, true);
  assert.equal(readiness.exact_entity_source_authoring.runtime_name_identity_class_or_url_resolution_forbidden, true);
  assert.equal(readiness.exact_entity_source_authoring.activity_rows_mutated, 0);
  assert.equal(readiness.exact_entity_source_authoring.fake_source_hash_or_bytes_rows, 0);

  const allocatedPolities = new Set(allocation.polities.map((row) => row.polity_uuid));
  const allocatedNames = new Set(allocation.polities.map((row) => row.preferred_name_uuid));
  const baseSourceIds = new Set(allocation.sources.map((row) => row.source_uuid));
  const supplementalSourceIds = new Set(sourceSupplement.sources.map((row) => row.source_uuid));
  assert.deepEqual(new Set(authoring.polities.map((row) => row.polity.id)), allocatedPolities);
  assert.deepEqual(new Set(authoring.polities.map((row) => row.preferred_name.id)), allocatedNames);
  const authoredSourceIds = new Set(authoring.sources.map((row) => row.row.id));
  assert.equal(authoredSourceIds.size, baseSourceIds.size + supplementalSourceIds.size);
  for (const id of baseSourceIds) assert.equal(authoredSourceIds.has(id), true);
  for (const id of supplementalSourceIds) assert.equal(authoredSourceIds.has(id), true);
});

test('Correction v2 execution boundary remains branch-only and exact-live-before-state dependent', () => {
  assert.equal(readiness.correction_v2_execution_boundary.prebinding_complete, true);
  assert.equal(readiness.correction_v2_execution_boundary.literal_new_entity_uuids_complete, true);
  assert.equal(readiness.correction_v2_execution_boundary.new_activity_fragment_uuids_must_be_literal_in_operation_manifests, true);
  assert.equal(readiness.correction_v2_execution_boundary.exact_live_before_state_required_after_p5_authoring, true);
  assert.equal(readiness.correction_v2_execution_boundary.same_sha_live_snapshot_then_manifest_synthesis_required, true);
  assert.equal(readiness.correction_v2_execution_boundary.name_only_binding_forbidden, true);
  assert.equal(readiness.correction_v2_execution_boundary.source_key_as_identity_forbidden, true);
  assert.equal(readiness.correction_v2_execution_boundary.production_execution_manifest_complete, false);
  assert.equal(readiness.safety.production_mutation_authorized, false);
  assert.equal(readiness.completion_boundary.atlas_rq_0215_remains_pending_until_production_apply, true);
  assert.equal(readiness.completion_boundary.atlas_rq_0216_remains_pending_until_correction_v2_execution_package_and_engine_are_complete, true);
});
