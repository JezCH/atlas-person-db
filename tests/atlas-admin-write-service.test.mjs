import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const adapterApi = require('../atlas-write-adapter.js');
const modeApi = require('../atlas-write-mode.js');
const shadowCompiler = require('../atlas-v2-shadow-compiler.js');
const { createAdminWriteService } = require('../atlas-admin-write-service.js');

function fakeDb(existingIds = new Map()) {
  const calls = [];
  return {
    calls,
    from(table) {
      calls.push(['from', table]);
      const filters = {};
      return {
        select() {
          return {
            eq(field, value) {
              filters[field] = value;
              return this;
            },
            limit: async () => {
              const key = [filters.person_name, filters.politic_name, filters.activity_start, filters.activity_end].join('|');
              const id = existingIds.get(key);
              return { data: id == null ? [] : [{ id }], error: null };
            }
          };
        },
        insert(payload) {
          calls.push(['insert', payload]);
          return { select() { return { single: async () => ({ data: { id: 101 }, error: null }) }; } };
        },
        update(payload) {
          calls.push(['update', payload]);
          return { eq: async (...args) => { calls.push(['update-eq', ...args]); return { error: null }; } };
        },
        delete() {
          return { eq: async (...args) => { calls.push(['delete-eq', ...args]); return { error: null }; } };
        }
      };
    }
  };
}

const row = {
  person_name: 'Ada Lovelace',
  politic_name: 'United Kingdom',
  activity_start: 1842,
  activity_end: 1852,
  role: 'Mathematician',
  period_basis: 'intellectual_activity',
  notes: null
};

test('admin write service creates through the adapter in legacy-only mode', async () => {
  const db = fakeDb();
  const service = createAdminWriteService({ db, adapterApi, mode: 'legacy-only', modeResolver: modeApi.resolveMode });
  const result = await service.saveRows([row]);
  assert.equal(result.inserted, 1);
  assert.equal(result.updated, 0);
  assert.deepEqual(result.failures, []);
  assert.equal(result.mode, 'legacy-only');
  assert.equal(db.calls.filter((call) => call[0] === 'from').every((call) => call[1] === 'person_politics'), true);
});

test('admin shadow-validate still commits legacy and compiles without v2 writes', async () => {
  const db = fakeDb();
  const service = createAdminWriteService({
    db,
    adapterApi,
    mode: 'shadow-validate',
    modeResolver: modeApi.resolveMode,
    shadowCompiler: shadowCompiler.compile
  });
  const result = await service.saveRows([row]);
  assert.equal(result.inserted, 1);
  assert.equal(result.updated, 0);
  assert.deepEqual(result.failures, []);
  assert.equal(result.mode, 'shadow-validate');
  assert.equal(db.calls.filter((call) => call[0] === 'from').every((call) => call[1] === 'person_politics'), true);
});

test('admin write service updates through the adapter when exact activity exists', async () => {
  const key = [row.person_name, row.politic_name, row.activity_start, row.activity_end].join('|');
  const db = fakeDb(new Map([[key, 7]]));
  const service = createAdminWriteService({ db, adapterApi, mode: 'legacy-only', modeResolver: modeApi.resolveMode });
  const result = await service.saveRows([row]);
  assert.equal(result.inserted, 0);
  assert.equal(result.updated, 1);
  assert.deepEqual(result.failures, []);
  assert.equal(db.calls.some((call) => call[0] === 'update'), true);
});

test('dual-write is a recognized contract but admin service alone remains legacy-targeted', async () => {
  const db = fakeDb();
  const service = createAdminWriteService({ db, adapterApi, mode: 'dual-write', modeResolver: (value) => modeApi.resolveMode(value, () => {}) });
  const result = await service.saveRows([row]);
  assert.equal(result.mode, 'dual-write');
  assert.equal(result.inserted, 1);
  assert.equal(db.calls.filter((call) => call[0] === 'from').every((call) => call[1] === 'person_politics'), true);
});

test('truly unknown admin write mode still fails closed to legacy-only', async () => {
  const db = fakeDb();
  const service = createAdminWriteService({ db, adapterApi, mode: 'v2-only', modeResolver: (value) => modeApi.resolveMode(value, () => {}) });
  const result = await service.saveRows([row]);
  assert.equal(result.mode, 'legacy-only');
  assert.equal(result.inserted, 1);
});
