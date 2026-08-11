import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  MANIFEST_V1,
  MANIFEST_V2,
  RESULT_SNAPSHOT_VERSION,
  requireManifest,
  manifestHash,
  markerForSchema,
  activityFromManifest,
  verifyPostwriteBinding,
  buildExecutionSnapshot,
  buildHistoricalReplaySnapshot,
  assertSnapshotMatchesLive
} = require('../server/atlas-authoring-manifest-service.js');

test('authoring manifest v1 remains compatible and requires approval, stable request id, person and activity', () => {
  const parsed = requireManifest({
    schema: MANIFEST_V1,
    review_status: 'approved',
    request_id: ' person:test:v1 ',
    person: { canonical_name_en: 'Test', display_name_ko: '테스트' },
    activity: { politic_name: 'Test Polity', activity_start: 1, activity_end: 2, period_basis: 'reign' }
  });
  assert.equal(parsed.schema, MANIFEST_V1);
  assert.equal(parsed.requestId, 'person:test:v1');
  assert.equal(parsed.polityIdentity, null);
  assert.equal(parsed.roleIdentity, null);
  assert.equal(markerForSchema(parsed.schema), 'ATLAS_AUTHORING_MANIFEST_V1');
  assert.throws(() => requireManifest({}), /UNSUPPORTED_AUTHORING_MANIFEST_SCHEMA/);
  assert.throws(() => requireManifest({ schema: MANIFEST_V1, request_id: 'x', person: {}, activity: {} }), /AUTHORING_MANIFEST_NOT_APPROVED/);
});

test('authoring manifest v2 can atomically declare new polity and role identities', () => {
  const parsed = requireManifest({
    schema: MANIFEST_V2,
    review_status: 'approved',
    request_id: 'person:test:v2',
    person: { canonical_name_en: 'Test', display_name_ko: '테스트' },
    polity_identity: {
      canonical_name_en: 'New Polity',
      display_name_ko: '새 정치체',
      polity_type: 'historical_polity',
      historicity: 'historical'
    },
    role_identity: {
      code: 'new_role',
      category: 'political',
      source_label: 'New Role',
      display_name_ko: '새 역할'
    },
    activity: {
      politic_name: 'New Polity',
      activity_start: 10,
      activity_end: 20,
      role: 'New Role',
      period_basis: 'reign'
    }
  });

  assert.equal(parsed.schema, MANIFEST_V2);
  assert.equal(parsed.polityIdentity.canonical_name_en, 'New Polity');
  assert.equal(parsed.roleIdentity.code, 'new_role');
  assert.equal(markerForSchema(parsed.schema), 'ATLAS_AUTHORING_MANIFEST_V2');
});

test('declared polity and role must be the exact identities referenced by the activity', () => {
  const base = {
    schema: MANIFEST_V2,
    review_status: 'approved',
    request_id: 'person:test:v2',
    person: { canonical_name_en: 'Test', display_name_ko: '테스트' },
    activity: {
      politic_name: 'New Polity',
      activity_start: 10,
      activity_end: 20,
      role: 'New Role',
      period_basis: 'reign'
    }
  };

  assert.throws(() => requireManifest({
    ...base,
    polity_identity: { canonical_name_en: 'Other Polity', display_name_ko: '다른 정치체' }
  }), /AUTHORING_POLITY_ACTIVITY_REFERENCE_MISMATCH/);

  assert.throws(() => requireManifest({
    ...base,
    role_identity: { code: 'other_role', category: 'political', source_label: 'Other Role', display_name_ko: '다른 역할' }
  }), /AUTHORING_ROLE_ACTIVITY_REFERENCE_MISMATCH/);

  assert.throws(() => requireManifest({
    ...base,
    activity: { ...base.activity, role: null },
    role_identity: { code: 'new_role', category: 'political', source_label: 'New Role', display_name_ko: '새 역할' }
  }), /AUTHORING_ROLE_ACTIVITY_REFERENCE_REQUIRED/);

  assert.throws(() => requireManifest({
    schema: MANIFEST_V1,
    review_status: 'approved',
    request_id: 'person:test:v1-extra',
    person: base.person,
    polity_identity: { canonical_name_en: 'New Polity', display_name_ko: '새 정치체' },
    activity: base.activity
  }), /AUTHORING_MANIFEST_V2_REQUIRED_FOR_IDENTITY_DECLARATIONS/);
});

