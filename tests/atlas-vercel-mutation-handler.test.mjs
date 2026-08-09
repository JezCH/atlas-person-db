import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  createVercelMutationHandler,
  createHeaderAuthorizer,
  bearerToken,
  safeTokenEqual,
  requireEnv
} = require('../server/atlas-vercel-mutation-handler.js');

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

test('bearer token parsing is strict', () => {
  assert.equal(bearerToken({ authorization: 'Bearer abc' }), 'abc');
  assert.equal(bearerToken({ Authorization: 'bearer xyz' }), 'xyz');
  assert.equal(bearerToken({ authorization: 'Basic abc' }), null);
  assert.equal(bearerToken({}), null);
});

test('token comparison is exact', () => {
  assert.equal(safeTokenEqual('secret', 'secret'), true);
  assert.equal(safeTokenEqual('secret', 'wrong'), false);
  assert.equal(safeTokenEqual(null, 'secret'), false);
});

test('required env fails closed', () => {
  assert.equal(requireEnv({ X: ' value ' }, 'X'), 'value');
  assert.throws(() => requireEnv({}, 'X'), /X is required/);
});

test('authorizer rejects missing or wrong token', async () => {
  const authorize = createHeaderAuthorizer({ env: { ATLAS_MUTATION_TOKEN: 'secret' } });
  assert.deepEqual(await authorize({ headers: {} }), { authorized: false, reason: 'unauthorized' });
  assert.deepEqual(await authorize({ headers: { authorization: 'Bearer wrong' } }), { authorized: false, reason: 'unauthorized' });
  assert.deepEqual(await authorize({ headers: { authorization: 'Bearer secret' } }), { authorized: true });
});

test('unauthorized request is rejected before opening a database connection', async () => {
  let clientFactoryCalls = 0;
  const handler = createVercelMutationHandler({
    clientFactory: async () => { clientFactoryCalls += 1; throw new Error('database must not be opened'); },
    env: { SUPABASE_DB_URL: 'postgresql://example.invalid/db', ATLAS_MUTATION_TOKEN: 'secret' }
  });
  const res = responseCapture();
  await handler({ method:'POST', headers:{ authorization:'Bearer wrong' }, body:{} }, res);
  assert.equal(res.statusCode,401);
  assert.equal(JSON.parse(res.body).error,'unauthorized');
  assert.equal(clientFactoryCalls,0);
});

test('unsupported method is rejected before auth and database connection', async () => {
  let clientFactoryCalls = 0;
  const handler = createVercelMutationHandler({
    clientFactory: async () => { clientFactoryCalls += 1; throw new Error('database must not be opened'); },
    env: { SUPABASE_DB_URL: 'postgresql://example.invalid/db', ATLAS_MUTATION_TOKEN: 'secret' }
  });
  const res = responseCapture();
  await handler({ method:'GET', headers:{}, body:null }, res);
  assert.equal(res.statusCode,405);
  assert.equal(JSON.parse(res.body).error,'method not allowed');
  assert.equal(clientFactoryCalls,0);
});
