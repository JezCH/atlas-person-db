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

function deterministicUuid(seed) {
  const bytes = crypto.createHash("sha256").update(String(seed)).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function runtimeLineageKey(legacyRecordId) {
  return `legacy-db:public.person_politics:${String(legacyRecordId)}`;
}

function normalizedRole(value) {
  const role = String(value ?? "").trim();
  return role || "unspecified";
}

function comparableLegacyRow(row) {
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

function sameLegacyRow(left, right) {
  return JSON.stringify(comparableLegacyRow(left)) === JSON.stringify(comparableLegacyRow(right));
}

function relationshipHash(input) {
  return contentHash({
    person_id: input.person_id,
    polity_id: input.polity_id,
    role_id: input.role_id,
    period_basis_id: input.period_basis_id,
    activity_start: Number(input.activity_start),
    activity_end: Number(input.activity_end),
    notes: input.notes ?? null
  });
}

function mutationLocator({ legacyRecordId, requestId }) {
  return {
    kind: "phase8c_dualwrite",
    legacy_table: "public.person_politics",
    legacy_record_id: String(legacyRecordId),
    request_id: requestId == null ? null : String(requestId)
  };
}

function createNormalizedTx(client) {
  async function resolveRelationshipExactSnapshot(row) {
    if (!row) return null;
    const result = await client.query(`
      select pp.id, pp.legacy_source_key
        from atlas_v2.person_politics_v2 pp
        join atlas_v2.roles r on r.id = pp.role_id
        join atlas_v2.period_bases pb on pb.id = pp.period_basis_id
       where pp.activity_start = $3
         and pp.activity_end = $4
         and pp.notes is not distinct from $7
         and pb.code = $6
         and exists (
           select 1 from atlas_v2.person_names pn
            where pn.person_id = pp.person_id and pn.name = $1
         )
         and exists (
           select 1 from atlas_v2.polity_names pn
            where pn.polity_id = pp.polity_id and pn.name = $2
         )
         and (
           r.code = $5 or r.source_label = $5 or exists (
             select 1 from atlas_v2.role_names rn where rn.role_id = r.id and rn.name = $5
           )
         )
       order by pp.id
       limit 2`, [
      row.person_name,
      row.politic_name,
      Number(row.activity_start),
      Number(row.activity_end),
      normalizedRole(row.role),
      row.period_basis,
      row.notes ?? null
    ]);
    return result.rows.length === 1 ? result.rows[0] : null;
  }

  return {
    async resolvePersonExact({ name }) {
      const result = await client.query(`select pn.person_id as id from atlas_v2.person_names pn where pn.name=$1 group by pn.person_id order by pn.person_id limit 2`, [name]);
      return result.rows.length === 1 ? result.rows[0].id : null;
    },
    async resolvePolityExact({ name }) {
      const result = await client.query(`select pn.polity_id as id from atlas_v2.polity_names pn where pn.name=$1 group by pn.polity_id order by pn.polity_id limit 2`, [name]);
      return result.rows.length === 1 ? result.rows[0].id : null;
    },
    async resolveRoleExact({ code_or_name }) {
      const result = await client.query(`select r.id from atlas_v2.roles r left join atlas_v2.role_names rn on rn.role_id=r.id where r.code=$1 or r.source_label=$1 or rn.name=$1 group by r.id order by r.id limit 2`, [code_or_name]);
      return result.rows.length === 1 ? result.rows[0].id : null;
    },
    async resolvePeriodBasisExact({ code }) {
      const result = await client.query(`select id from atlas_v2.period_bases where code=$1 order by id limit 2`, [code]);
      return result.rows.length === 1 ? result.rows[0].id : null;
    },
    async upsertPersonPoliticsV2(input) {
      const hash = relationshipHash(input);
      const locator = mutationLocator({ legacyRecordId: input.legacy_record_id, requestId: input.request_id });

      if (input.legacy_before) {
        const existing = await resolveRelationshipExactSnapshot(input.legacy_before);
        if (!existing) throw new Error("existing normalized relationship is not uniquely resolved from legacy preimage");
        const result = await client.query(`update atlas_v2.person_politics_v2
          set person_id=$1, polity_id=$2, activity_start=$3, activity_end=$4, role_id=$5,
              period_basis_id=$6, notes=$7, content_hash=$8,
              source_locator=source_locator || jsonb_build_object('last_mutation',$9::jsonb)
          where id=$10 returning id`, [
          input.person_id,
          input.polity_id,
          input.activity_start,
          input.activity_end,
          input.role_id,
          input.period_basis_id,
          input.notes ?? null,
          hash,
          JSON.stringify(locator),
          existing.id
        ]);
        return result.rows[0]?.id ?? null;
      }

      if (input.legacy_record_id == null || input.legacy_record_id === "") {
        throw new Error("legacy record id is required for normalized create/import lineage");
      }
      const lineage = runtimeLineageKey(input.legacy_record_id);
      const result = await client.query(`insert into atlas_v2.person_politics_v2
        (id,person_id,polity_id,activity_start,activity_end,role_id,period_basis_id,confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash)
        values (gen_random_uuid(),$1,$2,$3,$4,$5,$6,'legacy_asserted','exact_as_recorded',$7,$8,$9::jsonb,$10)
        on conflict (legacy_source_key) do update set
          person_id=excluded.person_id, polity_id=excluded.polity_id,
          activity_start=excluded.activity_start, activity_end=excluded.activity_end,
          role_id=excluded.role_id, period_basis_id=excluded.period_basis_id,
          notes=excluded.notes, source_locator=excluded.source_locator, content_hash=excluded.content_hash
        returning id`, [
        input.person_id,
        input.polity_id,
        input.activity_start,
        input.activity_end,
        input.role_id,
        input.period_basis_id,
        lineage,
        input.notes ?? null,
        JSON.stringify(locator),
        hash
      ]);
      return result.rows[0]?.id ?? null;
    },
    async resolveRelationshipByLegacyLineage({ legacy_record_id, legacy_before }) {
      if (legacy_before) {
        const exact = await resolveRelationshipExactSnapshot(legacy_before);
        return exact?.id ?? null;
      }
      const result = await client.query(`select id from atlas_v2.person_politics_v2 where legacy_source_key=$1 order by id limit 2`, [runtimeLineageKey(legacy_record_id)]);
      return result.rows.length === 1 ? result.rows[0].id : null;
    },
    async retireOrDeletePersonPoliticsV2({ relationship_id }) {
      const result = await client.query(`delete from atlas_v2.person_politics_v2 where id=$1`, [relationship_id]);
      if (result.rowCount !== 1) throw new Error("normalized relationship delete did not affect exactly one row");
    }
  };
}

async function executeV2Plan(tx, plan, context = {}) {
  if (!plan || plan.commit !== false || plan.writes_performed !== 0) return { committed:false, normalized_relationship_ids:[], replay:false, transaction_failure:"unapproved command plan" };
  if (Array.isArray(plan.blockers) && plan.blockers.length) return { committed:false, normalized_relationship_ids:[], replay:false, transaction_failure:"command plan blocked" };

  try {
    const state = {
      person_id:null,
      polity_id:null,
      role_id:null,
      period_basis_id:null,
      relationship_id:null,
      relationshipIds:[],
      row_index:0
    };
    const legacy = context.legacy || {};
    for (const command of plan.commands || []) {
      switch (command.type) {
        case "BEGIN_IMPORT_ROW": state.row_index = Number(command.row_index || 0); break;
        case "RESOLVE_PERSON_EXACT": state.person_id = await tx.resolvePersonExact(command.lookup); if (!state.person_id) throw new Error("person identity unresolved"); break;
        case "RESOLVE_POLITY_EXACT": state.polity_id = await tx.resolvePolityExact(command.lookup); if (!state.polity_id) throw new Error("polity identity unresolved"); break;
        case "RESOLVE_ROLE_EXACT": state.role_id = await tx.resolveRoleExact(command.lookup); if (!state.role_id) throw new Error("role vocabulary unresolved"); break;
        case "RESOLVE_PERIOD_BASIS_EXACT": state.period_basis_id = await tx.resolvePeriodBasisExact(command.lookup); if (!state.period_basis_id) throw new Error("period basis unresolved"); break;
        case "UPSERT_PERSON_POLITICS_V2": {
          const legacyRecordId = command.legacy_record_id ?? legacy.record_ids?.[state.row_index] ?? legacy.record_ids?.[0] ?? null;
          const legacyBefore = command.legacy_record_id != null ? legacy.before_rows?.[0] ?? null : null;
          const id = await tx.upsertPersonPoliticsV2({
            person_id:state.person_id,
            polity_id:state.polity_id,
            role_id:state.role_id,
            period_basis_id:state.period_basis_id,
            legacy_record_id:legacyRecordId,
            legacy_before:legacyBefore,
            request_id:context.request_id ?? null,
            ...command.values
          });
          if (!id) throw new Error("relationship upsert did not return id");
          state.relationshipIds.push(id);
          state.person_id = state.polity_id = state.role_id = state.period_basis_id = null;
          break;
        }
        case "RESOLVE_RELATIONSHIP_BY_LEGACY_LINEAGE": {
          const legacyBefore = legacy.before_rows?.[0] ?? null;
          state.relationship_id = await tx.resolveRelationshipByLegacyLineage({ ...command.lookup, legacy_before:legacyBefore });
          if (!state.relationship_id) throw new Error("relationship lineage unresolved");
          break;
        }
        case "RETIRE_OR_DELETE_PERSON_POLITICS_V2":
          await tx.retireOrDeletePersonPoliticsV2({ relationship_id:state.relationship_id });
          state.relationshipIds.push(state.relationship_id);
          state.relationship_id=null;
          break;
        default: throw new Error(`unsupported executor command: ${command.type}`);
      }
    }
    return { committed:true, normalized_relationship_ids:state.relationshipIds.slice(), replay:Boolean(legacy.replay), transaction_failure:null };
  } catch (error) {
    return { committed:false, normalized_relationship_ids:[], replay:false, transaction_failure:error?.message || String(error) };
  }
}

function normalizeLegacyPayload(operation, payload) {
  if (operation === "create") return payload;
  if (operation === "update") return payload?.value || null;
  if (operation === "import") return Array.isArray(payload) ? payload : [];
  return null;
}

function createLegacyExecutor(client) {
  async function selectLegacyRow(id, forUpdate = false) {
    const result = await client.query(`select id,person_name,politic_name,activity_start,activity_end,role,period_basis,notes from public.person_politics where id=$1${forUpdate ? " for update" : ""}`, [id]);
    return result.rows.length === 1 ? result.rows[0] : null;
  }

  async function insertReplaySafe(row, requestId, rowIndex) {
    const id = deterministicUuid(JSON.stringify(["public.person_politics", requestId, rowIndex, comparableLegacyRow(row)]));
    const result = await client.query(`insert into public.person_politics (id,person_name,politic_name,activity_start,activity_end,role,period_basis,notes) values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (id) do nothing returning id`, [id,row.person_name,row.politic_name,row.activity_start,row.activity_end,row.role ?? null,row.period_basis,row.notes ?? null]);
    if (result.rowCount === 1) return { id, replay:false };
    const existing = await selectLegacyRow(id, true);
    if (!existing || !sameLegacyRow(existing, row)) throw new Error("legacy idempotency collision with non-identical row");
    return { id, replay:true };
  }

  return async function executeLegacy({ operation, payload, request_id }) {
    if (operation === "create") {
      const row = normalizeLegacyPayload(operation, payload);
      const inserted = await insertReplaySafe(row, request_id, 0);
      return { committed:true, record_ids:[inserted.id], before_rows:[], replay:inserted.replay };
    }
    if (operation === "update") {
      const row = normalizeLegacyPayload(operation, payload);
      const id = payload?.id;
      const before = await selectLegacyRow(id, true);
      if (!before) return { committed:false, record_ids:[], before_rows:[], error:"legacy update target not found" };
      const result = await client.query(`update public.person_politics set person_name=$1,politic_name=$2,activity_start=$3,activity_end=$4,role=$5,period_basis=$6,notes=$7 where id=$8`, [row.person_name,row.politic_name,row.activity_start,row.activity_end,row.role ?? null,row.period_basis,row.notes ?? null,id]);
      return { committed:result.rowCount === 1, record_ids:[id], before_rows:[before], replay:sameLegacyRow(before,row) };
    }
    if (operation === "delete") {
      const id = payload?.id;
      const before = await selectLegacyRow(id, true);
      if (!before) return { committed:false, record_ids:[], before_rows:[], error:"legacy delete target not found" };
      const result = await client.query(`delete from public.person_politics where id=$1`, [id]);
      return { committed:result.rowCount === 1, record_ids:[id], before_rows:[before], replay:false };
    }
    if (operation === "import") {
      const ids=[];
      let replay=true;
      const rows = normalizeLegacyPayload(operation,payload);
      for (let index=0; index<rows.length; index += 1) {
        const inserted = await insertReplaySafe(rows[index], request_id, index);
        ids.push(inserted.id);
        replay = replay && inserted.replay;
      }
      return { committed:true, record_ids:ids, before_rows:[], replay };
    }
    return { committed:false, record_ids:[], before_rows:[], error:operation === "reconcile" ? "reconcile requires dedicated canonical transaction payload" : `unsupported legacy operation: ${operation}` };
  };
}

function createParityVerifier(client) {
  async function currentLegacyRow(id) {
    const result = await client.query(`select id,person_name,politic_name,activity_start,activity_end,role,period_basis,notes from public.person_politics where id=$1`, [id]);
    return result.rows.length === 1 ? result.rows[0] : null;
  }

  async function normalizedRowMatches(id, legacyRow) {
    const result = await client.query(`
      select pp.activity_start, pp.activity_end, pp.notes, r.source_label as role, pb.code as period_basis,
             exists (select 1 from atlas_v2.person_names pn where pn.person_id=pp.person_id and pn.name=$2) as person_match,
             exists (select 1 from atlas_v2.polity_names pn where pn.polity_id=pp.polity_id and pn.name=$3) as polity_match
        from atlas_v2.person_politics_v2 pp
        join atlas_v2.roles r on r.id=pp.role_id
        join atlas_v2.period_bases pb on pb.id=pp.period_basis_id
       where pp.id=$1`, [id, legacyRow.person_name, legacyRow.politic_name]);
    if (result.rows.length !== 1) return false;
    const row = result.rows[0];
    return row.person_match === true
      && row.polity_match === true
      && Number(row.activity_start) === Number(legacyRow.activity_start)
      && Number(row.activity_end) === Number(legacyRow.activity_end)
      && String(row.role ?? "") === normalizedRole(legacyRow.role)
      && String(row.period_basis ?? "") === String(legacyRow.period_basis ?? "")
      && (row.notes ?? null) === (legacyRow.notes ?? null);
  }

  return async function parityVerifier({ operation, legacy, v2 }) {
    const legacyIds = Array.isArray(legacy?.record_ids) ? legacy.record_ids : [];
    const v2Ids = Array.isArray(v2?.normalized_relationship_ids) ? v2.normalized_relationship_ids : [];
    if (!legacyIds.length || legacyIds.length !== v2Ids.length) {
      return { checked:true, match:false, reason:"legacy/v2 relationship id cardinality mismatch", legacy_rows:legacyIds.length, v2_rows:v2Ids.length };
    }

    if (operation === "delete") {
      const legacyRow = await currentLegacyRow(legacyIds[0]);
      const normalized = await client.query(`select count(*)::int as count from atlas_v2.person_politics_v2 where id=$1`, [v2Ids[0]]);
      const normalizedRemaining = Number(normalized.rows[0]?.count || 0);
      return {
        checked:true,
        match:legacyRow === null && normalizedRemaining === 0,
        legacy_remaining:legacyRow === null ? 0 : 1,
        v2_remaining:normalizedRemaining
      };
    }

    for (let index=0; index<legacyIds.length; index += 1) {
      const legacyRow = await currentLegacyRow(legacyIds[index]);
      if (!legacyRow) return { checked:true, match:false, reason:`legacy row ${index} missing`, legacy_rows:index, v2_rows:index };
      if (!await normalizedRowMatches(v2Ids[index], legacyRow)) {
        return { checked:true, match:false, reason:`normalized row ${index} mismatch`, legacy_rows:legacyIds.length, v2_rows:v2Ids.length };
      }
    }
    return { checked:true, match:true, legacy_rows:legacyIds.length, v2_rows:v2Ids.length };
  };
}

function createDualWriteTransactionFactory({ client, rollbackOnly = false } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");
  const legacyExecutor=createLegacyExecutor(client);
  const normalizedTx=createNormalizedTx(client);
  async function transactionFactory(work) {
    await client.query("begin");
    try {
      const tx={...normalizedTx,executeLegacy:legacyExecutor,async executeV2({plan,context}){return executeV2Plan(normalizedTx,plan,context);}};
      const result=await work(tx);
      if (rollbackOnly) await client.query("rollback");
      else await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }
  return { transactionFactory, parityVerifier:createParityVerifier(client) };
}

module.exports=Object.freeze({
  createDualWriteTransactionFactory,
  createLegacyExecutor,
  createParityVerifier,
  createNormalizedTx,
  executeV2Plan,
  deterministicUuid,
  runtimeLineageKey,
  contentHash
});