test('manifest hash is stable across object key order', () => {
  assert.equal(manifestHash({ b: 2, a: 1 }), manifestHash({ a: 1, b: 2 }));
});

test('activity manifest is normalized through authoritative comparable payload', () => {
  assert.deepEqual(activityFromManifest('Liliʻuokalani', {
    politic_name: 'Kingdom of Hawaii',
    activity_start: 1891,
    activity_end: 1893,
    role: 'Queen',
    period_basis: 'reign',
    notes: null
  }), {
    person_name: 'Liliʻuokalani',
    politic_name: 'Kingdom of Hawaii',
    activity_start: 1891,
    activity_end: 1893,
    role: 'Queen',
    period_basis: 'reign',
    notes: null
  });
});

test('execution snapshot records entity dispositions and normalized UUID bindings', () => {
  const snapshot = buildExecutionSnapshot({
    schema: MANIFEST_V2,
    marker: 'ATLAS_AUTHORING_MANIFEST_V2',
    personResult: { id: 'person-1', replay: false },
    polityResult: { id: 'polity-1', replay: true },
    roleResult: null,
    relationship: {
      id: 'activity-1',
      person_id: 'person-1',
      polity_id: 'polity-1',
      role_id: 'role-1',
      period_basis_id: 'period-1'
    },
    activityReplay: false
  });

  assert.equal(snapshot.version, RESULT_SNAPSHOT_VERSION);
  assert.equal(snapshot.provenance_complete, true);
  assert.deepEqual(snapshot.entities.person, { id: 'person-1', disposition: 'created' });
  assert.deepEqual(snapshot.entities.polity, { id: 'polity-1', disposition: 'reused' });
  assert.deepEqual(snapshot.entities.role, { id: 'role-1', disposition: 'resolved_existing' });
  assert.deepEqual(snapshot.entities.activity, { id: 'activity-1', disposition: 'created' });
});

test('postwrite binding verification fails closed on identity drift before commit', () => {
  const relationship = { person_id: 'person-1', polity_id: 'polity-1', role_id: 'role-1' };
  assert.doesNotThrow(() => verifyPostwriteBinding({
    relationship,
    personResult: { id: 'person-1' },
    polityResult: { id: 'polity-1' },
    roleResult: { id: 'role-1' }
  }));
  assert.throws(() => verifyPostwriteBinding({
    relationship,
    personResult: { id: 'other-person' },
    polityResult: { id: 'polity-1' },
    roleResult: { id: 'role-1' }
  }), /AUTHORING_POSTWRITE_PERSON_MISMATCH/);
});

test('historical ledger rows are backfilled without inventing original create/reuse provenance', () => {
  const snapshot = buildHistoricalReplaySnapshot({
    schema: MANIFEST_V1,
    marker: 'ATLAS_AUTHORING_MANIFEST_V1',
    ledger: { person_id: 'person-1' },
    relationship: {
      id: 'activity-1',
      polity_id: 'polity-1',
      role_id: null,
      period_basis_id: 'period-1'
    }
  });
  assert.equal(snapshot.provenance_complete, false);
  assert.equal(snapshot.entities.person.disposition, 'historical_unknown');
  assert.equal(snapshot.entities.role.disposition, 'not_applicable');
});

test('stored result snapshots are checked against live normalized bindings on replay', () => {
  const snapshot = buildExecutionSnapshot({
    schema: MANIFEST_V2,
    marker: 'ATLAS_AUTHORING_MANIFEST_V2',
    personResult: { id: 'person-1', replay: false },
    polityResult: null,
    roleResult: null,
    relationship: {
      id: 'activity-1',
      person_id: 'person-1',
      polity_id: 'polity-1',
      role_id: null,
      period_basis_id: 'period-1'
    },
    activityReplay: false
  });

  assert.doesNotThrow(() => assertSnapshotMatchesLive({
    snapshot,
    ledger: { person_id: 'person-1', relationship_id: 'activity-1' },
    relationship: {
      id: 'activity-1',
      person_id: 'person-1',
      polity_id: 'polity-1',
      role_id: null,
      period_basis_id: 'period-1'
    }
  }));

  assert.throws(() => assertSnapshotMatchesLive({
    snapshot,
    ledger: { person_id: 'person-1', relationship_id: 'activity-1' },
    relationship: {
      id: 'activity-1',
      person_id: 'person-1',
      polity_id: 'other-polity',
      role_id: null,
      period_basis_id: 'period-1'
    }
  }), /AUTHORING_LEDGER_POLITY_DRIFT/);
});
