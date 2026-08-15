import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  PERSON_READ_SQL,
  PERSON_DETAIL_SQL,
  ACTIVITY_DETAIL_SQL,
  PERSON_SOURCE_SQL,
  ACTIVITY_SOURCE_SQL,
  readPersons,
  readPersonDetail
} = require('../server/atlas-person-read-service.js');
const { createPersonReadHandler } = require('../server/atlas-person-read-handler.js');

const PERSON_ID = '00000000-0000-4000-8000-000000000001';
const ACTIVITY_ID = '00000000-0000-4000-8000-000000000101';
const POLITY_ID = '00000000-0000-4000-8000-000000000201';
const RELATION_ID = '7ca4de8f-01d4-542c-acc1-a06848c6742c';
const ROLE_ID = '00000000-0000-4000-8000-000000000301';
const PERIOD_BASIS_ID = '00000000-0000-4000-8000-000000000401';

function mockResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.body = String(value || ''); }
  };
}

function detailPersonRow() {
  return {
    id: PERSON_ID,
    person_type: 'historical',
    historicity: 'historical',
    names: [
      { locale: 'en', name: 'Ateas', name_type: 'canonical', is_preferred: true },
      { locale: 'ko', name: '아테아스', name_type: 'display', is_preferred: true }
    ],
    descriptions: []
  };
}

function detailActivityRow() {
  return {
    id: ACTIVITY_ID,
    person_id: PERSON_ID,
    polity_id: POLITY_ID,
    relation_type_id: RELATION_ID,
    role_id: ROLE_ID,
    period_basis_id: PERIOD_BASIS_ID,
    activity_start: -360,
    activity_start_month: null,
    activity_start_day: null,
    activity_start_granularity: 'year',
    activity_start_certainty: 'uncertain',
    activity_start_calendar: 'unspecified_historical',
    activity_end: -339,
    activity_end_month: null,
    activity_end_day: null,
    activity_end_granularity: 'year',
    activity_end_certainty: 'exact',
    activity_end_calendar: 'unspecified_historical',
    confidence: 'likely',
    chronology_status: 'reviewed',
    notes: 'Start is an activity boundary, not an asserted accession year.',
    relation_type_code: 'rules',
    relation_type_category: 'authority',
    polity_name_en: 'Scythian Kingdom',
    polity_name_ko: '스키타이 왕국',
    role_code: 'king',
    role_category: 'ruler',
    role_source_label: 'King',
    role_name_en: 'King',
    role_name_ko: '왕',
    period_basis_code: 'reign',
    period_basis_name_en: 'Reign',
    period_basis_name_ko: '재위'
  };
}

function personSourceRow() {
  return {
    source_type: 'bibliographic_reference',
    title: 'A History of the Scythians',
    canonical_url: null,
    citation_text: 'Example Scholar, A History of the Scythians, 2024.'
  };
}

function activitySourceRow() {
  return {
    person_politics_id: ACTIVITY_ID,
    source_locator_key: 'pp. 40-42',
    source_type: 'web_bibliographic_reference',
    title: 'Ateas chronology study',
    canonical_url: 'https://example.org/ateas',
    citation_text: 'Example Journal 12 (2025), pp. 40-42.'
  };
}

test('Person Main read preserves DB historicity vocabulary instead of inventing a frontend enum', async () => {
  const rows = [
    {
      id: '00000000-0000-4000-8000-000000000004',
      person_type: 'historical',
      historicity: 'disputed_historicity',
      names: [{ locale: 'en', name: 'D', name_type: 'canonical', is_preferred: true }],
      descriptions: [],
      activity_count: 0,
      first_activity_year: null,
      last_activity_year: null
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      person_type: 'legendary',
      historicity: 'legendary',
      names: [
        { locale: 'en', name: 'Gilgamesh', name_type: 'canonical', is_preferred: true },
        { locale: 'ko', name: '길가메시', name_type: 'display', is_preferred: true }
      ],
      descriptions: [{ locale: 'ko', content: '전승에 나타나는 인물' }],
      activity_count: 1,
      first_activity_year: -2700,
      last_activity_year: -2600
    },
    {
      id: '00000000-0000-4000-8000-000000000003',
      person_type: 'mythological',
      historicity: 'mythological',
      names: [{ locale: 'en', name: 'C', name_type: 'canonical', is_preferred: true }],
      descriptions: [],
      activity_count: 1,
      first_activity_year: -2500,
      last_activity_year: -2400
    },
    {
      id: PERSON_ID,
      person_type: 'historical',
      historicity: 'historical',
      names: [
        { locale: 'en', name: 'Ateas', name_type: 'canonical', is_preferred: true },
        { locale: 'ko', name: '아테아스', name_type: 'display', is_preferred: true }
      ],
      descriptions: [],
      activity_count: 1,
      first_activity_year: -360,
      last_activity_year: -339
    }
  ];
  const client = { async query(sql) { assert.equal(sql, PERSON_READ_SQL); return { rows }; } };
  const result = await readPersons({ client });

  assert.deepEqual(result.summary.historicity_values, [
    'disputed_historicity',
    'historical',
    'legendary',
    'mythological'
  ]);
  assert.deepEqual(result.summary.by_historicity, {
    legendary: 1,
    mythological: 1,
    historical: 1,
    disputed_historicity: 1
  });
  assert.equal(result.persons[0].display_name, '길가메시');
  assert.equal(result.persons[0].historicity, 'legendary');
  assert.equal(result.persons[3].historicity, 'disputed_historicity');
  assert.equal('canonical_key' in result.persons[0], false);
  assert.doesNotMatch(PERSON_READ_SQL, /p\.canonical_key/);
});

