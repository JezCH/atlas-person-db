"use strict";

function createNormalizedTx(client) {
  return {
    async resolvePersonExact({ name }) {
      const result = await client.query(`select pn.person_id as id from atlas_v2.person_names pn where pn.name=$1 order by pn.is_preferred desc,pn.id limit 2`, [name]);
      return result.rows.length === 1 ? result.rows[0].id : null;
    },
    async resolvePolityExact({ name }) {
      const result = await client.query(`select pn.polity_id as id from atlas_v2.polity_names pn where pn.name=$1 order by pn.is_preferred desc,pn.id limit 2`, [name]);
      return result.rows.length === 1 ? result.rows[0].id : null;
    },
    async resolveRoleExact({ code_or_name }) {
      const result = await client.query(`select r.id from atlas_v2.roles r left join atlas_v2.role_names rn on rn.role_id=r.id where r.code=$1 or rn.name=$1 group by r.id order by r.id limit 2`, [code_or_name]);
      return result.rows.length === 1 ? result.rows[0].id : null;
    },
    async resolvePeriodBasisExact({ code }) {
      const result = await client.query(`select id from atlas_v2.period_bases where code=$1 limit 2`, [code]);
      return result.rows.length === 1 ? result.rows[0].id : null;
    },
    async upsertPersonPoliticsV2(input) {
      const result = await client.query(`insert into atlas_v2.person_politics_v2
        (id,person_id,polity_id,activity_start,activity_end,role_id,period_basis_id,legacy_source_key,notes)
        values (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8)
        on conflict (legacy_source_key) do update set person_id=excluded.person_id,polity_id=excluded.polity_id,
        activity_start=excluded.activity_start,activity_end=excluded.activity_end,role_id=excluded.role_id,
        period_basis_id=excluded.period_basis_id,notes=excluded.notes,updated_at=now() returning id`,
        [input.person_id,input.polity_id,input.activity_start,input.activity_end,input.role_id,input.period_basis_id,input.legacy_source_key,input.notes ?? null]);
      return result.rows[0]?.id ?? null;
    },
    async resolveRelationshipByLegacyLineage({ legacy_record_id }) {
      const result = await client.query(`select id from atlas_v2.person_politics_v2 where legacy_source_key=$1 limit 2`, [String(legacy_record_id)]);
      return result.rows.length === 1 ? result.rows[0].id : null;
    },
    async retireOrDeletePersonPoliticsV2({ relationship_id }) {
      await client.query(`delete from atlas_v2.person_politics_v2 where id=$1`, [relationship_id]);
    },
    async findReplay(requestId) {
      const result = await client.query(`select normalized_relationship_ids from atlas_v2.write_request_log where request_id=$1`, [requestId]);
      return result.rows[0] ?? null;
    },
    async recordRequest({ request_id, normalized_relationship_ids }) {
      await client.query(`insert into atlas_v2.write_request_log(request_id,normalized_relationship_ids) values ($1,$2::uuid[]) on conflict (request_id) do nothing`, [request_id, normalized_relationship_ids]);
    }
  };
}

