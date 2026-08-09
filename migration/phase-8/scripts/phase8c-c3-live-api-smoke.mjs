import assert from 'node:assert/strict';
import { Client } from 'pg';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createVercelMutationHandler } = require('../../../server/atlas-vercel-mutation-handler.js');

const databaseUrl = process.env.SUPABASE_DB_URL;
if (!databaseUrl) throw new Error('SUPABASE_DB_URL is required');

const token = 'phase8c-c3-protected-smoke-token';
const marker = `phase8c-c3-live-api-smoke-${Date.now()}`;

async function connectedClient(url) {
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  return client;
}

function captureResponse() {
  const headers = {};
  let body = '';
  return {
    headers,
    get body() { return body; },
    setHeader(key, value) { headers[String(key).toLowerCase()] = value; },
    end(value = '') { body = String(value); }
  };
}

async function invoke(handler, { operation, payload, requestId, authorized = true }) {
  const res = captureResponse();
  await handler({
    method: 'POST',
    headers: authorized ? { authorization: `Bearer ${token}` } : {},
    body: { operation, payload, request_id: requestId }
  }, res);
  const parsed = JSON.parse(res.body || '{}');
  return { status: res.statusCode, body: parsed };
}

const probe = await connectedClient(databaseUrl);
try {
  const schema = await probe.query(`
    select column_name, is_nullable
      from information_schema.columns
     where table_schema='atlas_v2' and table_name='person_politics_v2'
     order by ordinal_position
  `);
  const columns = new Set(schema.rows.map((row) => row.column_name));
  for (const required of ['id','person_id','polity_id','role_id','period_basis_id','activity_start','activity_end','confidence','chronology_status','legacy_source_key','notes','source_locator','content_hash']) {
    assert.equal(columns.has(required), true, `live person_politics_v2 missing required column ${required}`);
  }

  const legacyIdSchema = await probe.query(`
    select data_type
      from information_schema.columns
     where table_schema='public' and table_name='person_politics' and column_name='id'
  `);
  assert.equal(legacyIdSchema.rows.length, 1, 'live public.person_politics.id column is missing');
  assert.equal(legacyIdSchema.rows[0].data_type, 'uuid', 'live public.person_politics.id must be uuid for deterministic request idempotency');

  const optionalRequestLog = await probe.query(`
    select to_regclass('atlas_v2.write_request_log') as write_request_log
  `);
  const writeRequestLogPresent = Boolean(optionalRequestLog.rows[0]?.write_request_log);

  const candidate = await probe.query(`
    select l.id,l.person_name,l.politic_name,l.activity_start,l.activity_end,l.role,l.period_basis,l.notes
      from public.person_politics l
     where l.role is not null
       and (
         select count(*)
           from atlas_v2.person_politics_v2 pp
           join atlas_v2.roles r on r.id=pp.role_id
           join atlas_v2.period_bases pb on pb.id=pp.period_basis_id
          where pp.activity_start=l.activity_start
            and pp.activity_end=l.activity_end
            and pp.notes is not distinct from l.notes
            and pb.code=l.period_basis
            and exists (select 1 from atlas_v2.person_names pn where pn.person_id=pp.person_id and pn.name=l.person_name)
            and exists (select 1 from atlas_v2.polity_names pn where pn.polity_id=pp.polity_id and pn.name=l.politic_name)
            and (r.code=l.role or r.source_label=l.role or exists (select 1 from atlas_v2.role_names rn where rn.role_id=r.id and rn.name=l.role))
       ) = 1
     order by l.id
     limit 1
  `);
  assert.equal(candidate.rows.length, 1, 'no live legacy row has one exact normalized preimage match');
  const source = candidate.rows[0];

  const years = await probe.query(`
    select y as activity_start, y + 1 as activity_end
      from generate_series(-9899, -9700) y
     where y <> 0 and y + 1 <> 0
       and not exists (
         select 1 from public.person_politics l
          where l.person_name=$1 and l.politic_name=$2 and l.activity_start=y and l.activity_end=y+1
       )
       and not exists (
         select 1 from atlas_v2.person_politics_v2 pp
          where pp.activity_start=y and pp.activity_end=y+1
            and exists (select 1 from atlas_v2.person_names pn where pn.person_id=pp.person_id and pn.name=$1)
            and exists (select 1 from atlas_v2.polity_names pn where pn.polity_id=pp.polity_id and pn.name=$2)
       )
     order by y
     limit 3
  `, [source.person_name, source.politic_name]);
  assert.equal(years.rows.length, 3, 'not enough collision-free smoke year pairs');

  const handler = createVercelMutationHandler({
    clientFactory: connectedClient,
    env: { SUPABASE_DB_URL: databaseUrl, ATLAS_MUTATION_TOKEN: token },
    transactionOptions: { rollbackOnly: true }
  });

  const unauthorized = await invoke(handler, {
    operation: 'create',
    payload: {
      person_name: source.person_name,
      politic_name: source.politic_name,
      activity_start: Number(years.rows[0].activity_start),
      activity_end: Number(years.rows[0].activity_end),
      role: source.role,
      period_basis: source.period_basis,
      notes: `${marker}:unauthorized`
    },
    requestId: `${marker}:unauthorized`,
    authorized: false
  });
  assert.equal(unauthorized.status, 401, JSON.stringify(unauthorized.body));
  assert.equal(unauthorized.body.ok, false, JSON.stringify(unauthorized.body));

  const createPayload = {
    person_name: source.person_name,
    politic_name: source.politic_name,
    activity_start: Number(years.rows[0].activity_start),
    activity_end: Number(years.rows[0].activity_end),
    role: source.role,
    period_basis: source.period_basis,
    notes: `${marker}:create`
  };
  const created = await invoke(handler, { operation:'create', payload:createPayload, requestId:`${marker}:create` });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  assert.equal(created.body.outcome?.parity?.match, true, JSON.stringify(created.body));

  const updatePayload = {
    id: source.id,
    value: {
      person_name: source.person_name,
      politic_name: source.politic_name,
      activity_start: Number(source.activity_start),
      activity_end: Number(source.activity_end),
      role: source.role,
      period_basis: source.period_basis,
      notes: `${marker}:update`
    }
  };
  const updated = await invoke(handler, { operation:'update', payload:updatePayload, requestId:`${marker}:update` });
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.outcome?.parity?.match, true, JSON.stringify(updated.body));

  const importedRows = [1,2].map((offset, index) => ({
    person_name: source.person_name,
    politic_name: source.politic_name,
    activity_start: Number(years.rows[offset].activity_start),
    activity_end: Number(years.rows[offset].activity_end),
    role: source.role,
    period_basis: source.period_basis,
    notes: `${marker}:import:${index}`
  }));
  const imported = await invoke(handler, { operation:'import', payload:importedRows, requestId:`${marker}:import` });
  assert.equal(imported.status, 200, JSON.stringify(imported.body));
  assert.equal(imported.body.outcome?.parity?.match, true, JSON.stringify(imported.body));
  assert.equal(imported.body.outcome?.legacy?.record_ids?.length, 2, JSON.stringify(imported.body));
  assert.equal(imported.body.outcome?.v2?.normalized_relationship_ids?.length, 2, JSON.stringify(imported.body));

  const deleted = await invoke(handler, { operation:'delete', payload:{id:source.id}, requestId:`${marker}:delete` });
  assert.equal(deleted.status, 200, JSON.stringify(deleted.body));
  assert.equal(deleted.body.outcome?.parity?.match, true, JSON.stringify(deleted.body));
  assert.equal(deleted.body.outcome?.parity?.legacy_remaining, 0, JSON.stringify(deleted.body));
  assert.equal(deleted.body.outcome?.parity?.v2_remaining, 0, JSON.stringify(deleted.body));

  const legacyResidue = await probe.query('select count(*)::int as count from public.person_politics where notes like $1', [`${marker}:%`]);
  const v2Residue = await probe.query('select count(*)::int as count from atlas_v2.person_politics_v2 where notes like $1', [`${marker}:%`]);
  const originalLegacy = await probe.query('select notes from public.person_politics where id=$1', [source.id]);
  assert.equal(Number(legacyResidue.rows[0].count), 0, 'rollback-only smoke left legacy residue');
  assert.equal(Number(v2Residue.rows[0].count), 0, 'rollback-only smoke left normalized residue');
  assert.equal(originalLegacy.rows.length, 1, 'rollback-only delete removed source legacy row');
  assert.equal(originalLegacy.rows[0].notes ?? null, source.notes ?? null, 'rollback-only update changed source legacy row');

  console.log(JSON.stringify({
    marker: 'PHASE_8C_C3_LIVE_API_SMOKE',
    authenticated_transport: true,
    unauthorized_rejected: true,
    shared_postgres_transaction: true,
    exact_preimage_resolution: true,
    operations: {
      create: true,
      update: true,
      delete: true,
      import: true
    },
    parity_match: true,
    rollback_only: true,
    legacy_residue: 0,
    v2_residue: 0,
    schema_contract_checked: true,
    legacy_uuid_contract_checked: true,
    write_request_log_used: false,
    write_request_log_present: writeRequestLogPresent
  }, null, 2));
} finally {
  await probe.end();
}
