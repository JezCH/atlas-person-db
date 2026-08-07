import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createPostgresTransactionFactory } = require('../atlas-v2-postgres-transaction-adapter.js');

function fakeClient() {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push([sql, params]);
      const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();
      if (normalized === 'begin' || normalized === 'commit' || normalized === 'rollback') return { rows: [] };
      if (normalized.includes('from atlas_v2.person_names')) return { rows: [{ id: 'person-1' }] };
      if (normalized.includes('from atlas_v2.polity_names')) return { rows: [{ id: 'polity-1' }] };
      if (normalized.includes('from atlas_v2.roles')) return { rows: [{ id: 'role-1' }] };
      if (normalized.includes('from atlas_v2.period_bases')) return { rows: [{ id: 'basis-1' }] };
      if (normalized.startsWith('insert into atlas_v2.person_politics_v2')) return { rows: [{ id: 'rel-1' }] };
      if (normalized.startsWith('select id from atlas_v2.person_politics_v2')) return { rows: [{ id: 'rel-1' }] };
      if (normalized.startsWith('delete from atlas_v2.person_politics_v2')) return { rows: [] };
      if (normalized.includes('from atlas_v2.write_request_log')) return { rows: [] };
      if (normalized.startsWith('insert into atlas_v2.write_request_log')) return { rows: [] };
      return { rows: [] };
    }
  };
}

test('transaction factory commits successful work', async () => {
  const client = fakeClient();
  const factory = createPostgresTransactionFactory({ client });
  const result = await factory(async (tx) => {
    assert.equal(await tx.resolvePersonExact({ name: 'Ada Lovelace' }), 'person-1');
    assert.equal(await tx.resolvePolityExact({ name: 'United Kingdom' }), 'polity-1');
    assert.equal(await tx.resolveRoleExact({ code_or_name: 'Mathematician' }), 'role-1');
    assert.equal(await tx.resolvePeriodBasisExact({ code: 'intellectual_activity' }), 'basis-1');
    return 'ok';
  });
  assert.equal(result, 'ok');
  assert.equal(client.calls[0][0].toLowerCase(), 'begin');
  assert.equal(client.calls.at(-1)[0].toLowerCase(), 'commit');
});

test('transaction factory rolls back failed work', async () => {
  const client = fakeClient();
  const factory = createPostgresTransactionFactory({ client });
  await assert.rejects(() => factory(async () => { throw new Error('boom'); }), /boom/);
  assert.equal(client.calls.at(-1)[0].toLowerCase(), 'rollback');
});

test('relationship upsert is parameterized and targets atlas_v2 only', async () => {
  const client = fakeClient();
  const factory = createPostgresTransactionFactory({ client });
  await factory(async (tx) => {
    const id = await tx.upsertPersonPoliticsV2({
      person_id: 'person-1', polity_id: 'polity-1', activity_start: 1842, activity_end: 1852,
      role_id: 'role-1', period_basis_id: 'basis-1', legacy_source_key: 'ada\u0001uk\u00011842\u00011852', notes: null
    });
    assert.equal(id, 'rel-1');
  });
  const write = client.calls.find(([sql]) => sql.includes('insert into atlas_v2.person_politics_v2'));
  assert.ok(write);
  assert.equal(write[0].includes('person_politics'), true);
  assert.equal(write[0].includes('public.person_politics'), false);
  assert.equal(write[1].length, 8);
});
