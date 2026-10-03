"use strict";
const CUTOVER=require("../contracts/person-domain-v2-final-cutover.json");
const REGISTRY=require("../atlas-person-domain-registry.js");
const EXPECTED_IDS=Object.freeze(CUTOVER.science_target_ids.map((id)=>String(id).toLowerCase()).sort());
const V2_CODES=Object.freeze([...REGISTRY.CODES]);
const V2_CODE_SET=new Set(V2_CODES);
const LEGACY_CODE="knowledge";
const TARGET_CODE="science";
const CONSTRAINT_NAME="persons_representative_domain_check";
const CUTOVER_LOCK="atlas-person-domain-v2-final-cutover";

function sameIds(left,right){const a=[...left].map(String).sort(),b=[...right].map(String).sort();return a.length===b.length&&a.every((v,i)=>v===b[i]);}
function summarize(rows){
  const counts={},knowledge_ids=[],science_ids=[],unsupported=[];
  for(const row of rows){const d=String(row.representative_domain),id=String(row.person_id).toLowerCase();counts[d]=(counts[d]||0)+1;if(d===LEGACY_CODE)knowledge_ids.push(id);else if(d===TARGET_CODE)science_ids.push(id);else if(!V2_CODE_SET.has(d))unsupported.push({person_id:id,representative_domain:d});}
  knowledge_ids.sort();science_ids.sort();
  return Object.freeze({assigned:rows.length,counts:Object.freeze(counts),knowledge_ids:Object.freeze(knowledge_ids),science_ids:Object.freeze(science_ids),unsupported:Object.freeze(unsupported),pre_cutover_exact:sameIds(knowledge_ids,EXPECTED_IDS)&&science_ids.length===0,data_cutover_complete:knowledge_ids.length===0&&sameIds(science_ids,EXPECTED_IDS)&&unsupported.length===0});
}
function countsMatch(actual,expected){for(const [code,count] of Object.entries(expected)){if(Number(actual[code]||0)!==Number(count))return false;}return true;}
async function constraintState(client){
  const r=await client.query(`select pg_get_constraintdef(c.oid) definition,c.convalidated from pg_constraint c where c.conrelid='atlas_v2.persons'::regclass and c.conname=$1`,[CONSTRAINT_NAME]);
  if(r.rowCount!==1)return Object.freeze({present:false,validated:false,definition:null,v1:false,v2:false});
  const definition=String(r.rows[0].definition||"");return Object.freeze({present:true,validated:r.rows[0].convalidated===true,definition,v1:definition.includes("'knowledge'")&&!definition.includes("'science'"),v2:definition.includes("'science'")&&!definition.includes("'knowledge'")});
}
async function domainRows(client,{forUpdate=false}={}){const r=await client.query(`select id::text person_id,representative_domain from atlas_v2.persons where representative_domain is not null order by id ${forUpdate?"for update":""}`);return r.rows;}
async function inspectPersonDomainV2Cutover(client){
  const state=summarize(await domainRows(client));const constraint=await constraintState(client);
  return Object.freeze({schema:"atlas-person-domain-v2-cutover-state/v1",expected_science_count:EXPECTED_IDS.length,...state,constraint,ready_for_cutover:state.pre_cutover_exact&&state.unsupported.length===0&&state.assigned===CUTOVER.expected_assigned&&countsMatch(state.counts,CUTOVER.expected_pre_cutover)&&constraint.v1&&constraint.validated,cutover_complete:state.data_cutover_complete&&state.assigned===CUTOVER.expected_assigned&&countsMatch(state.counts,CUTOVER.expected_post_cutover)&&constraint.v2&&constraint.validated});
}
async function installV2Constraint(client){
  await client.query(`alter table atlas_v2.persons drop constraint if exists ${CONSTRAINT_NAME}`);
  await client.query(`alter table atlas_v2.persons add constraint ${CONSTRAINT_NAME} check (representative_domain is null or representative_domain in ('governance','military','science','technology','commerce','culture','religion','exploration')) not valid`);
  await client.query(`alter table atlas_v2.persons validate constraint ${CONSTRAINT_NAME}`);
  await client.query(`comment on column atlas_v2.persons.representative_domain is 'Single editorial representative field for visualization. Controlled v2 values: governance, military, science, technology, commerce, culture, religion, exploration. NULL means unclassified.'`);
}
async function writeAudits(client){
  const r=await client.query(`insert into atlas_v2.person_profile_mutation_audits(request_id,person_id,operation,before_snapshot,after_snapshot) select 'person-domain-v2-final-cutover:'||p.id::text,p.id,'set_person_representative_domain','{"representative_domain":"knowledge"}'::jsonb,'{"representative_domain":"science"}'::jsonb from atlas_v2.persons p where p.id=any($1::uuid[]) on conflict (request_id) do nothing`,[EXPECTED_IDS]);return Number(r.rowCount||0);
}
async function applyPersonDomainV2Cutover(client){
  await client.query("begin isolation level serializable");
  try{
    await client.query("select pg_advisory_xact_lock(hashtext($1))",[CUTOVER_LOCK]);
    const before=summarize(await domainRows(client,{forUpdate:true}));
    const beforeConstraint=await constraintState(client);
    if(before.data_cutover_complete){
      await installV2Constraint(client);const after=await inspectPersonDomainV2Cutover(client);if(!after.cutover_complete)throw new Error("PERSON_DOMAIN_V2_CUTOVER_REPLAY_VERIFICATION_FAILED");await client.query("commit");return Object.freeze({committed:true,replay:true,before,after,audits_inserted:0});
    }
    if(!before.pre_cutover_exact||!countsMatch(before.counts,CUTOVER.expected_pre_cutover))throw new Error("PERSON_DOMAIN_V2_CUTOVER_SCIENCE_SET_MISMATCH");
    if(before.assigned!==CUTOVER.expected_assigned)throw new Error("PERSON_DOMAIN_V2_CUTOVER_ASSIGNED_COUNT_MISMATCH");
    if(before.unsupported.length)throw new Error("PERSON_DOMAIN_V2_CUTOVER_UNSUPPORTED_DOMAIN");
    if(!beforeConstraint.v1||!beforeConstraint.validated)throw new Error("PERSON_DOMAIN_V2_CUTOVER_PRECONDITION_CONSTRAINT_MISMATCH");
    await client.query(`alter table atlas_v2.persons drop constraint if exists ${CONSTRAINT_NAME}`);
    const updated=await client.query(`update atlas_v2.persons set representative_domain='science' where representative_domain='knowledge' and id=any($1::uuid[])`,[EXPECTED_IDS]);
    if(Number(updated.rowCount)!==EXPECTED_IDS.length)throw new Error("PERSON_DOMAIN_V2_CUTOVER_UPDATE_COUNT_MISMATCH");
    const auditsInserted=await writeAudits(client);await installV2Constraint(client);
    const after=await inspectPersonDomainV2Cutover(client);if(!after.cutover_complete)throw new Error("PERSON_DOMAIN_V2_CUTOVER_POSTCONDITION_FAILED");
    await client.query("commit");return Object.freeze({committed:true,replay:false,before,after,audits_inserted:auditsInserted});
  }catch(error){try{await client.query("rollback");}catch{}throw error;}
}
module.exports=Object.freeze({EXPECTED_IDS,V2_CODES,LEGACY_CODE,TARGET_CODE,sameIds,summarize,countsMatch,constraintState,inspectPersonDomainV2Cutover,applyPersonDomainV2Cutover});
