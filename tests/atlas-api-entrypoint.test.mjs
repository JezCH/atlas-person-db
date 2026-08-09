import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const api = readFileSync(new URL('../api/atlas-mutate.js', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const admin = readFileSync(new URL('../admin.html', import.meta.url), 'utf8');


test('api entrypoint uses server mutation handler and pg client only', () => {
  assert.match(api, /require\("pg"\)/);
  assert.match(api, /createVercelMutationHandler/);
  assert.match(api, /await client\.connect\(\)/);
  assert.doesNotMatch(api, /ATLAS_MUTATION_TOKEN|SUPABASE_DB_URL|service_role|postgres:\/\/|postgresql:\/\//);
});

test('server runtime dependency is explicit', () => {
  assert.equal(pkg.private, true);
  assert.equal(typeof pkg.dependencies?.pg, 'string');
});

test('browser pages do not load server entrypoint or pg', () => {
  for (const html of [index, admin]) {
    assert.doesNotMatch(html, /atlas-mutate\.js/);
    assert.doesNotMatch(html, /node_modules\/pg|require\("pg"\)/);
  }
});
