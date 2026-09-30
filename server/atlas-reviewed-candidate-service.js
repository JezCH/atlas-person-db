"use strict";
const crypto=require("node:crypto");
const REVIEW=new Set(["PENDING","IN_REVIEW","APPROVED","HOLD","REJECTED","DUPLICATE_EXISTING"]);
const REG=new Set(["NOT_READY","QUEUED","APPLYING","REGISTERED","VERIFIED_AUTHORING_ONLY","BLOCKED","NOT_APPLICABLE"]);
function text(v){return String(v??"").normalize("NFC").trim()}
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==="object"){const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o}return v}
function hash(v){return crypto.createHash("sha256").update(JSON.stringify(stable(v))).digest("hex")}
function normalizeReviewRevision(raw){
 const candidate_id=text(raw?.candidate_id),revision=Number(raw?.revision),review_state=text(raw?.review_state).toUpperCase(),review_checkpoint=text(raw?.review_checkpoint);
 if(!candidate_id)throw new Error("CANDIDATE_ID_REQUIRED");if(!Number.isInteger(revision)||revision<1)throw new Error("REVIEW_REVISION_REQUIRED");if(!REVIEW.has(review_state))throw new Error("REVIEW_STATE_INVALID");if(!review_checkpoint)throw new Error("REVIEW_CHECKPOINT_REQUIRED");
 const human_authorized=raw?.human_authorized===true;if(review_state==="APPROVED"&&!human_authorized)throw new Error("REVIEW_APPROVAL_REQUIRES_HUMAN_AUTHORIZATION");
 const reviewed_payload=stable(raw?.reviewed_payload??{});return Object.freeze({candidate_id,revision,review_state,review_checkpoint,reviewed_payload,payload_hash:hash(reviewed_payload),human_authorized});
}
async function recordReviewRevision(client,raw){
 const x=normalizeReviewRevision(raw);await client.query("select pg_advisory_xact_lock(hashtext($1))",[`atlas-review:${x.candidate_id}`]);
 const q=await client.query("select review_state,review_checkpoint,payload_hash,human_authorized from atlas_v2.person_candidate_review_revisions where candidate_id=$1 and revision=$2 for update",[x.candidate_id,x.revision]);
 if(q.rowCount){const r=q.rows[0];if(r.review_state!==x.review_state||r.review_checkpoint!==x.review_checkpoint||r.payload_hash!==x.payload_hash||r.human_authorized!==x.human_authorized)throw new Error("REVIEW_REVISION_IMMUTABLE");return Object.freeze({...x,replay:true})}
 await client.query("insert into atlas_v2.person_candidate_review_revisions(candidate_id,revision,review_state,review_checkpoint,reviewed_payload,payload_hash,human_authorized) values($1,$2,$3,$4,$5::jsonb,$6,$7)",[x.candidate_id,x.revision,x.review_state,x.review_checkpoint,JSON.stringify(x.reviewed_payload),x.payload_hash,x.human_authorized]);return Object.freeze({...x,replay:false});
}
async function queueApprovedRevision(client,{candidate_id,review_revision}){
 const id=text(candidate_id),rev=Number(review_revision);const q=await client.query("select review_state,human_authorized from atlas_v2.person_candidate_review_revisions where candidate_id=$1 and revision=$2",[id,rev]);if(q.rowCount!==1)throw new Error("REVIEW_REVISION_NOT_FOUND");if(q.rows[0].review_state!=="APPROVED"||q.rows[0].human_authorized!==true)throw new Error("REVIEW_REVISION_NOT_HUMAN_APPROVED");
 await client.query(`insert into atlas_v2.person_candidate_registration_states(candidate_id,review_revision,registration_state) values($1,$2,'QUEUED') on conflict(candidate_id) do update set review_revision=excluded.review_revision,registration_state='QUEUED',person_id=null,authoring_request_id=null,result_snapshot=null,updated_at=now()`,[id,rev]);return Object.freeze({candidate_id:id,review_revision:rev,registration_state:"QUEUED"});
}
async function setRegistrationState(client,{candidate_id,review_revision,registration_state,person_id=null,authoring_request_id=null,result_snapshot=null}){
 const id=text(candidate_id),rev=Number(review_revision),state=text(registration_state).toUpperCase();if(!REG.has(state))throw new Error("REGISTRATION_STATE_INVALID");
 const q=await client.query("select review_state,human_authorized from atlas_v2.person_candidate_review_revisions where candidate_id=$1 and revision=$2",[id,rev]);if(q.rowCount!==1)throw new Error("REVIEW_REVISION_NOT_FOUND");const approved=q.rows[0].review_state==="APPROVED"&&q.rows[0].human_authorized===true;
 if(["QUEUED","APPLYING","REGISTERED","VERIFIED_AUTHORING_ONLY"].includes(state)&&!approved)throw new Error("REGISTRATION_REQUIRES_HUMAN_APPROVED_REVISION");
 await client.query("update atlas_v2.person_candidate_registration_states set review_revision=$2,registration_state=$3,person_id=$4::uuid,authoring_request_id=$5,result_snapshot=$6::jsonb,updated_at=now() where candidate_id=$1",[id,rev,state,person_id,authoring_request_id,result_snapshot?JSON.stringify(result_snapshot):null]);return Object.freeze({candidate_id:id,review_revision:rev,registration_state:state});
}
module.exports=Object.freeze({REVIEW,REG,normalizeReviewRevision,recordReviewRevision,queueApprovedRevision,setRegistrationState});
