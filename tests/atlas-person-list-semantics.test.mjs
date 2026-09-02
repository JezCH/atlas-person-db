import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const {
  PERSON_LIST_SEMANTIC_SQL,
  projectCompactActivity,
  attachPersonListSemantics,
  readPersonListSemantics
} = require('../server/atlas-person-list-semantic-service.js');

const handlerSource = fs.readFileSync(new URL('../server/atlas-person-read-handler.js', import.meta.url), 'utf8');

const PERSON_A = '00000000-0000-4000-8000-000000000001';
const PERSON_B = '00000000-0000-4000-8000-000000000002';
const POLITY_A = '00000000-0000-4000-8000-000000000101';
const POLITY_B = '00000000-0000-4000-8000-000000000102';
const RELATION_RULES = '7ca4de8f-01d4-542c-acc1-a06848c6742c';
const RELATION_SERVES = '0fc4827f-8543-52f7-9e9a-3173b0c698a7';
const ROLE_KING = '00000000-0000-4000-8000-000000000201';
const ROLE_GENERAL = '00000000-0000-4000-8000-000000000202';
const BASIS_REIGN = '00000000-0000-4000-8000-000000000301';
const BASIS_SERVICE = '00000000-0000-4000-8000-000000000302';

function semanticRow({
  id = '00000000-0000-4000-8000-000000000401',
  personId = PERSON_A,
  polityId = POLITY_A,
  polityEn = 'Kingdom A',
  polityKo = 'A 왕국',
  relationId = RELATION_RULES,
  relationCode = 'rules',
  relationCategory = 'authority',
  roleId = ROLE_KING,
  roleCode = 'king',
  roleCategory = 'ruler',
  roleSourceLabel = 'King',
  roleEn = 'King',
  roleKo = '왕',
  basisId = BASIS_REIGN,
  basisCode = 'reign',
  basisEn = 'Reign',
  basisKo = '재위',
  start = 100,
  end = 120,
  startCertainty = 'exact',
  endCertainty = 'exact',
  confidence = 'reviewed',
  chronologyStatus = 'reviewed',
  notes = 'Court chronicle note'
} = {}) {
  return {
    id,
    person_id: personId,
    polity_id: polityId,
    polity_name_en: polityEn,
    polity_name_ko: polityKo,
    relation_type_id: relationId,
    relation_type_code: relationId == null ? null : relationCode,
    relation_type_category: relationId == null ? null : relationCategory,
    role_id: roleId,
    role_code: roleId == null ? null : roleCode,
    role_category: roleId == null ? null : roleCategory,
    role_source_label: roleId == null ? null : roleSourceLabel,
    role_name_en: roleId == null ? null : roleEn,
    role_name_ko: roleId == null ? null : roleKo,
    period_basis_id: basisId,
    period_basis_code: basisCode,
    period_basis_name_en: basisEn,
    period_basis_name_ko: basisKo,
    activity_start: start,
    activity_start_month: null,
    activity_start_day: null,
    activity_start_granularity: 'year',
    activity_start_certainty: startCertainty,
    activity_start_calendar: 'unspecified_historical',
    activity_end: end,
    activity_end_month: null,
    activity_end_day: null,
    activity_end_granularity: 'year',
    activity_end_certainty: endCertainty,
    activity_end_calendar: 'unspecified_historical',
    confidence,
    chronology_status: chronologyStatus,
    notes
  };
}

