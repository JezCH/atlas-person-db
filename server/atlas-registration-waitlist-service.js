"use strict";

// Waitlist intake is deliberately separate from reviewed-candidate approval.
// The only mutation is insert-only into the existing candidate ledger.
const { createHash } = require("node:crypto");
const { CANDIDATE_IDENTITY_CTES, identityKeySql } = require("./atlas-registration-queue-read-service.js");

const FIELDS = new Set(["candidate_id","name","display_name_ko","lookup_names","representative_domain","priority","source_issue"]);
function normalizeItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 30) throw Error("WAITLIST_BATCH_INVALID");
  const ids = new Set();
  function label(value, required = false) {
    if (value == null && !required) return null;
    if (typeof value !== "string" || !value.trim() || value.length > 240) throw Error("WAITLIST_LABEL_INVALID");
    return value.trim().normalize("NFC");
  }
  return items.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item) || Object.keys(item).some(k => !FIELDS.has(k))) throw Error("WAITLIST_FIELDS_FORBIDDEN");
    const candidate_id = label(item.candidate_id,true);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,179}$/.test(candidate_id) || ids.has(candidate_id)) throw Error("WAITLIST_ID_COLLISION");
    ids.add(candidate_id);
    const name = label(item.name,true);
    const display_name_ko = label(item.display_name_ko);
    const aliases = item.lookup_names ?? [];
    if (!Array.isArray(aliases) || aliases.length > 16) throw Error("WAITLIST_ALIASES_INVALID");
    const lookup_names = [...new Set([name, display_name_ko, ...aliases.map(a => label(a,true))].filter(Boolean))].sort();
    const representative_domain = label(item.representative_domain);
    const priority = label(item.priority);
    const source_issue = item.source_issue;
    if (!Number.isSafeInteger(source_issue) || source_issue < 1) throw Error("WAITLIST_SOURCE_REQUIRED");
    return {candidate_id,name,display_name_ko,lookup_names,representative_domain,priority,source_issue};
  }).sort((a,b) => a.candidate_id.localeCompare(b.candidate_id));
}

const PLAN_SQL = `
with ${CANDIDATE_IDENTITY_CTES},
incoming as (
  select item->>'candidate_id' as input_id, item->'lookup_names' as aliases
  from jsonb_array_elements($1::jsonb) as rows(item)
),
incoming_keys as (
  select distinct i.input_id, ${identityKeySql("a.alias_name")} as identity_key
  from incoming i cross join lateral jsonb_array_elements_text(i.aliases) as a(alias_name)
)
select i.input_id,
  exists(select 1 from atlas_v2.person_registration_candidates c where c.candidate_id=i.input_id) as id_exists,
  exists(select 1 from incoming_keys k where k.input_id=i.input_id and k.identity_key='') as empty_key,
  array(select distinct p.person_id::text from incoming_keys k join person_identity_keys p using(identity_key)
    where k.input_id=i.input_id and k.identity_key<>'' order by p.person_id::text) as person_ids,
  array(select distinct c.candidate_id from incoming_keys k join candidate_identity_keys c using(identity_key)
    where k.input_id=i.input_id and k.identity_key<>'' order by c.candidate_id) as candidate_ids,
  array(select distinct other.input_id from incoming_keys k join incoming_keys other using(identity_key)
    where k.input_id=i.input_id and k.identity_key<>'' and other.input_id<>i.input_id order by other.input_id) as batch_collisions
from incoming i order by i.input_id
`;

async function makePlan(client, items) {
  const { rows } = await client.query(PLAN_SQL,[JSON.stringify(items)]);
  const indexed = new Map(rows.map(r => [r.input_id,r]));
  if (rows.length !== items.length || indexed.size !== items.length) throw Error("WAITLIST_PREFLIGHT_READBACK");
  return items.map(item => {
    const row = indexed.get(item.candidate_id);
    if (!row || !["person_ids","candidate_ids","batch_collisions"].every(k => Array.isArray(row[k]))) throw Error("WAITLIST_PREFLIGHT_READBACK");
    const {person_ids,candidate_ids,batch_collisions} = row;
    const status = row.empty_key ? "BLOCKED_EMPTY_KEY" : batch_collisions.length ? "BLOCKED_BATCH_COLLISION" :
      row.id_exists ? "EXISTING_CANDIDATE_ID" : person_ids.length ? "EXISTING_PERSON_NAME_MATCH" :
      candidate_ids.length ? "EXISTING_CANDIDATE_NAME_MATCH" : "READY";
    return {candidate_id:item.candidate_id,name:item.name,status,person_ids,candidate_ids,batch_collisions};
  });
}
const planToken=(items,plan)=>createHash("sha256").update(JSON.stringify({items,plan})).digest("hex");

async function admitWaitlist({client,items:raw,commit=false,expected_token}={}) {
  if (typeof commit !== "boolean") throw Error("WAITLIST_COMMIT_INVALID");
  if (commit && !/^[a-f0-9]{64}$/.test(String(expected_token??""))) throw Error("WAITLIST_PREVIEW_REQUIRED");
  const items=normalizeItems(raw);
  await client.query(commit ? "begin isolation level serializable" : "begin isolation level repeatable read read only");
  try {
    const plan=await makePlan(client,items);
    const token=planToken(items,plan);
    if (commit && token!==expected_token) throw Error("WAITLIST_PREVIEW_STALE");
    const inserted=[];
    if(commit) {
      for(const entry of plan.filter(r=>r.status==="READY")) {
        const item=items.find(i=>i.candidate_id===entry.candidate_id);
        const metadata={
          source_issue:item.source_issue, lookup_names:item.lookup_names, display_name_ko:item.display_name_ko,
          review_state:"WAITLIST_USER_SELECTED", origin:"admin-waitlist-intake",
          user_authorized_for_registration:false, instruction:"queue_only_no_authoring_apply"
        };
        const res=await client.query(`insert into atlas_v2.person_registration_candidates
          (candidate_id,name,representative_domain,priority,review_metadata,person_id)
          values ($1,$2,$3,$4,$5::jsonb,null)
          on conflict(candidate_id) do nothing returning candidate_id,person_id,review_metadata`,
          [item.candidate_id,item.name,item.representative_domain,item.priority,JSON.stringify(metadata)]);
        const row=res.rows?.[0];
        if(res.rowCount!==1 || row?.candidate_id!==item.candidate_id || row.person_id!==null ||
           row.review_metadata?.user_authorized_for_registration!==false ||
           row.review_metadata?.review_state!=="WAITLIST_USER_SELECTED") throw Error("WAITLIST_INSERT_READBACK_CONFLICT");
        inserted.push(row.candidate_id);
      }
    }
    await client.query("commit");
    return {committed:commit,plan,preview_token:token,ready_count:plan.filter(r=>r.status==="READY").length,inserted};
  } catch(err) {
    await client.query("rollback");
    throw err;
  }
}
module.exports=Object.freeze({normalizeItems,makePlan,planToken,admitWaitlist,PLAN_SQL});
