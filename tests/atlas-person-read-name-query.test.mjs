import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  MAX_QUERY_LENGTH,
  MAX_LIST_LIMIT,
  normalizeSearchText,
  personMatchesQuery,
  personMatchesNamuWikiStatus,
  createPersonReadHandler
} = require('../server/atlas-person-read-handler.js');
const { PERSON_READ_SQL } = require('../server/atlas-person-read-service.js');

function mockResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.body = String(value || ''); }
  };
}

function person(id, en, ko, namuwiki = undefined) {
  return {
    id,
    person_type: 'historical',
    historicity: 'historical',
    names: [
      { locale: 'en', name: en, name_type: 'canonical', is_preferred: true },
      { locale: 'ko', name: ko, name_type: 'display', is_preferred: true }
    ],
    descriptions: [],
    external_references: namuwiki === undefined ? {} : { namuwiki },
    activity_count: 1,
    first_activity_year: -1500,
    last_activity_year: -1450
  };
}

test('person name query normalization is Unicode/case/space tolerant', () => {
  assert.equal(normalizeSearchText('  HATSHEPSUT   '), 'hatshepsut');
  assert.equal(personMatchesQuery({
    canonical_name_en: 'Hatshepsut',
    preferred_name_ko: '하트셉수트',
    names: []
  }, 'HATSHE'), true);
  assert.equal(personMatchesQuery({
    canonical_name_en: 'Hatshepsut',
    preferred_name_ko: '하트셉수트',
    names: []
  }, '하트'), true);
});

test('Person read handler returns only matching Production persons for q', async () => {
  const rows = [
    person('00000000-0000-4000-8000-000000000001', 'Hatshepsut', '하트셉수트'),
    person('00000000-0000-4000-8000-000000000002', 'Hatshepsut Maatkare', '하트셉수트'),
    person('00000000-0000-4000-8000-000000000003', 'Nefertiti', '네페르티티')
  ];
  let semanticInput = null;
  const handler = createPersonReadHandler({
    env: { SUPABASE_DB_URL: 'postgresql://example.invalid/atlas' },
    clientFactory: async () => ({
      async query(sql) {
        assert.equal(sql, PERSON_READ_SQL);
        return { rows };
      },
      async end() {}
    }),
    readListSemantics: async ({ persons }) => {
      semanticInput = persons;
      return persons;
    }
  });

  const res = mockResponse();
  await handler({ method: 'GET', url: '/api/atlas-person-read?q=%ED%95%98%ED%8A%B8' }, res);
  const payload = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(payload.query, '하트');
  assert.equal(payload.summary.total, 2);
  assert.deepEqual(payload.persons.map((row) => row.id), [
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002'
  ]);
  assert.equal(semanticInput.length, 2);
});

test('NamuWiki status matcher keeps missing distinct from not_found', () => {
  assert.equal(personMatchesNamuWikiStatus({ external_references: {} }, 'missing'), true);
  assert.equal(personMatchesNamuWikiStatus({ external_references: { namuwiki: null } }, 'missing'), true);
  assert.equal(personMatchesNamuWikiStatus({ external_references: { namuwiki: { status: 'not_found' } } }, 'missing'), false);
  assert.equal(personMatchesNamuWikiStatus({ external_references: { namuwiki: { status: 'not_found' } } }, 'not_found'), true);
  assert.equal(personMatchesNamuWikiStatus({ external_references: { namuwiki: { status: 'linked' } } }, 'linked'), true);
});