test('Person Main read keeps chronology availability separate from historicity', async () => {
  const client = {
    async query() {
      return { rows: [{
        id: '00000000-0000-4000-8000-000000000005',
        person_type: 'historical',
        historicity: 'historical',
        names: [{ locale: 'en', name: 'Unknown-date Person', name_type: 'canonical', is_preferred: true }],
        descriptions: [],
        activity_count: 0,
        first_activity_year: null,
        last_activity_year: null
      }] };
    }
  };
  const result = await readPersons({ client });
  assert.equal(result.persons[0].historicity, 'historical');
  assert.equal(result.persons[0].first_activity_year, null);
  assert.equal(result.persons[0].last_activity_year, null);
});

test('Person detail exposes authoritative Activity semantics and readable provenance without raw Source identity leakage', async () => {
  const client = {
    async query(sql, params) {
      assert.deepEqual(params, [PERSON_ID]);
      if (sql === PERSON_DETAIL_SQL) return { rowCount: 1, rows: [detailPersonRow()] };
      if (sql === ACTIVITY_DETAIL_SQL) return { rowCount: 1, rows: [detailActivityRow()] };
      if (sql === PERSON_SOURCE_SQL) return { rowCount: 1, rows: [personSourceRow()] };
      if (sql === ACTIVITY_SOURCE_SQL) return { rowCount: 1, rows: [activitySourceRow()] };
      throw new Error('unexpected Person detail query');
    }
  };

  const person = await readPersonDetail({ client, personId: PERSON_ID });
  assert.equal(person.display_name, '아테아스');
  assert.equal(person.activity_count, 1);
  assert.equal(person.first_activity_year, -360);
  assert.equal(person.last_activity_year, -339);
  assert.equal(person.sources.length, 1);
  assert.deepEqual(person.sources[0], {
    title: 'A History of the Scythians',
    source_type: 'bibliographic_reference',
    canonical_url: null,
    citation_text: 'Example Scholar, A History of the Scythians, 2024.',
    locator: null,
    display_reference: 'Example Scholar, A History of the Scythians, 2024.'
  });

  const activity = person.activities[0];
  assert.equal(activity.id, ACTIVITY_ID);
  assert.equal(activity.polity.display_name, '스키타이 왕국');
  assert.deepEqual(activity.relation, {
    id: RELATION_ID,
    code: 'rules',
    category: 'authority'
  });
  assert.equal(activity.role.display_name, '왕');
  assert.equal(activity.period_basis.display_name, '재위');
  assert.deepEqual(activity.start, {
    year: -360,
    month: null,
    day: null,
    granularity: 'year',
    certainty: 'uncertain',
    calendar: 'unspecified_historical'
  });
  assert.deepEqual(activity.end, {
    year: -339,
    month: null,
    day: null,
    granularity: 'year',
    certainty: 'exact',
    calendar: 'unspecified_historical'
  });
  assert.equal(activity.confidence, 'likely');
  assert.equal(activity.chronology_status, 'reviewed');
  assert.match(activity.notes, /not an asserted accession year/);
  assert.deepEqual(activity.sources[0], {
    title: 'Ateas chronology study',
    source_type: 'web_bibliographic_reference',
    canonical_url: 'https://example.org/ateas',
    citation_text: 'Example Journal 12 (2025), pp. 40-42.',
    locator: 'pp. 40-42',
    display_reference: 'Example Journal 12 (2025), pp. 40-42.'
  });
  for (const source of [...person.sources, ...activity.sources]) {
    assert.equal('id' in source, false);
    assert.equal('source_key' in source, false);
    assert.equal('sha256' in source, false);
    assert.equal('bytes' in source, false);
  }
  assert.doesNotMatch(PERSON_SOURCE_SQL, /select\s+s\.id/i);
  assert.doesNotMatch(ACTIVITY_SOURCE_SQL, /select\s+[\s\S]*s\.id[\s,]/i);
  assert.doesNotMatch(ACTIVITY_DETAIL_SQL, /canonical_key/);
  for (const field of [
    'relation_type_id',
    'activity_start_month',
    'activity_start_day',
    'activity_start_granularity',
    'activity_start_certainty',
    'activity_start_calendar',
    'activity_end_month',
    'activity_end_day',
    'activity_end_granularity',
    'activity_end_certainty',
    'activity_end_calendar',
    'confidence',
    'chronology_status',
    'notes'
  ]) assert.match(ACTIVITY_DETAIL_SQL, new RegExp(field));
  for (const field of ['title', 'source_type', 'canonical_url', 'citation_text']) {
    assert.match(PERSON_SOURCE_SQL, new RegExp(field));
    assert.match(ACTIVITY_SOURCE_SQL, new RegExp(field));
  }
  assert.match(ACTIVITY_SOURCE_SQL, /source_locator_key/);
});

