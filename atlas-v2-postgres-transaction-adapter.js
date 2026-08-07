(() => {
  "use strict";

  function qident(value) {
    return `"${String(value).replaceAll('"','""')}"`;
  }

  function createPostgresTransactionFactory({ client } = {}) {
    if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");

    return async function transactionFactory(work) {
      await client.query("begin");
      try {
        const tx = {
          async resolvePersonExact({ name }) {
            const result = await client.query(
              `select pn.person_id as id\n                 from atlas_v2.person_names pn\n                where pn.name = $1\n                order by pn.is_preferred desc, pn.id\n                limit 2`,
              [name]
            );
            return result.rows.length === 1 ? result.rows[0].id : null;
          },
          async resolvePolityExact({ name }) {
            const result = await client.query(
              `select pn.polity_id as id\n                 from atlas_v2.polity_names pn\n                where pn.name = $1\n                order by pn.is_preferred desc, pn.id\n                limit 2`,
              [name]
            );
            return result.rows.length === 1 ? result.rows[0].id : null;
          },
          async resolveRoleExact({ code_or_name }) {
            const result = await client.query(
              `select r.id\n                 from atlas_v2.roles r\n                 left join atlas_v2.role_names rn on rn.role_id = r.id\n                where r.code = $1 or rn.name = $1\n                group by r.id\n                order by r.id\n                limit 2`,
              [code_or_name]
            );
            return result.rows.length === 1 ? result.rows[0].id : null;
          },
          async resolvePeriodBasisExact({ code }) {
            const result = await client.query(
              `select id from atlas_v2.period_bases where code = $1 limit 2`,
              [code]
            );
            return result.rows.length === 1 ? result.rows[0].id : null;
          },
          async upsertPersonPoliticsV2(input) {
            const result = await client.query(
              `insert into atlas_v2.person_politics_v2\n                 (id, person_id, polity_id, activity_start, activity_end, role_id, period_basis_id, legacy_source_key, notes)\n               values (gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7,$8)\n               on conflict (legacy_source_key) do update set\n                 person_id = excluded.person_id,\n                 polity_id = excluded.polity_id,\n                 activity_start = excluded.activity_start,\n                 activity_end = excluded.activity_end,\n                 role_id = excluded.role_id,\n                 period_basis_id = excluded.period_basis_id,\n                 notes = excluded.notes,\n                 updated_at = now()\n               returning id`,
              [input.person_id, input.polity_id, input.activity_start, input.activity_end, input.role_id, input.period_basis_id, input.legacy_source_key, input.notes ?? null]
            );
            return result.rows[0]?.id ?? null;
          },
          async resolveRelationshipByLegacyLineage({ legacy_record_id }) {
            const result = await client.query(
              `select id from atlas_v2.person_politics_v2 where legacy_source_key = $1 limit 2`,
              [String(legacy_record_id)]
            );
            return result.rows.length === 1 ? result.rows[0].id : null;
          },
          async retireOrDeletePersonPoliticsV2({ relationship_id }) {
            await client.query(`delete from atlas_v2.person_politics_v2 where id = $1`, [relationship_id]);
          },
          async findReplay(requestId) {
            const result = await client.query(
              `select normalized_relationship_ids from atlas_v2.write_request_log where request_id = $1`,
              [requestId]
            );
            return result.rows[0] ?? null;
          },
          async recordRequest({ request_id, normalized_relationship_ids }) {
            await client.query(
              `insert into atlas_v2.write_request_log(request_id, normalized_relationship_ids) values ($1,$2::uuid[]) on conflict (request_id) do nothing`,
              [request_id, normalized_relationship_ids]
            );
          }
        };
        const result = await work(tx);
        await client.query("commit");
        return result;
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    };
  }

  const api = Object.freeze({ createPostgresTransactionFactory });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.ATLAS_V2_POSTGRES_TRANSACTION_ADAPTER = api;
})();
