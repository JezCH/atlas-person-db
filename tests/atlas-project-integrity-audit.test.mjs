import assert from 'node:assert/strict';
import test from 'node:test';
import auditModule from '../server/atlas-project-integrity-audit.js';

const {
  normalizedName,
  exactActivityDuplicateGroups,
  auditBaselineBDocument
} = auditModule;

function baselineFixture() {
  return {
    schema: 'atlas-stage2-baseline-b/v2',
    baseline_digest: 'sha256:test',
    datasets: {
      persons: [{ id: 'person-1' }, { id: 'person-2' }],
      person_names: [
        { person_id: 'person-1', locale: 'en', is_preferred: true, name: 'Alpha' },
        { person_id: 'person-1', locale: 'ko', is_preferred: true, name: '알파' },
        { person_id: 'person-2', locale: 'en', is_preferred: true, name: 'Beta' }
      ],
      polities: [{ id: 'polity-1' }, { id: 'polity-2' }],
      polity_names: [
        { polity_id: 'polity-1', locale: 'en', is_preferred: true, name: 'Example Kingdom' },
        { polity_id: 'polity-1', locale: 'ko', is_preferred: true, name: '예시 왕국' },
        { polity_id: 'polity-2', locale: 'en', is_preferred: true, name: 'Example War' }
      ],
      roles: [{ id: 'role-1' }, { id: 'role-unused' }],
      role_names: [
        { role_id: 'role-1', locale: 'en', is_preferred: true, name: 'Ruler' },
        { role_id: 'role-1', locale: 'ko', is_preferred: true, name: '통치자' },
        { role_id: 'role-unused', locale: 'en', is_preferred: true, name: 'Unused' }
      ],
      period_bases: [{ id: 'basis-1' }],
      period_basis_names: [{ period_basis_id: 'basis-1', locale: 'en', is_preferred: true, name: 'reign' }],
      relation_types: [{ id: 'relation-1' }],
      governance_contexts: [],
      governance_context_names: [],
      polity_designations: [],
      polity_designation_names: [],
      people_groups: [],
      people_group_names: [],
      historical_events: [{ id: 'event-1' }],
      historical_event_names: [{ historical_event_id: 'event-1', locale: 'en', is_preferred: true, name: 'Example War' }],
      sources: [{ id: 'source-1' }, { id: 'source-unused' }],
      activities: [
        {
          id: 'activity-1', person_id: 'person-1', polity_id: 'polity-1', relation_type_id: 'relation-1', role_id: 'role-1', period_basis_id: 'basis-1',
          activity_start: 100, activity_start_month: null, activity_start_day: null, activity_start_granularity: 'year', activity_start_calendar: 'proleptic_gregorian',
          activity_end: 110, activity_end_month: null, activity_end_day: null, activity_end_granularity: 'year', activity_end_calendar: 'proleptic_gregorian'
        },
        {
          id: 'activity-2', person_id: 'person-2', polity_id: 'polity-1', relation_type_id: 'relation-1', role_id: null, period_basis_id: 'basis-1',
          activity_start: 120, activity_start_month: null, activity_start_day: null, activity_start_granularity: 'year', activity_start_calendar: 'proleptic_gregorian',
          activity_end: 130, activity_end_month: null, activity_end_day: null, activity_end_granularity: 'year', activity_end_calendar: 'proleptic_gregorian'
        }
      ],
      activity_sources: [{ person_politics_id: 'activity-1', source_id: 'source-1', source_locator_key: 'x' }],
      person_sources: [], polity_sources: [], historical_event_sources: []
    }
  };
}

test('normalizes Unicode and whitespace for cross-category review only', () => {
  assert.equal(normalizedName('  WORLD   WAR I  '), 'world war i');
});

test('does not treat distinct Activity identities as duplicates', () => {
  const baseline = baselineFixture();
  assert.deepEqual(exactActivityDuplicateGroups(baseline.datasets.activities), []);
});

test('detects exact Activity semantic duplicates independent of Activity UUID', () => {
  const baseline = baselineFixture();
  const source = baseline.datasets.activities[0];
  const duplicate = { ...source, id: 'activity-copy' };
  const groups = exactActivityDuplicateGroups([source, duplicate]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].activity_ids, ['activity-1', 'activity-copy']);
});

test('audits Korean coverage, provenance gaps, catalog usage and semantic review without authorizing deletion', () => {
  const result = auditBaselineBDocument(baselineFixture());

  assert.equal(result.schema, 'atlas-project-integrity-audit/v1');
  assert.equal(result.summary.persons, 2);
  assert.equal(result.summary.activities, 2);
  assert.equal(result.summary.zero_source_activities, 1);
  assert.deepEqual(result.provenance.zero_source_activity_ids, ['activity-2']);

  assert.equal(result.korean.persons.with_preferred_ko, 1);
  assert.deepEqual(result.korean.persons.missing_preferred_ko, [{ id: 'person-2', display_name: 'Beta' }]);
  assert.equal(result.korean.period_bases.with_preferred_ko, 0);
  assert.deepEqual(result.catalog_usage.activity_unreferenced_polity_ids, ['polity-2']);
  assert.deepEqual(result.catalog_usage.activity_unreferenced_role_ids, ['role-unused']);
  assert.deepEqual(result.provenance.unreferenced_source_ids, ['source-unused']);

  assert.equal(result.semantic_review.event_like_polities.length, 1);
  assert.equal(result.semantic_review.event_like_polities[0].polity_id, 'polity-2');
  assert.equal(result.semantic_review.polity_historical_event_name_collisions.length, 1);
  assert.equal(result.semantic_review.polity_historical_event_name_collisions[0].normalized_name, 'example war');

  assert.equal(result.summary.semantic_v2_incomplete, 0);
  assert.equal(result.summary.dangling_activity_references, 0);
  assert.equal(result.policy.destructive_cleanup_authorized, false);
  assert.equal(result.policy.event_like_name_is_review_signal_only, true);
  assert.equal(result.policy.activity_unreferenced_catalog_entry_is_not_automatically_orphaned, true);
});

test('reports dangling references and semantic-v2 incompleteness rather than coercing them', () => {
  const baseline = baselineFixture();
  baseline.datasets.activities[1] = {
    ...baseline.datasets.activities[1],
    polity_id: 'missing-polity',
    relation_type_id: null,
    activity_end_calendar: null
  };
  baseline.datasets.activity_sources.push({ person_politics_id: 'missing-activity', source_id: 'missing-source' });

  const result = auditBaselineBDocument(baseline);
  assert.deepEqual(result.activity_integrity.semantic_v2_incomplete_ids, ['activity-2']);
  assert.deepEqual(result.activity_integrity.dangling_reference_activity_ids, ['activity-2']);
  assert.equal(result.provenance.dangling_activity_source_links.length, 1);
});