async function executeV2Plan(tx, plan, context = {}) {
  if (!plan || plan.commit !== false || plan.writes_performed !== 0) return { committed:false, normalized_relationship_ids:[], replay:false, transaction_failure:"unapproved command plan" };
  if (Array.isArray(plan.blockers) && plan.blockers.length) return { committed:false, normalized_relationship_ids:[], replay:false, transaction_failure:"command plan blocked" };

  const requestId = context.request_id ?? null;
  try {
    if (requestId && typeof tx.findReplay === "function") {
      const replay = await tx.findReplay(requestId);
      if (replay) return { committed:true, normalized_relationship_ids:Array.isArray(replay.normalized_relationship_ids) ? replay.normalized_relationship_ids : [], replay:true, transaction_failure:null };
    }
    const state = { person_id:null, polity_id:null, role_id:null, period_basis_id:null, relationship_id:null, relationshipIds:[] };
    for (const command of plan.commands || []) {
      switch (command.type) {
        case "BEGIN_IMPORT_ROW": break;
        case "RESOLVE_PERSON_EXACT": state.person_id = await tx.resolvePersonExact(command.lookup); if (!state.person_id) throw new Error("person identity unresolved"); break;
        case "RESOLVE_POLITY_EXACT": state.polity_id = await tx.resolvePolityExact(command.lookup); if (!state.polity_id) throw new Error("polity identity unresolved"); break;
        case "RESOLVE_ROLE_EXACT": state.role_id = await tx.resolveRoleExact(command.lookup); if (!state.role_id) throw new Error("role vocabulary unresolved"); break;
        case "RESOLVE_PERIOD_BASIS_EXACT": state.period_basis_id = await tx.resolvePeriodBasisExact(command.lookup); if (!state.period_basis_id) throw new Error("period basis unresolved"); break;
        case "UPSERT_PERSON_POLITICS_V2": {
          const id = await tx.upsertPersonPoliticsV2({ person_id:state.person_id, polity_id:state.polity_id, role_id:state.role_id, period_basis_id:state.period_basis_id, legacy_record_id:command.legacy_record_id ?? null, legacy_source_key:command.legacy_source_key, ...command.values });
          if (!id) throw new Error("relationship upsert did not return id");
          state.relationshipIds.push(id);
          state.person_id = state.polity_id = state.role_id = state.period_basis_id = null;
          break;
        }
        case "RESOLVE_RELATIONSHIP_BY_LEGACY_LINEAGE": state.relationship_id = await tx.resolveRelationshipByLegacyLineage(command.lookup); if (!state.relationship_id) throw new Error("relationship lineage unresolved"); break;
        case "RETIRE_OR_DELETE_PERSON_POLITICS_V2": await tx.retireOrDeletePersonPoliticsV2({ relationship_id:state.relationship_id, legacy_record_id:command.legacy_record_id ?? null }); state.relationshipIds.push(state.relationship_id); state.relationship_id=null; break;
        default: throw new Error(`unsupported executor command: ${command.type}`);
      }
    }
    if (requestId && typeof tx.recordRequest === "function") await tx.recordRequest({ request_id:requestId, normalized_relationship_ids:state.relationshipIds.slice() });
    return { committed:true, normalized_relationship_ids:state.relationshipIds.slice(), replay:false, transaction_failure:null };
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
  return async function executeLegacy({ operation, payload }) {
    if (operation === "create") {
      const row = normalizeLegacyPayload(operation, payload);
      const result = await client.query(`insert into public.person_politics (person_name,politic_name,activity_start,activity_end,role,period_basis,notes) values ($1,$2,$3,$4,$5,$6,$7) returning id`, [row.person_name,row.politic_name,row.activity_start,row.activity_end,row.role ?? null,row.period_basis,row.notes ?? null]);
      return { committed:result.rowCount === 1, record_ids:result.rows.map((r) => r.id) };
    }
    if (operation === "update") {
      const row = normalizeLegacyPayload(operation, payload); const id = payload?.id;
      const result = await client.query(`update public.person_politics set person_name=$1,politic_name=$2,activity_start=$3,activity_end=$4,role=$5,period_basis=$6,notes=$7 where id=$8`, [row.person_name,row.politic_name,row.activity_start,row.activity_end,row.role ?? null,row.period_basis,row.notes ?? null,id]);
      return { committed:result.rowCount === 1, record_ids:[id] };
    }
    if (operation === "delete") {
      const id = payload?.id; const result = await client.query(`delete from public.person_politics where id=$1`, [id]); return { committed:result.rowCount === 1, record_ids:[id] };
    }
    if (operation === "import") {
      const ids=[]; for (const row of normalizeLegacyPayload(operation,payload)) { const result=await client.query(`insert into public.person_politics (person_name,politic_name,activity_start,activity_end,role,period_basis,notes) values ($1,$2,$3,$4,$5,$6,$7) returning id`, [row.person_name,row.politic_name,row.activity_start,row.activity_end,row.role ?? null,row.period_basis,row.notes ?? null]); if (result.rowCount !== 1) return {committed:false,record_ids:ids,error:"legacy import row failed"}; ids.push(result.rows[0].id); } return { committed:true, record_ids:ids };
    }
    return { committed:false, record_ids:[], error:operation === "reconcile" ? "reconcile requires dedicated canonical transaction payload" : `unsupported legacy operation: ${operation}` };
  };
}

function createParityVerifier(client) {
  return async function parityVerifier({ operation, payload, legacy, v2 }) {
    if (operation === "delete") {
      const r=await client.query(`select count(*)::int as count from public.person_politics where id=$1`, [payload?.id]); const remaining=Number(r.rows[0]?.count || 0); return {checked:true,match:remaining===0,legacy_remaining:remaining};
    }
    const ids=Array.isArray(legacy?.record_ids) ? legacy.record_ids : []; if (!ids.length) return {checked:true,match:false,reason:"legacy ids missing"};
    const leftQ=await client.query(`select person_name,politic_name,activity_start,activity_end,role,period_basis,notes from public.person_politics where id = any($1::bigint[])`, [ids]);
    const rightQ=await client.query(`select coalesce(pn.name,p.canonical_name) as person_name,coalesce(poln.name,pol.canonical_name) as politic_name,pp.activity_start,pp.activity_end,coalesce(rn.name,r.code) as role,pb.code as period_basis,pp.notes from atlas_v2.person_politics_v2 pp join atlas_v2.persons p on p.id=pp.person_id left join lateral (select name from atlas_v2.person_names where person_id=p.id order by is_preferred desc,id limit 1) pn on true join atlas_v2.polities pol on pol.id=pp.polity_id left join lateral (select name from atlas_v2.polity_names where polity_id=pol.id order by is_preferred desc,id limit 1) poln on true left join atlas_v2.roles r on r.id=pp.role_id left join lateral (select name from atlas_v2.role_names where role_id=r.id order by id limit 1) rn on true join atlas_v2.period_bases pb on pb.id=pp.period_basis_id where pp.id = any($1::uuid[])`, [v2?.normalized_relationship_ids || []]);
    const norm=(row)=>({person_name:String(row.person_name||"").trim(),politic_name:String(row.politic_name||"").trim(),activity_start:Number(row.activity_start),activity_end:Number(row.activity_end),role:row.role==null?null:String(row.role).trim(),period_basis:String(row.period_basis||"").trim(),notes:row.notes==null?null:String(row.notes)});
    const left=leftQ.rows.map(norm).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))); const right=rightQ.rows.map(norm).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return {checked:true,match:JSON.stringify(left)===JSON.stringify(right),legacy_rows:left.length,v2_rows:right.length};
  };
}

function createDualWriteTransactionFactory({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");
  const legacyExecutor=createLegacyExecutor(client); const normalizedTx=createNormalizedTx(client);
  async function transactionFactory(work) {
    await client.query("begin");
    try {
      const tx={...normalizedTx,executeLegacy:legacyExecutor,async executeV2({plan,context}){return executeV2Plan(normalizedTx,plan,context);}};
      const result=await work(tx); await client.query("commit"); return result;
    } catch (error) { await client.query("rollback"); throw error; }
  }
  return { transactionFactory, parityVerifier:createParityVerifier(client) };
}

module.exports=Object.freeze({createDualWriteTransactionFactory,createLegacyExecutor,createParityVerifier,createNormalizedTx,executeV2Plan});
