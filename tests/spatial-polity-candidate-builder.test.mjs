import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSpatialPolityCandidates } from '../scripts/build-spatial-polity-candidates.mjs';

const DEPLOYMENT_SHA = '0123456789abcdef0123456789abcdef01234567';

function auditFixture() {
  return {
    ok: true,
    marker: 'ATLAS_POLITY_REFERENCE_AUDIT_V1',
    read_only: true,
    committed: false,
    complete: true,
    deployment_sha: DEPLOYMENT_SHA,
    polities: [
      {
        polity_id: 'placed',
        canonical_key: 'placed-polity',
        polity_type: 'state',
        historicity: 'historical',
        names: [{ locale: 'en', name: 'Placed', is_preferred: true }],
        external_references: [
          { source_schema: 'atlas_v2', source_table: 'person_politics_v2', source_column: 'polity_id', count: 9 }
        ]
      },
      {
        polity_id: 'used-five',
        canonical_key: 'alpha-used',
        polity_type: 'kingdom',
        historicity: 'historical',
        names: [
          { locale: 'en', name: 'Alpha', is_preferred: true },
          { locale: 'ko', name: '알파', is_preferred: true },
          { locale: 'en', name: 'Old Alpha', is_preferred: false }
        ],
        external_references: [
          { source_schema: 'atlas_v2', source_table: 'person_politics_v2', source_column: 'polity_id', count: 2 },
          { source_schema: 'atlas_v2', source_table: 'person_politics_v2', source_column: 'polity_id', count: '3' },
          { source_schema: 'atlas_v2', source_table: 'other', source_column: 'polity_id', count: 100 }
        ]
      },
      {
        polity_id: 'used-one',
        canonical_key: 'beta-used',
        polity_type: 'republic',
        historicity: 'historical',
        names: [{ locale: 'en', name: 'Beta', is_preferred: true }],
        external_references: [
          { source_schema: 'atlas_v2', source_table: 'person_politics_v2', source_column: 'polity_id', count: 1 }
        ]
      },
      {
        polity_id: 'unused',
        canonical_key: 'unused-polity',
        polity_type: 'state',
        historicity: 'historical',
        names: [{ locale: 'en', name: 'Unused', is_preferred: true }],
        external_references: [
          { source_schema: 'public', source_table: 'legacy', source_column: 'polity_id', count: 4 }
        ]
      }
    ]
  };
}

function spatialFixture() {
  return {
    polity_geography: {
      placed: 'europe',
      existing_a: 'africa',
      existing_b: 'east-asia'
    },
    polity_subregions: {
      placed: 'western-europe',
      existing_a: 'central-africa'
    }
  };
}

test('builds a deterministic used-but-unplaced polity queue from authoritative UUIDs', () => {
  const result = buildSpatialPolityCandidates({
    audit: auditFixture(),
    spatial: spatialFixture(),
    expectedDeploymentSha: DEPLOYMENT_SHA,
    topLimit: 1
  });

  assert.deepEqual(result.summary, {
    deployment_sha: DEPLOYMENT_SHA,
    geography_count: 3,
    subregion_count: 2,
    temporal_reviewed_used_polity_count: 0,
    explicit_review_queue_used_polity_count: 0,
    undispositioned_used_polity_count: 2,
    unplaced_used_polity_count: 2
  });
  assert.deepEqual(result.candidates.map((entry) => entry.polity_id), ['used-five', 'used-one']);
  assert.equal(result.candidates[0].activity_reference_count, 5);
  assert.deepEqual(result.candidates[0].preferred_names, [
    { locale: 'en', name: 'Alpha' },
    { locale: 'ko', name: '알파' }
  ]);
  assert.deepEqual(result.top.map((entry) => entry.polity_id), ['used-five']);
});

test('rejects audit evidence from a different Production deployment SHA', () => {
  assert.throws(
    () => buildSpatialPolityCandidates({
      audit: auditFixture(),
      spatial: spatialFixture(),
      expectedDeploymentSha: 'f'.repeat(40)
    }),
    /deployment SHA mismatch/
  );
});

test('rejects incomplete or mutating audit evidence', () => {
  const audit = auditFixture();
  audit.read_only = false;
  assert.throws(
    () => buildSpatialPolityCandidates({ audit, spatial: spatialFixture() }),
    /complete, read-only, and uncommitted/
  );
});
