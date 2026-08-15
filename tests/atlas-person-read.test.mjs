import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  PERSON_READ_SQL,
  readPersons
} = require('../server/atlas-person-read-service.js');
const { createPersonReadHandler } = require('../server/atlas-person-read-handler.js');

function mockResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.body = String(value || ''); }
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
      id: '00000000-0000-4000-8000-000000000001',
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

test('Person read handler is GET-only and returns the versioned Person envelope', async () => {
  let ended = false;
  const handler = createPersonReadHandler({
    env: { SUPABASE_DB_URL: 'postgresql://example.invalid/atlas' },
    clientFactory: async () => ({
      async query() { return { rows: [] }; },
      async end() { ended = true; }
    })
  });

  const getRes = mockResponse();
  await handler({ method: 'GET' }, getRes);
  const payload = JSON.parse(getRes.body);
  assert.equal(getRes.statusCode, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.source, 'v2-person-read');
  assert.equal(payload.schema, 'atlas-person-read/v1');
  assert.deepEqual(payload.persons, []);
  assert.deepEqual(payload.summary.historicity_values, []);
  assert.equal(ended, true);

  const postRes = mockResponse();
  await handler({ method: 'POST' }, postRes);
  assert.equal(postRes.statusCode, 405);
});
