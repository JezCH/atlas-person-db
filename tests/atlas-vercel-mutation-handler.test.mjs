import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createHeaderAuthorizer, bearerToken, requireEnv } = require('../server/atlas-vercel-mutation-handler.js');

test('bearer token parsing is strict', () => {
  assert.equal(bearerToken({ authorization: 'Bearer abc' }), 'abc');
  assert.equal(bearerToken({ Authorization: 'bearer xyz' }), 'xyz');
  assert.equal(bearerToken({ authorization: 'Basic abc' }), null);
  assert.equal(bearerToken({}), null);
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
