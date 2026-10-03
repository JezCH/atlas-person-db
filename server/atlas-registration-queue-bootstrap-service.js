"use strict";

const fs=require("node:fs");
const path=require("node:path");

const SOURCE_PATH=path.join(__dirname,"..","data","core","person-registration-queue-source.v1.json");
const SOURCE_SCHEMA="atlas-core/person-registration-queue-source/v1";
const EXPECTED_TOTAL=701;
const EXPECTED_PENDING=393;
const EXPECTED_BOUND=308;
const EXPECTED_COMMERCE=55;

function textValue(value){ return String(value ?? "").normalize("NFC").trim(); }
function normalizeLookupName(value) {
  return textValue(value)
    .normalize("NFKD")
    .replace(/\p{M}/gu,"")
    .normalize("NFKC")
    .toLocaleLowerCase("und")
    .replace(/[’'`".,()[\]{}\-–—_/]+/gu," ")
    .replace(/\s+/gu," ")
    .trim();
}
function loadBootstrapSource(filePath=SOURCE_PATH) {
  const payload=JSON.parse(fs.readFileSync(filePath,"utf8"));
  if (payload?.schema!==SOURCE_SCHEMA || !Array.isArray(payload?.candidates)) throw new Error("REGISTRATION_QUEUE_BOOTSTRAP_SOURCE_INVALID");
  const seen=new Set();
  const candidates=payload.candidates.map(raw=>{
    const candidate_id=textValue(raw?.candidate_id);
    const name=textValue(raw?.name);
    if (!candidate_id || !name || seen.has(candidate_id)) throw new Error("REGISTRATION_QUEUE_BOOTSTRAP_CANDIDATE_INVALID");
    seen.add(candidate_id);
    const lookup_names=[...new Set((Array.isArray(raw.lookup_names)?raw.lookup_names:[name]).map(textValue).filter(Boolean))];
    return Object.freeze({
      candidate_id,name,lookup_names,
      representative_domain:raw?.representative_domain == null ? null : textValue(raw.representative_domain) || null,
      priority:raw?.legacy_priority == null ? null : textValue(raw.legacy_priority) || null,
      metadata:Object.freeze({
        origin:raw?.origin ?? null,
        review_state:raw?.review_state ?? null,
        source_issue:raw?.source_issue ?? null,
        source_comment_id:raw?.source_comment_id ?? null,
        human_authorized_by_user:raw?.human_authorized_by_user === true
      })
    });
  });
  return Object.freeze({ schema:payload.schema, candidates:Object.freeze(candidates) });
}
function personNameIndex(rows) {
  const map=new Map();
  for (const row of rows || []) {
    const key=normalizeLookupName(row?.name);
    const personId=textValue(row?.person_id);
    if (!key || !personId) continue;
    const ids=map.get(key) || new Set();
    ids.add(personId);
    map.set(key,ids);
  }
  return map;
}
function baselineBindings(source, personRows) {
  const index=personNameIndex(personRows);
  const rows=[];
  for (const candidate of source.candidates) {
    const ids=new Set();
    for (const lookupName of candidate.lookup_names) {
      for (const id of index.get(normalizeLookupName(lookupName)) || []) ids.add(id);
    }
    if (ids.size>1) throw new Error(`REGISTRATION_QUEUE_BOOTSTRAP_AMBIGUOUS_IDENTITY:${candidate.candidate_id}`);
    rows.push(Object.freeze({...candidate,person_id:ids.size===1?[...ids][0]:null}));
  }
  return Object.freeze(rows);
}
function diffSets(expected,actual) {
  const a=new Set(expected), b=new Set(actual);
  return Object.freeze({
    missing:Object.freeze([...a].filter(x=>!b.has(x)).sort()),
    extra:Object.freeze([...b].filter(x=>!a.has(x)).sort())
  });
}
async function bootstrapRegistrationQueue(client,{source=loadBootstrapSource()}={}) {
  if (!client || typeof client.query!=="function") throw new Error("PostgreSQL client is required");
  const persons=await client.query(`
    select p.id::text as person_id,pn.name
      from atlas_v2.persons p
      join atlas_v2.person_names pn on pn.person_id=p.id
     where nullif(trim(pn.name),'') is not null
  `);
  const baseline=baselineBindings(source,persons.rows || []);
  const pendingBaseline=baseline.filter(row=>row.person_id==null).map(row=>row.candidate_id);
  const boundBaseline=baseline.filter(row=>row.person_id!=null);
  const commerce=baseline.filter(row=>row.metadata.origin==="commerce_world_history_20261003");
  if (baseline.length!==EXPECTED_TOTAL) throw new Error(`REGISTRATION_QUEUE_BOOTSTRAP_TOTAL_DRIFT:${baseline.length}`);
  if (pendingBaseline.length!==EXPECTED_PENDING) throw new Error(`REGISTRATION_QUEUE_BOOTSTRAP_PENDING_DRIFT:${pendingBaseline.length}`);
  if (boundBaseline.length!==EXPECTED_BOUND) throw new Error(`REGISTRATION_QUEUE_BOOTSTRAP_BOUND_DRIFT:${boundBaseline.length}`);
  if (commerce.length!==EXPECTED_COMMERCE || commerce.some(row=>row.person_id!=null)) throw new Error("REGISTRATION_QUEUE_BOOTSTRAP_COMMERCE_DRIFT");

  await client.query("begin isolation level serializable");
  try {
    const existing=await client.query(`
      select candidate_id,person_id::text
        from atlas_v2.person_candidate_registration_states
       order by candidate_id
       for update
    `);
    const sourceIds=new Set(baseline.map(row=>row.candidate_id));
    const unexpected=(existing.rows || []).map(row=>textValue(row.candidate_id)).filter(id=>!sourceIds.has(id));
    if (unexpected.length) throw new Error(`REGISTRATION_QUEUE_BOOTSTRAP_UNEXPECTED_EXISTING:${unexpected.slice(0,10).join(",")}`);

    for (const row of baseline) {
      const state=row.person_id == null ? "QUEUED" : "REGISTERED";
      await client.query(
        `insert into atlas_v2.person_candidate_registration_states(
           candidate_id,review_revision,registration_state,person_id,authoring_request_id,result_snapshot,
           name,representative_domain,priority,metadata,updated_at
         ) values($1,null,$2,$3::uuid,null,null,$4,$5,$6,$7::jsonb,now())
         on conflict(candidate_id) do update
           set person_id=excluded.person_id,
               registration_state=excluded.registration_state,
               name=excluded.name,
               representative_domain=excluded.representative_domain,
               priority=excluded.priority,
               metadata=excluded.metadata,
               updated_at=now()`,
        [row.candidate_id,state,row.person_id,row.name,row.representative_domain,row.priority,JSON.stringify(row.metadata)]
      );
    }

    await client.query(`alter table atlas_v2.person_candidate_registration_states alter column name set not null`);

    const readback=await client.query(`
      select q.candidate_id,q.person_id::text,
             (p.id is null and q.person_id is not null) as dangling
        from atlas_v2.person_candidate_registration_states q
        left join atlas_v2.persons p on p.id=q.person_id
       order by q.candidate_id
    `);
    const rows=readback.rows || [];
    const currentPending=rows.filter(row=>row.person_id==null).map(row=>textValue(row.candidate_id));
    const diff=diffSets(pendingBaseline,currentPending);
    const duplicates=rows.length-new Set(rows.map(row=>textValue(row.candidate_id))).size;
    const dangling=rows.filter(row=>row.dangling===true).length;
    const commerceIds=new Set(commerce.map(row=>row.candidate_id));
    const commercePreserved=rows.filter(row=>commerceIds.has(textValue(row.candidate_id)) && row.person_id==null).length;
    const boundCount=rows.filter(row=>row.person_id!=null).length;
    if (rows.length!==EXPECTED_TOTAL || currentPending.length!==EXPECTED_PENDING || boundCount!==EXPECTED_BOUND ||
        diff.missing.length || diff.extra.length || duplicates || dangling || commercePreserved!==EXPECTED_COMMERCE) {
      throw new Error("REGISTRATION_QUEUE_BOOTSTRAP_ACCEPTANCE_FAILED");
    }
    await client.query("commit");
    return Object.freeze({
      canonical_queue_authority:"database",
      canonical_db_table:"atlas_v2.person_candidate_registration_states",
      membership_rule:"person_id IS NULL",
      migration_candidate_total:rows.length,
      registered_bound_count:boundCount,
      pending_count:currentPending.length,
      missing_candidate_ids:diff.missing,
      extra_candidate_ids:diff.extra,
      duplicate_candidate_ids:duplicates,
      dangling_person_ids:dangling,
      commerce_20261003_preserved:commercePreserved===EXPECTED_COMMERCE
    });
  } catch(error) {
    try { await client.query("rollback"); } catch {}
    throw error;
  }
}

module.exports=Object.freeze({
  SOURCE_PATH,SOURCE_SCHEMA,
  EXPECTED_TOTAL,EXPECTED_PENDING,EXPECTED_BOUND,EXPECTED_COMMERCE,
  text:textValue,normalizeLookupName,loadBootstrapSource,personNameIndex,baselineBindings,diffSets,
  bootstrapRegistrationQueue
});
