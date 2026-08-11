import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { postgresSslOptions, normalizePem } = require('../server/atlas-postgres-client.js');

test('PostgreSQL client enables certificate verification when Supabase CA is configured', () => {
  const ssl = postgresSslOptions({ SUPABASE_DB_CA: '-----BEGIN CERTIFICATE-----\\nABC\\n-----END CERTIFICATE-----' });
  assert.equal(ssl.rejectUnauthorized, true);
  assert.match(ssl.ca, /BEGIN CERTIFICATE/);
  assert.equal(ssl.ca.includes('\\n'), false);
  assert.match(ssl.ca, /\nABC\n/);
});

test('PostgreSQL client preserves deployed TLS compatibility until CA rollout is configured', () => {
  assert.deepEqual(postgresSslOptions({}), { rejectUnauthorized: false });
  assert.equal(normalizePem('   '), null);
});
