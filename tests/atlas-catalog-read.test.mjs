import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  MAX_RESULTS,
  POLITY_LOOKUP_SQL,
  ROLE_LOOKUP_SQL,
  searchCatalog,
  createCatalogReadHandler
} = require('../server/atlas-catalog-read-handler.js');
const atlasRead = require('../api/atlas-read.js');

function mockResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.body = String(value || ''); }
  };
}

test('catalog search uses bounded polity and role queries', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [{ canonical_name_en: 'Chola Empire' }] };
    }
  };

  const polity = await searchCatalog({ client, kind: 'polity', query: 'Chola' });
  assert.equal(polity.length, 1);
  assert.equal(calls[0].sql, POLITY_LOOKUP_SQL);
  assert.deepEqual(calls[0].params, ['%Chola%', 'Chola', MAX_RESULTS]);
  assert.match(POLITY_LOOKUP_SQL, /limit \$3/i);
  assert.match(POLITY_LOOKUP_SQL, /polity_names/i);

  await searchCatalog({ client, kind: 'role', query: 'Emperor' });
  assert.equal(calls[1].sql, ROLE_LOOKUP_SQL);
  assert.deepEqual(calls[1].params, ['%Emperor%', 'Emperor', MAX_RESULTS]);
  assert.match(ROLE_LOOKUP_SQL, /r\.is_active=true/i);
  assert.match(ROLE_LOOKUP_SQL, /role_names/i);
});

test('catalog read returns a compact search result and closes the client', async () => {
  let ended = false;
  const handler = createCatalogReadHandler({
    env: { SUPABASE_DB_URL: 'postgresql://example.invalid/atlas' },
    clientFactory: async () => ({ async end() { ended = true; } }),
    search: async ({ kind, query }) => {
      assert.equal(kind, 'polity');
      assert.equal(query, 'Chola');
      return [{
        canonical_name_en: 'Chola Empire',
        display_name_ko: '촐라 제국',
        polity_type: 'historical_polity',
        historicity: 'historical'
      }];
    }
  });

  const res = mockResponse();
  await handler({ method: 'GET', query: { kind: 'polity', q: 'Chola' } }, res);
  const payload = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.schema, 'atlas-catalog-read/v1');
  assert.equal(payload.kind, 'polity');
  assert.equal(payload.query, 'Chola');
  assert.equal(payload.count, 1);
  assert.equal(payload.results[0].canonical_name_en, 'Chola Empire');
  assert.equal(ended, true);
});

test('catalog read rejects invalid kind and query before opening the database', async () => {
  let factoryCalls = 0;
  const handler = createCatalogReadHandler({
    env: { SUPABASE_DB_URL: 'postgresql://example.invalid/atlas' },
    clientFactory: async () => { factoryCalls += 1; throw new Error('must not connect'); }
  });

  const badKind = mockResponse();
  await handler({ method: 'GET', query: { kind: 'person', q: 'Ateas' } }, badKind);
  assert.equal(badKind.statusCode, 400);
  assert.equal(JSON.parse(badKind.body).code, 'INVALID_CATALOG_KIND');

  const emptyQuery = mockResponse();
  await handler({ method: 'GET', query: { kind: 'polity', q: '' } }, emptyQuery);
  assert.equal(emptyQuery.statusCode, 400);
  assert.equal(JSON.parse(emptyQuery.body).code, 'INVALID_CATALOG_QUERY');
  assert.equal(factoryCalls, 0);
});

test('consolidated atlas read recognizes the catalog surface', () => {
  assert.equal(atlasRead.selectReadSurface({ query: { __atlas_read_surface: 'catalog' } }), 'catalog');
  assert.equal(atlasRead.selectReadSurface({ url: '/api/atlas-read?__atlas_read_surface=catalog&kind=polity&q=Chola' }), 'catalog');
});
