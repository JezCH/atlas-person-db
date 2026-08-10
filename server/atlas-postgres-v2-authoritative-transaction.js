"use strict";

const crypto = require("node:crypto");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function contentHash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function runtimeSourceKey(requestId, rowIndex = 0) {
  return `v2-runtime:${String(requestId)}:${Number(rowIndex)}`;
}

function comparablePayload(row) {
  return {
    person_name: String(row?.person_name ?? "").trim(),
    politic_name: String(row?.politic_name ?? "").trim(),
    activity_start: Number(row?.activity_start),
    activity_end: Number(row?.activity_end),
    role: row?.role == null || String(row.role).trim() === "" ? null : String(row.role).trim(),
    period_basis: String(row?.period_basis ?? "").trim(),
    notes: row?.notes == null || String(row.notes).trim() === "" ? null : String(row.notes).trim()
  };
}

function semanticKey({ person_id, polity_id, activity_start, activity_end, role_id, period_basis_id }) {
  return [
    String(person_id),
    String(polity_id),
    Number(activity_start),
    Number(activity_end),
    role_id == null ? "<NULL_ROLE>" : String(role_id),
    String(period_basis_id)
  ].join("|");
}

function sameResolvedRow(row, resolved) {
  return String(row.person_id) === String(resolved.person_id)
    && String(row.polity_id) === String(resolved.polity_id)
    && Number(row.activity_start) === Number(resolved.activity_start)
    && Number(row.activity_end) === Number(resolved.activity_end)
    && String(row.role_id ?? "") === String(resolved.role_id ?? "")
    && String(row.period_basis_id) === String(resolved.period_basis_id)
    && (row.notes ?? null) === (resolved.notes ?? null);
}

