import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('Vercel Git integration only deploys main', () => {
  const rules = config?.git?.deploymentEnabled;
  assert.equal(typeof rules, 'object');
  assert.equal(rules.main, true, 'main must remain deployable');
  assert.equal(rules['**'], false, 'all non-main branches must be disabled by the catch-all minimatch rule');
});

test('data-only main commits still use the reviewed ignore-build gate', () => {
  assert.equal(config.ignoreCommand, 'node scripts/vercel-ignore-build.mjs');
});
