"use strict";

const { projectActivity } = require("./atlas-person-read-service.js");

const PERSON_LIST_SEMANTIC_SQL = `
select
  pp.id,
  pp.person_id,
  pp.polity_id,
  pp.relation_type_id,
  pp.role_id,
  pp.period_basis_id,
  pp.activity_start,
  pp.activity_start_month,
  pp.activity_start_day,
  pp.activity_start_granularity,
  pp.activity_start_certainty,
  pp.activity_start_calendar,
  pp.activity_end,
  pp.activity_end_month,
  pp.activity_end_day,
  pp.activity_end_granularity,
  pp.activity_end_certainty,
  pp.activity_end_calendar,
  pp.confidence,
  pp.chronology_status,
  pp.source_locator->>'ongoing_as_of' as ongoing_as_of,
  pp.notes,
  prt.code as relation_type_code,
  prt.category as relation_type_category,
  (
    select pn.name
    from atlas_v2.polity_names pn
    where pn.polity_id = pp.polity_id
      and pn.locale = 'en'
      and pn.is_preferred = true
    order by pn.id
    limit 1
  ) as polity_name_en,
  (
    select pn.name
    from atlas_v2.polity_names pn
    where pn.polity_id = pp.polity_id
      and pn.locale = 'ko'
      and pn.is_preferred = true
    order by pn.id
    limit 1
  ) as polity_name_ko,
  r.code as role_code,
  r.category as role_category,
  r.source_label as role_source_label,
  (
    select rn.name
    from atlas_v2.role_names rn
    where rn.role_id = pp.role_id
      and rn.locale = 'en'
      and rn.is_preferred = true
    order by rn.id
    limit 1
  ) as role_name_en,
  (
    select rn.name
    from atlas_v2.role_names rn
    where rn.role_id = pp.role_id
      and rn.locale = 'ko'
      and rn.is_preferred = true
    order by rn.id
    limit 1
  ) as role_name_ko,
  pb.code as period_basis_code,
  (
    select pbn.name
    from atlas_v2.period_basis_names pbn
    where pbn.period_basis_id = pp.period_basis_id
      and pbn.locale = 'en'
      and pbn.is_preferred = true
    order by pbn.id
    limit 1
  ) as period_basis_name_en,
  (
    select pbn.name
    from atlas_v2.period_basis_names pbn
    where pbn.period_basis_id = pp.period_basis_id
      and pbn.locale = 'ko'
      and pbn.is_preferred = true
    order by pbn.id
    limit 1
  ) as period_basis_name_ko
from atlas_v2.person_politics_v2 pp
left join atlas_v2.person_polity_relation_types prt
  on prt.id = pp.relation_type_id
left join atlas_v2.roles r
  on r.id = pp.role_id
join atlas_v2.period_bases pb
  on pb.id = pp.period_basis_id
where pp.person_id = any($1::uuid[])
order by pp.person_id, pp.activity_start, pp.activity_end, pp.polity_id, pp.id
`;

function projectCompactActivity(row) {
  const activity = projectActivity(row);
  return Object.freeze({
    id: activity.id,
    polity: activity.polity,
    relation: activity.relation,
    role: activity.role,
    period_basis: activity.period_basis,
    start: activity.start,
    end: activity.end,
    confidence: activity.confidence,
    chronology_status: activity.chronology_status,
    notes: activity.notes
  });
}

function createBucket() {
  return {
    activities: [],
    facets: {
      polities: [],
      relations: [],
      roles: [],
      period_bases: []
    },
    seen: {
      polities: new Set(),
      relations: new Set(),
      roles: new Set(),
      period_bases: new Set()
    }
  };
}

function pushUnique(bucket, key, item) {
  if (!item || bucket.seen[key].has(item.id)) return;
  bucket.seen[key].add(item.id);
  bucket.facets[key].push(item);
}

function freezeFacets(bucket) {
  return Object.freeze({
    polities: Object.freeze(bucket.facets.polities.slice()),
    relations: Object.freeze(bucket.facets.relations.slice()),
    roles: Object.freeze(bucket.facets.roles.slice()),
    period_bases: Object.freeze(bucket.facets.period_bases.slice())
  });
}

function consistencyError(personId, expected, observed) {
  const error = new Error(`Person list Activity count mismatch for ${personId}: expected ${expected}, observed ${observed}`);
  error.code = "PERSON_LIST_ACTIVITY_COUNT_MISMATCH";
  error.person_id = personId;
  error.expected_activity_count = expected;
  error.observed_activity_count = observed;
  return error;
}

function attachPersonListSemantics(persons, rows) {
  const byPerson = new Map();
  for (const rawRow of rows || []) {
    const personId = String(rawRow.person_id);
    const bucket = byPerson.get(personId) || createBucket();
    const activity = projectCompactActivity(rawRow);
    bucket.activities.push(activity);
    if (activity.relation?.code !== "opposes") {
      pushUnique(bucket, "polities", activity.polity);
    }
    pushUnique(bucket, "relations", activity.relation);
    pushUnique(bucket, "roles", activity.role);
    pushUnique(bucket, "period_bases", activity.period_basis);
    byPerson.set(personId, bucket);
  }

  return Object.freeze((persons || []).map((person) => {
    const personId = String(person.id);
    const bucket = byPerson.get(personId) || createBucket();
    const expected = Number(person.activity_count);
    const observed = bucket.activities.length;
    if (Number.isInteger(expected) && expected >= 0 && expected !== observed) {
      throw consistencyError(personId, expected, observed);
    }
    return Object.freeze({
      ...person,
      activity_summaries: Object.freeze(bucket.activities.slice()),
      facets: freezeFacets(bucket)
    });
  }));
}

async function readPersonListSemantics({ client, persons } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const list = Array.isArray(persons) ? persons : [];
  if (!list.length) return Object.freeze([]);
  const personIds = list.map((person) => String(person.id));
  const result = await client.query(PERSON_LIST_SEMANTIC_SQL, [personIds]);
  return attachPersonListSemantics(list, result.rows || []);
}

module.exports = Object.freeze({
  PERSON_LIST_SEMANTIC_SQL,
  projectCompactActivity,
  consistencyError,
  attachPersonListSemantics,
  readPersonListSemantics
});