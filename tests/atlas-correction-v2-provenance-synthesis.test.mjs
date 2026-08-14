import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const synth = require('../server/atlas-correction-v2-manifest-synthesizer.js');

const PERSON = '11111111-1111-4111-8111-111111111111';
const POLITY = '22222222-2222-4222-8222-222222222222';
const ROLE = '33333333-3333-4333-8333-333333333333';
const PERIOD = '44444444-4444-4444-8444-444444444444';
const RELATION = '55555555-5555-4555-8555-555555555555';
const TARGET = '66666666-6666-4666-8666-666666666666';
const SURVIVOR = '77777777-7777-4777-8777-777777777777';
const FRAGMENT = '88888888-8888-4888-8888-888888888888';
const SOURCE_A = '99999999-9999-4999-8999-999999999999';
const SOURCE_B = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ASSERTION = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const OBJECT_POLITY = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const POLITY_RELATION = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function liveActivity(id, start = 100, end = 110) {
  return {
    id, person_id: PERSON, polity_id: POLITY, relation_type_id: null, role_id: ROLE, period_basis_id: PERIOD,
    activity_start: start, activity_start_month: null, activity_start_day: null, activity_start_granularity: null,
    activity_start_certainty: null, activity_start_calendar: null,
    activity_end: end, activity_end_month: null, activity_end_day: null, activity_end_granularity: null,
    activity_end_certainty: null, activity_end_calendar: null,
    confidence: 'legacy_asserted', chronology_status: 'exact_as_recorded', legacy_source_key: `legacy:${id}`,
    notes: null, source_locator: {}, content_hash: `hash:${id}`
  };
}

function baseline(activity, sourceCount = 1) {
  return {
    person_id: activity.person_id, polity_id: activity.polity_id, role_id: activity.role_id,
    period_basis_id: activity.period_basis_id, activity_start: activity.activity_start, activity_end: activity.activity_end,
    confidence: activity.confidence, chronology_status: activity.chronology_status,
    legacy_source_key: activity.legacy_source_key, source_count: sourceCount
  };
}

function snapshot(activities, links = []) {
  return {
    schema: synth.SNAPSHOT_SCHEMA,
    snapshot_digest: `sha256:${'a'.repeat(64)}`,
    activity_ids: activities.map((row) => row.id).sort(),
    activities,
    normalized_activity_source_links: links,
    chronology_claims: [],
    relationship_descriptions: []
  };
}

function plan(operations, companion_assertions = []) {
  return {
    schema: synth.PLAN_SCHEMA,
    batch_id: 'test-provenance-safe-synthesis',
    baseline: { deployment_sha: 'test', baseline_digest: `sha256:${'b'.repeat(64)}` },
    execution_rules: { production_executable: false, production_mutation_authorized: false },
    operations,
    companion_assertions
  };
}

test('retire synthesis snapshots reviewed survivors and transfers exact normalized provenance before delete', () => {
  const retired = liveActivity(TARGET);
  const survivor = liveActivity(SURVIVOR, 90, 120);
  const retiredLink = { person_politics_id: TARGET, source_id: SOURCE_A, source_locator_key: 'page:10' };
  const survivorLink = { person_politics_id: SURVIVOR, source_id: SOURCE_B, source_locator_key: 'page:20' };
  const p = plan([{
    case_id: 'retire-case', type: 'retire_activity', activity_id: TARGET, baseline_before: baseline(retired),
    replacement_activity_ids: [SURVIVOR], source_transfer_policy: synth.RETIRE_SOURCE_TRANSFER_POLICY,
    silent_source_drop_forbidden: true
  }]);
  assert.deepEqual(synth.requiredSnapshotActivityIds(p), [TARGET, SURVIVOR].sort());
  const manifest = synth.synthesizeCorrectionV2Manifest(p, snapshot([retired, survivor], [retiredLink, survivorLink]));
  const op = manifest.operations[0];
  assert.equal(op.type, 'retire_activity');
  assert.equal(op.replacement_survivors.length, 1);
  assert.deepEqual(op.replacement_survivors[0].exact_before.normalized_source_links, [survivorLink]);
  assert.deepEqual(op.replacement_survivors[0].exact_after.normalized_source_links, [
    { person_politics_id: SURVIVOR, source_id: SOURCE_A, source_locator_key: 'page:10' },
    survivorLink
  ].sort((a,b)=>a.source_id.localeCompare(b.source_id)));
  assert.equal(op.silent_source_drop_forbidden, true);
});

