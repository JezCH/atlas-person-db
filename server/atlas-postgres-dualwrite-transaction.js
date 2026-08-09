"use strict";

const { createPostgresTransactionFactory } = require("../atlas-v2-postgres-transaction-adapter.js");
const { createIsolatedExecutor } = require("../atlas-v2-isolated-executor.js");

function normalizeLegacyPayload(operation, payload) {
  if (operation === "create") return payload;
  if (operation === "update") return payload?.value || null;
  if (operation === "import") return Array.isArray(payload) ? payload : [];
  return null;
}

function createLegacyExecutor(client) {
  return async function executeLegacy({ operation, payload }) {
    if (operation === "create") {
      const row = normalizeLegacyPayload(operation, payload);
      const result = await client.query(
        `insert into public.person_politics
          (person_name, politic_name, activity_start, activity_end, role, period_basis, notes)
         values ($1,$2,$3,$4,$5,$6,$7)
         returning id`,
        [row.person_name, row.politic_name, row.activity_start, row.activity_end, row.role ?? null, row.period_basis, row.notes ?? null]
      );
      return { committed: result.rowCount === 1, record_ids: result.rows.map((r) => r.id) };
    }

    if (operation === "update") {
      const row = normalizeLegacyPayload(operation, payload);
      const id = payload?.id;
      const result = await client.query(
        `update public.person_politics
            set person_name=$1, politic_name=$2, activity_start=$3, activity_end=$4,
                role=$5, period_basis=$6, notes=$7
          where id=$8`,
        [row.person_name, row.politic_name, row.activity_start, row.activity_end, row.role ?? null, row.period_basis, row.notes ?? null, id]
      );
      return { committed: result.rowCount === 1, record_ids: [id] };
    }

    if (operation === "delete") {
      const id = payload?.id;
      const result = await client.query(`delete from public.person_politics where id=$1`, [id]);
      return { committed: result.rowCount === 1, record_ids: [id] };
    }

    if (operation === "import") {
      const rows = normalizeLegacyPayload(operation, payload);
      const ids = [];
      for (const row of rows) {
        const result = await client.query(
          `insert into public.person_politics
            (person_name, politic_name, activity_start, activity_end, role, period_basis, notes)
           values ($1,$2,$3,$4,$5,$6,$7)
           returning id`,
          [row.person_name, row.politic_name, row.activity_start, row.activity_end, row.role ?? null, row.period_basis, row.notes ?? null]
        );
        if (result.rowCount !== 1) return { committed: false, record_ids: ids, error: "legacy import row failed" };
        ids.push(result.rows[0].id);
      }
      return { committed: true, record_ids: ids };
    }

    if (operation === "reconcile") {
      return { committed: false, record_ids: [], error: "reconcile requires dedicated canonical transaction payload" };
    }

    return { committed: false, record_ids: [], error: `unsupported legacy operation: ${operation}` };
  };
}

function createParityVerifier(client) {
  return async function parityVerifier({ operation, payload, legacy, v2 }) {
    if (operation === "delete") {
      const legacyId = payload?.id;
      const legacyResult = await client.query(`select count(*)::int as count from public.person_politics where id=$1`, [legacyId]);
      const remaining = Number(legacyResult.rows[0]?.count || 0);
      return { checked: true, match: remaining === 0 && Array.isArray(v2?.normalized_relationship_ids), legacy_remaining: remaining };
    }

    const ids = Array.isArray(legacy?.record_ids) ? legacy.record_ids : [];
    if (!ids.length) return { checked: true, match: false, reason: "legacy ids missing" };

    const legacyRows = await client.query(
      `select id, person_name, politic_name, activity_start, activity_end, role, period_basis, notes
         from public.person_politics
        where id = any($1::bigint[])
        order by id`,
      [ids]
    );

    const v2Rows = await client.query(
      `select pp.id,
              coalesce(pn.name, p.canonical_name) as person_name,
              coalesce(poln.name, pol.canonical_name) as politic_name,
              pp.activity_start, pp.activity_end,
              coalesce(rn.name, r.code) as role,
              pb.code as period_basis,
              pp.notes
         from atlas_v2.person_politics_v2 pp
         join atlas_v2.persons p on p.id = pp.person_id
         left join lateral (
           select name from atlas_v2.person_names where person_id=p.id order by is_preferred desc, id limit 1
         ) pn on true
         join atlas_v2.polities pol on pol.id = pp.polity_id
         left join lateral (
           select name from atlas_v2.polity_names where polity_id=pol.id order by is_preferred desc, id limit 1
         ) poln on true
         left join atlas_v2.roles r on r.id = pp.role_id
         left join lateral (
           select name from atlas_v2.role_names where role_id=r.id order by id limit 1
         ) rn on true
         join atlas_v2.period_bases pb on pb.id = pp.period_basis_id
        where pp.id = any($1::uuid[])
        order by pp.id`,
      [v2?.normalized_relationship_ids || []]
    );

    const normalize = (row) => ({
      person_name: String(row.person_name || "").trim(),
      politic_name: String(row.politic_name || "").trim(),
      activity_start: Number(row.activity_start),
      activity_end: Number(row.activity_end),
      role: row.role == null ? null : String(row.role).trim(),
      period_basis: String(row.period_basis || "").trim(),
      notes: row.notes == null ? null : String(row.notes)
    });

    const legacyNormalized = legacyRows.rows.map(normalize);
    const v2Normalized = v2Rows.rows.map(normalize);
    const sortKey = (row) => JSON.stringify(row);
    legacyNormalized.sort((a,b) => sortKey(a).localeCompare(sortKey(b)));
    v2Normalized.sort((a,b) => sortKey(a).localeCompare(sortKey(b)));
    const match = JSON.stringify(legacyNormalized) === JSON.stringify(v2Normalized);
    return { checked: true, match, legacy_rows: legacyNormalized.length, v2_rows: v2Normalized.length };
  };
}

function createDualWriteTransactionFactory({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");

  const legacyExecutor = createLegacyExecutor(client);
  const baseV2Factory = createPostgresTransactionFactory({ client });
  const v2Executor = createIsolatedExecutor({
    transactionFactory: async (work) => {
      const tx = globalThis.__ATLAS_ACTIVE_TX;
      if (!tx) throw new Error("v2 execution must run inside active dual-write transaction");
      return work(tx);
    }
  });

  async function transactionFactory(work) {
    await client.query("begin");
    try {
      let activeTx = null;
      await baseV2Factory(async (tx) => { activeTx = tx; throw Object.assign(new Error("capture-only"), { captureOnly: true }); }).catch((error) => {
        if (!error?.captureOnly) throw error;
      });
      if (!activeTx) throw new Error("failed to initialize normalized transaction adapter");
      globalThis.__ATLAS_ACTIVE_TX = activeTx;
      const tx = {
        ...activeTx,
        executeLegacy: legacyExecutor,
        async executeV2({ plan, context }) { return v2Executor({ plan, context }); }
      };
      const result = await work(tx);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      delete globalThis.__ATLAS_ACTIVE_TX;
    }
  }

  return { transactionFactory, parityVerifier: createParityVerifier(client) };
}

module.exports = Object.freeze({ createDualWriteTransactionFactory, createLegacyExecutor, createParityVerifier });
