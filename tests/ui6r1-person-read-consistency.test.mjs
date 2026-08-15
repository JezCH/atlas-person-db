import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const personRead = require('../server/atlas-person-read-service.js');
const personSemantics = require('../server/atlas-person-list-semantic-service.js');

const {
  PERSON_DETAIL_SQL,
  ACTIVITY_DETAIL_SQL,
  PERSON_SOURCE_SQL,
  ACTIVITY_SOURCE_SQL,
  readPersonDetail
} = personRead;
const {
  PERSON_LIST_SEMANTIC_SQL,
  attachPersonListSemantics
} = personSemantics;

const PERSON_ID = '52237f0f-0679-5c65-adaa-a36a9c535a6f';
const ACTIVITY_ID = '16781cf4-9279-5ce0-a7f4-0c491d7af9c5';
const POLITY_ID = '00000000-0000-4000-8000-000000000101';
const ROLE_ID = '00000000-0000-4000-8000-000000000201';
const BASIS_ID = '00000000-0000-4000-8000-000000000301';

function unresolvedRelationActivityRow() {
  return {
    id: ACTIVITY_ID,
    person_id: PERSON_ID,
    polity_id: POLITY_ID,
    relation_type_id: null,
    role_id: ROLE_ID,
    period_basis_id: BASIS_ID,
    activity_start: -1620,
    activity_start_month: null,
    activity_start_day: null,
    activity_start_granularity: null,
    activity_start_certainty: null,
    activity_start_calendar: null,
    activity_end: -1590,
    activity_end_month: null,
    activity_end_day: null,
    activity_end_granularity: null,
    activity_end_certainty: null,
    activity_end_calendar: null,
    confidence: 'legacy_asserted',
    chronology_status: 'exact_as_recorded',
    notes: 'Early Hittite king with unresolved Stage 2 relation semantics.',
    relation_type_code: null,
    relation_type_category: null,
    polity_name_en: 'Hittite Kingdom',
    polity_name_ko: '히타이트 왕국',
    role_code: 'great_king',
    role_category: 'ruler',
    role_source_label: 'Great King',
    role_name_en: 'Great King',
    role_name_ko: '대왕',
    period_basis_code: 'reign',
    period_basis_name_en: 'Reign',
    period_basis_name_ko: '재위'
  };
}

test('Person detail read preserves an Activity whose Stage 2 relation_type_id is still unresolved', async () => {
  assert.match(ACTIVITY_DETAIL_SQL, /left join atlas_v2\.person_polity_relation_types prt/i);
  assert.doesNotMatch(ACTIVITY_DETAIL_SQL, /\njoin atlas_v2\.person_polity_relation_types prt/i);

  const client = {
    async query(sql, params) {
      assert.deepEqual(params, [PERSON_ID]);
      if (sql === PERSON_DETAIL_SQL) {
        return {
          rowCount: 1,
          rows: [{
            id: PERSON_ID,
            person_type: 'historical',
            historicity: 'historical',
            names: [
              { locale: 'en', name: 'Mursili I', name_type: 'canonical', is_preferred: true },
              { locale: 'ko', name: '무르실리 1세', name_type: 'display', is_preferred: true }
            ],
            descriptions: []
          }]
        };
      }
      if (sql === ACTIVITY_DETAIL_SQL) return { rowCount: 1, rows: [unresolvedRelationActivityRow()] };
      if (sql === PERSON_SOURCE_SQL || sql === ACTIVITY_SOURCE_SQL) return { rowCount: 0, rows: [] };
      throw new Error(`unexpected query: ${String(sql).slice(0, 80)}`);
    }
  };

  const detail = await readPersonDetail({ client, personId: PERSON_ID });
  assert.ok(detail);
  assert.equal(detail.activity_count, 1);
  assert.equal(detail.first_activity_year, -1620);
  assert.equal(detail.last_activity_year, -1590);
  assert.equal(detail.activities.length, 1);
  assert.equal(detail.activities[0].id, ACTIVITY_ID);
  assert.equal(detail.activities[0].polity.display_name, '히타이트 왕국');
  assert.equal(detail.activities[0].role.display_name, '대왕');
  assert.equal(detail.activities[0].period_basis.code, 'reign');
  assert.equal(detail.activities[0].relation, null);
});

test('Person list semantics keep the Activity tuple and resolvable facets when relation_type_id is unresolved', () => {
  assert.match(PERSON_LIST_SEMANTIC_SQL, /left join atlas_v2\.person_polity_relation_types prt/i);
  assert.doesNotMatch(PERSON_LIST_SEMANTIC_SQL, /\njoin atlas_v2\.person_polity_relation_types prt/i);

  const row = unresolvedRelationActivityRow();
  const enriched = attachPersonListSemantics(
    [Object.freeze({ id: PERSON_ID, display_name: '무르실리 1세', activity_count: 1 })],
    [row]
  );

  assert.equal(enriched.length, 1);
  assert.equal(enriched[0].activity_count, 1);
  assert.equal(enriched[0].activity_summaries.length, 1);
  assert.equal(enriched[0].activity_summaries[0].id, ACTIVITY_ID);
  assert.equal(enriched[0].activity_summaries[0].relation, null);
  assert.equal(enriched[0].facets.polities.length, 1);
  assert.equal(enriched[0].facets.polities[0].display_name, '히타이트 왕국');
  assert.equal(enriched[0].facets.roles.length, 1);
  assert.equal(enriched[0].facets.roles[0].display_name, '대왕');
  assert.equal(enriched[0].facets.period_bases.length, 1);
  assert.equal(enriched[0].facets.period_bases[0].code, 'reign');
  assert.deepEqual(enriched[0].facets.relations, []);
});

test('UI-6R1 does not weaken required Period Basis resolution while repairing nullable Relation Type reads', () => {
  assert.match(ACTIVITY_DETAIL_SQL, /\njoin atlas_v2\.period_bases pb/i);
  assert.match(PERSON_LIST_SEMANTIC_SQL, /\njoin atlas_v2\.period_bases pb/i);
});
