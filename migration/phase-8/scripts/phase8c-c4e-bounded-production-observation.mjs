import assert from 'node:assert/strict';
import { Client } from 'pg';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createVercelMutationHandler } = require('../../../server/atlas-vercel-mutation-handler.js');

const databaseUrl = process.env.SUPABASE_DB_URL;
if (!databaseUrl) throw new Error('SUPABASE_DB_URL is required');

const token = 'phase8c-c4e-protected-observation-token';
const runId = process.env.GITHUB_RUN_ID || 'local';
const runAttempt = process.env.GITHUB_RUN_ATTEMPT || '1';
const marker = `phase8c-c4e-observation-${runId}-${runAttempt}-${Date.now()}`;

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

async function invoke(handler, { operation, payload, requestId }) {
  const res = captureResponse();
  await handler({
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: { operation, payload, request_id: requestId }
  }, res);
  const parsed = JSON.parse(res.body || '{}');
  assert.equal(res.statusCode, 200, `${operation} failed: ${JSON.stringify(parsed)}`);
  assert.equal(parsed.ok, true, `${operation} transport failed: ${JSON.stringify(parsed)}`);
  assert.equal(parsed.outcome?.committed, true, `${operation} was not committed: ${JSON.stringify(parsed)}`);
  assert.equal(parsed.outcome?.rollback, false, `${operation} unexpectedly rolled back: ${JSON.stringify(parsed)}`);
  assert.equal(parsed.outcome?.parity?.match, true, `${operation} parity failed: ${JSON.stringify(parsed)}`);
  return parsed.outcome;
}

async function globalState(client) {
  const result = await client.query(`
    select
      (select count(*)::int from public.person_politics) as legacy_rows,
      (select count(*)::int from public.atlas_person_politics_compat_v1) as compatibility_rows,
      (select count(*)::int from atlas_v2.person_politics_v2) as normalized_rows,
      (select count(*)::int from (
        select person_name,politic_name,activity_start,activity_end,role,period_basis,notes
          from public.person_politics
        except all
        select person_name,politic_name,activity_start,activity_end,role,period_basis,notes
          from public.atlas_person_politics_compat_v1
      ) missing) as legacy_rows_missing_from_v2,
      (select count(*)::int from pg_policies
        where schemaname='public' and tablename='person_politics'
          and cmd in ('ALL','INSERT','UPDATE','DELETE')) as write_policies,
      (select count(*)::int from pg_policies
        where schemaname='public' and tablename='person_politics' and cmd='SELECT') as read_policies
  `);
  assert.equal(result.rows.length, 1, 'global state query failed');
  return Object.fromEntries(Object.entries(result.rows[0]).map(([key, value]) => [key, Number(value)]));
}

async function assertPersisted(client, { id, personName, polityName, start, end, role, periodBasis, notes }) {
  const legacy = await client.query(`
    select id,person_name,politic_name,activity_start,activity_end,role,period_basis,notes
      from public.person_politics where id=$1
  `, [id]);
  assert.equal(legacy.rows.length, 1, `committed legacy row ${id} not visible after transaction`);
  assert.equal(legacy.rows[0].person_name, personName);
  assert.equal(legacy.rows[0].politic_name, polityName);
  assert.equal(Number(legacy.rows[0].activity_start), Number(start));
  assert.equal(Number(legacy.rows[0].activity_end), Number(end));
  assert.equal(legacy.rows[0].role ?? null, role ?? null);
  assert.equal(legacy.rows[0].period_basis, periodBasis);
  assert.equal(legacy.rows[0].notes ?? null, notes ?? null);

  const compat = await client.query(`
    select count(*)::int as count
      from public.atlas_person_politics_compat_v1
     where person_name=$1 and politic_name=$2
       and activity_start=$3 and activity_end=$4
       and role is not distinct from $5
       and period_basis=$6 and notes is not distinct from $7
  `, [personName, polityName, start, end, role ?? null, periodBasis, notes ?? null]);
  assert.equal(Number(compat.rows[0]?.count || 0), 1, `committed row is not represented exactly once in compatibility view for ${id}`);
}

