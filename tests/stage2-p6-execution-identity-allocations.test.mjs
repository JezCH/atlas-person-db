import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const readJson = (rel) => JSON.parse(fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const allocation = readJson('stage2/execution/p6-execution-identity-allocations.v1.json');
const amendment = readJson('stage2/integration/baseline-a-politic-resolution-amendments.v1.json');
const closure = readJson('stage2/integration/p6-effective-prebinding-closure.v1.json');
const p5Batches = [
  readJson('stage2/authoring/p5-polity-authoring-batch1-late-han.v1.json'),
  readJson('stage2/authoring/p5-polity-authoring-batch2-reviewed-polities.v1.json'),
  readJson('stage2/authoring/p5-polity-authoring-batch3-community-boundaries.v1.json')
];
const sourcePackage = readJson('stage2/authoring/p5-polity-relation-sources.v1.json');

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function targetMetadata(target) {
  return {
    label: target.proposed_catalog_label,
    locale: target.locale,
    semantic_name_kind: target.semantic_name_kind,
    historical_name_claim: target.historical_name_claim
  };
}

test('execution identity allocation is pinned to exact Baseline A and closed P6 frontier', () => {
  assert.equal(allocation.schema, 'atlas-stage2-p6-execution-identity-allocations/v1');
  assert.equal(allocation.status, 'REVIEWED_LITERAL_UUID_ALLOCATION_BRANCH_ONLY_NO_PRODUCTION_MUTATION');
  assert.equal(allocation.baseline.deployment_sha, closure.baseline.deployment_sha);
  assert.equal(allocation.baseline.baseline_digest, closure.baseline.baseline_digest);
  assert.equal(closure.closure.completed_effective_prebinding_activity_count, 54);
  assert.equal(closure.closure.remaining_effective_prebinding_activity_count, 0);
  assert.equal(allocation.rules.production_mutation_authorized, false);
  assert.equal(allocation.result.production_mutation_authorized, false);
});

test('exactly the effective 17 new Polities receive literal UUIDs and superseded micro-targets receive none', () => {
  const legacyTargets = p5Batches.flatMap((batch) => batch.targets);
  const superseded = new Set(amendment.superseded_new_polity_identity_classes);
  const replacements = amendment.replacement_new_polity_targets;
  const activeTargets = [
    ...legacyTargets.filter((target) => !superseded.has(target.identity_class)),
    ...replacements
  ];
  assert.equal(activeTargets.length, 17);

  const expected = new Map(activeTargets.map((target) => [target.identity_class, target]));
  const allocated = new Map(allocation.polities.map((target) => [target.identity_class, target]));
  assert.equal(allocated.size, 17);
  assert.deepEqual([...allocated.keys()].sort(), [...expected.keys()].sort());

  for (const identityClass of superseded) assert.equal(allocated.has(identityClass), false);
  for (const [identityClass, row] of allocated) {
    assert.match(row.polity_uuid, UUID_V4, `${identityClass} polity UUID must be literal UUIDv4`);
    assert.match(row.preferred_name_uuid, UUID_V4, `${identityClass} name UUID must be literal UUIDv4`);
    assert.match(row.canonical_key, /^stage2:[a-z0-9-]+$/);
    assert.deepEqual(
      { label: row.label, locale: row.locale, semantic_name_kind: row.semantic_name_kind, historical_name_claim: row.historical_name_claim },
      targetMetadata(expected.get(identityClass)),
      `${identityClass} authoring metadata drifted from reviewed target`
    );
  }
});

test('all nine reviewed bibliographic Source candidates receive UUIDs without URL/title identity binding', () => {
  const expectedKeys = sourcePackage.sources.map((source) => source.candidate_key).sort();
  const actualKeys = allocation.sources.map((source) => source.candidate_key).sort();
  assert.equal(sourcePackage.result.new_source_candidates, 9);
  assert.equal(allocation.sources.length, 9);
  assert.deepEqual(actualKeys, expectedKeys);
  for (const row of allocation.sources) assert.match(row.source_uuid, UUID_V4);
  assert.equal(allocation.rules.source_candidate_key_is_metadata_not_identity, true);
  assert.equal(allocation.rules.canonical_url_is_metadata_not_identity, true);
  assert.equal(allocation.rules.runtime_name_or_identity_class_resolution_forbidden, true);
});

test('every allocated database identity is globally unique inside this execution allocation layer', () => {
  const ids = [
    ...allocation.polities.flatMap((row) => [row.polity_uuid, row.preferred_name_uuid]),
    ...allocation.sources.map((row) => row.source_uuid)
  ];
  assert.equal(ids.length, 43);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(allocation.result.effective_new_polity_uuid_count, 17);
  assert.equal(allocation.result.preferred_polity_name_uuid_count, 17);
  assert.equal(allocation.result.new_bibliographic_source_uuid_count, 9);
  assert.equal(allocation.result.superseded_polity_uuid_allocations, 0);
});

test('new Activity fragment UUID allocation remains explicitly deferred to the operation-manifest layer', () => {
  assert.equal(allocation.rules.new_activity_fragment_uuids_are_allocated_in_the_operation_manifest_layer, true);
  assert.equal(allocation.result.new_activity_fragment_uuid_count, 0);
  assert.equal(allocation.rules.territory_geometry_mutation_forbidden, true);
});
