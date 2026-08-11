import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const adapter = fs.readFileSync(new URL('../atlas-server-write-adapter.js', import.meta.url), 'utf8');

function rootNames() {
  return fs.readdirSync(root).sort();
}

test('retired root authoring/import residue is absent', () => {
  const names = rootNames();
  const stale = names.filter((name) =>
    /^expected-persons.*\.json$/.test(name)
    || /^pending-records.*\.json$/.test(name)
    || /^person-locales.*\.js$/.test(name)
    || name === 'search-index.js'
    || name === 'verification-data-merge.js'
  );
  assert.deepEqual(stale, []);
});

test('retired canonical reconciliation is not exposed by the active browser writer', () => {
  assert.doesNotMatch(adapter, /reconcileCanonical|mutate\("reconcile"/);
});

test('completed localization apply executable is retired from active repository surface', () => {
  assert.equal(fs.existsSync(new URL('../migration/phase-9/scripts/phase9-apply-ui-localization.mjs', import.meta.url)), false);
});
