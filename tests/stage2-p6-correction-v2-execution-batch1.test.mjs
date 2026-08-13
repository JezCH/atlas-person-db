import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const read = (rel) => JSON.parse(fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const plan = read('stage2/execution/p6-correction-v2-execution-batch1.v1.json');
const prebinding = read('stage2/integration/p6-correction-v2-prebinding-batch1.v1.json');
const allocation = read('stage2/execution/p6-execution-identity-allocations.v1.json');
const sourcePackage = read('stage2/authoring/p5-polity-relation-sources.v1.json');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const RULES = '7ca4de8f-01d4-542c-acc1-a06848c6742c';
const SERVES = '0fc4827f-8543-52f7-9e9a-3173b0c698a7';
const NOMINAL = '375da950-65bc-5b81-a338-6c705f515120';
const VASSAL = 'b4982965-848a-5a2b-b690-daba1d092d02';

function beforeObject(row) {
  const fields = prebinding.before_tuple_fields;
  return Object.fromEntries(fields.map((field, index) => [field, row[index]]));
}

test('Batch1 plan binds all nine prebinding cases without runtime semantic resolution', () => {
  assert.equal(plan.schema, 'atlas-stage2-correction-v2-execution-plan/v1');
  assert.equal(plan.status, 'LITERAL_OPERANDS_COMPLETE_LIVE_BEFORE_SNAPSHOT_REQUIRED');
  assert.equal(plan.operations.length, 9);
  assert.equal(plan.result.rewrite_activity_count, 6);
  assert.equal(plan.result.split_activity_count, 3);
  assert.equal(plan.execution_rules.identity_class_name_relation_code_or_source_key_runtime_resolution_forbidden, true);
  assert.equal(plan.result.runtime_identity_class_resolution_count, 0);
  assert.equal(plan.result.runtime_relation_code_resolution_count, 0);
  assert.equal(plan.result.runtime_source_key_resolution_count, 0);
  assert.equal(plan.execution_rules.production_executable, false);
  assert.equal(plan.execution_rules.production_mutation_authorized, false);

  const expectedCaseIds = prebinding.cases.map((row) => row.id).sort();
  const actualCaseIds = plan.operations.map((row) => row.case_id).sort();
  assert.deepEqual(actualCaseIds, expectedCaseIds);
});

test('every branch Baseline A tuple exactly matches its reviewed prebinding tuple', () => {
  const prebindingById = new Map(prebinding.cases.map((row) => [row.id, row]));
  for (const operation of plan.operations) {
    const reviewed = prebindingById.get(operation.case_id);
    assert.ok(reviewed, operation.case_id);
    assert.equal(operation.activity_id, reviewed.activity_id);
    assert.deepEqual(operation.baseline_before, beforeObject(reviewed.expected_before), `${operation.case_id} before tuple drift`);
    assert.equal(operation.live_before, 'SYNTHESIZE_FROM_EXACT_SAME_SHA_SNAPSHOT_BEFORE_DRY_RUN');
  }
});

test('all new Activity UUIDs are literal, unique and used exactly once by split fragments', () => {
  assert.equal(plan.new_activity_uuid_allocations.length, 3);
  const ids = plan.new_activity_uuid_allocations.map((row) => row.activity_uuid);
  ids.forEach((id) => assert.match(id, UUID));
  assert.equal(new Set(ids).size, 3);

  const used = plan.operations
    .filter((row) => row.type === 'split_activity')
    .flatMap((row) => row.fragments.filter((fragment) => !fragment.survivor).map((fragment) => fragment.activity_id));
  assert.deepEqual([...used].sort(), [...ids].sort());
  for (const operation of plan.operations.filter((row) => row.type === 'split_activity')) {
    assert.equal(operation.fragments.filter((fragment) => fragment.survivor).length, 1);
    assert.equal(operation.fragments.find((fragment) => fragment.survivor).activity_id, operation.activity_id);
    assert.equal(operation.fragments.find((fragment) => !fragment.survivor).legacy_source_key, null);
    assert.match(operation.source_copy_policy, /^COPY_ALL_EXISTING_NORMALIZED_ACTIVITY_SOURCE_LINKS_AND_LOCATORS_TO_ALL_FRAGMENTS$/);
  }
  assert.equal(plan.result.fake_legacy_source_key_count, 0);
});

test('all Person relation operands are exact relation UUIDs and reviewed target Polity UUIDs', () => {
  const allocatedPolities = new Set(allocation.polities.map((row) => row.polity_uuid));
  let relationBindingCount = 0;
  for (const operation of plan.operations) {
    const rows = operation.type === 'split_activity' ? operation.fragments : [operation.after];
    for (const row of rows) {
      relationBindingCount += 1;
      assert.ok([RULES, SERVES].includes(row.relation_type_id));
      assert.match(row.polity_id, UUID);
      if (row.relation_type_id === RULES) assert.ok(allocatedPolities.has(row.polity_id), `${operation.case_id} rules target must be a reviewed allocated Polity`);
      assert.equal(row.activity_start_detail, null);
      assert.equal(row.activity_end_detail, null);
    }
  }
  assert.equal(relationBindingCount, 12);
  assert.equal(plan.result.person_relation_uuid_bindings, 12);
});

test('six Polity relation assertions use literal subject/object/relation/source/link UUIDs and reviewed locators', () => {
  assert.equal(plan.polity_relation_assertions.length, 6);
  const allocatedPolities = new Set(allocation.polities.map((row) => row.polity_uuid));
  const allocatedSources = new Set(allocation.sources.map((row) => row.source_uuid));
  const sourceLocatorPairs = new Set(sourcePackage.links.map((link) => `${link.source_candidate_key}|${link.locator_key}`));
  const sourceUuidByCandidate = new Map(allocation.sources.map((row) => [row.candidate_key, row.source_uuid]));
  const candidateBySourceUuid = new Map([...sourceUuidByCandidate].map(([key, value]) => [value, key]));
  const relationIds = new Set();
  const linkIds = new Set();

  for (const relation of plan.polity_relation_assertions) {
    assert.match(relation.id, UUID);
    assert.equal(relationIds.has(relation.id), false);
    relationIds.add(relation.id);
    assert.ok(allocatedPolities.has(relation.subject_polity_id));
    assert.match(relation.object_polity_id, UUID);
    assert.ok([NOMINAL, VASSAL].includes(relation.relation_type_id));
    assert.equal(relation.valid_from_granularity, 'year');
    assert.equal(relation.valid_to_granularity, 'year');
    assert.equal(relation.valid_from_certainty, 'exact');
    assert.equal(relation.valid_to_certainty, 'exact');
    assert.equal(relation.valid_from_calendar, 'unspecified_historical');
    assert.equal(relation.valid_to_calendar, 'unspecified_historical');
    assert.equal(relation.confidence, 'unknown');
    assert.equal(relation.source_links.length, 1);
    const link = relation.source_links[0];
    assert.match(link.id, UUID);
    assert.equal(linkIds.has(link.id), false);
    linkIds.add(link.id);
    assert.ok(allocatedSources.has(link.source_id));
    const candidate = candidateBySourceUuid.get(link.source_id);
    assert.ok(sourceLocatorPairs.has(`${candidate}|${link.source_locator_key}`), `${relation.decision_id} source locator must be reviewed`);
  }
  assert.equal(relationIds.size, 6);
  assert.equal(linkIds.size, 6);
});

test('Ying Bu Polity relation correctly starts before the coarser Person Activity without forcing Person chronology', () => {
  const ying = plan.operations.find((row) => row.case_id === 'p6b1_ying_bu_relink');
  const relation = plan.polity_relation_assertions.find((row) => row.decision_id === 'ying_bu_huainan_vassal_relation');
  assert.equal(ying.baseline_before.activity_start, -202);
  assert.equal(ying.after.activity_start, -202);
  assert.equal(relation.valid_from_year, -203);
  assert.equal(relation.valid_to_year, -196);
  assert.equal(relation.relation_type_id, VASSAL);
});

test('final executable manifest remains blocked on exact same-SHA live row and source-link snapshot', () => {
  assert.equal(plan.next_gate.required, 'SAME_SHA_EXACT_LIVE_BEFORE_AND_NORMALIZED_ACTIVITY_SOURCE_LINK_SNAPSHOT_AFTER_P5_SCHEMA_AND_ENTITY_AUTHORING');
  assert.match(plan.next_gate.then, /SYNTHESIZE_FINAL_CORRECTION_V2_MANIFEST/);
  assert.equal(plan.execution_rules.exact_live_before_snapshot_after_p5_schema_and_entity_authoring_required, true);
  assert.equal(plan.execution_rules.same_sha_snapshot_then_manifest_synthesis_required, true);
  assert.equal(plan.execution_rules.silent_source_drop_forbidden, true);
  assert.equal(plan.execution_rules.territory_geometry_mutation_forbidden, true);
  assert.equal(plan.execution_rules.physical_person_merge_forbidden, true);
  assert.equal(plan.result.production_executable, false);
  assert.equal(plan.result.production_mutation_authorized, false);
});
