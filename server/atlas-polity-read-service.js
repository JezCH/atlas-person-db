"use strict";

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
    left join lateral (
      select pd.id
        from atlas_v2.polity_designations pd
       where pd.polity_id = pp.polity_id
         and pp.activity_start is not null
         and pp.activity_end is not null
         and (pd.valid_from_year is null or pd.valid_from_year <= pp.activity_start)
         and (pd.valid_to_year is null or pd.valid_to_year >= pp.activity_end)
       order by
         case pd.designation_type
           when 'official_name' then 1
           when 'state_form' then 2
           when 'historiographic_period' then 3
           when 'conventional_temporal_label' then 4
           else 5
         end,
         case when pd.valid_from_year is null then 1 else 0 end,
         case when pd.valid_to_year is null then 1 else 0 end,
         (coalesce(pd.valid_to_year, 9999) - coalesce(pd.valid_from_year, -10000)),
         pd.id
       limit 1
    ) td on true
    left join atlas_v2.polity_designation_names td_en
      on td_en.polity_designation_id = td.id and td_en.locale = 'en' and td_en.is_preferred = true
    left join atlas_v2.polity_designation_names td_ko
      on td_ko.polity_designation_id = td.id and td_ko.locale = 'ko' and td_ko.is_preferred = true
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
  return projectPolity(result.rows[0]);
}

module.exports = Object.freeze({
  POLITY_SELECT_SQL,
  POLITY_LIST_SQL,
  POLITY_DETAIL_SQL,
  normalizeNames,
  normalizeActivities,
  projectPolity,
  buildSummary,
  readPolities,
  readPolityDetail
});
