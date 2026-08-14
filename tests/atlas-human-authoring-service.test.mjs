import assert from 'node:assert/strict';
import test from 'node:test';

import humanModule from '../server/atlas-human-authoring-service.js';
const { HUMAN_AUTHORING_SCHEMA, HUMAN_AUTHORING_MARKER, normalizeHumanAuthoringRequest, roleCodeFromLabel, roleCategoryForRelation, activityPayload } = humanModule;
const UUIDS = {
  person:'11111111-1111-4111-8111-111111111111', polity:'22222222-2222-4222-8222-222222222222', relation:'33333333-3333-4333-8333-333333333333', role:'44444444-4444-4444-8444-444444444444', period:'55555555-5555-4555-8555-555555555555', source:'66666666-6666-4666-8666-666666666666'
};
function request(overrides = {}) {
  return {
    schema:HUMAN_AUTHORING_SCHEMA,
    request_id:'admin:test-razia',
    person:{ canonical_name_en:'Razia Sultan', display_name_ko:'라지아 술탄' },
    polity:{ canonical_name_en:'Delhi Sultanate', display_name_ko:'델리 술탄국' },
    activity:{ relation_type:'rules', period_basis:'reign', role:'Sultan', role_display_name_ko:'술탄', start_year:1236, end_year:1240, start_certainty:'exact', end_certainty:'exact', confidence:'well_established', chronology_status:'reviewed' },
    sources:[{ title:'Reviewed source', canonical_url:'https://example.test/razia' }],
    ...overrides
  };
}

test('human authoring accepts historical fields without any operator UUIDs', () => {
  const normalized = normalizeHumanAuthoringRequest(request());
  assert.equal(normalized.person.canonical_name_en, 'Razia Sultan');
  assert.equal(normalized.polity.canonical_name_en, 'Delhi Sultanate');
  assert.equal(normalized.activity.relation_type, 'rules');
  assert.equal(normalized.activity.period_basis, 'reign');
  assert.equal(normalized.activity.role_code, 'sultan');
  assert.equal(normalized.activity.role_category, 'ruler');
  assert.deepEqual(normalized.activity.start, { year:1236, month:null, day:null, granularity:'year', certainty:'exact', calendar:'unspecified_historical' });
  assert.equal(normalized.sources[0].locator, 'https://example.test/razia');
});

test('human authoring keeps controlled relation explicit and never applies a generic default', () => {
  const raw = request();
  delete raw.activity.relation_type;
  assert.throws(() => normalizeHumanAuthoringRequest(raw), /HUMAN_AUTHORING_RELATION_TYPE_REQUIRED/);
  assert.throws(() => normalizeHumanAuthoringRequest(request({ activity:{ ...request().activity, relation_type:'related_to' } })), /HUMAN_AUTHORING_RELATION_TYPE_INVALID/);
});

test('human authoring refuses historical year zero and source-less authoritative writes', () => {
  assert.throws(() => normalizeHumanAuthoringRequest(request({ activity:{ ...request().activity, start_year:0 } })), /signed non-zero historical year/);
  assert.throws(() => normalizeHumanAuthoringRequest(request({ sources:[] })), /HUMAN_AUTHORING_SOURCE_REQUIRED/);
});

test('role code/category derivation is deterministic at the human compiler boundary', () => {
  assert.equal(roleCodeFromLabel('Grand Vizier'), 'grand_vizier');
  assert.equal(roleCategoryForRelation('rules'), 'ruler');
  assert.equal(roleCategoryForRelation('serves'), 'service');
});

test('compiled Activity payload is UUID-only and full-temporal before native writer execution', () => {
  const normalized = normalizeHumanAuthoringRequest(request());
  const payload = activityPayload({ personId:UUIDS.person, polityId:UUIDS.polity, roleId:UUIDS.role, relation:{ id:UUIDS.relation, code:'rules' }, periodBasis:{ id:UUIDS.period, code:'reign' }, activity:normalized.activity, sources:[{ id:UUIDS.source, locator:'p. 1', disposition:'created' }] });
  assert.equal(payload.person_id, UUIDS.person);
  assert.equal(payload.relation_type_id, UUIDS.relation);
  assert.equal(payload.period_basis_id, UUIDS.period);
  assert.equal(payload.activity_start_granularity, 'year');
  assert.equal(payload.activity_start_calendar, 'unspecified_historical');
  assert.deepEqual(payload.source_links, [{ source_id:UUIDS.source, source_locator_key:'p. 1' }]);
  for (const forbidden of ['person_name','polity_name','politic_name','relation_type','period_basis','role']) assert.equal(Object.hasOwn(payload, forbidden), false);
  assert.equal(HUMAN_AUTHORING_MARKER, 'ATLAS_HUMAN_AUTHORING_V1');
});
