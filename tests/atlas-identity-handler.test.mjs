import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createIdentityHandler } = require('../server/atlas-identity-handler.js');

function responseCapture() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(key, value) { this.headers[key] = value; },
    end(value = '') { this.body = String(value); }
  };
}

function clientForReplay() {
  return {
    async query(sql) {
      const text = String(sql);
      if (/where p\.canonical_key=\$1/.test(text)) {
        return { rows: [{
          id: 'person-1', person_type: 'historical', historicity: 'historical',
          canonical_name_en: 'Belisarius', display_name_ko: '벨리사리우스'
        }] };
      }
      return { rows: [] };
    },
    async end() {}
  };
}

const env = {
  SUPABASE_DB_URL: 'postgresql://example.invalid/db',
  ATLAS_MUTATION_TOKEN: 'secret'
};

test('identity handler fails gracefully when server configuration is missing', async () => {
  const handler = createIdentityHandler({ clientFactory: async () => { throw new Error('must not connect'); }, env: {} });
  const res = responseCapture();
  await handler({ method: 'POST', headers: {}, body: { operation: 'create_person', payload: {} } }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(JSON.parse(res.body).code, 'SERVER_CONFIGURATION_ERROR');
});

test('identity handler requires administrator authorization before DB connection', async () => {
  let connected = false;
  const handler = createIdentityHandler({ clientFactory: async () => { connected = true; return clientForReplay(); }, env });
  const res = responseCapture();
  await handler({ method: 'POST', headers: {}, body: { operation: 'create_person', payload: {} } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(connected, false);
});

test('identity handler accepts server bearer and returns committed replay', async () => {
  let receivedUrl = null;
  const handler = createIdentityHandler({
    clientFactory: async (url) => { receivedUrl = url; return clientForReplay(); },
    env
  });
  const res = responseCapture();
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer secret' },
    body: {
      operation: 'create_person',
      payload: { canonical_name_en: 'Belisarius', display_name_ko: '벨리사리우스' }
    }
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(receivedUrl, env.SUPABASE_DB_URL);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.outcome.committed, true);
  assert.equal(body.outcome.replay, true);
});

test('identity handler rejects non-POST methods without touching auth or DB', async () => {
  const handler = createIdentityHandler({ clientFactory: async () => { throw new Error('must not connect'); }, env });
  const res = responseCapture();
  await handler({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 405);
});
