"use strict";
const {UUID_RE}=require("./atlas-authoring-object-service.js");
const TYPES=Object.freeze({
 people_group:{table:"people_groups",names:"people_group_names",owner:"people_group_id",typeField:"people_type",allowed:new Set(["ethnic_group","ethnolinguistic_group","cultural_people","tribal_people","other_people_group"]),sources:"people_group_sources"},
 historical_event:{table:"historical_events",names:"historical_event_names",owner:"historical_event_id",typeField:"event_type",allowed:new Set(["military_conflict","expedition","political_event","migration","other_historical_event"]),sources:"historical_event_sources"},
 governance_context:{table:"governance_contexts",names:"governance_context_names",owner:"governance_context_id",typeField:"governance_type",allowed:new Set(["government","constitutional_regime","governing_regime"]),sources:"governance_context_sources"}
});
function text(v){return String(v??"").normalize("NFC").trim().replace(/\s+/g," ")}
function req(v,c){const x=text(v);if(!x)throw new Error(c);return x}
function normalizeContextObject(raw){
 const kind=req(raw?.kind,"CONTEXT_OBJECT_KIND_REQUIRED"), spec=TYPES[kind]; if(!spec)throw new Error("CONTEXT_OBJECT_KIND_INVALID");
 const type=req(raw.type,"CONTEXT_OBJECT_TYPE_REQUIRED");if(!spec.allowed.has(type))throw new Error("CONTEXT_OBJECT_TYPE_INVALID");
 const sources=raw.sources;if(!Array.isArray(sources)||!sources.length)throw new Error("CONTEXT_OBJECT_SOURCE_REQUIRED");
 return Object.freeze({kind,canonical_key:req(raw.canonical_key,"CONTEXT_OBJECT_CANONICAL_KEY_REQUIRED"),canonical_name_en:req(raw.canonical_name_en,"CONTEXT_OBJECT_EN_REQUIRED"),display_name_ko:req(raw.display_name_ko,"CONTEXT_OBJECT_KO_REQUIRED"),type,historicity:text(raw.historicity)||"historical",confidence:text(raw.confidence)||"well_established",valid_from_year:raw.valid_from_year??null,valid_to_year:raw.valid_to_year??null,sources:Object.freeze(sources.map(s=>{const id=text(s.source_id).toLowerCase();if(!UUID_RE.test(id))throw new Error("CONTEXT_OBJECT_SOURCE_ID_INVALID");return Object.freeze({source_id:id,source_locator_key:req(s.source_locator_key??s.locator,"CONTEXT_OBJECT_SOURCE_LOCATOR_REQUIRED")})}))});
}
async function createContextObject(client,raw){
 const x=normalizeContextObject(raw),s=TYPES[x.kind];await client.query("select pg_advisory_xact_lock(hashtext($1))",[`atlas-context:${x.kind}:${x.canonical_key}`]);
 for(const src of x.sources){const q=await client.query("select id from atlas_v2.sources where id=$1::uuid",[src.source_id]);if(q.rows.length!==1)throw new Error("CONTEXT_OBJECT_SOURCE_UNRESOLVED")}
 const ex=await client.query(`select id::text,${s.typeField} as entity_type,historicity from atlas_v2.${s.table} where canonical_key=$1 for update`,[x.canonical_key]);
 let id,replay=false;if(ex.rows.length){const r=ex.rows[0];if(text(r.entity_type)!==x.type||text(r.historicity)!==x.historicity)throw new Error("CONTEXT_OBJECT_CANONICAL_KEY_CONFLICT");id=text(r.id).toLowerCase();replay=true}else{
  const extra=x.kind==="historical_event"?",valid_from_year,valid_to_year,confidence":"";const vals=x.kind==="historical_event"?", $4,$5,$6":"";
  const ins=await client.query(`insert into atlas_v2.${s.table}(id,canonical_key,${s.typeField},historicity${extra}) values(gen_random_uuid(),$1,$2,$3${vals}) returning id::text`,x.kind==="historical_event"?[x.canonical_key,x.type,x.historicity,x.valid_from_year,x.valid_to_year,x.confidence]:[x.canonical_key,x.type,x.historicity]);id=text(ins.rows[0].id).toLowerCase();
  await client.query(`insert into atlas_v2.${s.names}(id,${s.owner},locale,name,name_type,is_preferred) values(gen_random_uuid(),$1::uuid,'en',$2,'canonical',true),(gen_random_uuid(),$1::uuid,'ko',$3,'display',true)`,[id,x.canonical_name_en,x.display_name_ko]);
 }
 for(const src of x.sources)await client.query(`insert into atlas_v2.${s.sources}(${s.owner},source_id,source_locator_key) values($1::uuid,$2::uuid,$3) on conflict do nothing`,[id,src.source_id,src.source_locator_key]);
 return Object.freeze({kind:x.kind,id,disposition:replay?"reused":"created"});
}
async function linkPersonContext(client,{personId,context,link}){
 if(!UUID_RE.test(text(personId)))throw new Error("CONTEXT_PERSON_ID_INVALID");if(context.kind==="governance_context")throw new Error("CONTEXT_GOVERNANCE_PERSON_LINK_UNSUPPORTED");
 const source=normalizeContextObject({...context,sources:link.sources||context.sources});
 const ctx=await createContextObject(client,source);const sources=source.sources;
 const isPeople=ctx.kind==="people_group",table=isPeople?"person_people_affiliations":"person_event_participations",fk=isPeople?"people_group_id":"historical_event_id",typeField=isPeople?"affiliation_type":"participation_type",type=req(link.type,"CONTEXT_PERSON_LINK_TYPE_REQUIRED");
 const allowed=isPeople?new Set(["member_of","born_into","identified_with","associated_with"]):new Set(["participant","commander","interpreter","envoy","organizer","witness","subject"]);if(!allowed.has(type))throw new Error("CONTEXT_PERSON_LINK_TYPE_INVALID");
 const existing=await client.query(`select id::text from atlas_v2.${table} where person_id=$1::uuid and ${fk}=$2::uuid and ${typeField}=$3 limit 1`,[personId,ctx.id,type]);let linkId=existing.rows[0]?.id;
 if(!linkId){const q=await client.query(`insert into atlas_v2.${table}(id,person_id,${fk},${typeField},confidence,notes) values(gen_random_uuid(),$1::uuid,$2::uuid,$3,$4,$5) returning id::text`,[personId,ctx.id,type,text(link.confidence)||"well_established",text(link.notes)||null]);linkId=q.rows[0].id}
 const st=isPeople?"person_people_affiliation_sources":"person_event_participation_sources",sf=isPeople?"person_people_affiliation_id":"person_event_participation_id";
 for(const src of sources)await client.query(`insert into atlas_v2.${st}(${sf},source_id,source_locator_key) values($1::uuid,$2::uuid,$3) on conflict do nothing`,[linkId,src.source_id,src.source_locator_key]);
 return Object.freeze({context:ctx,link_id:text(linkId).toLowerCase(),link_type:type});
}
module.exports=Object.freeze({TYPES,normalizeContextObject,createContextObject,linkPersonContext});
