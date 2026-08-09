import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../atlas-reconciliation-bootstrap.js', import.meta.url), 'utf8');

test('index loads the reviewed reconciliation chain in dependency order', () => {
  const scripts = [
    'atlas-canonical-data.js',
    'atlas-reconciliation-planner.js',
    'atlas-reconciliation-controller.js',
    'atlas-legacy-reconciliation-executor.js',
    'atlas-reconciliation-integration.js',
    'atlas-reconciliation-bootstrap.js',
    'atlas-reader.js',
    'app.js'
  ];
  const positions = scripts.map((name) => index.indexOf(name));
  assert.equal(positions.every((value) => value >= 0), true);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('legacy ingest page-load script is no longer loaded', () => {
  assert.equal(index.includes('./ingest.js'), false);
});

test('bootstrap is dry-run only and does not enable browser commits', () => {
  assert.equal(bootstrap.includes('state: "dry-run"'), true);
  assert.equal(bootstrap.includes('state: "legacy-commit"'), false);
  assert.equal(bootstrap.includes('changed: 0'), true);
  assert.equal(bootstrap.includes('v2_committed: false'), true);
  assert.equal(bootstrap.includes('atlas_v2'), false);
  assert.equal(/\.(insert|update|delete)\(/.test(bootstrap), false);
});

test('bootstrap preserves reconcile promise and event contract', () => {
  assert.equal(bootstrap.includes('window.ATLAS_RECONCILE_PROMISE'), true);
  assert.equal(bootstrap.includes('atlas:reconciled'), true);
  assert.equal(bootstrap.includes('atlas:reconcile-error'), true);
});
