"use strict";

const QUEUE_SCHEMA = "atlas-registration-queue/v3";
const { reviewedPersonAliasesValuesSql, REVIEWED_REPRESENTATIVE_ALIASES } = require("./atlas-reviewed-person-registration-aliases.js");
const REVIEWED_PERSON_ALIAS_VALUES_SQL=reviewedPersonAliasesValuesSql();
const REVIEWED_REPRESENTATIVE_NAMES_SQL=REVIEWED_REPRESENTATIVE_ALIASES
  .map(row=>"'"+row.alias_name.replaceAll("'","''")+"'").join(",");

const REVIEWED_PERSON_ALIASES_SQL = `
select aliases.alias_name,p.id::text as person_id,p.canonical_key,
       aliases.alias_name in (${REVIEWED_REPRESENTATIVE_NAMES_SQL}) as representative_default
from (${REVIEWED_PERSON_ALIAS_VALUES_SQL}) as aliases(alias_name,canonical_key)
join atlas_v2.persons p on p.canonical_key=aliases.canonical_key
order by aliases.alias_name,p.id
`;
const QUEUE_TABLE = "atlas_v2.person_registration_candidates";
const QUEUE_MEMBERSHIP_RULE = "candidate has no registered normalized Person identity match; homonyms use a representative Person by default";

const DIACRITIC_SOURCE = "áàäâãåāăąǎǟȧạảấầẩẫậắằẳẵặçćčĉċďđéèëêēěĕėęěẹẻẽếềểễệğģĝġíìïîīĭįıǐịỉĩłĺļľŀñńņňóòöôõōŏőǒøọỏốồổỗộớờởỡợŕŗřśšşŝťţŧúùüûūŭůűųǔụủũứừửữựýÿŷỳỵỷỹžźż";
const DIACRITIC_TARGET = "aaaaaaaaaaaaaaaaaaaaaaaacccccddeeeeeeeeeeeeeeeeeeggggiiiiiiiiiiiilllllnnnnoooooooooooooooooooooorrrsssstttuuuuuuuuuuuuuuuuuuyyyyyyyzzz";

function identityKeySql(expression) {
  return `regexp_replace(
    translate(
      lower(replace(replace(replace(${expression}, 'æ', 'ae'), 'œ', 'oe'), 'ß', 'ss')),
      '${DIACRITIC_SOURCE}',
      '${DIACRITIC_TARGET}'
    ),
    '[^a-z0-9가-힣]+',
    '',
    'g'
  )`;
}

const CANDIDATE_IDENTITY_CTES = `
candidate_aliases as (
  select
    c.candidate_id,
    nullif(btrim(alias_name),'') as alias_name
  from atlas_v2.person_registration_candidates c
  cross join lateral (
    select c.name as alias_name
    union all
    select btrim(part)
      from regexp_split_to_table(c.name, E'\\s*[|/]\\s*') as part
    union all
    select jsonb_array_elements_text(
      case
        when jsonb_typeof(c.review_metadata->'lookup_names')='array'
          then c.review_metadata->'lookup_names'
        else '[]'::jsonb
      end
    )
    union all
    select c.review_metadata->>'display_name_ko'
  ) aliases
),
candidate_identity_keys as (
  select distinct
    candidate_id,
    ${identityKeySql("alias_name")} as identity_key
  from candidate_aliases
  where alias_name is not null
),
person_aliases as (
  select p.id as person_id, pn.name as alias_name
    from atlas_v2.persons p
    join atlas_v2.person_names pn on pn.person_id=p.id
  union all
  select p.id, p.canonical_key
    from atlas_v2.persons p
  union all
  select p.id,aliases.alias_name
    from atlas_v2.persons p
    join (${REVIEWED_PERSON_ALIAS_VALUES_SQL}) as aliases(alias_name,canonical_key)
      on p.canonical_key=aliases.canonical_key
),
person_identity_keys as (
  select distinct
    person_id,
    ${identityKeySql("alias_name")} as identity_key
  from person_aliases
  where alias_name is not null
),
candidate_identity_matches as (
  select
    c.candidate_id,
    count(distinct p.person_id)::int as matched_person_count,
    min(p.person_id::text) as matched_person_id
  from candidate_identity_keys c
  join person_identity_keys p
    on p.identity_key=c.identity_key
   and c.identity_key<>''
  group by c.candidate_id
)
`;

const PENDING_SQL = `
with
${CANDIDATE_IDENTITY_CTES}
select
  c.candidate_id,
  c.name,
  c.representative_domain,
  c.priority,
  c.review_metadata,
  c.created_at,
  c.updated_at,
  coalesce(m.matched_person_count,0)::int as identity_match_count
from atlas_v2.person_registration_candidates c
left join candidate_identity_matches m on m.candidate_id=c.candidate_id
left join atlas_v2.persons bound_person on bound_person.id=c.person_id
where bound_person.id is null
  and coalesce(m.matched_person_count,0) = 0
order by coalesce(c.representative_domain,''), c.name, c.candidate_id
`;

const SUMMARY_SQL = `
select
  count(*)::int as ledger_candidate_total,
  count(*) filter (where person_id is not null)::int as legacy_bound_count
from atlas_v2.person_registration_candidates
`;

function text(value) {
  return String(value ?? "").normalize("NFC").trim();
}

function requiredCandidateId(value) {
  const candidateId = text(value);
  if (!candidateId) throw new Error("REGISTRATION_QUEUE_CANDIDATE_ID_REQUIRED");
  return candidateId;
}

function requiredPersonId(value) {
  const personId = text(value).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(personId)) {
    throw new Error("REGISTRATION_QUEUE_PERSON_ID_REQUIRED");
  }
  return personId;
}

