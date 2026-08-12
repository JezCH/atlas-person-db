import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBaselineAIntake, digest, BASELINE_MARKER, INTAKE_SCHEMA } from '../scripts/stage2-baseline-a-intake.mjs';

const SHA = 'a'.repeat(40);
const A = '11111111-1111-4111-8111-111111111111';
const P = '22222222-2222-4222-8222-222222222222';
const P2 = '33333333-3333-4333-8333-333333333333';
const POL = '44444444-4444-4444-8444-444444444444';
const POL_UNUSED = '55555555-5555-4555-8555-555555555555';
const ROLE = '66666666-6666-4666-8666-666666666666';
const BASIS = '77777777-7777-4777-8777-777777777777';
const SOURCE = '88888888-8888-4888-8888-888888888888';
const N1 = '91111111-1111-4111-8111-111111111111';
const N2 = '92222222-2222-4222-8222-222222222222';
const N3 = '93333333-3333-4333-8333-333333333333';
const N4 = '94444444-4444-4444-8444-444444444444';

function fixture() {
  const catalogs = {
    persons: [
      { id: P, canonical_key: 'person-a', person_type: 'historical', historicity: 'historical', names: [{ id: N1, locale: 'en', name: 'Person A', name_type: 'canonical', is_preferred: true }] },
      { id: P2, canonical_key: 'person-unused', person_type: 'historical', historicity: 'historical', names: [] }
    ],
    polities: [
      { id: POL, canonical_key: 'polity-a', polity_type: 'state', historicity: 'historical', names: [{ id: N2, locale: 'en', name: 'Polity A', name_type: 'canonical', is_preferred: true }] },
      { id: POL_UNUSED, canonical_key: 'polity-unused', polity_type: 'state', historicity: 'historical', names: [{ id: N3, locale: 'en', name: 'Unreferenced Polity', name_type: 'legacy-alias-kind', is_preferred: true }] }
    ],
    roles: [{ id: ROLE, code: 'ruler', category: 'political', source_label: 'Ruler', is_active: true, names: [] }],
    period_bases: [{ id: BASIS, code: 'reign', is_active: true, names: [{ id: N4, locale: 'en', name: 'Reign', is_preferred: true }] }],
    sources: [{ id: SOURCE, source_key: 'source-a', source_type: 'dataset', title: 'Source A', sha256: 'abc', bytes: 12 }]
  };
  const rows = [{
    activity_id: A, person_id: P, polity_id: POL, role_id: ROLE, period_basis_id: BASIS,
    activity_start: -203, activity_end: -196, confidence: 'well_established', chronology_status: 'reviewed', legacy_source_key: 'legacy-a', notes: null,
    person_canonical_key: 'person-a', person_type: 'historical', person_historicity: 'historical', person_name_en: 'Person A', person_name_ko: null,
    polity_canonical_key: 'polity-a', polity_type: 'state', polity_historicity: 'historical', polity_name_en: 'Polity A', polity_name_ko: null,
    role_code: 'ruler', role_category: 'political', role_source_label: 'Ruler', period_basis: 'reign', source_count: 1, chronology_claim_count: 0, description_count: 0
  }];
  const counts = { persons: 2, person_names: 1, polities: 2, polity_names: 2, roles: 1, role_names: 0, period_bases: 1, period_basis_names: 1,
    sources: 1, activities: 1, activity_source_links: 1, chronology_claims: 0, relationship_descriptions: 0 };
  return { marker: BASELINE_MARKER, mode: 'full_stage2_baseline', read_only: true, committed: false, deployment_sha: SHA,
    row_count: rows.length, counts, rows, catalogs, baseline_digest: digest(rows, counts, catalogs) };
}

test('Baseline A v2 intake preserves complete live identity catalogs including unreferenced entities and raw polity name_type', () => {
  const intake = buildBaselineAIntake(fixture());
  assert.equal(intake.schema, INTAKE_SCHEMA);
  assert.equal(intake.identity_catalogs.persons.length, 2);
  assert.equal(intake.identity_catalogs.polities.length, 2);
  assert.equal(intake.identity_catalogs.polities[1].names[0].name_type, 'legacy-alias-kind');
  assert.equal(intake.catalog_cardinality.sources, 1);
  assert.equal(intake.authority.live_uuid_inventory_authoritative, true);
  assert.equal(intake.authority.historical_identity_decisions_automatically_approved, false);
  assert.equal(intake.authority.names_binding_authority, false);
  assert.equal(intake.authority.correction_v2_authorized, false);
  assert.equal(intake.authority.production_mutation_authorized, false);
});

test('Baseline A v2 digest covers catalogs, not only Activity rows', () => {
  const baseline = fixture();
  baseline.catalogs.polities[1].names[0].name_type = 'tampered';
  assert.throws(() => buildBaselineAIntake(baseline), /baseline digest mismatch/);
});

test('Baseline A v2 rejects Activity metadata drift from the same snapshot catalog', () => {
  const baseline = fixture();
  baseline.rows[0].polity_canonical_key = 'wrong';
  baseline.baseline_digest = digest(baseline.rows, baseline.counts, baseline.catalogs);
  assert.throws(() => buildBaselineAIntake(baseline), /polity canonical metadata drift/);
});

test('Baseline A v2 rejects missing full catalog rows and unsorted Activity UUIDs', () => {
  const baseline = fixture();
  baseline.catalogs.polities = baseline.catalogs.polities.slice(1);
  baseline.counts.polities = 1;
  baseline.counts.polity_names = 1;
  baseline.baseline_digest = digest(baseline.rows, baseline.counts, baseline.catalogs);
  assert.throws(() => buildBaselineAIntake(baseline), /polity UUID missing from full catalog/);
});

test('Baseline A v2 accepts historical BCE integer convention and rejects year zero', () => {
  assert.doesNotThrow(() => buildBaselineAIntake(fixture()));
  const baseline = fixture();
  baseline.rows[0].activity_start = 0;
  baseline.baseline_digest = digest(baseline.rows, baseline.counts, baseline.catalogs);
  assert.throws(() => buildBaselineAIntake(baseline), /invalid historical interval/);
});
