import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSpatialPolityCandidates } from '../scripts/build-spatial-polity-candidates.mjs';

const IDS = Object.freeze({
  undispositioned: '00000000-0000-4000-8000-000000000101',
  static: '00000000-0000-4000-8000-000000000102',
  temporal: '00000000-0000-4000-8000-000000000103',
  review: '00000000-0000-4000-8000-000000000104',
  unused: '00000000-0000-4000-8000-000000000105'
});

function activityReference(count = 1) {
  return {
    source_schema: 'atlas_v2',
    source_table: 'person_politics_v2',
    source_column: 'polity_id',
    count
  };
}

function polity(polityId, count = 1) {
  return {
    polity_id: polityId,
    canonical_key: `polity:${polityId}`,
    polity_type: 'state',
    historicity: 'historical',
    names: [{ locale: 'en', name: polityId, is_preferred: true }],
    external_references: count > 0 ? [activityReference(count)] : []
  };
}

function audit() {
  return {
    ok: true,
    marker: 'ATLAS_POLITY_REFERENCE_AUDIT_V1',
    read_only: true,
    committed: false,
    complete: true,
    deployment_sha: 'test-sha',
    polities: [
      polity(IDS.undispositioned, 3),
      polity(IDS.static, 2),
      polity(IDS.temporal, 2),
      polity(IDS.review, 1),
      polity(IDS.unused, 0)
    ]
  };
}

function spatial() {
  return {
    polity_geography: { [IDS.static]: 'europe' },
    polity_subregions: { [IDS.static]: 'italy' },
    place_function_records: [{ polity_id: IDS.temporal }],
    review_queue: [{ polity_id: IDS.review, reason: 'requires_activity_specific_spatial_review' }]
  };
}

test('candidate inventory contains only Activity-used polities without any reviewed disposition', () => {
  const result = buildSpatialPolityCandidates({
    audit: audit(),
    spatial: spatial(),
    expectedDeploymentSha: 'test-sha',
    topLimit: 100
  });

  assert.deepEqual(result.candidates.map((entry) => entry.polity_id), [IDS.undispositioned]);
  assert.equal(result.candidates[0].activity_reference_count, 3);
  assert.equal(result.summary.undispositioned_used_polity_count, 1);
  assert.equal(result.summary.unplaced_used_polity_count, 1);
  assert.equal(result.summary.place_function_record_count, 1);
  assert.equal(result.summary.review_queue_count, 1);
});

test('temporal place functions and explicit review queue entries are dispositions, not unplaced debt', () => {
  const value = spatial();
  value.polity_geography = {};
  value.polity_subregions = {};
  const result = buildSpatialPolityCandidates({ audit: audit(), spatial: value, expectedDeploymentSha: 'test-sha' });
  const ids = new Set(result.candidates.map((entry) => entry.polity_id));

  assert.equal(ids.has(IDS.temporal), false);
  assert.equal(ids.has(IDS.review), false);
  assert.equal(ids.has(IDS.static), true);
});

test('malformed optional disposition rows do not hide real candidates', () => {
  const value = spatial();
  value.polity_geography = {};
  value.polity_subregions = {};
  value.place_function_records = [{}, { polity_id: null }, { polity_id: IDS.temporal }];
  value.review_queue = [{ reason: 'missing-id' }, { polity_id: IDS.review, reason: 'review' }];
  const result = buildSpatialPolityCandidates({ audit: audit(), spatial: value, expectedDeploymentSha: 'test-sha' });
  const ids = new Set(result.candidates.map((entry) => entry.polity_id));

  assert.equal(ids.has(IDS.undispositioned), true);
  assert.equal(ids.has(IDS.static), true);
  assert.equal(ids.has(IDS.temporal), false);
  assert.equal(ids.has(IDS.review), false);
  assert.equal(ids.has(IDS.unused), false);
});

test('candidate builder fails closed on deployment SHA drift', () => {
  assert.throws(
    () => buildSpatialPolityCandidates({ audit: audit(), spatial: spatial(), expectedDeploymentSha: 'different-sha' }),
    /deployment SHA mismatch/
  );
});
