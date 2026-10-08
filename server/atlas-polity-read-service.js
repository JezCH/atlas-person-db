"use strict";

const { TEMPORAL_POLITY_DESIGNATION_JOIN_SQL } = require("./atlas-polity-temporal-designation-read.js");

function preferredName(names, locale) {
  return (names || []).find((row) => row.locale === locale && row.is_preferred)?.name || null;
}

function firstUsableName(names) {
  return (names || []).find((row) => row.is_preferred)?.name || (names || [])[0]?.name || null;
}

function normalizeNames(value) {
  if (!Array.isArray(value)) return Object.freeze([]);
  return Object.freeze(value.map((row) => Object.freeze({
    locale: row?.locale == null ? null : String(row.locale),
    name: row?.name == null ? null : String(row.name),
    name_type: row?.name_type == null ? null : String(row.name_type),
    is_preferred: row?.is_preferred === true
  })));
}

function normalizeActivities(value) {
  if (!Array.isArray(value)) return Object.freeze([]);
  return Object.freeze(value.map((row) => Object.freeze({
    id: String(row.id),
    person_id: String(row.person_id),
    person_name_en: row.person_name_en == null ? null : String(row.person_name_en),
    person_name_ko: row.person_name_ko == null ? null : String(row.person_name_ko),
    person_display_name: row.person_name_ko || row.person_name_en || String(row.person_id),
    polity_designation_name_en: row.polity_designation_name_en == null ? null : String(row.polity_designation_name_en),
    polity_designation_name_ko: row.polity_designation_name_ko == null ? null : String(row.polity_designation_name_ko),
    activity_start: row.activity_start == null ? null : Number(row.activity_start),
    activity_end: row.activity_end == null ? null : Number(row.activity_end),
    chronology_status: row.chronology_status == null ? null : String(row.chronology_status),
    relation_code: row.relation_code == null ? null : String(row.relation_code),
    relation_category: row.relation_category == null ? null : String(row.relation_category),
    role_code: row.role_code == null ? null : String(row.role_code),
    role_name: row.role_name == null ? null : String(row.role_name),
    period_basis: row.period_basis == null ? null : String(row.period_basis),
    confidence: row.confidence == null ? null : String(row.confidence)
  })));
}

function projectPolity(row) {
  const names = normalizeNames(row.names);
  const activities = normalizeActivities(row.activities);
  const canonicalNameEn = row.canonical_name_en == null ? preferredName(names, "en") : String(row.canonical_name_en);
  const preferredNameKo = row.preferred_name_ko == null ? preferredName(names, "ko") : String(row.preferred_name_ko);
  const displayName = preferredNameKo || canonicalNameEn || firstUsableName(names) || String(row.id);
  const personIds = [...new Set(activities.map((activity) => activity.person_id))];
  const starts = activities.map((activity) => activity.activity_start).filter(Number.isInteger);
  const ends = activities.map((activity) => activity.activity_end).filter(Number.isInteger);
  const unresolvedActivityCount = activities.filter((activity) => {
    if (activity.activity_start == null) return true;
    return activity.activity_end == null && activity.chronology_status !== "ongoing";
  }).length;

  return Object.freeze({
    id: String(row.id),
    canonical_key: row.canonical_key == null ? null : String(row.canonical_key),
    polity_type: row.polity_type == null ? null : String(row.polity_type),
    historicity: row.historicity == null ? null : String(row.historicity),
    canonical_name_en: canonicalNameEn,
    preferred_name_ko: preferredNameKo,
    display_name: displayName,
    names,
    activity_count: activities.length,
    person_count: personIds.length,
    first_activity_year: starts.length ? Math.min(...starts) : null,
    last_activity_year: ends.length ? Math.max(...ends) : null,
    has_ongoing_activity: activities.some((activity) => activity.chronology_status === "ongoing"),
    unresolved_activity_count: unresolvedActivityCount,
    activities
  });
}