test('Person read handler supports list and UUID detail modes and rejects malformed IDs before DB access', async () => {
  let ended = false;
  const handler = createPersonReadHandler({
    env: { SUPABASE_DB_URL: 'postgresql://example.invalid/atlas' },
    clientFactory: async () => ({
      async query(sql) {
        if (sql === PERSON_READ_SQL) return { rows: [] };
        if (sql === PERSON_DETAIL_SQL) return { rowCount: 1, rows: [detailPersonRow()] };
        if (sql === ACTIVITY_DETAIL_SQL) return { rowCount: 1, rows: [detailActivityRow()] };
        if (sql === PERSON_SOURCE_SQL) return { rowCount: 1, rows: [personSourceRow()] };
        if (sql === ACTIVITY_SOURCE_SQL) return { rowCount: 1, rows: [activitySourceRow()] };
        throw new Error('unexpected handler query');
      },
      async end() { ended = true; }
    })
  });

  const listRes = mockResponse();
  await handler({ method: 'GET' }, listRes);
  const listPayload = JSON.parse(listRes.body);
  assert.equal(listRes.statusCode, 200);
  assert.equal(listPayload.ok, true);
  assert.equal(listPayload.schema, 'atlas-person-read/v1');
  assert.equal(listPayload.mode, 'list');
  assert.deepEqual(listPayload.persons, []);

  ended = false;
  const detailRes = mockResponse();
  await handler({ method: 'GET', query: { person_id: PERSON_ID } }, detailRes);
  const detailPayload = JSON.parse(detailRes.body);
  assert.equal(detailRes.statusCode, 200);
  assert.equal(detailPayload.mode, 'detail');
  assert.equal(detailPayload.person.id, PERSON_ID);
  assert.equal(detailPayload.person.activities[0].relation.code, 'rules');
  assert.equal(detailPayload.person.sources[0].title, 'A History of the Scythians');
  assert.equal(detailPayload.person.activities[0].sources[0].locator, 'pp. 40-42');
  assert.equal(ended, true);

  let factoryCalled = false;
  const rejectHandler = createPersonReadHandler({
    env: { SUPABASE_DB_URL: 'postgresql://example.invalid/atlas' },
    clientFactory: async () => { factoryCalled = true; throw new Error('must not connect'); }
  });
  const invalidRes = mockResponse();
  await rejectHandler({ method: 'GET', query: { person_id: 'not-a-uuid' } }, invalidRes);
  assert.equal(invalidRes.statusCode, 400);
  assert.equal(JSON.parse(invalidRes.body).code, 'INVALID_PERSON_ID');
  assert.equal(factoryCalled, false);

  const postRes = mockResponse();
  await handler({ method: 'POST' }, postRes);
  assert.equal(postRes.statusCode, 405);
});

test('Person detail returns 404 for a valid UUID that is not present', async () => {
  const handler = createPersonReadHandler({
    env: { SUPABASE_DB_URL: 'postgresql://example.invalid/atlas' },
    clientFactory: async () => ({
      async query(sql) {
        assert.equal(sql, PERSON_DETAIL_SQL);
        return { rowCount: 0, rows: [] };
      },
      async end() {}
    })
  });
  const res = mockResponse();
  await handler({ method: 'GET', url: `/api/atlas-person-read?person_id=${PERSON_ID}` }, res);
  assert.equal(res.statusCode, 404);
  assert.equal(JSON.parse(res.body).code, 'PERSON_NOT_FOUND');
});