async function cleanupSynthetic(client) {
  const before = await client.query(`
    select
      (select count(*)::int from public.person_politics where notes like $1) as legacy,
      (select count(*)::int from atlas_v2.person_politics_v2 where notes like $1) as normalized
  `, [`${marker}%`]);
  const legacy = Number(before.rows[0]?.legacy || 0);
  const normalized = Number(before.rows[0]?.normalized || 0);
  if (legacy === 0 && normalized === 0) return { used: false, legacy_before: 0, normalized_before: 0 };

  await client.query('begin');
  try {
    await client.query(`delete from atlas_v2.person_politics_v2 where notes like $1`, [`${marker}%`]);
    await client.query(`delete from public.person_politics where notes like $1`, [`${marker}%`]);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
  return { used: true, legacy_before: legacy, normalized_before: normalized };
}

const probe = await connectedClient(databaseUrl);
let primaryError = null;
let report = null;
let cleanup = { used: false, legacy_before: 0, normalized_before: 0 };

try {
  const baseline = await globalState(probe);
  assert.equal(baseline.legacy_rows > 0, true, 'legacy baseline unexpectedly empty');
  assert.equal(baseline.compatibility_rows >= baseline.legacy_rows, true, 'compatibility projection smaller than legacy baseline');
  assert.equal(baseline.legacy_rows_missing_from_v2, 0, 'legacy baseline contains rows missing from v2 compatibility');
  assert.equal(baseline.write_policies, 0, 'public legacy write policy is still active');
  assert.equal(baseline.read_policies >= 1, true, 'public legacy read policy is missing');

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
  assert.equal(candidate.rows.length, 1, 'no exact live source row is available for bounded observation');
  const source = candidate.rows[0];

  const years = await probe.query(`
    select y as activity_start, y + 1 as activity_end
      from generate_series(-9599, -9200) y
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
  assert.equal(years.rows.length, 3, 'not enough collision-free observation year pairs');

  const handler = createVercelMutationHandler({
    clientFactory: connectedClient,
    env: { SUPABASE_DB_URL: databaseUrl, ATLAS_MUTATION_TOKEN: token }
  });

  const createPayload = {
    person_name: source.person_name,
    politic_name: source.politic_name,
    activity_start: Number(years.rows[0].activity_start),
    activity_end: Number(years.rows[0].activity_end),
    role: null,
    period_basis: source.period_basis,
    notes: `${marker}:create-null`
  };
  const created = await invoke(handler, { operation: 'create', payload: createPayload, requestId: `${marker}:create` });
  const createdLegacyId = created.legacy?.record_ids?.[0];
  assert.ok(createdLegacyId, 'create did not return legacy id');
  await assertPersisted(probe, {
    id: createdLegacyId,
    personName: source.person_name,
    polityName: source.politic_name,
    start: createPayload.activity_start,
    end: createPayload.activity_end,
    role: null,
    periodBasis: source.period_basis,
    notes: createPayload.notes
  });

  const roleUpdate = {
    id: createdLegacyId,
    value: {
      ...createPayload,
      role: source.role,
      notes: `${marker}:update-role`
    }
  };
  const updatedToRole = await invoke(handler, { operation: 'update', payload: roleUpdate, requestId: `${marker}:update-role` });
  assert.equal(updatedToRole.legacy?.record_ids?.[0], createdLegacyId, 'role update changed legacy identity');
  await assertPersisted(probe, {
    id: createdLegacyId,
    personName: source.person_name,
    polityName: source.politic_name,
    start: createPayload.activity_start,
    end: createPayload.activity_end,
    role: source.role,
    periodBasis: source.period_basis,
    notes: roleUpdate.value.notes
  });

  const nullUpdate = {
    id: createdLegacyId,
    value: {
      ...createPayload,
      role: null,
      notes: `${marker}:update-null`
    }
  };
  const updatedToNull = await invoke(handler, { operation: 'update', payload: nullUpdate, requestId: `${marker}:update-null` });
  assert.equal(updatedToNull.legacy?.record_ids?.[0], createdLegacyId, 'null update changed legacy identity');
  await assertPersisted(probe, {
    id: createdLegacyId,
    personName: source.person_name,
    polityName: source.politic_name,
    start: createPayload.activity_start,
    end: createPayload.activity_end,
    role: null,
    periodBasis: source.period_basis,
    notes: nullUpdate.value.notes
  });

  const importPayload = [
    {
      person_name: source.person_name,
      politic_name: source.politic_name,
      activity_start: Number(years.rows[1].activity_start),
      activity_end: Number(years.rows[1].activity_end),
      role: null,
      period_basis: source.period_basis,
      notes: `${marker}:import-null`
    },
    {
      person_name: source.person_name,
      politic_name: source.politic_name,
      activity_start: Number(years.rows[2].activity_start),
      activity_end: Number(years.rows[2].activity_end),
      role: source.role,
      period_basis: source.period_basis,
      notes: `${marker}:import-role`
    }
  ];
  const imported = await invoke(handler, { operation: 'import', payload: importPayload, requestId: `${marker}:import` });
  const importedLegacyIds = imported.legacy?.record_ids || [];
  assert.equal(importedLegacyIds.length, 2, 'mixed import did not commit two legacy rows');
  assert.equal(imported.v2?.normalized_relationship_ids?.length, 2, 'mixed import did not commit two normalized rows');
  await assertPersisted(probe, {
    id: importedLegacyIds[0],
    personName: source.person_name,
    polityName: source.politic_name,
    start: importPayload[0].activity_start,
    end: importPayload[0].activity_end,
    role: null,
    periodBasis: source.period_basis,
    notes: importPayload[0].notes
  });
  await assertPersisted(probe, {
    id: importedLegacyIds[1],
    personName: source.person_name,
    polityName: source.politic_name,
    start: importPayload[1].activity_start,
    end: importPayload[1].activity_end,
    role: source.role,
    periodBasis: source.period_basis,
    notes: importPayload[1].notes
  });

  for (const [index, id] of [createdLegacyId, ...importedLegacyIds].entries()) {
    const deleted = await invoke(handler, { operation: 'delete', payload: { id }, requestId: `${marker}:delete:${index}` });
    assert.equal(deleted.parity?.legacy_remaining, 0, `delete ${index} left legacy residue`);
    assert.equal(deleted.parity?.v2_remaining, 0, `delete ${index} left normalized residue`);
  }

  const finalState = await globalState(probe);
  const legacyResidue = await probe.query('select count(*)::int as count from public.person_politics where notes like $1', [`${marker}%`]);
  const v2Residue = await probe.query('select count(*)::int as count from atlas_v2.person_politics_v2 where notes like $1', [`${marker}%`]);
  const compatResidue = await probe.query('select count(*)::int as count from public.atlas_person_politics_compat_v1 where notes like $1', [`${marker}%`]);

  assert.equal(Number(legacyResidue.rows[0].count), 0, 'bounded observation left legacy residue');
  assert.equal(Number(v2Residue.rows[0].count), 0, 'bounded observation left normalized residue');
  assert.equal(Number(compatResidue.rows[0].count), 0, 'bounded observation left compatibility residue');
  assert.equal(finalState.legacy_rows, baseline.legacy_rows, 'legacy row count did not return to baseline');
  assert.equal(finalState.compatibility_rows, baseline.compatibility_rows, 'compatibility row count did not return to baseline');
  assert.equal(finalState.normalized_rows, baseline.normalized_rows, 'normalized row count did not return to baseline');
  assert.equal(finalState.legacy_rows_missing_from_v2, 0, 'final legacy rows are missing from v2 compatibility');
  assert.equal(finalState.write_policies, 0, 'public write policy reappeared during observation');
  assert.equal(finalState.read_policies >= 1, true, 'public read policy disappeared during observation');

  report = {
    marker: 'PHASE_8C_C4E_BOUNDED_PRODUCTION_DUALWRITE_OBSERVATION',
    exact_live_commit_path: true,
    rollback_only: false,
    public_write_policies: 0,
    public_read_policy_present: true,
    baseline,
    operations: {
      create_null_role: true,
      update_null_to_role: true,
      update_role_to_null: true,
      mixed_import_null_and_role: true,
      delete_all_synthetic: true
    },
    persisted_between_transactions: true,
    compatibility_projection_checked: true,
    parity_match_each_operation: true,
    final_state: finalState,
    legacy_residue: 0,
    normalized_residue: 0,
    compatibility_residue: 0,
    cleanup_fallback_used: false
  };
} catch (error) {
  primaryError = error;
} finally {
  cleanup = await cleanupSynthetic(probe);
  await probe.end();
}

if (primaryError) {
  console.error(JSON.stringify({
    marker: 'PHASE_8C_C4E_BOUNDED_PRODUCTION_DUALWRITE_OBSERVATION_FAILURE',
    error: primaryError.message,
    cleanup_fallback: cleanup
  }, null, 2));
  throw primaryError;
}

if (cleanup.used) {
  throw new Error(`bounded observation required fallback cleanup: ${JSON.stringify(cleanup)}`);
}

console.log(JSON.stringify(report, null, 2));
