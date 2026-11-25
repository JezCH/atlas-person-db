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


test('polity catalogue includes temporal designation matches without replacing stable identity', async () => {
  assert.match(POLITY_LOOKUP_SQL, /left join lateral\s*\(/i);
  assert.match(POLITY_LOOKUP_SQL, /from atlas_v2\.polity_designations pd/i);
  assert.match(POLITY_LOOKUP_SQL, /join atlas_v2\.polity_designation_names pdn on pdn\.polity_designation_id=pd\.id/i);
  assert.match(POLITY_LOOKUP_SQL, /pd\.polity_id=p\.id and pdn\.name ilike \$1/i);
  assert.match(POLITY_LOOKUP_SQL, /where dm\.matches is not null\s+or exists/i);
  assert.match(POLITY_LOOKUP_SQL, /dm\.exact_match then 0/i);
  assert.match(POLITY_LOOKUP_SQL, /coalesce\(dm\.matches, '\[\]'::jsonb\) as matched_designations/i);
  assert.match(POLITY_LOOKUP_SQL, /en\.name as canonical_name_en/i);
  assert.match(POLITY_LOOKUP_SQL, /ko\.name as display_name_ko/i);
  const result = {id:'stable-polity', canonical_name_en:'Stable Polity', display_name_ko:'기본 국호',matched_designations:[{designation_id:'period-id',locale:'en',name:'Period Name',valid_from_year:100,valid_to_year:200}]};
  for (const q of ['Period Name','시대 국호','Stable Polity']) {
    const rows = await searchCatalog({kind:'polity',query:q,client:{async query(sql,params) {
      assert.equal(sql,POLITY_LOOKUP_SQL);
      assert.deepEqual(params,[`%${q}%`,q,MAX_RESULTS]);
      return {rows:[result]};
    }}});
    assert.deepEqual(rows,[result]);
  }
});