function createV2AuthoritativeTx(client) {
  async function resolveOne(sql, params, label) {
    const result = await client.query(sql, params);
    if (result.rows.length !== 1) throw new Error(`${label} unresolved or ambiguous`);
    return result.rows[0].id;
  }

  async function resolvePayload(row) {
    const value = comparablePayload(row);
    const personId = await resolveOne(
      `select pn.person_id as id
         from atlas_v2.person_names pn
        where pn.name=$1
        group by pn.person_id
        order by pn.person_id
        limit 2`,
      [value.person_name],
      "person identity"
    );
    const polityId = await resolveOne(
      `select pn.polity_id as id
         from atlas_v2.polity_names pn
        where pn.name=$1
        group by pn.polity_id
        order by pn.polity_id
        limit 2`,
      [value.politic_name],
      "polity identity"
    );
    let roleId = null;
    if (value.role != null) {
      roleId = await resolveOne(
        `select r.id
           from atlas_v2.roles r
           left join atlas_v2.role_names rn on rn.role_id=r.id
          where r.code=$1 or r.source_label=$1 or rn.name=$1
          group by r.id
          order by r.id
          limit 2`,
        [value.role],
        "role vocabulary"
      );
    }
    const periodBasisId = await resolveOne(
      `select id from atlas_v2.period_bases where code=$1 order by id limit 2`,
      [value.period_basis],
      "period basis"
    );
    return {
      ...value,
      person_id: personId,
      polity_id: polityId,
      role_id: roleId,
      period_basis_id: periodBasisId
    };
  }

  async function lockKey(prefix, key) {
    await client.query(`select pg_advisory_xact_lock(hashtext($1))`, [`${prefix}:${key}`]);
  }

  async function lockSemantic(resolved) {
    await lockKey("atlas-v2-authoritative", semanticKey(resolved));
  }

  async function semanticCollisions(resolved, excludeId = null) {
    const result = await client.query(`
      select id
        from atlas_v2.person_politics_v2
       where person_id=$1
         and polity_id=$2
         and activity_start=$3
         and activity_end=$4
         and role_id is not distinct from $5::uuid
         and period_basis_id=$6
         and ($7::uuid is null or id <> $7::uuid)
       order by id
       limit 2`, [
      resolved.person_id,
      resolved.polity_id,
      resolved.activity_start,
      resolved.activity_end,
      resolved.role_id,
      resolved.period_basis_id,
      excludeId
    ]);
    return result.rows.map((row) => row.id);
  }

  async function selectByRuntimeKey(sourceKey, forUpdate = false) {
    const result = await client.query(`
      select id,person_id,polity_id,activity_start,activity_end,role_id,period_basis_id,notes,
             legacy_source_key,source_locator,content_hash,confidence,chronology_status
        from atlas_v2.person_politics_v2
       where legacy_source_key=$1${forUpdate ? " for update" : ""}`,
    [sourceKey]);
    return result.rows.length === 1 ? result.rows[0] : null;
  }

  async function selectById(id, forUpdate = false) {
    const result = await client.query(`
      select id,person_id,polity_id,activity_start,activity_end,role_id,period_basis_id,notes,
             legacy_source_key,source_locator,content_hash,confidence,chronology_status
        from atlas_v2.person_politics_v2
       where id=$1${forUpdate ? " for update" : ""}`,
    [id]);
    return result.rows.length === 1 ? result.rows[0] : null;
  }

  async function createOne(row, requestId, rowIndex) {
    const resolved = await resolvePayload(row);
    const sourceKey = runtimeSourceKey(requestId, rowIndex);
    await lockKey("atlas-v2-runtime-source", sourceKey);
    const existing = await selectByRuntimeKey(sourceKey, true);
    if (existing) {
      if (!sameResolvedRow(existing, resolved)) {
        throw new Error("v2 idempotency key collision with non-identical payload");
      }
      return { id: existing.id, replay: true };
    }

    await lockSemantic(resolved);
    const collisions = await semanticCollisions(resolved);
    if (collisions.length) throw new Error("v2 semantic duplicate already exists");

    const locator = {
      kind: "phase8c_v2_authoritative",
      request_id: String(requestId),
      row_index: Number(rowIndex)
    };
    const result = await client.query(`
      insert into atlas_v2.person_politics_v2
        (id,person_id,polity_id,activity_start,activity_end,role_id,period_basis_id,
         confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash)
      values
        (gen_random_uuid(),$1,$2,$3,$4,$5,$6,'direct_asserted','exact_as_recorded',$7,$8,$9::jsonb,$10)
      returning id`, [
      resolved.person_id,
      resolved.polity_id,
      resolved.activity_start,
      resolved.activity_end,
      resolved.role_id,
      resolved.period_basis_id,
      sourceKey,
      resolved.notes,
      JSON.stringify(locator),
      contentHash(comparablePayload(row))
    ]);
    if (result.rows.length !== 1) throw new Error("v2 create did not return exactly one id");
    return { id: result.rows[0].id, replay: false };
  }

  async function updateOne(id, row) {
    const before = await selectById(id, true);
    if (!before) throw new Error("normalized update target not found");
    const resolved = await resolvePayload(row);
    const beforeSemantic = semanticKey(before);
    const afterSemantic = semanticKey(resolved);
    if (beforeSemantic !== afterSemantic) {
      await lockSemantic(resolved);
      const collisions = await semanticCollisions(resolved, id);
      if (collisions.length) throw new Error("v2 semantic duplicate would be introduced by update");
    }
    const result = await client.query(`
      update atlas_v2.person_politics_v2
         set person_id=$1,
             polity_id=$2,
             activity_start=$3,
             activity_end=$4,
             role_id=$5,
             period_basis_id=$6,
             notes=$7
       where id=$8
       returning id`, [
      resolved.person_id,
      resolved.polity_id,
      resolved.activity_start,
      resolved.activity_end,
      resolved.role_id,
      resolved.period_basis_id,
      resolved.notes,
      id
    ]);
    if (result.rows.length !== 1) throw new Error("v2 update did not affect exactly one row");
    return { id: result.rows[0].id, replay: sameResolvedRow(before, resolved) };
  }

  async function deleteOne(id) {
    const before = await selectById(id, true);
    if (!before) throw new Error("normalized delete target not found");
    const result = await client.query(`delete from atlas_v2.person_politics_v2 where id=$1 returning id`, [id]);
    if (result.rows.length !== 1) throw new Error("v2 delete did not affect exactly one row");
    return { id: result.rows[0].id, replay: false };
  }

  return Object.freeze({
    async executeV2Authoritative({ operation, payload, request_id }) {
      if (operation === "create") {
        const created = await createOne(payload, request_id, 0);
        return { committed: true, normalized_relationship_ids: [created.id], replay: created.replay, transaction_failure: null };
      }
      if (operation === "update") {
        const updated = await updateOne(payload?.id, payload?.value);
        return { committed: true, normalized_relationship_ids: [updated.id], replay: updated.replay, transaction_failure: null };
      }
      if (operation === "delete") {
        const deleted = await deleteOne(payload?.id);
        return { committed: true, normalized_relationship_ids: [deleted.id], replay: deleted.replay, transaction_failure: null };
      }
      if (operation === "import") {
        const ids = [];
        let replay = true;
        const rows = Array.isArray(payload) ? payload : [];
        for (let index = 0; index < rows.length; index += 1) {
          const created = await createOne(rows[index], request_id, index);
          ids.push(created.id);
          replay = replay && created.replay;
        }
        return { committed: true, normalized_relationship_ids: ids, replay, transaction_failure: null };
      }
      throw new Error(`unsupported v2-authoritative operation: ${operation}`);
    },
    selectById
  });
}

