import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSpatialActivityCandidates } from '../scripts/build-spatial-activity-candidates.mjs';

const PERSON_ID = '00000000-0000-4000-8000-0000000000b1';
const POLITY_ID = '00000000-0000-4000-8000-0000000000b2';
const ACTIVITY_ID = '00000000-0000-4000-8000-0000000000b3';

function personRead({ activity = {} } = {}) {
  return {
    ok: true,
    schema: 'atlas-person-read/v1',
    persons: [{
      id: PERSON_ID,
      display_name: 'Test Person',
      activity_summaries: [{
        id: ACTIVITY_ID,
        polity: { id: POLITY_ID, display_name: 'Test Polity' },
        start: { year: -195 },
        end: { year: -190 },
        ...activity
      }]
    }]
  };
}

function spatial(extra = {}) {
  return {
    schema: 'atlas-polity-spatial-index/v2',
    regions: [],
    polity_geography: {},
    polity_subregions: {},
    place_function_records: [],
    review_queue: [],
    activity_spatial_overrides: [],
    ...extra
  };
}

test('review_queue polity with no Activity override is surfaced as spatial debt', () => {
  const result = buildSpatialActivityCandidates({
    personRead: personRead(),
    spatial: spatial({ review_queue: [{ polity_id: POLITY_ID, reason: 'activity_specific_required' }] })
  });
  assert.equal(result.summary.spatial_unresolved_activity_count, 1);
  assert.equal(result.summary.review_queue_activity_override_missing_count, 1);
  assert.equal(result.candidates[0].activity_id, ACTIVITY_ID);
  assert.equal(result.candidates[0].category, 'review_queue_activity_override_missing');
});

test('exact Activity override closes review_queue spatial debt', () => {
  const result = buildSpatialActivityCandidates({
    personRead: personRead(),
    spatial: spatial({
      review_queue: [{ polity_id: POLITY_ID, reason: 'activity_specific_required' }],
      activity_spatial_overrides: [{
        activity_id: ACTIVITY_ID,
        expected_polity_id: POLITY_ID,
        expected_start_year: -195,
        expected_end_year: -190,
        region_code: 'west-asia',
        subregion_code: 'anatolia',
        location_label: 'Ephesus–Side',
        reason: 'reviewed test',
        source_refs: ['source']
      }]
    })
  });
  assert.equal(result.summary.spatial_unresolved_activity_count, 0);
  assert.deepEqual(result.candidates, []);
});

test('macroregion-only polity placement is surfaced at Activity level', () => {
  const result = buildSpatialActivityCandidates({
    personRead: personRead(),
    spatial: spatial({ polity_geography: { [POLITY_ID]: 'west-asia' } })
  });
  assert.equal(result.summary.spatial_unresolved_activity_count, 1);
  assert.equal(result.candidates[0].category, 'macroregion_only_activity_unresolved');
});

test('chronology-unresolved rows are tracked separately instead of misclassified as spatial debt', () => {
  const result = buildSpatialActivityCandidates({
    personRead: personRead({ start: { year: null }, end: { year: null } }),
    spatial: spatial({ review_queue: [] })
  });
  assert.equal(result.summary.chronology_unresolved_activity_count, 1);
  assert.equal(result.summary.spatial_unresolved_activity_count, 0);
});
