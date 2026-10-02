"use strict";

const RETIRED_ACTIVITY_WRITE_CODE = "P9_LEGACY_ACTIVITY_MUTATION_RETIRED_USE_AUTHORING_MANIFEST_V2";

function createV2AuthoritativeTx(client) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");

  async function selectById(id, forUpdate = false) {
    const result = await client.query(
      `select id
         from atlas_v2.person_politics_v2
        where id=$1::uuid${forUpdate ? " for update" : ""}`,
      [id]
    );
    return result.rows.length === 1 ? result.rows[0] : null;
  }

  async function deleteOne(id) {
    const before = await selectById(id, true);
    if (!before) throw new Error("normalized delete target not found");
    const result = await client.query(
      "delete from atlas_v2.person_politics_v2 where id=$1::uuid returning id",
      [id]
    );
    if (result.rows.length !== 1) throw new Error("v2 delete did not affect exactly one row");
    return Object.freeze({ id:result.rows[0].id, replay:false });
  }

  return Object.freeze({
    async executeV2Authoritative({ operation, payload }) {
      if (operation !== "delete") throw new Error(RETIRED_ACTIVITY_WRITE_CODE);
      const deleted = await deleteOne(payload?.id);
      return Object.freeze({
        committed:true,
        normalized_relationship_ids:[deleted.id],
        replay:false,
        transaction_failure:null
      });
    },
    selectById
  });
}

function createV2VerificationVerifier(client) {
  return async function verify({ operation, v2 }) {
    if (operation !== "delete") {
      return Object.freeze({ checked:true, match:false, reason:RETIRED_ACTIVITY_WRITE_CODE });
    }
    const ids = Array.isArray(v2?.normalized_relationship_ids) ? v2.normalized_relationship_ids : [];
    if (ids.length !== 1) return Object.freeze({ checked:true, match:false, reason:"normalized relationship id missing" });
    const result = await client.query(
      "select count(*)::int as count from atlas_v2.person_politics_v2 where id=$1::uuid",
      [ids[0]]
    );
    const remaining = Number(result.rows[0]?.count || 0);
    return Object.freeze({ checked:true, match:remaining===0, remaining });
  };
}

function createV2AuthoritativeTransactionFactory({ client, rollbackOnly = false } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");
  const tx = createV2AuthoritativeTx(client);

  async function transactionFactory(work) {
    await client.query("begin");
    try {
      const result = await work(tx);
      if (rollbackOnly) await client.query("rollback");
      else await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }

  return Object.freeze({
    transactionFactory,
    verificationVerifier:createV2VerificationVerifier(client)
  });
}

module.exports = Object.freeze({
  createV2AuthoritativeTransactionFactory,
  createV2AuthoritativeTx,
  createV2VerificationVerifier,
  RETIRED_ACTIVITY_WRITE_CODE
});