function createV2VerificationVerifier(client) {
  return async function verify({ operation, payload, v2 }) {
    const ids = Array.isArray(v2?.normalized_relationship_ids) ? v2.normalized_relationship_ids : [];
    if (!ids.length) return { checked: true, match: false, reason: "normalized relationship id missing" };

    if (operation === "delete") {
      const result = await client.query(`select count(*)::int as count from atlas_v2.person_politics_v2 where id=$1`, [ids[0]]);
      return { checked: true, match: Number(result.rows[0]?.count || 0) === 0, remaining: Number(result.rows[0]?.count || 0) };
    }

    const rows = operation === "import" ? payload : [operation === "update" ? payload?.value : payload];
    if (rows.length !== ids.length) return { checked: true, match: false, reason: "payload/id cardinality mismatch" };

    for (let index = 0; index < ids.length; index += 1) {
      const expected = comparablePayload(rows[index]);
      const result = await client.query(`
        select pp.activity_start,pp.activity_end,pp.notes,r.source_label as role,pb.code as period_basis,
               exists(select 1 from atlas_v2.person_names pn where pn.person_id=pp.person_id and pn.name=$2) as person_match,
               exists(select 1 from atlas_v2.polity_names pn where pn.polity_id=pp.polity_id and pn.name=$3) as polity_match
          from atlas_v2.person_politics_v2 pp
          left join atlas_v2.roles r on r.id=pp.role_id
          join atlas_v2.period_bases pb on pb.id=pp.period_basis_id
         where pp.id=$1`, [ids[index], expected.person_name, expected.politic_name]);
      if (result.rows.length !== 1) return { checked: true, match: false, reason: `normalized row ${index} missing` };
      const row = result.rows[0];
      const match = row.person_match === true
        && row.polity_match === true
        && Number(row.activity_start) === expected.activity_start
        && Number(row.activity_end) === expected.activity_end
        && String(row.role ?? "") === String(expected.role ?? "")
        && String(row.period_basis) === expected.period_basis
        && (row.notes ?? null) === expected.notes;
      if (!match) return { checked: true, match: false, reason: `normalized row ${index} mismatch` };
    }
    return { checked: true, match: true, rows: ids.length };
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
  return { transactionFactory, verificationVerifier: createV2VerificationVerifier(client) };
}

module.exports = Object.freeze({
  createV2AuthoritativeTransactionFactory,
  createV2AuthoritativeTx,
  createV2VerificationVerifier,
  runtimeSourceKey,
  comparablePayload,
  contentHash,
  semanticKey
});
