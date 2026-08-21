import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { attachPersonListSemantics } = require('../server/atlas-person-list-semantic-service.js');

function activityRow({ id, personId, polityId, polityName, relationId, relationCode }) {
  return {
    id,
    person_id: personId,
    polity_id: polityId,
    relation_type_id: relationId,
    relation_type_code: relationCode,
    relation_type_category: relationCode === 'opposes' ? 'counterparty' : 'affiliation',
    role_id: null,
    period_basis_id: 'period-general',
    period_basis_code: 'general_activity',
    polity_name_en: polityName,
    polity_name_ko: null,
    activity_start: 1919,
    activity_end: 1919,
    activity_start_month: null,
    activity_start_day: null,
    activity_start_granularity: 'year',
    activity_start_certainty: 'exact',
    activity_start_calendar: 'gregorian',
    activity_end_month: null,
    activity_end_day: null,
    activity_end_granularity: 'year',
    activity_end_certainty: 'exact',
    activity_end_calendar: 'gregorian',
    confidence: 'high',
    chronology_status: 'reviewed',
    notes: null
  };
}

test('opposes keeps the counterparty in activity detail but excludes it from representative polity facets', () => {
  const personId = 'person-yu-gwan-sun';
  const [person] = attachPersonListSemantics(
    [{ id: personId, activity_count: 1 }],
    [activityRow({
      id: 'activity-opposes-japan',
      personId,
      polityId: 'polity-japan',
      polityName: 'Empire of Japan',
      relationId: 'relation-opposes',
      relationCode: 'opposes'
    })]
  );

  assert.deepEqual(person.facets.polities, []);
  assert.equal(person.activity_summaries.length, 1);
  assert.equal(person.activity_summaries[0].polity.canonical_name_en, 'Empire of Japan');
  assert.equal(person.activity_summaries[0].relation.code, 'opposes');
  assert.deepEqual(person.facets.relations.map((relation) => relation.code), ['opposes']);
});

test('representative polity facets keep own-side polity while excluding an opposed counterparty', () => {
  const personId = 'person-mixed-relations';
  const [person] = attachPersonListSemantics(
    [{ id: personId, activity_count: 2 }],
    [
      activityRow({
        id: 'activity-rules-own-side',
        personId,
        polityId: 'polity-own-side',
        polityName: 'Own-side Polity',
        relationId: 'relation-rules',
        relationCode: 'rules'
      }),
      activityRow({
        id: 'activity-opposes-counterparty',
        personId,
        polityId: 'polity-counterparty',
        polityName: 'Counterparty Empire',
        relationId: 'relation-opposes',
        relationCode: 'opposes'
      })
    ]
  );

  assert.deepEqual(person.facets.polities.map((polity) => polity.canonical_name_en), ['Own-side Polity']);
  assert.equal(person.activity_summaries.length, 2);
  assert.deepEqual(person.activity_summaries.map((activity) => activity.relation.code), ['rules', 'opposes']);
});
