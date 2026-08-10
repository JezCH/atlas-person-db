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
            limit: async (limit) => {
              calls.push(['limit', limit]);
              const key = [filters.person_name, filters.politic_name, filters.activity_start, filters.activity_end].join('|');
              const value = existingIds.get(key);
              const ids = value == null ? [] : Array.isArray(value) ? value : [value];
              return { data: ids.slice(0, limit).map((id) => ({ id })), error: null };
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
        mode: 'server-v2-only',
        async createActivity(payload) {
          calls.push(['create', payload]);
          return fail
            ? { committed: false, v2: { committed: false }, errors: ['synthetic failure'] }
            : { committed: true, legacy: { attempted: false, committed: false }, v2: { committed: true, normalized_relationship_ids: ['new-v2-id'] }, errors: [] };
        },
        async updateActivity(id, payload) {
          calls.push(['update', id, payload]);
          return fail
            ? { committed: false, v2: { committed: false }, errors: ['synthetic failure'] }
            : { committed: true, legacy: { attempted: false, committed: false }, v2: { committed: true, normalized_relationship_ids: [id] }, errors: [] };
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

test('admin creates through v2-only server adapter while compatibility view is read lookup only', async () => {
  const db = fakeDb();
  const adapterApi = fakeServerAdapterApi();
  const service = createAdminWriteService({ db, adapterApi });
  const result = await service.saveRows([row]);
  assert.equal(result.inserted, 1);
  assert.equal(result.updated, 0);
  assert.deepEqual(result.failures, []);
  assert.equal(result.mode, 'server-v2-only');
  assert.deepEqual(adapterApi.calls.map((call) => call[0]), ['create']);
  assert.equal(db.calls.filter((call) => call[0] === 'from').every((call) => call[1] === 'atlas_person_politics_compat_v1'), true);
});

test('admin update uses normalized relationship id returned by compatibility lookup', async () => {
  const key = [row.person_name, row.politic_name, row.activity_start, row.activity_end].join('|');
  const db = fakeDb(new Map([[key, 'normalized-7']]));
  const adapterApi = fakeServerAdapterApi();
  const service = createAdminWriteService({ db, adapterApi });
  const result = await service.saveRows([row]);
  assert.equal(result.inserted, 0);
  assert.equal(result.updated, 1);
  assert.deepEqual(result.failures, []);
  assert.deepEqual(adapterApi.calls[0].slice(0, 2), ['update', 'normalized-7']);
});

test('admin fails closed on ambiguous normalized activity lookup', async () => {
  const key = [row.person_name, row.politic_name, row.activity_start, row.activity_end].join('|');
  const db = fakeDb(new Map([[key, ['normalized-1', 'normalized-2']]]));
  const adapterApi = fakeServerAdapterApi();
  const service = createAdminWriteService({ db, adapterApi });
  const result = await service.saveRows([row]);
  assert.equal(result.inserted, 0);
  assert.equal(result.updated, 0);
  assert.equal(adapterApi.calls.length, 0);
  assert.match(result.failures[0], /ambiguous/);
});

test('admin reports v2-only server mutation failures without client fallback', async () => {
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
