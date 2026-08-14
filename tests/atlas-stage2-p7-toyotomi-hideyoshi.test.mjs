import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const polity = read('stage2/authoring/p7-toyotomi-hideyoshi-pre1590-polity.v1.json');
const governance = read('stage2/authoring/p7-toyotomi-hideyoshi-governance-context.v1.json');
const sources = read('stage2/authoring/p7-toyotomi-hideyoshi-sources.v1.json');
const split = read('stage2/execution/p7-toyotomi-hideyoshi-authority-split-execution.v1.json');
const retire = read('stage2/execution/p7-toyotomi-hideyoshi-regime-retire-execution.v1.json');

test('Toyotomi execution package preserves reviewed 1590 uncertainty without inventing a date', () => {
  assert.equal(polity.polities[0].row.id, '0a36b422-122a-5957-8ae8-99ad2aa5cc2b');
  assert.equal(polity.polities[0].names[0].semantic_name_kind, 'editorial_catalog_label');
  assert.equal(polity.result.historical_name_claim, false);
  assert.equal(governance.contexts[0].row.governance_type, 'governing_regime');
  assert.equal(governance.contexts[0].row.id, '679fcf78-44cd-5148-8271-78e5456083a2');
  assert.equal(sources.sources.length, 1);

  assert.equal(split.operations.length, 1);
  assert.equal(split.operations[0].type, 'split_activity');
  const [pre, post] = split.operations[0].fragments;
  assert.equal(pre.survivor, false);
  assert.equal(pre.activity_id, '6293857f-8e4d-5224-8434-900467b9dc74');
  assert.equal(pre.polity_id, '0a36b422-122a-5957-8ae8-99ad2aa5cc2b');
  assert.equal(pre.relation_type_id, '7ca4de8f-01d4-542c-acc1-a06848c6742c');
  assert.equal(pre.legacy_source_key, null);
  assert.deepEqual(pre.activity_end_detail, {year:1590,month:null,day:null,granularity:'year',certainty:'uncertain',calendar:'gregorian'});

  assert.equal(post.survivor, true);
  assert.equal(post.activity_id, '7bd5741a-6b37-5b33-9512-40741e01b179');
  assert.equal(post.polity_id, 'e029b047-544a-52c7-8897-4e494ac72af4');
  assert.equal(post.relation_type_id, '67a57b37-1853-5f2a-b7ab-e6b2d32b56b6');
  assert.deepEqual(post.activity_start_detail, {year:1590,month:null,day:null,granularity:'year',certainty:'uncertain',calendar:'gregorian'});
  assert.equal(split.execution_rules.subyear_1590_boundary_is_unknown_and_must_not_be_fabricated, true);

  assert.equal(split.stage2_assertions.length, 1);
  assert.equal(split.stage2_assertions[0].type, 'assert_governance_period');
  assert.equal(retire.operations[0].type, 'retire_activity');
  assert.deepEqual(new Set(retire.operations[0].replacement_activity_ids), new Set([pre.activity_id, post.activity_id]));
  assert.equal(split.result.subyear_boundary_fabricated, false);
  assert.equal(split.result.production_mutation_authorized, false);
  assert.equal(retire.result.production_mutation_authorized, false);
});
