import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Client } from "pg";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const planner = require("../../../atlas-v2-command-planner.js");
const { createV2AuthoritativeMutationService } = require("../../../server/atlas-v2-authoritative-mutation-service.js");
const { createV2AuthoritativeTransactionFactory } = require("../../../server/atlas-postgres-v2-authoritative-transaction.js");

const databaseUrl = process.env.SUPABASE_DB_URL;
if (!databaseUrl) throw new Error("SUPABASE_DB_URL is required");

const marker = `phase8c-c5a-v2-only-${Date.now()}`;
let cleanupFallbackUsed = false;
let completed = false;

async function connectedClient() {
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  return client;
}

function digestRows(rows) {
  return crypto.createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

async function legacySnapshot(client) {
  const result = await client.query(`
    select id,person_name,politic_name,activity_start,activity_end,role,period_basis,notes
      from public.person_politics
     order by id`);
  return { rows: result.rows.length, digest: digestRows(result.rows) };
}

async function stateSnapshot(client) {
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
      (select count(*)::int from pg_policies where schemaname='public' and tablename='person_politics' and cmd in ('ALL','INSERT','UPDATE','DELETE')) as write_policies,
      (select count(*)::int from pg_policies where schemaname='public' and tablename='person_politics' and cmd='SELECT') as read_policies`);
  return result.rows[0];
}

async function mutate(request) {
  const client = await connectedClient();
  try {
    const { transactionFactory, verificationVerifier } = createV2AuthoritativeTransactionFactory({ client });
    const service = createV2AuthoritativeMutationService({ planner, transactionFactory, verificationVerifier });
    const result = await service.mutate(request);
    assert.equal(result.write_mode, "v2-only", JSON.stringify(result));
    assert.equal(result.legacy?.attempted, false, JSON.stringify(result));
    assert.equal(result.legacy?.committed, false, JSON.stringify(result));
    assert.equal(result.committed, true, JSON.stringify(result));
    assert.equal(result.rollback, false, JSON.stringify(result));
    assert.equal(result.v2?.committed, true, JSON.stringify(result));
    assert.equal(result.verification?.match, true, JSON.stringify(result));
    assert.equal(result.parity, null, JSON.stringify(result));
    return result;
  } finally {
    await client.end();
  }
}

async function compatRow(client, id) {
  const result = await client.query(`
    select id,person_name,politic_name,activity_start,activity_end,role,period_basis,notes
      from public.atlas_person_politics_compat_v1
     where id=$1`, [id]);
  return result.rows.length === 1 ? result.rows[0] : null;
}

async function assertLegacyUnchanged(client, baseline, label) {
  const current = await legacySnapshot(client);
  assert.deepEqual(current, baseline, `legacy changed during ${label}`);
}

const probe = await connectedClient();
try {
  const baselineState = await stateSnapshot(probe);
  const baselineLegacy = await legacySnapshot(probe);
  assert.equal(Number(baselineState.write_policies), 0, "public legacy write policy unexpectedly present");
  assert.equal(Number(baselineState.read_policies) >= 1, true, "public legacy read policy missing");
  assert.equal(Number(baselineState.legacy_rows_missing_from_v2), 0, "legacy baseline not fully represented in v2 compatibility projection");
  assert.equal(Number(baselineState.normalized_rows), Number(baselineState.compatibility_rows), "compatibility baseline is not row complete");

  const sourceResult = await probe.query(`
    select id,person_name,politic_name,activity_start,activity_end,role,period_basis,notes
      from public.atlas_person_politics_compat_v1
     where role is not null
     order by id
     limit 1`);
  assert.equal(sourceResult.rows.length, 1, "no reviewed non-null role source row available");
  const source = sourceResult.rows[0];

  const years = await probe.query(`
    select y as activity_start, y + 1 as activity_end
      from generate_series(-9499, -9200) y
     where y <> 0 and y + 1 <> 0
       and not exists (
         select 1
           from atlas_v2.person_politics_v2 pp
          where pp.activity_start=y and pp.activity_end=y+1
            and exists (select 1 from atlas_v2.person_names pn where pn.person_id=pp.person_id and pn.name=$1)
            and exists (select 1 from atlas_v2.polity_names pn where pn.polity_id=pp.polity_id and pn.name=$2)
       )
     order by y
     limit 3`, [source.person_name, source.politic_name]);
  assert.equal(years.rows.length, 3, "not enough collision-free v2-only observation year pairs");

  const createPayload = {
    person_name: source.person_name,
    politic_name: source.politic_name,
    activity_start: Number(years.rows[0].activity_start),
    activity_end: Number(years.rows[0].activity_end),
    role: null,
    period_basis: source.period_basis,
    notes: `${marker}:create`
  };
  const created = await mutate({ operation: "create", payload: createPayload, request_id: `${marker}:create` });
  const createdId = created.v2.normalized_relationship_ids[0];
  assert.ok(createdId, "create normalized id missing");
  const createdCompat = await compatRow(probe, createdId);
  assert.ok(createdCompat, "committed v2 create not visible in compatibility projection");
  assert.equal(createdCompat.role, null, "null role not preserved in compatibility projection");
  await assertLegacyUnchanged(probe, baselineLegacy, "v2-only create");

  const provenance = await probe.query(`
    select legacy_source_key,source_locator,content_hash,confidence,chronology_status
      from atlas_v2.person_politics_v2
     where id=$1`, [createdId]);
  assert.equal(provenance.rows.length, 1, "created v2 provenance row missing");
  assert.match(provenance.rows[0].legacy_source_key, new RegExp(`^v2-runtime:${marker}:create:0$`));
  assert.equal(provenance.rows[0].source_locator?.kind, "phase8c_v2_authoritative");
  assert.equal(provenance.rows[0].confidence, "direct_asserted");
  assert.equal(provenance.rows[0].chronology_status, "exact_as_recorded");
  assert.equal(String(provenance.rows[0].content_hash).length, 64);

  const rolePayload = { ...createPayload, role: source.role, notes: `${marker}:role` };
  const updatedToRole = await mutate({
    operation: "update",
    payload: { id: createdId, value: rolePayload },
    request_id: `${marker}:update-role`
  });
  assert.deepEqual(updatedToRole.v2.normalized_relationship_ids, [createdId]);
  assert.equal((await compatRow(probe, createdId))?.role, source.role, "reviewed role update not visible");
  await assertLegacyUnchanged(probe, baselineLegacy, "v2-only null-to-role update");

  const nullAgainPayload = { ...createPayload, notes: `${marker}:null-again` };
  const updatedToNull = await mutate({
    operation: "update",
    payload: { id: createdId, value: nullAgainPayload },
    request_id: `${marker}:update-null`
  });
  assert.deepEqual(updatedToNull.v2.normalized_relationship_ids, [createdId]);
  assert.equal((await compatRow(probe, createdId))?.role, null, "role-to-null update not visible");
  await assertLegacyUnchanged(probe, baselineLegacy, "v2-only role-to-null update");

  const importedRows = [
    {
      ...createPayload,
      activity_start: Number(years.rows[1].activity_start),
      activity_end: Number(years.rows[1].activity_end),
      notes: `${marker}:import-null`
    },
    {
      ...createPayload,
      activity_start: Number(years.rows[2].activity_start),
      activity_end: Number(years.rows[2].activity_end),
      role: source.role,
      notes: `${marker}:import-role`
    }
  ];
  const imported = await mutate({ operation: "import", payload: importedRows, request_id: `${marker}:import` });
  assert.equal(imported.v2.normalized_relationship_ids.length, 2, "mixed import did not return two normalized ids");
  const importedIds = imported.v2.normalized_relationship_ids;
  assert.equal((await compatRow(probe, importedIds[0]))?.role, null, "import null role not visible");
  assert.equal((await compatRow(probe, importedIds[1]))?.role, source.role, "import reviewed role not visible");
  await assertLegacyUnchanged(probe, baselineLegacy, "v2-only mixed import");

  const duringState = await stateSnapshot(probe);
  assert.equal(Number(duringState.legacy_rows), Number(baselineState.legacy_rows), "legacy count changed during v2-only commits");
  assert.equal(Number(duringState.normalized_rows), Number(baselineState.normalized_rows) + 3, "expected three committed normalized synthetic rows");
  assert.equal(Number(duringState.compatibility_rows), Number(baselineState.compatibility_rows) + 3, "compatibility did not expose all committed v2 rows");

  for (const [index, id] of [createdId, ...importedIds].entries()) {
    const deleted = await mutate({ operation: "delete", payload: { id }, request_id: `${marker}:delete:${index}` });
    assert.deepEqual(deleted.v2.normalized_relationship_ids, [id]);
    assert.equal(await compatRow(probe, id), null, `deleted normalized row ${index} remains visible`);
    await assertLegacyUnchanged(probe, baselineLegacy, `v2-only delete ${index}`);
  }

  const finalState = await stateSnapshot(probe);
  assert.deepEqual(
    {
      legacy_rows: Number(finalState.legacy_rows),
      compatibility_rows: Number(finalState.compatibility_rows),
      normalized_rows: Number(finalState.normalized_rows),
      legacy_rows_missing_from_v2: Number(finalState.legacy_rows_missing_from_v2),
      write_policies: Number(finalState.write_policies),
      read_policies: Number(finalState.read_policies)
    },
    {
      legacy_rows: Number(baselineState.legacy_rows),
      compatibility_rows: Number(baselineState.compatibility_rows),
      normalized_rows: Number(baselineState.normalized_rows),
      legacy_rows_missing_from_v2: Number(baselineState.legacy_rows_missing_from_v2),
      write_policies: Number(baselineState.write_policies),
      read_policies: Number(baselineState.read_policies)
    },
    "final state did not return exactly to baseline"
  );
  await assertLegacyUnchanged(probe, baselineLegacy, "final state");

  const residue = await probe.query(`
    select
      (select count(*)::int from atlas_v2.person_politics_v2 where legacy_source_key like $1) as normalized_residue,
      (select count(*)::int from public.atlas_person_politics_compat_v1 where notes like $2) as compatibility_residue,
      (select count(*)::int from public.person_politics where notes like $2) as legacy_residue`,
    [`v2-runtime:${marker}:%`, `${marker}:%`]);
  assert.equal(Number(residue.rows[0].normalized_residue), 0, "normalized synthetic residue remains");
  assert.equal(Number(residue.rows[0].compatibility_residue), 0, "compatibility synthetic residue remains");
  assert.equal(Number(residue.rows[0].legacy_residue), 0, "legacy synthetic residue unexpectedly exists");

  completed = true;
  console.log(JSON.stringify({
    marker: "PHASE_8C_C5A_V2_AUTHORITATIVE_COMMITTED_PROOF",
    exact_live_commit_path: true,
    write_mode: "v2-only",
    legacy_mutations: 0,
    legacy_digest_unchanged: true,
    normalized_ids_authoritative: true,
    operations: {
      create_null_role: true,
      update_null_to_role: true,
      update_role_to_null: true,
      mixed_import_null_and_role: true,
      delete_all_synthetic: true
    },
    verification_match_each_operation: true,
    compatibility_projection_checked: true,
    provenance: {
      runtime_source_key: true,
      direct_source_locator: true,
      direct_asserted_confidence: true,
      exact_as_recorded_chronology: true
    },
    baseline: {
      legacy_rows: Number(baselineState.legacy_rows),
      compatibility_rows: Number(baselineState.compatibility_rows),
      normalized_rows: Number(baselineState.normalized_rows)
    },
    final_state: {
      legacy_rows: Number(finalState.legacy_rows),
      compatibility_rows: Number(finalState.compatibility_rows),
      normalized_rows: Number(finalState.normalized_rows)
    },
    public_write_policies: Number(finalState.write_policies),
    public_read_policy_present: Number(finalState.read_policies) >= 1,
    normalized_residue: 0,
    compatibility_residue: 0,
    legacy_residue: 0,
    cleanup_fallback_used: false
  }, null, 2));
} finally {
  if (!completed) {
    const cleanup = await connectedClient();
    try {
      const result = await cleanup.query(`
        delete from atlas_v2.person_politics_v2
         where legacy_source_key like $1`, [`v2-runtime:${marker}:%`]);
      cleanupFallbackUsed = result.rowCount > 0;
      if (cleanupFallbackUsed) console.error(`C5A FALLBACK CLEANUP REMOVED ${result.rowCount} NORMALIZED ROW(S)`);
    } finally {
      await cleanup.end();
    }
  }
  await probe.end();
  if (cleanupFallbackUsed) process.exitCode = 2;
}