test('compact list semantic SQL returns one Activity-shaped tuple including legacy-readable notes and no private detail payload', () => {
  for (const token of [
    'pp.id', 'pp.person_id', 'pp.polity_id', 'pp.relation_type_id', 'pp.role_id', 'pp.period_basis_id',
    'pp.activity_start', 'pp.activity_end', 'activity_start_granularity', 'activity_start_certainty',
    'activity_start_calendar', 'activity_end_granularity', 'activity_end_certainty', 'activity_end_calendar',
    'pp.confidence', 'pp.chronology_status', 'pp.notes', 'relation_type_code', 'relation_type_category',
    'role_code', 'role_category', 'role_source_label', 'period_basis_code'
  ]) assert.match(PERSON_LIST_SEMANTIC_SQL, new RegExp(token.replace('.', '\\.')));

  assert.match(PERSON_LIST_SEMANTIC_SQL, /left join atlas_v2\.person_polity_relation_types prt/i);
  assert.match(PERSON_LIST_SEMANTIC_SQL, /\njoin atlas_v2\.period_bases pb/i);
  assert.match(PERSON_LIST_SEMANTIC_SQL, /where pp\.person_id = any\(\$1::uuid\[\]\)/i);
  assert.match(PERSON_LIST_SEMANTIC_SQL, /order by pp\.person_id, pp\.activity_start, pp\.activity_end, pp\.polity_id, pp\.id/i);
  assert.match(PERSON_LIST_SEMANTIC_SQL, /order by pn\.id\s+limit 1/i);
  assert.match(PERSON_LIST_SEMANTIC_SQL, /order by rn\.id\s+limit 1/i);
  assert.match(PERSON_LIST_SEMANTIC_SQL, /order by pbn\.id\s+limit 1/i);
  // Only the public verification date is extracted; the private JSON payload stays server-side.
  assert.match(PERSON_LIST_SEMANTIC_SQL, /pp\.source_locator->>'ongoing_as_of' as ongoing_as_of/);
  assert.doesNotMatch(PERSON_LIST_SEMANTIC_SQL.replace("pp.source_locator->>'ongoing_as_of' as ongoing_as_of", ""), /source_locator|source_key|sha256|bytes|canonical_key/i);
});

test('compact Activity projection preserves the actual Polity-Relation-Role-Basis-temporal tuple plus notes', () => {
  const projected = projectCompactActivity(semanticRow());
  assert.equal(projected.polity.display_name, 'A 왕국');
  assert.equal(projected.relation.code, 'rules');
  assert.equal(projected.role.display_name, '왕');
  assert.equal(projected.period_basis.display_name, '재위');
  assert.deepEqual(projected.start, {
    year: 100,
    month: null,
    day: null,
    granularity: 'year',
    certainty: 'exact',
    calendar: 'unspecified_historical'
  });
  assert.deepEqual(projected.end, {
    year: 120,
    month: null,
    day: null,
    granularity: 'year',
    certainty: 'exact',
    calendar: 'unspecified_historical'
  });
  assert.equal(projected.confidence, 'reviewed');
  assert.equal(projected.chronology_status, 'reviewed');
  assert.equal(projected.notes, 'Court chronicle note');
  assert.equal('person_id' in projected, false);
});

test('list semantics never fabricate a cross-product between independent facets', () => {
  const persons = [Object.freeze({ id: PERSON_A, display_name: 'A', activity_count: 2 })];
  const rows = [
    semanticRow({
      id: '00000000-0000-4000-8000-000000000401',
      polityId: POLITY_A,
      polityEn: 'Kingdom A',
      polityKo: 'A 왕국',
      relationId: RELATION_RULES,
      relationCode: 'rules',
      relationCategory: 'authority',
      roleId: ROLE_KING,
      roleCode: 'king',
      roleKo: '왕',
      basisId: BASIS_REIGN,
      basisCode: 'reign',
      basisKo: '재위',
      start: 100,
      end: 120
    }),
    semanticRow({
      id: '00000000-0000-4000-8000-000000000402',
      polityId: POLITY_B,
      polityEn: 'Kingdom B',
      polityKo: 'B 왕국',
      relationId: RELATION_SERVES,
      relationCode: 'serves',
      relationCategory: 'service',
      roleId: ROLE_GENERAL,
      roleCode: 'general',
      roleCategory: 'military',
      roleSourceLabel: 'General',
      roleEn: 'General',
      roleKo: '장군',
      basisId: BASIS_SERVICE,
      basisCode: 'term',
      basisEn: 'Term',
      basisKo: '재임',
      start: 130,
      end: 140
    })
  ];

  const [person] = attachPersonListSemantics(persons, rows);
  assert.equal(person.activity_summaries.length, 2);
  assert.deepEqual(
    person.activity_summaries.map((activity) => [
      activity.polity.display_name,
      activity.relation?.code,
      activity.role?.display_name,
      activity.period_basis.code,
      activity.start.year,
      activity.end.year
    ]),
    [
      ['A 왕국', 'rules', '왕', 'reign', 100, 120],
      ['B 왕국', 'serves', '장군', 'term', 130, 140]
    ]
  );
  assert.equal(person.activity_summaries.some((activity) => activity.polity.id === POLITY_A && activity.relation?.id === RELATION_SERVES), false);
  assert.equal(person.activity_summaries.some((activity) => activity.polity.id === POLITY_B && activity.role?.id === ROLE_KING), false);
  assert.equal(person.facets.polities.length, 2);
  assert.equal(person.facets.relations.length, 2);
  assert.equal(person.facets.roles.length, 2);
  assert.equal(person.facets.period_bases.length, 2);
});

