import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BASELINE_A_MARKER,
  BASELINE_A_MODE,
  INTAKE_SCHEMA,
  calculateBaselineDigest,
  validateBaselineA,
  buildBaselineAIntake
} from '../scripts/stage2-baseline-a-intake.mjs';

function row(overrides = {}) {
  return {
    activity_id: '00000000-0000-4000-8000-000000000101',
    person_id: '00000000-0000-4000-8000-000000000201',
    polity_id: '00000000-0000-4000-8000-000000000301',
    role_id: null,
    period_basis_id: '00000000-0000-4000-8000-000000000401',
    activity_start: 100,
    activity_end: 110,
    confidence: 'well_established',
    chronology_status: 'exact_as_recorded',
    legacy_source_key: 'fixture:1',
    notes: null,
    person_canonical_key: 'fixture-person',
    person_type: 'person',
    person_historicity: 'historical',
    person_name_en: 'Fixture Person',
    person_name_ko: '시험 인물',
    polity_canonical_key: 'fixture-polity',
    polity_type: 'state',
    polity_historicity: 'historical',
    polity_name_en: 'Fixture Polity',
    polity_name_ko: '시험 정치체',
    role_code: null,
    role_category: null,
    role_source_label: null,
    period_basis: 'activity',
    source_count: 1,
    chronology_claim_count: 0,
    description_count: 0,
    ...overrides
  };
}

function makeBaseline(rows = [row()]) {
  const counts = {
    persons: 1,
    polities: 1,
    roles: 0,
    period_bases: 1,
    activities: rows.length,
    activity_source_links: rows.reduce((sum, r) => sum + r.source_count, 0),
    chronology_claims: rows.reduce((sum, r) => sum + r.chronology_claim_count, 0),
    relationship_descriptions: rows.reduce((sum, r) => sum + r.description_count, 0)
  };
  return {
    ok: true,
    marker: BASELINE_A_MARKER,
    mode: BASELINE_A_MODE,
    read_only: true,
    committed: false,
    deployment_sha: '1111111111111111111111111111111111111111',
    row_count: rows.length,
    counts,
    baseline_digest: calculateBaselineDigest(rows, counts),
    rows
  };
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => error?.message === code);
}

test('Baseline A intake contract is non-production and explicitly separates review labels from UUID binding authority', () => {
  const contract = JSON.parse(fs.readFileSync('stage2/contracts/baseline-a-intake-current.v1.json', 'utf8'));
  assert.equal(contract.schema, 'atlas-stage2-baseline-a-intake-contract/v1');
  assert.equal(contract.production_mutation, false);
  assert.equal(contract.identity_rules.baseline_a_is_execution_uuid_source_of_truth, true);
  assert.equal(contract.identity_rules.old_346_activity_baseline_authoritative, false);
  assert.equal(contract.identity_rules.canonical_names_are_binding_authority, false);
  assert.equal(contract.identity_rules.canonical_keys_are_binding_authority, false);
  assert.equal(contract.identity_rules.generic_relation_default_allowed, false);
  assert.equal(contract.duplicate_lifecycle.physical_person_merge_before_semantic_key_v2_allowed, false);
  assert.equal(contract.downstream_authority.intake_alone_authorizes_correction_v2, false);
});

test('valid exact-SHA Baseline A evidence is accepted and produces a deterministic non-mutation intake', () => {
  const baseline = makeBaseline();
  assert.doesNotThrow(() => validateBaselineA(baseline));
  const first = buildBaselineAIntake(baseline);
  const second = buildBaselineAIntake(JSON.parse(JSON.stringify(baseline)));
  assert.equal(first.schema, INTAKE_SCHEMA);
  assert.equal(first.production_mutation, false);
  assert.equal(first.intake_digest, second.intake_digest);
  assert.equal(first.source.baseline_digest, baseline.baseline_digest);
  assert.equal(first.activity_bindings.length, 1);
  assert.equal(first.downstream_gates.correction_v2_target_generation_authorized, false);
  assert.equal(first.downstream_gates.semantic_key_v2_activation_authorized, false);
  assert.equal(first.downstream_gates.physical_person_merge_authorized, false);
});

