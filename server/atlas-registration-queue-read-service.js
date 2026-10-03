"use strict";

const QUEUE_SCHEMA = "atlas-registration-queue/v2";

const CURRENT_QUEUE_SQL = `
select
  candidate_id,
  name,
  lookup_names,
  representative_domain,
  legacy_priority,
  review_revision,
  registration_state,
  origin,
  source_issue,
  source_comment_id,
  human_authorized_by_user,
  admitted_at,
  updated_at
from atlas_v2.person_candidate_registration_states
where person_id is null
order by coalesce(representative_domain,''), name, candidate_id
`;

const QUEUE_SUMMARY_SQL = `
select
  count(*)::int as candidate_total,
  count(*) filter (where person_id is null)::int as pending_count,
  count(*) filter (where person_id is not null)::int as registered_bound_count
from atlas_v2.person_candidate_registration_states
`;

function text(value) {
  return String(value ?? "").normalize("NFC").trim();
}

function normalizeQueueRow(row) {
  return Object.freeze({
    candidate_id:text(row?.candidate_id),
    name:text(row?.name),
    lookup_names:Object.freeze(Array.isArray(row?.lookup_names) ? row.lookup_names.map(text).filter(Boolean) : []),
    representative_domain:row?.representative_domain == null ? null : text(row.representative_domain) || null,
    legacy_priority:row?.legacy_priority == null ? null : text(row.legacy_priority) || null,
    review_revision:row?.review_revision == null ? null : Number(row.review_revision),
    registration_state:row?.registration_state == null ? null : text(row.registration_state) || null,
    origin:row?.origin == null ? null : text(row.origin) || null,
    source_issue:row?.source_issue == null ? null : Number(row.source_issue),
    source_comment_id:row?.source_comment_id == null ? null : Number(row.source_comment_id),
    human_authorized_by_user:row?.human_authorized_by_user === true,
    admitted_at:row?.admitted_at == null ? null : String(row.admitted_at),
    updated_at:row?.updated_at == null ? null : String(row.updated_at)
  });
}

function summarizeCurrent(rows, summaryRow = {}) {
  const byDomain = {};
  for (const row of rows) {
    const domain = row.representative_domain || "unassigned";
    byDomain[domain] = (byDomain[domain] || 0) + 1;
  }
  return Object.freeze({
    candidate_total:Number(summaryRow.candidate_total || 0),
    current_total:rows.length,
    pending_count:Number(summaryRow.pending_count || 0),
    registered_bound_count:Number(summaryRow.registered_bound_count || 0),
    membership_rule:"person_id IS NULL",
    by_domain:Object.freeze(byDomain)
  });
}

async function readCurrentRegistrationQueue({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const currentResult = await client.query(CURRENT_QUEUE_SQL);
  const summaryResult = await client.query(QUEUE_SUMMARY_SQL);
  const candidates = Object.freeze((currentResult.rows || []).map(normalizeQueueRow));
  const summary = summarizeCurrent(candidates, summaryResult.rows?.[0] || {});
  if (summary.pending_count !== candidates.length) throw new Error("REGISTRATION_QUEUE_PENDING_COUNT_DRIFT");
  return Object.freeze({
    schema:QUEUE_SCHEMA,
    authority:"atlas_v2.person_candidate_registration_states",
    membership_rule:"person_id IS NULL",
    summary,
    candidates
  });
}

module.exports = Object.freeze({
  QUEUE_SCHEMA,
  CURRENT_QUEUE_SQL,
  QUEUE_SUMMARY_SQL,
  text,
  normalizeQueueRow,
  summarizeCurrent,
  readCurrentRegistrationQueue
});
