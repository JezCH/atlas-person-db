import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createNormalizedReadHandler } = require('../server/atlas-normalized-read-handler.js');
const { createVercelMutationHandler } = require('../server/atlas-vercel-mutation-handler.js');
const { createDuplicateReviewHandler } = require('../server/atlas-duplicate-review-handler.js');
const { createIdentityHandler } = require('../server/atlas-identity-handler.js');

function responseCapture() {
  let body = '';
  return {
    statusCode: null,
    headers: {},
    setHeader(key, value) { this.headers[String(key).toLowerCase()] = value; },
    end(value = '') { body = String(value); },
    get body() { return body; }
  };
}

async function assertConfiguration503(handler, request) {
  const res = responseCapture();
  await handler(request, res);
  assert.equal(res.statusCode, 503);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, false);
  assert.equal(body.code, 'SERVER_CONFIGURATION_ERROR');
}

test('all server DB handlers report missing configuration as JSON 503 instead of throwing during module boot', async () => {
  const neverConnect = async () => { throw new Error('must not connect'); };
  await assertConfiguration503(
    createNormalizedReadHandler({ clientFactory: neverConnect, env: {} }),
    { method: 'GET' }
  );
  await assertConfiguration503(
    createVercelMutationHandler({ clientFactory: neverConnect, env: {} }),
    { method: 'POST', headers: {}, body: {} }
  );
  await assertConfiguration503(
    createDuplicateReviewHandler({ clientFactory: neverConnect, env: {} }),
    { method: 'GET', headers: {} }
  );
  await assertConfiguration503(
    createIdentityHandler({ clientFactory: neverConnect, env: {} }),
    { method: 'POST', headers: {}, body: { operation: 'create_person', payload: {} } }
  );
});

async function assertDatabase503(handler, request) {
  const res = responseCapture();
  await handler(request, res);
  assert.equal(res.statusCode, 503);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, false);
  assert.equal(body.code, 'DATABASE_UNAVAILABLE');
}

test('authenticated DB handlers convert connection failure to deterministic JSON 503', async () => {
  const unavailable = async () => { throw new Error('synthetic connection failure'); };
  const env = { SUPABASE_DB_URL: 'postgresql://example.invalid/db', ATLAS_MUTATION_TOKEN: 'secret' };

  await assertDatabase503(
    createNormalizedReadHandler({ clientFactory: unavailable, env }),
    { method: 'GET' }
  );
  await assertDatabase503(
    createVercelMutationHandler({ clientFactory: unavailable, env }),
    { method: 'POST', headers: { authorization: 'Bearer secret' }, body: {} }
  );
  await assertDatabase503(
    createDuplicateReviewHandler({ clientFactory: unavailable, env }),
    { method: 'GET', headers: { authorization: 'Bearer secret' } }
  );
  await assertDatabase503(
    createIdentityHandler({ clientFactory: unavailable, env }),
    {
      method: 'POST',
      headers: { authorization: 'Bearer secret' },
      body: { operation: 'create_person', payload: { canonical_name_en: 'A', display_name_ko: '가' } }
    }
  );
});
