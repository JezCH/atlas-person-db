"use strict";

function text(value) {
  return String(value ?? "").normalize("NFC").trim();
}

function requiredCandidateId(value) {
  const candidateId=text(value);
  if (!candidateId) throw new Error("CANDIDATE_ID_REQUIRED");
  return candidateId;
}

function requiredName(value) {
  const name=text(value);
  if (!name) throw new Error("REGISTRATION_QUEUE_CANDIDATE_NAME_REQUIRED");
  return name;
}

async function enqueueRegistrationQueueCandidate(client, {
  candidate_id,
  name,
  representative_domain = null,
  priority = null,
  metadata = {},
  review_revision = null
} = {}) {
  const id=requiredCandidateId(candidate_id);
  const candidateName=requiredName(name);
  const result=await client.query(
    `insert into atlas_v2.person_candidate_registration_states(
       candidate_id,review_revision,registration_state,person_id,authoring_request_id,result_snapshot,
       name,representative_domain,priority,metadata,updated_at
     ) values($1,$2,'QUEUED',null,null,null,$3,$4,$5,$6::jsonb,now())
     on conflict(candidate_id) do update
       set review_revision=coalesce(excluded.review_revision,atlas_v2.person_candidate_registration_states.review_revision),
           registration_state=case
             when atlas_v2.person_candidate_registration_states.person_id is null then 'QUEUED'
             else atlas_v2.person_candidate_registration_states.registration_state
           end,
           name=excluded.name,
           representative_domain=excluded.representative_domain,
           priority=excluded.priority,
           metadata=excluded.metadata,
           updated_at=now()
       where atlas_v2.person_candidate_registration_states.person_id is null
     returning candidate_id,person_id::text,registration_state`,
    [
      id,
      review_revision == null ? null : Number(review_revision),
      candidateName,
      representative_domain == null ? null : text(representative_domain) || null,
      priority == null ? null : text(priority) || null,
      JSON.stringify(metadata && typeof metadata==="object" && !Array.isArray(metadata) ? metadata : {})
    ]
  );
  if (result.rowCount !== 1) throw new Error("REGISTRATION_QUEUE_CANDIDATE_ALREADY_BOUND");
  return Object.freeze({ candidate_id:id, person_id:null, registration_state:"QUEUED" });
}

async function bindRegistrationQueueCandidate(client, {
  candidate_id,
  person_id,
  authoring_request_id = null,
  result_snapshot = null
} = {}) {
  const id=requiredCandidateId(candidate_id);
  const personId=text(person_id);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(personId)) {
    throw new Error("REGISTRATION_QUEUE_PERSON_ID_REQUIRED");
  }
  const locked=await client.query(
    `select candidate_id,person_id::text
       from atlas_v2.person_candidate_registration_states
      where candidate_id=$1
      for update`,
    [id]
  );
  const row=locked.rows?.[0];
  if (!row) throw new Error("REGISTRATION_QUEUE_CANDIDATE_NOT_FOUND");
  if (row.person_id != null && String(row.person_id) !== personId) {
    throw new Error("REGISTRATION_QUEUE_PERSON_BINDING_DRIFT");
  }
  if (row.person_id != null) {
    return Object.freeze({ candidate_id:id, person_id:personId, replay:true });
  }
  const updated=await client.query(
    `update atlas_v2.person_candidate_registration_states
        set person_id=$2::uuid,
            registration_state='REGISTERED',
            authoring_request_id=coalesce($3,authoring_request_id),
            result_snapshot=coalesce($4::jsonb,result_snapshot),
            updated_at=now()
      where candidate_id=$1 and person_id is null
      returning candidate_id,person_id::text`,
    [id,personId,authoring_request_id,result_snapshot == null ? null : JSON.stringify(result_snapshot)]
  );
  if (updated.rowCount !== 1) throw new Error("REGISTRATION_QUEUE_BIND_FAILED");
  return Object.freeze({ candidate_id:id, person_id:personId, replay:false });
}

async function removePendingRegistrationQueueCandidate(client, candidate_id) {
  const id=requiredCandidateId(candidate_id);
  const result=await client.query(
    `delete from atlas_v2.person_candidate_registration_states
      where candidate_id=$1 and person_id is null
      returning candidate_id`,
    [id]
  );
  return result.rowCount === 1;
}

module.exports=Object.freeze({
  requiredCandidateId,
  requiredName,
  enqueueRegistrationQueueCandidate,
  bindRegistrationQueueCandidate,
  removePendingRegistrationQueueCandidate
});