function normalizeGovernancePeriods(rows) {
  if (!Array.isArray(rows)) return Object.freeze([]);
  const numeric = (value) => value == null ? null : Number(value);
  return Object.freeze(rows.map((row) => Object.freeze({
    id: String(row.id),
    governance_context_id: String(row.governance_context_id),
    governance_context_key: String(row.governance_context_key),
    governance_type: String(row.governance_type),
    historicity: String(row.historicity),
    name_en: row.name_en == null ? null : String(row.name_en),
    name_fr: row.name_fr == null ? null : String(row.name_fr),
    name_ko: row.name_ko == null ? null : String(row.name_ko),
    valid_from_year: numeric(row.valid_from_year),
    valid_from_month: numeric(row.valid_from_month),
    valid_from_day: numeric(row.valid_from_day),
    valid_from_granularity: row.valid_from_granularity == null ? null : String(row.valid_from_granularity),
    valid_to_year: numeric(row.valid_to_year),
    valid_to_month: numeric(row.valid_to_month),
    valid_to_day: numeric(row.valid_to_day),
    valid_to_granularity: row.valid_to_granularity == null ? null : String(row.valid_to_granularity),
    confidence: row.confidence == null ? null : String(row.confidence),
    notes: row.notes == null ? null : String(row.notes)
  })));
}

function comparePolities(left, right) {
  return String(left.display_name || left.canonical_name_en || left.id)
    .localeCompare(String(right.display_name || right.canonical_name_en || right.id), "ko")
    || left.id.localeCompare(right.id);
}

function buildSummary(polities) {
  const uniquePersons = new Set();
  let activityCount = 0;
  let personPolityLinks = 0;
  let linkedPolities = 0;
  let ongoingPolities = 0;
  let unresolvedActivityCount = 0;

  for (const polity of polities || []) {
    activityCount += polity.activity_count;
    personPolityLinks += polity.person_count;
    unresolvedActivityCount += polity.unresolved_activity_count;
    if (polity.activity_count > 0) linkedPolities += 1;
    if (polity.has_ongoing_activity) ongoingPolities += 1;
    for (const activity of polity.activities) uniquePersons.add(activity.person_id);
  }

  return Object.freeze({
    total_polities: (polities || []).length,
    linked_polities: linkedPolities,
    orphan_polities: (polities || []).length - linkedPolities,
    activity_count: activityCount,
    unique_linked_persons: uniquePersons.size,
    person_polity_links: personPolityLinks,
    ongoing_polities: ongoingPolities,
    unresolved_activity_count: unresolvedActivityCount
  });
}

const POLITY_SELECT_SQL = `
select
  p.id::text,
  p.canonical_key,
  p.polity_type,
  p.historicity,
  en.name as canonical_name_en,
  ko.name as preferred_name_ko,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'locale', pn.locale,
      'name', pn.name,
      'name_type', pn.name_type,
      'is_preferred', pn.is_preferred
    ) order by pn.is_preferred desc, pn.locale, pn.name_type, pn.name, pn.id)
    from atlas_v2.polity_names pn
    where pn.polity_id = p.id
  ), '[]'::jsonb) as names,
  coalesce((
    select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', pp.id::text,
      'person_id', pp.person_id::text,
      'person_name_en', pen.name,
      'person_name_ko', pko.name,
      'polity_designation_name_en', td_en.name,
      'polity_designation_name_ko', td_ko.name,
      'activity_start', pp.activity_start,
      'activity_end', pp.activity_end,
      'chronology_status', pp.chronology_status,
      'relation_code', rt.code,
      'relation_category', rt.category,
      'role_code', r.code,
      'role_name', coalesce(rko.name, ren.name, r.source_label, r.code),
      'period_basis', pb.code,
      'confidence', pp.confidence
    )) order by
      pp.activity_start nulls last,
      pp.activity_end nulls last,
      coalesce(pko.name, pen.name),
      pp.person_id,
      pp.id)
    from atlas_v2.person_politics_v2 pp
    join atlas_v2.persons pe on pe.id = pp.person_id
    left join atlas_v2.person_names pen
      on pen.person_id = pe.id and pen.locale = 'en' and pen.is_preferred = true
    left join atlas_v2.person_names pko
      on pko.person_id = pe.id and pko.locale = 'ko' and pko.is_preferred = true
    ${TEMPORAL_POLITY_DESIGNATION_JOIN_SQL}
    join atlas_v2.person_polity_relation_types rt on rt.id = pp.relation_type_id
    left join atlas_v2.roles r on r.id = pp.role_id
    left join atlas_v2.role_names ren
      on ren.role_id = r.id and ren.locale = 'en' and ren.is_preferred = true
    left join atlas_v2.role_names rko
      on rko.role_id = r.id and rko.locale = 'ko' and rko.is_preferred = true
    join atlas_v2.period_bases pb on pb.id = pp.period_basis_id
    where pp.polity_id = p.id
  ), '[]'::jsonb) as activities
from atlas_v2.polities p
left join atlas_v2.polity_names en
  on en.polity_id = p.id and en.locale = 'en' and en.is_preferred = true
left join atlas_v2.polity_names ko
  on ko.polity_id = p.id and ko.locale = 'ko' and ko.is_preferred = true
`;

