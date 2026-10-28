import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  POLITY_LIST_SQL,
  POLITY_DETAIL_SQL,
  POLITY_GOVERNANCE_PERIODS_SQL,
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
      if (sql === POLITY_GOVERNANCE_PERIODS_SQL) {
        assert.deepEqual(params, [POLITY_ID]);
        return { rows: [] };
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
  assert.deepEqual(detail.governance_periods, []);
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

test('Polity query preserves the existing UI corpus, Unicode matching and filtered summary', async () => {
  const row = polityRow();
  row.names.push({ locale: 'en', name: 'Nippon', name_type: 'alias' });
  const orphan = { id: '00000000-0000-4000-8000-000000000202', canonical_name_en: 'Korean Empire', preferred_name_ko: '대한제국', activities: [] };
  const before = JSON.stringify([row, orphan]);
  const client = { query: async () => ({ rows: [row, orphan] }) };
  for (const query of ['일본 Japan', 'Ｎｉｐｐｏｎ', '일본'.normalize('NFD'), '인물 A', '천황', '일본 제국', 'historical_polity', 'reign']) {
    const data = await readPolities({ client, query });
    assert.deepEqual(data.polities.map(p => p.id), [POLITY_ID], query);
    assert.equal(data.summary.total_polities, 1);
    assert.equal(data.summary.activity_count, 2);
    assert.equal(data.polities[0].activities[0].id, row.activities[0].id);
  }
  assert.equal((await readPolities({ client, query: 'korean\t  empire' })).polities[0].id, orphan.id);
  assert.equal((await readPolities({ client, query: 'missing' })).summary.total_polities, 0);
  assert.equal((await readPolities({ client, query: '' })).polities.length, 2);
  assert.equal(JSON.stringify([row, orphan]), before);
});

test('Polity list handler forwards URL/framework queries through the actual service', async () => {
  let sqlCalls = 0;
  const handler = createPolityReadHandler({ env: { SUPABASE_DB_URL: 'postgresql://offline.invalid/atlas' }, clientFactory: async () => ({
    query: async () => { sqlCalls++; return { rows: [polityRow()] }; }, end: async () => {}
  }) });
  for (const req of [{ url: '/?q=missing' }, { query: { q: 'missing' } }]) {
    const res = mockResponse(); await handler(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(JSON.parse(res.body).summary.total_polities, 0);
  }
  assert.equal(sqlCalls, 2, 'one existing list query per request, not a database cost reduction');
});

test('Polity list rejects ambiguous, oversized and malformed search input before DB access', async () => {
  let calls = 0;
  const handler = createPolityReadHandler({ env: { SUPABASE_DB_URL: 'postgresql://offline.invalid/atlas' }, clientFactory: async () => { calls++; throw Error('must not connect'); } });
  for (const req of [{ url: '/?q=a&q=b' }, { query: { q: ['a','b'] } }, { query: { q: 'x'.repeat(201) } }, { url: 'http://[' }, { query: { q: {} } }]) {
    const res = mockResponse(); await handler(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(JSON.parse(res.body).code, 'INVALID_SEARCH_QUERY');
  }
  assert.equal(calls, 0);
});

test('list omits dossier-only temporal metadata while UUID detail preserves it', async () => {
  const row = polityRow();
  Object.assign(row.activities[0], { activity_start_month: 3, activity_start_day: 15,
    activity_start_granularity: 'day', activity_start_certainty: 'uncertain', activity_start_calendar: 'julian' });
  const before = JSON.stringify(row);
  const list = await readPolities({ client: { query: async () => ({ rows: [row] }) } });
  assert.equal(Object.hasOwn(list.polities[0].activities[0], 'activity_start_month'), false);
  assert.equal(list.polities[0].activities[0].id, row.activities[0].id);
  let queries = 0;
  const detail = await readPolityDetail({ client: { query: async () => { queries++; return queries === 1 ? { rowCount: 1, rows: [row] } : { rows: [] }; } }, polityId: POLITY_ID });
  for (const field of ['month','day','granularity','certainty','calendar']) {
    assert.equal(detail.activities[0]['activity_start_' + field], row.activities[0]['activity_start_' + field]);
  }
  assert.equal(queries, 2, 'existing Activity and governance detail queries remain; no DB reduction claimed');
  assert.equal(JSON.stringify(row), before);
});

test('navigation pilot references only present UUIDs, preserves rows and never infers identity edges', async () => {
  const ids=['5fb816f2-2d44-55f9-a9c4-35e31625df38','e76162a0-8a7e-4d81-8a76-3a068f4194e0'];
  const rows=ids.map((id,i)=>({...polityRow(),id,canonical_name_en:i?'Korean Empire':'Joseon',preferred_name_ko:i?'대한제국':'조선'}));
  rows.push({...polityRow(),canonical_name_en:'Joseon name lookalike'});
  const before=JSON.stringify(rows);const client={query:async()=>({rows})};
  const result=await readPolities({client});
  assert.equal(result.polities.length,rows.length,'default listing remains complete');
  const collection=result.navigation_collections[0];
  assert.equal(collection.kind,'nonexclusive_navigation');assert.deepEqual(collection.polity_ids,ids);
  assert.match(collection.description,/비배타적/);assert.match(collection.description,/승계/);
  assert.equal(collection.evidence.url,'https://sillok.history.go.kr/id/kza_13410013_002');
  assert.equal(collection.evidence.source_ids.length,2);
  assert.equal(Object.hasOwn(result,'edges'),false);assert.equal(Object.hasOwn(collection,'successor_polity_id'),false);
  assert.equal(JSON.stringify(rows),before);
  const missing=await readPolities({client:{query:async()=>({rows:[rows[2]]})}});
  assert.deepEqual(missing.navigation_collections,[],'matching a name cannot create membership');
  const narrowed=await readPolities({client,query:'대한제국'});
  assert.deepEqual(narrowed.navigation_collections[0].polity_ids,[ids[1]],'metadata cannot introduce a filtered-out UUID');
});
