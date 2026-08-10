import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
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
          calls.push(['select']);
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
        insert() { throw new Error('admin service must not write through Supabase'); },
        update() { throw new Error('admin service must not write through Supabase'); },
        delete() { throw new Error('admin service must not write through Supabase'); }
      };
    }
  };
}

function fakeServerAdapterApi({ fail = false } = {}) {
  const calls = [];
  return {
    calls,
    createAdapter() {
      return {
        mode: 'server-dual-write',
        async createActivity(payload) {
          calls.push(['create', payload]);
          return fail
            ? { legacy: { committed: false }, errors: ['synthetic failure'] }
            : { legacy: { committed: true, record_ids: ['new-id'] }, v2: { committed: true }, errors: [] };
        },
        async updateActivity(id, payload) {
          calls.push(['update', id, payload]);
          return fail
            ? { legacy: { committed: false }, errors: ['synthetic failure'] }
            : { legacy: { committed: true, record_ids: [id] }, v2: { committed: true }, errors: [] };
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

test('admin creates through server adapter while Supabase is read lookup only', async () => {
  const db = fakeDb();
  const adapterApi = fakeServerAdapterApi();
  const service = createAdminWriteService({ db, adapterApi });
  const result = await service.saveRows([row]);
  assert.equal(result.inserted, 1);
  assert.equal(result.updated, 0);
  assert.deepEqual(result.failures, []);
  assert.equal(result.mode, 'server-dual-write');
  assert.deepEqual(adapterApi.calls.map((call) => call[0]), ['create']);
  assert.equal(db.calls.filter((call) => call[0] === 'from').every((call) => call[1] === 'person_politics'), true);
});

test('admin updates through server adapter when exact activity already exists', async () => {
  const key = [row.person_name, row.politic_name, row.activity_start, row.activity_end].join('|');
  const db = fakeDb(new Map([[key, 'legacy-7']]));
  const adapterApi = fakeServerAdapterApi();
  const service = createAdminWriteService({ db, adapterApi });
  const result = await service.saveRows([row]);
  assert.equal(result.inserted, 0);
  assert.equal(result.updated, 1);
  assert.deepEqual(result.failures, []);
  assert.deepEqual(adapterApi.calls[0].slice(0, 2), ['update', 'legacy-7']);
});

test('admin reports server mutation failures without attempting a client-side fallback', async () => {
  const db = fakeDb();
  const adapterApi = fakeServerAdapterApi({ fail: true });
  const service = createAdminWriteService({ db, adapterApi });
  const result = await service.saveRows([row]);
  assert.equal(result.inserted, 0);
  assert.equal(result.updated, 0);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0], /synthetic failure/);
  assert.equal(adapterApi.calls.length, 1);
});
