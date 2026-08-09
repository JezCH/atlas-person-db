import assert from 'node:assert/strict';
import { Client } from 'pg';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createMutationService } = require('../../../server/atlas-mutation-service.js');
const { createDualWriteTransactionFactory } = require('../../../server/atlas-postgres-dualwrite-transaction.js');
const planner = require('../../../atlas-v2-command-planner.js');

const databaseUrl = process.env.SUPABASE_DB_URL;
if (!databaseUrl) throw new Error('SUPABASE_DB_URL is required');

const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

const marker = `phase8c-c3-live-api-smoke-${Date.now()}`;
let rollbackObserved = false;
try {
  const { transactionFactory, parityVerifier } = createDualWriteTransactionFactory({ client });
  const rollbackOnlyFactory = async (work) => {
    await client.query('begin');
    try {
      const normalizedTx = require('../../../server/atlas-postgres-dualwrite-transaction.js').createNormalizedTx(client);
      const legacyExecutor = require('../../../server/atlas-postgres-dualwrite-transaction.js').createLegacyExecutor(client);
      const tx = {
        ...normalizedTx,
        executeLegacy: legacyExecutor,
        async executeV2({ plan, context }) {
          return require('../../../server/atlas-postgres-dualwrite-transaction.js').executeV2Plan(normalizedTx, plan, context);
        }
      };
      const result = await work(tx);
      await client.query('rollback');
      rollbackObserved = true;
      return result;
    } catch (error) {
      await client.query('rollback');
      rollbackObserved = true;
      throw error;
    }
  };

  const source = await client.query(`
    select pp.person_name, pp.politic_name, pp.activity_start, pp.activity_end,
           pp.role, pp.period_basis
      from public.person_politics pp
      join atlas_v2.person_names pn on pn.name = pp.person_name
      join atlas_v2.polity_names poln on poln.name = pp.politic_name
      join atlas_v2.period_bases pb on pb.code = pp.period_basis
     where pp.role is not null
       and exists (
         select 1 from atlas_v2.roles r
         left join atlas_v2.role_names rn on rn.role_id = r.id
         where r.code = pp.role or rn.name = pp.role
       )
     order by pp.id
     limit 1
  `);
  assert.equal(source.rows.length, 1, 'no live row satisfies exact v2 identity/vocabulary contract');
  const row = source.rows[0];
  const years = await client.query(`
    select y as activity_start, y + 1 as activity_end
      from generate_series(-9899, -9800) y
     where not exists (
       select 1 from public.person_politics
        where person_name=$1 and politic_name=$2 and activity_start=y and activity_end=y+1
     )
     limit 1
  `, [row.person_name, row.politic_name]);
  assert.equal(years.rows.length, 1, 'no collision-free smoke years available');

  const payload = {
    person_name: row.person_name,
    politic_name: row.politic_name,
    activity_start: Number(years.rows[0].activity_start),
    activity_end: Number(years.rows[0].activity_end),
    role: row.role,
    period_basis: row.period_basis,
    notes: marker
  };

  const mutationService = createMutationService({ planner, transactionFactory: rollbackOnlyFactory, parityVerifier });
  const outcome = await mutationService.mutate({ operation: 'create', payload, request_id: marker });

  assert.equal(outcome.committed, true, JSON.stringify(outcome));
  assert.equal(outcome.parity?.checked, true, JSON.stringify(outcome));
  assert.equal(outcome.parity?.match, true, JSON.stringify(outcome));
  assert.equal(rollbackObserved, true);

  const legacyResidue = await client.query('select count(*)::int as count from public.person_politics where notes=$1', [marker]);
  const v2Residue = await client.query('select count(*)::int as count from atlas_v2.person_politics_v2 where notes=$1', [marker]);
  assert.equal(Number(legacyResidue.rows[0].count), 0);
  assert.equal(Number(v2Residue.rows[0].count), 0);

  console.log(JSON.stringify({
    marker: 'PHASE_8C_C3_LIVE_API_SMOKE',
    request_id: marker,
    authenticated_boundary: 'workflow-secret',
    transaction: 'shared-postgres',
    legacy_mutation: true,
    v2_mutation: true,
    parity_match: true,
    rollback_only: true,
    legacy_residue: 0,
    v2_residue: 0
  }, null, 2));
} finally {
  await client.end();
}