test('Baseline A digest tampering fails closed before any intake is generated', () => {
  const baseline = makeBaseline();
  baseline.rows[0].notes = 'tampered after digest';
  expectCode(() => validateBaselineA(baseline), 'BASELINE_A_DIGEST_MISMATCH');
});

test('duplicate or non-canonical Activity UUID order is rejected even when a matching digest is supplied', () => {
  const duplicateRows = [row(), row({ legacy_source_key: 'fixture:2' })];
  const duplicate = makeBaseline(duplicateRows);
  expectCode(() => validateBaselineA(duplicate), 'BASELINE_A_DUPLICATE_ACTIVITY_UUID');

  const unsortedRows = [
    row({ activity_id: '00000000-0000-4000-8000-000000000102', legacy_source_key: 'fixture:2' }),
    row()
  ];
  const unsorted = makeBaseline(unsortedRows);
  expectCode(() => validateBaselineA(unsorted), 'BASELINE_A_ACTIVITY_ORDER_INVALID');
});

test('historical year zero and reversed intervals are rejected while null Role remains valid', () => {
  const nullRole = makeBaseline();
  assert.doesNotThrow(() => validateBaselineA(nullRole));

  const yearZero = makeBaseline([row({ activity_start: 0 })]);
  expectCode(() => validateBaselineA(yearZero), 'BASELINE_A_HISTORICAL_YEAR_ZERO_FORBIDDEN');

  const reversed = makeBaseline([row({ activity_start: 111, activity_end: 110 })]);
  expectCode(() => validateBaselineA(reversed), 'BASELINE_A_ACTIVITY_INTERVAL_REVERSED');
});

test('same UUID with inconsistent Person or Polity metadata is rejected as corrupted handoff evidence', () => {
  const rows = [
    row(),
    row({
      activity_id: '00000000-0000-4000-8000-000000000102',
      legacy_source_key: 'fixture:2',
      person_name_en: 'Conflicting Name'
    })
  ];
  const baseline = makeBaseline(rows);
  expectCode(() => validateBaselineA(baseline), 'BASELINE_A_PERSON_METADATA_DRIFT');
});

test('names and canonical keys stay in non-authoritative review catalogs, never in Activity UUID binding identity', () => {
  const intake = buildBaselineAIntake(makeBaseline());
  const binding = intake.activity_bindings[0];
  assert.deepEqual(Object.keys(binding).sort(), [
    'activity_end','activity_id','activity_start','legacy_source_key','period_basis_id','person_id','polity_id','role_id'
  ]);
  assert.equal(intake.referenced_identity_catalogs.binding_authority, false);
  assert.equal(intake.referenced_identity_catalogs.persons[0].canonical_key, 'fixture-person');
  assert.equal(intake.referenced_identity_catalogs.polities[0].name_en, 'Fixture Polity');
  assert.equal(intake.authority.names_or_canonical_keys_are_identity_binding_authority, false);
});

test('baseline-independent integration manifest carries the intake contract/tool but keeps live outputs Baseline-A-gated', () => {
  const prep = JSON.parse(fs.readFileSync('stage2/integration/stage2-baseline-independent-prep.v1.json', 'utf8'));
  const ports = new Map(prep.port_now.map((entry) => [entry.id, entry.path]));
  assert.equal(ports.get('baseline_a_intake_contract'), 'stage2/contracts/baseline-a-intake-current.v1.json');
  assert.equal(ports.get('baseline_a_intake_tool'), 'scripts/stage2-baseline-a-intake.mjs');
  assert.equal(ports.get('baseline_a_identity_handoff'), 'docs/stage2/BASELINE_A_INTAKE_AND_IDENTITY_HANDOFF_2026-08-12.md');
  assert.equal(prep.wait_for_baseline_a.includes('baseline_a_validated_intake'), true);
  assert.equal(prep.wait_for_baseline_a.includes('reviewed_identity_bindings'), true);
  assert.equal(prep.production_mutation, false);
});