test('unresolved nullable Relation Type keeps the compact Activity and all other resolvable dimensions', () => {
  const persons = [Object.freeze({ id: PERSON_A, display_name: 'A', activity_count: 1 })];
  const [person] = attachPersonListSemantics(persons, [semanticRow({ relationId: null })]);
  assert.equal(person.activity_summaries.length, 1);
  assert.equal(person.activity_summaries[0].relation, null);
  assert.equal(person.activity_summaries[0].polity.display_name, 'A 왕국');
  assert.equal(person.activity_summaries[0].role.display_name, '왕');
  assert.equal(person.activity_summaries[0].period_basis.code, 'reign');
  assert.equal(person.facets.relations.length, 0);
  assert.equal(person.facets.polities.length, 1);
  assert.equal(person.facets.roles.length, 1);
  assert.equal(person.facets.period_bases.length, 1);
});

test('list semantic projection fails closed instead of silently hiding an Activity count mismatch', () => {
  assert.throws(
    () => attachPersonListSemantics(
      [Object.freeze({ id: PERSON_A, display_name: 'A', activity_count: 2 })],
      [semanticRow()]
    ),
    (error) => {
      assert.equal(error.code, 'PERSON_LIST_ACTIVITY_COUNT_MISMATCH');
      assert.equal(error.person_id, PERSON_A);
      assert.equal(error.expected_activity_count, 2);
      assert.equal(error.observed_activity_count, 1);
      return true;
    }
  );
});

test('semantic list read is one bounded query for any non-empty Person list and zero for an empty list', async () => {
  const persons = [
    Object.freeze({ id: PERSON_A, display_name: 'A', activity_count: 1 }),
    Object.freeze({ id: PERSON_B, display_name: 'B', activity_count: 0 })
  ];
  let calls = 0;
  const client = {
    async query(sql, params) {
      calls += 1;
      assert.equal(sql, PERSON_LIST_SEMANTIC_SQL);
      assert.deepEqual(params, [[PERSON_A, PERSON_B]]);
      return { rows: [semanticRow()] };
    }
  };
  const result = await readPersonListSemantics({ client, persons });
  assert.equal(calls, 1);
  assert.equal(result[0].activity_summaries.length, 1);
  assert.equal(result[1].activity_summaries.length, 0);

  calls = 0;
  const empty = await readPersonListSemantics({ client, persons: [] });
  assert.equal(calls, 0);
  assert.deepEqual(empty, []);
});

test('Person list handler uses the unified semantic projection instead of a second facet-only model', () => {
  assert.match(handlerSource, /atlas-person-list-semantic-service\.js/);
  assert.match(handlerSource, /readListSemantics\(\{ client, persons: data\.persons \}\)/);
  assert.doesNotMatch(handlerSource, /readPersonListFacets|atlas-person-list-facet-service/);
  const detailBranch = handlerSource.slice(handlerSource.indexOf('if (requestedPersonId)'), handlerSource.indexOf('const data = await readPersons'));
  assert.doesNotMatch(detailBranch, /readListSemantics/);
});