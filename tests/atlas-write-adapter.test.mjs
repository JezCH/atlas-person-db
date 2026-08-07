import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createAdapter, normalizeInput } = require('../atlas-write-adapter.js');
const { resolveMode } = require('../atlas-write-mode.js');

function fakeDb({ fail = null } = {}) {
  const calls = [];
  const chain = {
    select() { calls.push(['select']); return chain; },
    single: async () => fail ? { error: new Error(fail) } : { data: { id: 101 }, error: null },
    eq: async (...args) => { calls.push(['eq', ...args]); return fail ? { error: new Error(fail) } : { error: null }; }
  };
  return {
    calls,
    from(table) {
      calls.push(['from', table]);
      return {
        insert(payload) { calls.push(['insert', payload]); return chain; },
        update(payload) { calls.push(['update', payload]); return chain; },
        delete() { calls.push(['delete']); return chain; }
      };
    }
  };
}

const valid = {
  person_name: '  Ada Lovelace ',
  politic_name: ' United Kingdom ',
  activity_start: 1842,
  activity_end: 1852,
  role: 'Mathematician',
  period_basis: 'intellectual_activity',
  notes: ''
};

test('mode resolver fails closed', () => {
  assert.equal(resolveMode('legacy-only', () => {}), 'legacy-only');
  assert.equal(resolveMode('shadow-validate', () => {}), 'shadow-validate');
  assert.equal(resolveMode('dual-write', () => {}), 'legacy-only');
  assert.equal(resolveMode('v2-only', () => {}), 'legacy-only');
});

test('normalization validates and trims', () => {
  const parsed = normalizeInput(valid);
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.value.person_name, 'Ada Lovelace');
  assert.equal(parsed.value.politic_name, 'United Kingdom');
  assert.equal(parsed.value.notes, null);
});

test('legacy create targets only person_politics', async () => {
  const db = fakeDb();
  const adapter = createAdapter({ db, mode: 'legacy-only', modeResolver: resolveMode });
  const result = await adapter.createActivity(valid);
  assert.equal(result.legacy.committed, true);
  assert.equal(result.v2.committed, false);
  assert.deepEqual(result.legacy.record_ids, [101]);
  assert.equal(db.calls.some((call) => call[0] === 'from' && call[1] === 'person_politics'), true);
  assert.equal(db.calls.some((call) => String(call[1] || '').includes('atlas_v2')), false);
});

test('invalid create performs zero writes', async () => {
  const db = fakeDb();
  const adapter = createAdapter({ db, mode: 'legacy-only', modeResolver: resolveMode });
  const result = await adapter.createActivity({ ...valid, person_name: '', activity_end: 1800 });
  assert.equal(result.legacy.attempted, false);
  assert.equal(db.calls.length, 0);
  assert.ok(result.errors.length >= 2);
});

test('update and delete require identifiers', async () => {
  const db = fakeDb();
  const adapter = createAdapter({ db, mode: 'legacy-only', modeResolver: resolveMode });
  assert.equal((await adapter.updateActivity('', valid)).legacy.attempted, false);
  assert.equal((await adapter.deleteActivity(null)).legacy.attempted, false);
  assert.equal(db.calls.length, 0);
});

test('import rejects mixed invalid rows without partial write', async () => {
  const db = fakeDb();
  const adapter = createAdapter({ db, mode: 'legacy-only', modeResolver: resolveMode });
  const result = await adapter.importActivities([valid, { ...valid, politic_name: '' }]);
  assert.equal(result.legacy.attempted, false);
  assert.equal(result.row_outcomes[0].committed, false);
  assert.equal(result.row_outcomes[1].errors.length > 0, true);
  assert.equal(db.calls.length, 0);
});

test('shadow validation never commits v2', async () => {
  const db = fakeDb();
  const compiled = [];
  const adapter = createAdapter({
    db,
    mode: 'shadow-validate',
    modeResolver: resolveMode,
    shadowCompiler: async (operation, payload) => { compiled.push([operation, payload]); return { valid: true }; }
  });
  const result = await adapter.createActivity(valid);
  assert.equal(result.mode, 'shadow-validate');
  assert.equal(result.legacy.committed, true);
  assert.equal(result.v2.attempted, true);
  assert.equal(result.v2.committed, false);
  assert.deepEqual(result.v2.validation, { valid: true });
  assert.equal(compiled.length, 1);
});

test('database failures are explicit', async () => {
  const db = fakeDb({ fail: 'blocked' });
  const adapter = createAdapter({ db, mode: 'legacy-only', modeResolver: resolveMode });
  const result = await adapter.createActivity(valid);
  assert.equal(result.legacy.attempted, true);
  assert.equal(result.legacy.committed, false);
  assert.deepEqual(result.errors, ['blocked']);
});

test('reconciliation remains disabled', async () => {
  const db = fakeDb();
  const adapter = createAdapter({ db, mode: 'legacy-only', modeResolver: resolveMode });
  const result = await adapter.reconcileCanonical({ digest: 'abc' });
  assert.equal(result.legacy.attempted, false);
  assert.equal(result.v2.committed, false);
  assert.match(result.errors[0], /disabled/);
  assert.equal(db.calls.length, 0);
});
