"use strict";

const QUEUE_SCHEMA="atlas-registration-queue/v2";
const CANONICAL_QUEUE_TABLE="atlas_v2.person_candidate_registration_states";

const QUEUE_SQL=`
select
  candidate_id,
  name,
  representative_domain,
  priority,
  metadata,
  review_revision,
  registration_state,
  updated_at
from atlas_v2.person_candidate_registration_states
where person_id is null
order by representative_domain nulls first,name,candidate_id
`;

const SUMMARY_SQL=`
select
  count(*)::int as candidate_total,
  count(*) filter (where person_id is null)::int as current_total,
  count(*) filter (where person_id is not null)::int as registered_bound_total
from atlas_v2.person_candidate_registration_states
`;

function textValue(value){ return String(value ?? "").normalize("NFC").trim(); }

function normalizeQueueRow(row) {
  return Object.freeze({
    candidate_id:textValue(row?.candidate_id),
    name:textValue(row?.name),
    representative_domain:row?.representative_domain == null ? null : textValue(row.representative_domain) || null,
    priority:row?.priority == null ? null : textValue(row.priority) || null,
    metadata:Object.freeze(row?.metadata && typeof row.metadata==="object" && !Array.isArray(row.metadata) ? {...row.metadata} : {}),
    review_revision:row?.review_revision == null ? null : Number(row.review_revision),
    registration_state:row?.registration_state == null ? null : textValue(row.registration_state) || null,
    state_updated_at:row?.updated_at == null ? null : String(row.updated_at)
  });
}

function summarizeDomains(rows) {
  const byDomain={};
  for (const row of rows) {
    const key=row.representative_domain || "unassigned";
    byDomain[key]=(byDomain[key] || 0)+1;
  }
  return Object.freeze(byDomain);
}

async function readCurrentRegistrationQueue({client}={}) {
  if (!client || typeof client.query!=="function") throw new Error("PostgreSQL client is required");
  const summaryResult=await client.query(SUMMARY_SQL);
  const rowsResult=await client.query(QUEUE_SQL);
  const candidates=(rowsResult.rows || []).map(normalizeQueueRow);
  const summaryRow=summaryResult.rows?.[0] || {};
  return Object.freeze({
    schema:QUEUE_SCHEMA,
    authority:"database",
    canonical_table:CANONICAL_QUEUE_TABLE,
    membership_rule:"person_id IS NULL",
    summary:Object.freeze({
      candidate_total:Number(summaryRow.candidate_total || 0),
      current_total:Number(summaryRow.current_total || 0),
      registered_bound_total:Number(summaryRow.registered_bound_total || 0),
      by_domain:summarizeDomains(candidates)
    }),
    candidates:Object.freeze(candidates)
  });
}

module.exports=Object.freeze({
  QUEUE_SCHEMA,
  CANONICAL_QUEUE_TABLE,
  QUEUE_SQL,
  SUMMARY_SQL,
  text:textValue,
  normalizeQueueRow,
  summarizeDomains,
  readCurrentRegistrationQueue
});