function normalizeMetadata(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function readCurrentRegistrationQueue({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");

  const pendingResult = await client.query(PENDING_SQL);
  const summaryResult = await client.query(SUMMARY_SQL);
  const aliasesResult = await client.query(REVIEWED_PERSON_ALIASES_SQL);
  const ledger = summaryResult.rows?.[0] || {};
  const candidates = (pendingResult.rows || []).map((item) => {
    const reviewMetadata = normalizeMetadata(item.review_metadata);
    const priority = item.priority == null ? null : text(item.priority) || null;
    return Object.freeze({
      candidate_id:requiredCandidateId(item.candidate_id),
      name:text(item.name),
      representative_domain:item.representative_domain == null ? null : text(item.representative_domain) || null,
      priority,
      legacy_priority:priority,
      review_state:reviewMetadata.review_state == null ? null : text(reviewMetadata.review_state) || null,
      origin:reviewMetadata.origin == null ? null : text(reviewMetadata.origin) || null,
      review_metadata:Object.freeze({ ...reviewMetadata }),
      created_at:item.created_at == null ? null : String(item.created_at),
      updated_at:item.updated_at == null ? null : String(item.updated_at)
    });
  });

  const byDomain = {};
  for (const candidate of candidates) {
    const domain = candidate.representative_domain || "unassigned";
    byDomain[domain] = (byDomain[domain] || 0) + 1;
  }

  const currentTotal = candidates.length;
  const ambiguousIdentityCount = (pendingResult.rows || []).filter((item) => Number(item.identity_match_count || 0) > 1).length;
  return Object.freeze({
    schema:QUEUE_SCHEMA,
    authority:QUEUE_TABLE,
    membership_rule:QUEUE_MEMBERSHIP_RULE,
    reviewed_person_aliases:Object.freeze((aliasesResult.rows||[]).map(row=>Object.freeze({
      alias_name:text(row.alias_name),
      person_id:String(row.person_id),
      canonical_key:text(row.canonical_key),
      representative_default:row.representative_default===true
    }))),
    summary:Object.freeze({
      candidate_total:currentTotal,
      current_total:currentTotal,
      pending_count:currentTotal,
      by_domain:Object.freeze(byDomain),
      ambiguous_identity_count:ambiguousIdentityCount,
      ledger_candidate_total:Number(ledger.ledger_candidate_total || 0),
      legacy_bound_count:Number(ledger.legacy_bound_count || 0)
    }),
    candidates:Object.freeze(candidates)
  });
}

async function admitRegistrationQueueCandidate(client, {
  candidate_id,
  name,
  representative_domain = null,
  priority = null,
  review_metadata = {}
} = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const candidateId = requiredCandidateId(candidate_id);
  const candidateName = text(name);
  if (!candidateName) throw new Error("REGISTRATION_QUEUE_CANDIDATE_NAME_REQUIRED");
  const domain = representative_domain == null ? null : text(representative_domain) || null;
  const normalizedPriority = priority == null ? null : text(priority) || null;
  const metadata = normalizeMetadata(review_metadata);

  const result = await client.query(
    `insert into atlas_v2.person_registration_candidates(
       candidate_id,name,representative_domain,priority,review_metadata,person_id
     ) values($1,$2,$3,$4,$5::jsonb,null)
     on conflict(candidate_id) do update
       set name=excluded.name,
           representative_domain=excluded.representative_domain,
           priority=excluded.priority,
           review_metadata=excluded.review_metadata,
           person_id=null,
           updated_at=now()
     returning candidate_id`,
    [candidateId,candidateName,domain,normalizedPriority,JSON.stringify(metadata)]
  );

  if (result.rowCount !== 1) throw new Error("REGISTRATION_QUEUE_ADMISSION_FAILED");
  return Object.freeze({ candidate_id:candidateId });
}

async function loadRegistrationQueueCandidate(client, candidateId, { forUpdate = false } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const id = requiredCandidateId(candidateId);
  const result = await client.query(
    `select candidate_id
       from atlas_v2.person_registration_candidates
      where candidate_id=$1
      ${forUpdate ? "for update" : ""}`,
    [id]
  );
  return result.rows?.[0] || null;
}

// Backward-compatible validator only.
// Queue membership is derived from Production identity and no longer mutates candidate.person_id.
async function bindRegistrationQueueCandidate(client, {
  candidate_id,
  person_id,
  required = false
} = {}) {
  const candidateId = requiredCandidateId(candidate_id);
  const personId = requiredPersonId(person_id);
  const current = await loadRegistrationQueueCandidate(client, candidateId, { forUpdate:false });

  if (!current) {
    if (required) throw new Error("REGISTRATION_QUEUE_CANDIDATE_NOT_FOUND");
    return null;
  }

  const person = await client.query(
    `select id::text from atlas_v2.persons where id=$1::uuid`,
    [personId]
  );
  if (person.rowCount !== 1) throw new Error("REGISTRATION_QUEUE_PERSON_NOT_FOUND");

  return Object.freeze({
    candidate_id:candidateId,
    person_id:personId,
    replay:true,
    membership_mutated:false
  });
}

module.exports = Object.freeze({
  QUEUE_SCHEMA,
  QUEUE_TABLE,
  QUEUE_MEMBERSHIP_RULE,
  REVIEWED_PERSON_ALIAS_VALUES_SQL,
  REVIEWED_PERSON_ALIASES_SQL,
  CANDIDATE_IDENTITY_CTES,
  PENDING_SQL,
  SUMMARY_SQL,
  text,
  requiredCandidateId,
  requiredPersonId,
  readCurrentRegistrationQueue,
  admitRegistrationQueueCandidate,
  loadRegistrationQueueCandidate,
  bindRegistrationQueueCandidate
});