// Only the UUID detail view loads Governance Contexts; the all-polity list remains unchanged.
// Deliberately match the EXACT requested polity_id: country/Republic/contested regimes are
// not projected across distinct Polity UUIDs, and no relationship is inferred.
const POLITY_GOVERNANCE_PERIODS_SQL = `
select
  gp.id::text as id,
  gc.id::text as governance_context_id,
  gc.canonical_key as governance_context_key,
  gc.governance_type,
  gc.historicity,
  (select gn.name from atlas_v2.governance_context_names gn
    where gn.governance_context_id=gc.id and gn.locale='en'
    order by gn.is_preferred desc, gn.id::text limit 1) as name_en,
  (select gn.name from atlas_v2.governance_context_names gn
    where gn.governance_context_id=gc.id and gn.locale='fr'
    order by gn.is_preferred desc, gn.id::text limit 1) as name_fr,
  (select gn.name from atlas_v2.governance_context_names gn
    where gn.governance_context_id=gc.id and gn.locale='ko'
    order by gn.is_preferred desc, gn.id::text limit 1) as name_ko,
  gp.valid_from_year, gp.valid_from_month, gp.valid_from_day, gp.valid_from_granularity,
  gp.valid_to_year, gp.valid_to_month, gp.valid_to_day, gp.valid_to_granularity,
  gp.confidence, gp.notes
from atlas_v2.polity_governance_periods gp
join atlas_v2.governance_contexts gc on gc.id=gp.governance_context_id
where gp.polity_id=$1::uuid
order by gp.valid_from_year nulls last,
         coalesce(gp.valid_from_month,1),
         coalesce(gp.valid_from_day,1),
         gp.id::text
`;

const POLITY_LIST_SQL = `${POLITY_SELECT_SQL}
order by coalesce(ko.name, en.name, p.canonical_key, p.id::text), p.id
`;

const POLITY_DETAIL_SQL = `${POLITY_SELECT_SQL}
where p.id = $1::uuid
limit 1
`;

async function readPolities({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const result = await client.query(POLITY_LIST_SQL);
  const polities = Object.freeze((result.rows || []).map(projectPolity).sort(comparePolities));
  return Object.freeze({ polities, summary: buildSummary(polities) });
}

async function readPolityDetail({ client, polityId } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const result = await client.query(POLITY_DETAIL_SQL, [polityId]);
  if (result.rowCount === 0 || !(result.rows || []).length) return null;
  const existing = projectPolity(result.rows[0]);
  const periods = await client.query(POLITY_GOVERNANCE_PERIODS_SQL, [polityId]);
  return Object.freeze({
    ...existing,
    governance_periods: normalizeGovernancePeriods(periods.rows || [])
  });
}

module.exports = Object.freeze({
  POLITY_SELECT_SQL,
  POLITY_LIST_SQL,
  POLITY_DETAIL_SQL,
  POLITY_GOVERNANCE_PERIODS_SQL,
  normalizeGovernancePeriods,
  normalizeNames,
  normalizeActivities,
  projectPolity,
  buildSummary,
  readPolities,
  readPolityDetail
});