test('Person read handler returns a bounded batch of only missing NamuWiki references', async () => {
  const rows = [
    person('00000000-0000-4000-8000-000000000001', 'Missing One', '미연결 1'),
    person('00000000-0000-4000-8000-000000000002', 'Linked One', '연결', {
      status: 'linked', document_title: '연결', url: 'https://namu.wiki/w/%EC%97%B0%EA%B2%B0'
    }),
    person('00000000-0000-4000-8000-000000000003', 'Checked Missing', '없음 확인', { status: 'not_found' }),
    person('00000000-0000-4000-8000-000000000004', 'Missing Two', '미연결 2')
  ];
  let semanticInput = null;
  const handler = createPersonReadHandler({
    env: { SUPABASE_DB_URL: 'postgresql://example.invalid/atlas' },
    clientFactory: async () => ({
      async query(sql) {
        assert.equal(sql, PERSON_READ_SQL);
        return { rows };
      },
      async end() {}
    }),
    readListSemantics: async ({ persons }) => {
      semanticInput = persons;
      return persons;
    }
  });

  const res = mockResponse();
  await handler({ method: 'GET', url: '/api/atlas-person-read?namuwiki_status=missing&limit=1' }, res);
  const payload = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(payload.namuwiki_status, 'missing');
  assert.equal(payload.limit, 1);
  assert.equal(payload.matched_total, 2);
  assert.equal(payload.summary.total, 1);
  assert.deepEqual(payload.persons.map((row) => row.id), ['00000000-0000-4000-8000-000000000001']);
  assert.equal(semanticInput.length, 1);
});

test('Person read handler can select previously checked not_found references', async () => {
  const rows = [
    person('00000000-0000-4000-8000-000000000001', 'Missing', '미연결'),
    person('00000000-0000-4000-8000-000000000002', 'Not Found', '없음 확인', { status: 'not_found' })
  ];
  const handler = createPersonReadHandler({
    env: { SUPABASE_DB_URL: 'postgresql://example.invalid/atlas' },
    clientFactory: async () => ({
      async query(sql) {
        assert.equal(sql, PERSON_READ_SQL);
        return { rows };
      },
      async end() {}
    }),
    readListSemantics: async ({ persons }) => persons
  });

  const res = mockResponse();
  await handler({ method: 'GET', url: '/api/atlas-person-read?namuwiki_status=not_found' }, res);
  const payload = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(payload.summary.total, 1);
  assert.equal(payload.persons[0].id, '00000000-0000-4000-8000-000000000002');
});

test('Person read handler rejects conflicting or invalid list filters before DB access', async () => {
  let factoryCalled = false;
  const handler = createPersonReadHandler({
    env: { SUPABASE_DB_URL: 'postgresql://example.invalid/atlas' },
    clientFactory: async () => {
      factoryCalled = true;
      throw new Error('must not connect');
    }
  });

  const conflictRes = mockResponse();
  await handler({
    method: 'GET',
    query: {
      person_id: '00000000-0000-4000-8000-000000000001',
      q: 'Hatshepsut'
    }
  }, conflictRes);
  assert.equal(conflictRes.statusCode, 400);
  assert.equal(JSON.parse(conflictRes.body).code, 'PERSON_READ_MODE_CONFLICT');

  const statusConflictRes = mockResponse();
  await handler({
    method: 'GET',
    query: {
      person_id: '00000000-0000-4000-8000-000000000001',
      namuwiki_status: 'missing'
    }
  }, statusConflictRes);
  assert.equal(statusConflictRes.statusCode, 400);
  assert.equal(JSON.parse(statusConflictRes.body).code, 'PERSON_READ_MODE_CONFLICT');

  const oversizedRes = mockResponse();
  await handler({ method: 'GET', query: { q: 'x'.repeat(MAX_QUERY_LENGTH + 1) } }, oversizedRes);
  assert.equal(oversizedRes.statusCode, 400);
  assert.equal(JSON.parse(oversizedRes.body).code, 'INVALID_PERSON_QUERY');

  const invalidStatusRes = mockResponse();
  await handler({ method: 'GET', query: { namuwiki_status: 'unknown' } }, invalidStatusRes);
  assert.equal(invalidStatusRes.statusCode, 400);
  assert.equal(JSON.parse(invalidStatusRes.body).code, 'INVALID_NAMUWIKI_STATUS');

  const invalidLimitRes = mockResponse();
  await handler({ method: 'GET', query: { limit: String(MAX_LIST_LIMIT + 1) } }, invalidLimitRes);
  assert.equal(invalidLimitRes.statusCode, 400);
  assert.equal(JSON.parse(invalidLimitRes.body).code, 'INVALID_LIST_LIMIT');
  assert.equal(factoryCalled, false);
});
