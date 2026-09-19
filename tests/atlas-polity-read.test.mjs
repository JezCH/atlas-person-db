import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  POLITY_LIST_SQL,
  POLITY_DETAIL_SQL,
  projectPolity,
  buildSummary,
  readPolities,
  readPolityDetail
} = require('../server/atlas-polity-read-service.js');
const { createPolityReadHandler } = require('../server/atlas-polity-read-handler.js');
const { TEMPORAL_POLITY_DESIGNATION_JOIN_SQL } = require('../server/atlas-polity-temporal-designation-read.js');

const POLITY_ID = '00000000-0000-4000-8000-000000000201';
const PERSON_A = '00000000-0000-4000-8000-000000000001';
const PERSON_B = '00000000-0000-4000-8000-000000000002';

function polityRow() {
  return {
    id: POLITY_ID,
    canonical_key: 'japan',
    polity_type: 'historical_polity',
    historicity: 'historical',
    canonical_name_en: 'Japan',
    preferred_name_ko: '일본',
    names: [
      { locale: 'en', name: 'Japan', name_type: 'canonical', is_preferred: true },
      { locale: 'ko', name: '일본', name_type: 'display', is_preferred: true }
    ],
    activities: [
      {
        id: '00000000-0000-4000-8000-000000000101',
        person_id: PERSON_A,
        person_name_en: 'Person A',
        person_name_ko: '인물 A',
        polity_designation_name_en: 'Empire of Japan',
        polity_designation_name_ko: '일본 제국',
        activity_start: 1868,
        activity_end: 1912,
        chronology_status: 'reviewed',
        relation_code: 'rules',
        relation_category: 'authority',
        role_code: 'emperor',
        role_name: '천황',
        period_basis: 'reign',
        confidence: 'high'
      },
      {
        id: '00000000-0000-4000-8000-000000000102',
        person_id: PERSON_B,
        person_name_en: 'Person B',
        person_name_ko: '인물 B',
        activity_start: 1946,
        activity_end: null,
        chronology_status: 'ongoing',
        relation_code: 'serves',
        relation_category: 'affiliation',
        role_code: 'office',
        role_name: '공직',
        period_basis: 'term',
        confidence: 'high'
      }
    ]
  };
}

function mockResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.body = String(value || ''); }
  };
}

test('Polity read projection exposes linked Person chronology and dataset statistics', () => {
  const polity = projectPolity(polityRow());
  assert.equal(polity.display_name, '일본');
  assert.equal(polity.activity_count, 2);
  assert.equal(polity.person_count, 2);
  assert.equal(polity.first_activity_year, 1868);
  assert.equal(polity.last_activity_year, 1912);
  assert.equal(polity.has_ongoing_activity, true);
  assert.equal(polity.activities[0].person_display_name, '인물 A');
  assert.equal(polity.activities[0].polity_designation_name_ko, '일본 제국');
  assert.equal(polity.activities[0].relation_code, 'rules');
  assert.equal(polity.activities[0].role_name, '천황');

  const summary = buildSummary([polity, {
    activity_count: 0,
    person_count: 0,
    unresolved_activity_count: 0,
    has_ongoing_activity: false,
    activities: []
  }]);
  assert.deepEqual(summary, {
    total_polities: 2,
    linked_polities: 1,
    orphan_polities: 1,
    activity_count: 2,
    unique_linked_persons: 2,
    person_polity_links: 2,
    ongoing_polities: 1,
    unresolved_activity_count: 0
  });
});

test('Polity SQL reads all catalog identities and joins Person Activity semantics', () => {
  for (const token of [
    'atlas_v2.polities',
    'atlas_v2.polity_names',
    'atlas_v2.person_politics_v2',
    'atlas_v2.person_names',
    'atlas_v2.polity_designations',
    'atlas_v2.polity_designation_names',
    'person_id',
    'activity_start',
    'activity_end',
    'chronology_status',
    'relation_code',
    'role_name',
    'period_basis'
  ]) assert.match(POLITY_LIST_SQL, new RegExp(token));
  assert.match(POLITY_DETAIL_SQL, /where p\.id = \$1::uuid/);
  assert.ok(POLITY_LIST_SQL.includes(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL));
  assert.doesNotMatch(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL, /order by/i);
  assert.doesNotMatch(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL, /limit\s+1/i);
});

test('Polity read service supports list and UUID detail reads', async () => {
  const client = {
    async query(sql, params) {
      if (sql === POLITY_LIST_SQL) {
        assert.equal(params, undefined);
        return { rows: [polityRow()] };
      }
      if (sql === POLITY_DETAIL_SQL) {
        assert.deepEqual(params, [POLITY_ID]);
        return { rowCount: 1, rows: [polityRow()] };
      }
      throw new Error('unexpected query');
    }
  };

  const list = await readPolities({ client });
  assert.equal(list.summary.total_polities, 1);
  assert.equal(list.polities[0].activities.length, 2);

  const detail = await readPolityDetail({ client, polityId: POLITY_ID });
  assert.equal(detail.id, POLITY_ID);
  assert.equal(detail.person_count, 2);
});

test('Polity read handler exposes list/detail modes and rejects malformed UUIDs before DB access', async () => {
  let factoryCalls = 0;
  const handler = createPolityReadHandler({
    env: { SUPABASE_DB_URL: 'postgresql://example.invalid/atlas' },
    clientFactory: async () => {
      factoryCalls += 1;
      return { async end() {} };
    },
    readList: async () => ({ polities: [projectPolity(polityRow())], summary: buildSummary([projectPolity(polityRow())]) }),
    readDetail: async () => projectPolity(polityRow())
  });

  const listRes = mockResponse();
  await handler({ method: 'GET' }, listRes);
  assert.equal(listRes.statusCode, 200);
  assert.equal(JSON.parse(listRes.body).mode, 'list');

  const detailRes = mockResponse();
  await handler({ method: 'GET', query: { polity_id: POLITY_ID } }, detailRes);
  assert.equal(detailRes.statusCode, 200);
  assert.equal(JSON.parse(detailRes.body).polity.id, POLITY_ID);

  const invalidRes = mockResponse();
  await handler({ method: 'GET', query: { polity_id: 'bad-id' } }, invalidRes);
  assert.equal(invalidRes.statusCode, 400);
  assert.equal(JSON.parse(invalidRes.body).code, 'INVALID_POLITY_ID');
  assert.equal(factoryCalls, 2);

  const postRes = mockResponse();
  await handler({ method: 'POST' }, postRes);
  assert.equal(postRes.statusCode, 405);
});
