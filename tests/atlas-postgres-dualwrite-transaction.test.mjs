import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createDualWriteTransactionFactory } = require('../server/atlas-postgres-dualwrite-transaction.js');

function fakeClient({ failV2 = false } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      const text = String(sql).replace(/\s+/g, ' ').trim();
      calls.push([text, params]);
      if (text === 'begin' || text === 'commit' || text === 'rollback') return { rows: [], rowCount: null };
      if (text.includes('insert into public.person_politics')) return { rows: [{ id: 11 }], rowCount: 1 };
      if (text.includes('from atlas_v2.person_names pn where pn.name')) return { rows: [{ id: '11111111-1111-1111-1111-111111111111' }], rowCount: 1 };
      if (text.includes('from atlas_v2.polity_names pn where pn.name')) return { rows: [{ id: '22222222-2222-2222-2222-222222222222' }], rowCount: 1 };
      if (text.includes('from atlas_v2.roles r left join atlas_v2.role_names')) return { rows: [{ id: '33333333-3333-3333-3333-333333333333' }], rowCount: 1 };
      if (text.includes('from atlas_v2.period_bases where code')) return { rows: [{ id: '44444444-4444-4444-4444-444444444444' }], rowCount: 1 };
      if (text.includes('insert into atlas_v2.person_politics_v2')) {
        if (failV2) throw new Error('v2 failed');
        return { rows: [{ id: '55555555-5555-5555-5555-555555555555' }], rowCount: 1 };
      }
      if (text.includes('from atlas_v2.write_request_log')) return { rows: [], rowCount: 0 };
      if (text.includes('insert into atlas_v2.write_request_log')) return { rows: [], rowCount: 1 };
      if (text.includes('from public.person_politics where id = any')) return { rows: [{ person_name:'Ada Lovelace', politic_name:'United Kingdom', activity_start:1842, activity_end:1852, role:'Mathematician', period_basis:'intellectual_activity', notes:null }], rowCount:1 };
      if (text.includes('from atlas_v2.person_politics_v2 pp')) return { rows: [{ person_name:'Ada Lovelace', politic_name:'United Kingdom', activity_start:1842, activity_end:1852, role:'Mathematician', period_basis:'intellectual_activity', notes:null }], rowCount:1 };
      return { rows: [], rowCount: 0 };
    }
  };
}

const plan = {
  commit:false,
  writes_performed:0,
  blockers:[],
  commands:[
    {type:'RESOLVE_PERSON_EXACT',lookup:{name:'Ada Lovelace'}},
    {type:'RESOLVE_POLITY_EXACT',lookup:{name:'United Kingdom'}},
    {type:'RESOLVE_ROLE_EXACT',lookup:{code_or_name:'Mathematician'}},
    {type:'RESOLVE_PERIOD_BASIS_EXACT',lookup:{code:'intellectual_activity'}},
    {type:'UPSERT_PERSON_POLITICS_V2',legacy_source_key:'ada\u0001united kingdom\u00011842\u00011852',values:{activity_start:1842,activity_end:1852,notes:null}}
  ]
};

const payload = { person_name:'Ada Lovelace', politic_name:'United Kingdom', activity_start:1842, activity_end:1852, role:'Mathematician', period_basis:'intellectual_activity', notes:null };

test('dual-write uses one begin and one commit', async () => {
  const client = fakeClient();
  const { transactionFactory, parityVerifier } = createDualWriteTransactionFactory({ client });
  const result = await transactionFactory(async (tx) => {
    const legacy = await tx.executeLegacy({ operation:'create', payload });
    const v2 = await tx.executeV2({ plan, context:{ request_id:'req-1' } });
    assert.equal(v2.committed, true, v2.transaction_failure || 'v2 should commit');
    const parity = await parityVerifier({ operation:'create', payload, legacy, v2 });
    assert.deepEqual(parity, { checked:true, match:true, legacy_rows:1, v2_rows:1 });
    return { legacy, v2 };
  });
  assert.equal(result.legacy.committed, true);
  assert.equal(result.v2.committed, true);
  assert.equal(client.calls.filter(([sql]) => sql === 'begin').length, 1);
  assert.equal(client.calls.filter(([sql]) => sql === 'commit').length, 1);
  assert.equal(client.calls.filter(([sql]) => sql === 'rollback').length, 0);
});

test('v2 failure rolls back the shared transaction', async () => {
  const client = fakeClient({ failV2:true });
  const { transactionFactory } = createDualWriteTransactionFactory({ client });
  await assert.rejects(() => transactionFactory(async (tx) => {
    await tx.executeLegacy({ operation:'create', payload });
    const v2 = await tx.executeV2({ plan, context:{ request_id:'req-2' } });
    if (!v2.committed) throw new Error(v2.transaction_failure || 'v2 failed');
  }));
  assert.equal(client.calls.filter(([sql]) => sql === 'begin').length, 1);
  assert.equal(client.calls.filter(([sql]) => sql === 'rollback').length, 1);
  assert.equal(client.calls.filter(([sql]) => sql === 'commit').length, 0);
});
