import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { buildStage2P6ExecutionPackage, buildStage2P6LiteralExecutionPackage } from '../scripts/build-stage2-p6-execution-package.mjs';

const require = createRequire(import.meta.url);
const { boundaryDetail } = require('../server/atlas-p6-execution-plan-materializer.js');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(value, label) {
  assert.match(String(value || ''), UUID_RE, label);
}

test('P6 literal materializer closes the exact 45-target remainder behind the 9-target golden plan', () => {
  const coverage = buildStage2P6ExecutionPackage();
  const literal = buildStage2P6LiteralExecutionPackage();
  const operations = literal.plans.flatMap((plan) => plan.operations);
  assert.equal(coverage.coverage.golden_literal_targets, 9);
  assert.equal(coverage.coverage.remaining_targets, 45);
  assert.equal(literal.plans.length, 17);
  assert.equal(literal.result.compiled_activity_targets, 45);
  assert.equal(operations.length, 45);
  assert.equal(new Set(operations.map((row) => row.activity_id)).size, 45);
  assert.equal(9 + operations.length, 54);
  assert.equal(literal.result.production_mutation_authorized, false);
});

test('P6 literal execution operands contain UUIDs rather than runtime identity names/classes/keys', () => {
  const literal = buildStage2P6LiteralExecutionPackage();
  for (const plan of literal.plans) {
    assert.equal(plan.execution_rules.uuid_only_runtime_operands, true);
    assert.equal(plan.execution_rules.runtime_name_identity_class_and_source_key_resolution_forbidden, true);
    assert.equal(plan.execution_rules.reviewed_assertion_locator_required, true);
    const runtimeOperands = JSON.stringify({ operations: plan.operations, companion_assertions: plan.companion_assertions });
    assert.doesNotMatch(runtimeOperands, /identity_class/i);
    assert.doesNotMatch(runtimeOperands, /candidate_key/i);
    assert.doesNotMatch(runtimeOperands, /polity_label|person_name|polity_name/i);
    for (const op of plan.operations) {
      assertUuid(op.activity_id, `${op.case_id} activity`);
      if (op.type === 'rewrite_activity') {
        assertUuid(op.after.person_id, `${op.case_id} person`);
        assertUuid(op.after.polity_id, `${op.case_id} polity`);
        assertUuid(op.after.role_id, `${op.case_id} role`);
        assertUuid(op.after.period_basis_id, `${op.case_id} period`);
        if (op.after.relation_type_id != null) assertUuid(op.after.relation_type_id, `${op.case_id} relation`);
        for (const source of op.after.add_source_links) assertUuid(source.source_id, `${op.case_id} source`);
      }
      if (op.type === 'split_activity') {
        assert.equal(op.fragments.filter((row) => row.survivor).length, 1, `${op.case_id} survivor`);
        for (const fragment of op.fragments) {
          assertUuid(fragment.activity_id, `${op.case_id} fragment activity`);
          assertUuid(fragment.person_id, `${op.case_id} fragment person`);
          assertUuid(fragment.polity_id, `${op.case_id} fragment polity`);
          assertUuid(fragment.role_id, `${op.case_id} fragment role`);
          assertUuid(fragment.period_basis_id, `${op.case_id} fragment period`);
          if (!fragment.survivor) {
            assertUuid(fragment.relation_type_id, `${op.case_id} new fragment relation`);
            assert.equal(fragment.legacy_source_key, null, `${op.case_id} new fragment cannot fabricate legacy provenance`);
          }
          for (const source of fragment.add_source_links) assertUuid(source.source_id, `${op.case_id} fragment source`);
        }
      }
      if (op.type === 'retire_activity') {
        assert.ok(op.replacement_activity_ids.length > 0, `${op.case_id} reviewed survivor required`);
        op.replacement_activity_ids.forEach((id) => assertUuid(id, `${op.case_id} replacement`));
        assert.equal(op.silent_source_drop_forbidden, true);
        assert.match(op.source_transfer_policy, /COPY_ALL_RETIRED_NORMALIZED_SOURCE_LINKS/);
      }
    }
    for (const assertion of plan.companion_assertions) {
      assertUuid(assertion.assertion_id, 'assertion id');
      assertUuid(assertion.subject_polity_id, 'assertion subject');
      assertUuid(assertion.object_polity_id, 'assertion object');
      assertUuid(assertion.relation_type_id, 'assertion relation');
      assert.ok(assertion.source_links.length > 0, `${assertion.relation_decision_id} source links`);
      for (const source of assertion.source_links) {
        assertUuid(source.source_id, 'assertion source');
        assert.ok(String(source.source_locator_key || '').trim().length > 0, `${assertion.relation_decision_id} reviewed locator`);
      }
    }
  }
});

test('reviewed temporal boundaries retain explicit subyear precision without inventing it', () => {
  assert.deepEqual(boundaryDetail({ year: 1867, month: 7, day: 1, granularity: 'day', certainty: 'exact', calendar: 'gregorian' }, 1867), {
    year: 1867,
    month: 7,
    day: 1,
    granularity: 'day',
    certainty: 'exact',
    calendar: 'gregorian'
  });
  assert.deepEqual(boundaryDetail({ year: 191, month: null, day: null, granularity: 'year', certainty: 'exact', calendar: 'unspecified_historical' }, 191), {
    year: 191,
    month: null,
    day: null,
    granularity: 'year',
    certainty: 'exact',
    calendar: 'unspecified_historical'
  });
});

test('reviewed Ma Teng and Lu Bu adapters are literalized without fabricated subyear precision', () => {
  const literal = buildStage2P6LiteralExecutionPackage();
  const operations = literal.plans.flatMap((plan) => plan.operations);
  const maTeng = operations.find((row) => row.case_id === 'p6b10_ma_teng_multiphase_scaffold');
  const luBu = operations.find((row) => row.case_id === 'p6b11_lu_bu_five_phase_scaffold');
  assert.equal(maTeng?.type, 'split_activity');
  assert.equal(maTeng.fragments.length, 2);
  assert.equal(luBu?.type, 'split_activity');
  assert.equal(luBu.fragments.length, 4);
  const central = maTeng.fragments.find((row) => row.activity_start === 208);
  assert.equal(central.activity_id, '7fd8007d-18dd-5953-b9fb-2f94b50a384a');
  assert.equal(central.role_id, 'c48b2b1b-ff24-54ec-ba48-d2e00db0872d');
  for (const fragment of [...maTeng.fragments, ...luBu.fragments]) {
    assert.equal(fragment.activity_start_detail?.month ?? null, null);
    assert.equal(fragment.activity_start_detail?.day ?? null, null);
    assert.equal(fragment.activity_end_detail?.month ?? null, null);
    assert.equal(fragment.activity_end_detail?.day ?? null, null);
  }
});