test('retire synthesis fails closed when survivor already binds the same Source to a different locator', () => {
  const retired = liveActivity(TARGET);
  const survivor = liveActivity(SURVIVOR, 90, 120);
  const p = plan([{
    case_id: 'retire-conflict', type: 'retire_activity', activity_id: TARGET, baseline_before: baseline(retired),
    replacement_activity_ids: [SURVIVOR], source_transfer_policy: synth.RETIRE_SOURCE_TRANSFER_POLICY,
    silent_source_drop_forbidden: true
  }]);
  assert.throws(() => synth.synthesizeCorrectionV2Manifest(p, snapshot([retired, survivor], [
    { person_politics_id: TARGET, source_id: SOURCE_A, source_locator_key: 'page:10' },
    { person_politics_id: SURVIVOR, source_id: SOURCE_A, source_locator_key: 'page:99' }
  ])), /SOURCE_LOCATOR_CONFLICT/);
});

test('split synthesis obeys per-fragment source-copy policy and never turns a null locator into provenance', () => {
  const live = liveActivity(TARGET);
  const p = plan([{
    case_id: 'split-case', type: 'split_activity', activity_id: TARGET, baseline_before: baseline(live), gap_overlap_policy: 'reviewed',
    fragments: [
      {
        survivor: true, activity_id: TARGET, person_id: PERSON, polity_id: POLITY, relation_type_id: RELATION,
        role_id: ROLE, period_basis_id: PERIOD, activity_start: 100, activity_end: 104,
        activity_start_detail: null, activity_end_detail: null, confidence: live.confidence,
        chronology_status: live.chronology_status, legacy_source_key: live.legacy_source_key,
        source_copy_policy: 'COPY_EXISTING', add_source_links: []
      },
      {
        survivor: false, activity_id: FRAGMENT, person_id: PERSON, polity_id: POLITY, relation_type_id: RELATION,
        role_id: ROLE, period_basis_id: PERIOD, activity_start: 105, activity_end: 110,
        activity_start_detail: { year:105, month:7, day:1, granularity:'day', certainty:'exact', calendar:'gregorian' },
        activity_end_detail: null, confidence: live.confidence, chronology_status: live.chronology_status, legacy_source_key: null,
        source_copy_policy: 'DO_NOT_COPY_EXISTING', add_source_links: [{ source_id: SOURCE_B, source_locator_key: null }]
      }
    ]
  }]);
  const manifest = synth.synthesizeCorrectionV2Manifest(p, snapshot([live], [
    { person_politics_id: TARGET, source_id: SOURCE_A, source_locator_key: 'page:10' }
  ]));
  const fragment = manifest.operations[0].new_fragments[0];
  assert.equal(fragment.source_copy_policy, 'DO_NOT_COPY_EXISTING');
  assert.deepEqual(fragment.normalized_source_links, []);
  assert.equal(fragment.activity.activity_start_month, 7);
  assert.equal(fragment.activity.activity_start_day, 1);
  assert.equal(fragment.activity.activity_start_granularity, 'day');
  assert.equal(fragment.activity.activity_start_calendar, 'gregorian');
});

test('companion polity relation synthesis preserves reviewed locator and subyear boundary', () => {
  const live = liveActivity(TARGET);
  const p = plan([{
    case_id: 'rewrite', type: 'rewrite_activity', activity_id: TARGET, baseline_before: baseline(live),
    after: {
      activity_id: TARGET, person_id: PERSON, polity_id: POLITY, relation_type_id: RELATION, role_id: ROLE,
      period_basis_id: PERIOD, activity_start: 100, activity_end: 110, activity_start_detail: null,
      activity_end_detail: null, confidence: live.confidence, chronology_status: live.chronology_status,
      legacy_source_key: live.legacy_source_key, add_source_links: []
    }
  }], [{
    type: 'assert_polity_relation', assertion_id: ASSERTION, relation_decision_id: 'reviewed-relation',
    subject_polity_id: POLITY, object_polity_id: OBJECT_POLITY, relation_type_id: POLITY_RELATION,
    start_year: 1867, end_year: 1931,
    start_detail: { year:1867, month:7, day:1, granularity:'day', certainty:'exact', calendar:'gregorian' },
    end_detail: { year:1931, month:12, day:11, granularity:'day', certainty:'exact', calendar:'gregorian' },
    source_links: [{ source_id: SOURCE_A, source_locator_key: 'url:https://example.invalid/reviewed' }]
  }]);
  const manifest = synth.synthesizeCorrectionV2Manifest(p, snapshot([live], [
    { person_politics_id: TARGET, source_id: SOURCE_A, source_locator_key: 'page:10' }
  ]));
  const assertion = manifest.operations.find((row) => row.type === 'assert_polity_relation');
  assert.equal(assertion.exact_after.relation.valid_from_month, 7);
  assert.equal(assertion.exact_after.relation.valid_from_day, 1);
  assert.equal(assertion.exact_after.relation.valid_from_calendar, 'gregorian');
  assert.equal(assertion.exact_after.relation.confidence, 'unknown');
  assert.deepEqual(assertion.exact_after.source_links, [{
    polity_relation_id: ASSERTION, source_id: SOURCE_A, source_locator_key: 'url:https://example.invalid/reviewed'
  }]);
});
