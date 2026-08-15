import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const {
  PERSON_LIST_FACET_SQL,
  attachPersonListFacets,
  readPersonListFacets
} = require('../server/atlas-person-list-facet-service.js');

const handlerSource = fs.readFileSync(new URL('../server/atlas-person-read-handler.js', import.meta.url), 'utf8');

const PERSON_A = '00000000-0000-4000-8000-000000000001';
const PERSON_B = '00000000-0000-4000-8000-000000000002';
const POLITY = '00000000-0000-4000-8000-000000000101';
const RELATION = '7ca4de8f-01d4-542c-acc1-a06848c6742c';
const ROLE = '00000000-0000-4000-8000-000000000201';
const BASIS = '00000000-0000-4000-8000-000000000301';

function facetRow(personId = PERSON_A, overrides = {}) {
  return {
    person_id: personId,
    polity_id: POLITY,
    polity_name_en: 'Scythian Kingdom',
    polity_name_ko: '스키타이 왕국',
    relation_type_id: RELATION,
    relation_type_code: 'rules',
    relation_type_category: 'authority',
    role_id: ROLE,
    role_code: 'king',
    role_category: 'ruler',
    role_source_label: 'King',
    role_name_en: 'King',
    role_name_ko: '왕',
    period_basis_id: BASIS,
    period_basis_code: 'reign',
    period_basis_name_en: 'Reign',
    period_basis_name_ko: '재위',
    ...overrides
  };
}

test('compact Person list facets preserve only the semantic dimensions needed by Main filters', () => {
  for (const token of [
    'person_id', 'polity_id', 'relation_type_id', 'role_id', 'period_basis_id',
    'polity_name_en', 'polity_name_ko', 'relation_type_code', 'relation_type_category',
    'role_code', 'role_category', 'role_source_label', 'role_name_en', 'role_name_ko',
    'period_basis_code', 'period_basis_name_en', 'period_basis_name_ko'
  ]) assert.match(PERSON_LIST_FACET_SQL, new RegExp(token));

  assert.doesNotMatch(PERSON_LIST_FACET_SQL, /canonical_key|activity_start|activity_end|confidence|chronology_status|notes|source_locator|source_key|sha256|bytes/i);
  assert.match(PERSON_LIST_FACET_SQL, /select distinct/i);
});

test('facet attachment deduplicates repeated Activity dimensions and preserves null Role without inventing a value', () => {
  const persons = [
    Object.freeze({ id: PERSON_A, display_name: 'A' }),
    Object.freeze({ id: PERSON_B, display_name: 'B' })
  ];
  const rows = [
    facetRow(),
    facetRow(),
    facetRow(PERSON_A, {
      role_id: null,
      role_code: null,
      role_category: null,
      role_source_label: null,
      role_name_en: null,
      role_name_ko: null
    })
  ];
  const result = attachPersonListFacets(persons, rows);

  assert.equal(result[0].facets.polities.length, 1);
  assert.equal(result[0].facets.relations.length, 1);
  assert.equal(result[0].facets.roles.length, 1);
  assert.equal(result[0].facets.period_bases.length, 1);
  assert.equal(result[0].facets.polities[0].display_name, '스키타이 왕국');
  assert.equal(result[0].facets.roles[0].display_name, '왕');
  assert.equal(result[0].facets.period_bases[0].display_name, '재위');
  assert.deepEqual(result[1].facets, { polities: [], relations: [], roles: [], period_bases: [] });
  assert.equal('canonical_key' in result[0], false);
});

test('facet read performs one bounded SQL query for any non-empty Person list and zero queries for an empty list', async () => {
  let calls = 0;
  const client = {
    async query(sql) {
      calls += 1;
      assert.equal(sql, PERSON_LIST_FACET_SQL);
      return { rows: [facetRow()] };
    }
  };
  const persons = [Object.freeze({ id: PERSON_A, display_name: 'A' }), Object.freeze({ id: PERSON_B, display_name: 'B' })];
  const result = await readPersonListFacets({ client, persons });
  assert.equal(calls, 1);
  assert.equal(result.length, 2);
  assert.equal(result[0].facets.polities.length, 1);

  calls = 0;
  const empty = await readPersonListFacets({ client, persons: [] });
  assert.equal(calls, 0);
  assert.deepEqual(empty, []);
});

test('Person list handler enriches only list mode through the bounded facet service', () => {
  assert.match(handlerSource, /atlas-person-list-facet-service\.js/);
  assert.match(handlerSource, /readListFacets\(\{ client, persons: data\.persons \}\)/);
  const detailBranch = handlerSource.slice(handlerSource.indexOf('if (requestedPersonId)'), handlerSource.indexOf('const data = await readPersons'));
  assert.doesNotMatch(detailBranch, /readListFacets/);
});
