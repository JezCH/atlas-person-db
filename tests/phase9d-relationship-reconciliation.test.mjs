import assert from 'node:assert/strict';
import test from 'node:test';
import reconciliation from '../server/atlas-relationship-reconciliation.js';

const { buildRelationshipReconciliationGroups, buildReconciliationPlan } = reconciliation;

const LOW = '11111111-1111-4111-8111-111111111111';
const HIGH = '22222222-2222-4222-8222-222222222222';
const R1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const R2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const R3 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
const R4 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';

function row(id, person_id, role_id) {
  return {
    id,
    person_id,
    polity_id: '33333333-3333-4333-8333-333333333333',
    role_id,
    period_basis_id: '44444444-4444-4444-8444-444444444444',
    activity_start: 1762,
    activity_end: 1796,
    notes: id
  };
}

test('same context across both persons becomes one reconciliation group with exact duplicates and role variants', () => {
  const groups = buildRelationshipReconciliationGroups({
    lowPersonId: LOW,
    highPersonId: HIGH,
    rows: [
      row(R1, LOW, '55555555-5555-4555-8555-555555555555'),
      row(R2, LOW, '66666666-6666-4666-8666-666666666666'),
      row(R3, HIGH, '66666666-6666-4666-8666-666666666666')
    ]
  });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].has_role_variants, true);
  assert.equal(groups[0].has_exact_role_duplicates, true);
  assert.equal(groups[0].exact_duplicate_role_groups.length, 1);
  assert.deepEqual(groups[0].exact_duplicate_role_groups[0].relationships.map((item) => item.id).sort(), [R2, R3].sort());
});

test('KEEP_DISTINCT_ROLES preserves unique roles and requires an explicit representative for each duplicated role', () => {
  const groups = buildRelationshipReconciliationGroups({
    lowPersonId: LOW,
    highPersonId: HIGH,
    rows: [
      row(R1, LOW, '55555555-5555-4555-8555-555555555555'),
      row(R2, LOW, '66666666-6666-4666-8666-666666666666'),
      row(R3, HIGH, '66666666-6666-4666-8666-666666666666')
    ]
  });
  assert.throws(() => buildReconciliationPlan({
    groups,
    resolutions: [{ group_fingerprint: groups[0].group_fingerprint, action: 'KEEP_DISTINCT_ROLES' }]
  }), /explicit representative/);

  const plan = buildReconciliationPlan({
    groups,
    resolutions: [{
      group_fingerprint: groups[0].group_fingerprint,
      action: 'KEEP_DISTINCT_ROLES',
      keep_relationship_ids: [R3]
    }]
  });
  assert.deepEqual(plan.coalesces, [{
    group_fingerprint: groups[0].group_fingerprint,
    keep_relationship_id: R3,
    drop_relationship_id: R2
  }]);
});

test('KEEP_ONE_RELATIONSHIP drops every other relationship in the context group', () => {
  const groups = buildRelationshipReconciliationGroups({
    lowPersonId: LOW,
    highPersonId: HIGH,
    rows: [
      row(R1, LOW, '55555555-5555-4555-8555-555555555555'),
      row(R2, LOW, '66666666-6666-4666-8666-666666666666'),
      row(R3, HIGH, '66666666-6666-4666-8666-666666666666'),
      row(R4, HIGH, '77777777-7777-4777-8777-777777777777')
    ]
  });
  const plan = buildReconciliationPlan({
    groups,
    resolutions: [{
      group_fingerprint: groups[0].group_fingerprint,
      action: 'KEEP_ONE_RELATIONSHIP',
      keep_relationship_id: R4
    }]
  });
  assert.equal(plan.coalesces.length, 3);
  assert.ok(plan.coalesces.every((item) => item.keep_relationship_id === R4));
  assert.deepEqual(new Set(plan.coalesces.map((item) => item.drop_relationship_id)), new Set([R1, R2, R3]));
});

test('missing, stale, or cross-group resolution choices fail closed', () => {
  const groups = buildRelationshipReconciliationGroups({
    lowPersonId: LOW,
    highPersonId: HIGH,
    rows: [row(R1, LOW, null), row(R2, HIGH, null)]
  });
  assert.throws(() => buildReconciliationPlan({ groups, resolutions: [] }), /every relationship conflict group/);
  assert.throws(() => buildReconciliationPlan({
    groups,
    resolutions: [{ group_fingerprint: 'f'.repeat(64), action: 'KEEP_ONE_RELATIONSHIP', keep_relationship_id: R1 }]
  }), /stale or missing/);
  assert.throws(() => buildReconciliationPlan({
    groups,
    resolutions: [{ group_fingerprint: groups[0].group_fingerprint, action: 'KEEP_ONE_RELATIONSHIP', keep_relationship_id: R4 }]
  }), /does not belong/);
});
