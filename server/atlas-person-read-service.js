"use strict";

const PERSON_READ_SQL = `
select
  p.id,
  p.person_type,
  p.historicity,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'locale', pn.locale,
        'name', pn.name,
        'name_type', pn.name_type,
        'is_preferred', pn.is_preferred
      )
      order by pn.is_preferred desc, pn.locale, pn.name_type, pn.name, pn.id
    )
    from atlas_v2.person_names pn
    where pn.person_id = p.id
  ), '[]'::jsonb) as names,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'locale', pd.locale,
        'content', pd.content
      )
      order by pd.locale, pd.id
    )
    from atlas_v2.person_descriptions pd
    where pd.person_id = p.id
  ), '[]'::jsonb) as descriptions,
  coalesce((
    select jsonb_object_agg(
      per.provider,
      jsonb_strip_nulls(jsonb_build_object(
        'status', per.status,
        'checked_at', per.checked_at::text,
        'document_title', per.document_title,
        'url', per.url
      ))
      order by per.provider
    )
    from atlas_v2.person_external_references per
    where per.person_id = p.id
  ), '{}'::jsonb) as external_references,
  (select count(*)::int from atlas_v2.person_politics_v2 pp where pp.person_id = p.id) as activity_count,
  (select min(pp.activity_start) from atlas_v2.person_politics_v2 pp where pp.person_id = p.id) as first_activity_year,
  (select max(pp.activity_end) from atlas_v2.person_politics_v2 pp where pp.person_id = p.id) as last_activity_year
from atlas_v2.persons p
order by p.id
`;

const PERSON_DETAIL_SQL = `
select
  p.id,
  p.person_type,
  p.historicity,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'locale', pn.locale,
        'name', pn.name,
        'name_type', pn.name_type,
        'is_preferred', pn.is_preferred
      )
      order by pn.is_preferred desc, pn.locale, pn.name_type, pn.name, pn.id
    )
    from atlas_v2.person_names pn
    where pn.person_id = p.id
  ), '[]'::jsonb) as names,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'locale', pd.locale,
        'content', pd.content
      )
      order by pd.locale, pd.id
    )
    from atlas_v2.person_descriptions pd
    where pd.person_id = p.id
  ), '[]'::jsonb) as descriptions,
  coalesce((
    select jsonb_object_agg(
      per.provider,
      jsonb_strip_nulls(jsonb_build_object(
        'status', per.status,
        'checked_at', per.checked_at::text,
        'document_title', per.document_title,
        'url', per.url
      ))
      order by per.provider
    )
    from atlas_v2.person_external_references per
    where per.person_id = p.id
  ), '{}'::jsonb) as external_references
from atlas_v2.persons p
where p.id = $1::uuid
limit 1
`;

const ACTIVITY_DETAIL_SQL = `
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
  pen.name as polity_name_en,
  pko.name as polity_name_ko,
  r.code as role_code,
  r.category as role_category,
  r.source_label as role_source_label,
  ren.name as role_name_en,
  rko.name as role_name_ko,
  pb.code as period_basis_code,
  pben.name as period_basis_name_en,
  pbko.name as period_basis_name_ko
from atlas_v2.person_politics_v2 pp
left join atlas_v2.person_polity_relation_types prt
  on prt.id = pp.relation_type_id
left join atlas_v2.polity_names pen
  on pen.polity_id = pp.polity_id
 and pen.locale = 'en'
 and pen.is_preferred = true
left join atlas_v2.polity_names pko
  on pko.polity_id = pp.polity_id
 and pko.locale = 'ko'
 and pko.is_preferred = true
left join atlas_v2.roles r
  on r.id = pp.role_id
left join atlas_v2.role_names ren
  on ren.role_id = pp.role_id
 and ren.locale = 'en'
 and ren.is_preferred = true
left join atlas_v2.role_names rko
  on rko.role_id = pp.role_id
 and rko.locale = 'ko'
 and rko.is_preferred = true
join atlas_v2.period_bases pb
  on pb.id = pp.period_basis_id
left join atlas_v2.period_basis_names pben
  on pben.period_basis_id = pp.period_basis_id
 and pben.locale = 'en'
 and pben.is_preferred = true
left join atlas_v2.period_basis_names pbko
  on pbko.period_basis_id = pp.period_basis_id
 and pbko.locale = 'ko'
 and pbko.is_preferred = true
where pp.person_id = $1::uuid
order by pp.activity_start, pp.activity_end, pp.polity_id, pp.id
`;

const PERSON_SOURCE_SQL = `
select
  s.source_type,
  s.title,
  s.canonical_url,
  s.citation_text
from atlas_v2.person_sources ps
join atlas_v2.sources s
  on s.id = ps.source_id
where ps.person_id = $1::uuid
order by s.title, s.source_type, s.id
`;

const ACTIVITY_SOURCE_SQL = `
select
  pps.person_politics_id,
  pps.source_locator_key,
  s.source_type,
  s.title,
  s.canonical_url,
  s.citation_text
from atlas_v2.person_politics_sources pps
join atlas_v2.person_politics_v2 pp
  on pp.id = pps.person_politics_id
join atlas_v2.sources s
  on s.id = pps.source_id
where pp.person_id = $1::uuid
order by pps.person_politics_id, s.title, pps.source_locator_key, s.id
`;

function normalizeNameRows(value) {
  if (!Array.isArray(value)) return [];
  return value.map((row) => Object.freeze({
    locale: String(row?.locale || ""),
    name: String(row?.name || ""),
    name_type: String(row?.name_type || ""),
    is_preferred: Boolean(row?.is_preferred)
  }));
}

function normalizeDescriptionRows(value) {
  if (!Array.isArray(value)) return [];
  return value.map((row) => Object.freeze({
    locale: String(row?.locale || ""),
    content: String(row?.content || "")
  }));
}

function normalizeExternalReferences(value) {
  const empty = Object.freeze({ namuwiki:null });
  if (!value || typeof value !== "object" || Array.isArray(value)) return empty;
  const raw = value.namuwiki;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return empty;
  const status = String(raw.status || "").trim();
  if (status !== "linked" && status !== "not_found") return empty;
  const checkedAt = raw.checked_at == null ? null : String(raw.checked_at);
  if (status === "not_found") return Object.freeze({ namuwiki:Object.freeze({ status, checked_at:checkedAt }) });
  const documentTitle = raw.document_title == null ? null : String(raw.document_title);
  const url = raw.url == null ? null : String(raw.url);
  if (!documentTitle || !url) return empty;
  return Object.freeze({ namuwiki:Object.freeze({ status, checked_at:checkedAt, document_title:documentTitle, url }) });
}

function preferredName(names, locale) {
  return names.find((row) => row.locale === locale && row.is_preferred)?.name || null;
}

function firstUsableName(names) {
  return names.find((row) => row.is_preferred)?.name || names[0]?.name || null;
}

function comparePersons(left, right) {
  const leftYear = left.first_activity_year;
  const rightYear = right.first_activity_year;
  if (leftYear == null && rightYear != null) return 1;
  if (leftYear != null && rightYear == null) return -1;
  if (leftYear != null && rightYear != null && leftYear !== rightYear) return leftYear - rightYear;
  return String(left.display_name || left.canonical_name_en || left.id)
    .localeCompare(String(right.display_name || right.canonical_name_en || right.id), "ko");
}

function buildSummary(persons) {
  const byHistoricity = {};
  for (const person of persons) {
    const key = person.historicity || "";
    byHistoricity[key] = (byHistoricity[key] || 0) + 1;
  }
  return Object.freeze({
    total: persons.length,
    historicity_values: Object.freeze(Object.keys(byHistoricity).sort()),
    by_historicity: Object.freeze(byHistoricity)
  });
}

function projectPersonIdentity(row) {
  const names = normalizeNameRows(row.names);
  const descriptions = normalizeDescriptionRows(row.descriptions);
  const canonicalNameEn = preferredName(names, "en");
  const preferredNameKo = preferredName(names, "ko");
  const displayName = preferredNameKo || canonicalNameEn || firstUsableName(names) || String(row.id);
  return {
    id: String(row.id),
    person_type: row.person_type == null ? null : String(row.person_type),
    historicity: row.historicity == null ? null : String(row.historicity),
    canonical_name_en: canonicalNameEn,
    preferred_name_ko: preferredNameKo,
    display_name: displayName,
    names: Object.freeze(names),
    descriptions: Object.freeze(descriptions),
    external_references:normalizeExternalReferences(row.external_references)
  };
}

function projectPerson(row) {
  return Object.freeze({
    ...projectPersonIdentity(row),
    activity_count: Number(row.activity_count || 0),
    first_activity_year: row.first_activity_year == null ? null : Number(row.first_activity_year),
    last_activity_year: row.last_activity_year == null ? null : Number(row.last_activity_year)
  });
}

function normalizeBoundary(row, prefix) {
  if (prefix === "activity_end" && row.chronology_status === "ongoing" && row.activity_end == null) {
    return Object.freeze({ year:null, month:null, day:null, granularity:null, certainty:null, calendar:null, status:"ongoing", as_of:row.ongoing_as_of ?? row.source_locator?.ongoing_as_of ?? null });
  }
  const year = row?.[prefix];
  return Object.freeze({
    year: year == null ? null : Number(year),
    month: row?.[`${prefix}_month`] == null ? null : Number(row[`${prefix}_month`]),
    day: row?.[`${prefix}_day`] == null ? null : Number(row[`${prefix}_day`]),
    granularity: row?.[`${prefix}_granularity`] == null ? null : String(row[`${prefix}_granularity`]),
    certainty: row?.[`${prefix}_certainty`] == null ? null : String(row[`${prefix}_certainty`]),
    calendar: row?.[`${prefix}_calendar`] == null ? null : String(row[`${prefix}_calendar`])
  });
}

function displayValue(preferredKo, canonicalEn, fallback = null) {
  return preferredKo || canonicalEn || fallback;
}

function projectSource(row, locator = null) {
  const title = row?.title == null ? null : String(row.title);
  const citationText = row?.citation_text == null ? null : String(row.citation_text);
  const canonicalUrl = row?.canonical_url == null ? null : String(row.canonical_url);
  return Object.freeze({
    title,
    source_type: row?.source_type == null ? null : String(row.source_type),
    canonical_url: canonicalUrl,
    citation_text: citationText,
    locator: locator == null ? null : String(locator),
    display_reference: citationText || title || canonicalUrl
  });
}

function projectActivity(row) {
  const polityId = row.polity_id == null ? null : String(row.polity_id);
  const polityNameEn = row.polity_name_en == null ? null : String(row.polity_name_en);
  const polityNameKo = row.polity_name_ko == null ? null : String(row.polity_name_ko);
  const relationTypeId = row.relation_type_id == null ? null : String(row.relation_type_id);
  const roleNameEn = row.role_name_en == null ? null : String(row.role_name_en);
  const roleNameKo = row.role_name_ko == null ? null : String(row.role_name_ko);
  const periodBasisNameEn = row.period_basis_name_en == null ? null : String(row.period_basis_name_en);
  const periodBasisNameKo = row.period_basis_name_ko == null ? null : String(row.period_basis_name_ko);
  const roleId = row.role_id == null ? null : String(row.role_id);

  return Object.freeze({
    id: String(row.id),
    person_id: String(row.person_id),
    polity: polityId == null ? null : Object.freeze({
      id: polityId,
      canonical_name_en: polityNameEn,
      preferred_name_ko: polityNameKo,
      display_name: displayValue(polityNameKo, polityNameEn, polityId)
    }),
    relation: relationTypeId == null ? null : Object.freeze({
      id: relationTypeId,
      code: row.relation_type_code == null ? null : String(row.relation_type_code),
      category: row.relation_type_category == null ? null : String(row.relation_type_category)
    }),
    role: roleId == null ? null : Object.freeze({
      id: roleId,
      code: row.role_code == null ? null : String(row.role_code),
      category: row.role_category == null ? null : String(row.role_category),
      source_label: row.role_source_label == null ? null : String(row.role_source_label),
      canonical_name_en: roleNameEn,
      preferred_name_ko: roleNameKo,
      display_name: displayValue(roleNameKo, roleNameEn, row.role_source_label == null ? null : String(row.role_source_label))
    }),
    period_basis: Object.freeze({
      id: String(row.period_basis_id),
      code: String(row.period_basis_code),
      canonical_name_en: periodBasisNameEn,
      preferred_name_ko: periodBasisNameKo,
      display_name: displayValue(periodBasisNameKo, periodBasisNameEn, String(row.period_basis_code))
    }),
    start: normalizeBoundary(row, "activity_start"),
    end: normalizeBoundary(row, "activity_end"),
    confidence: row.confidence == null ? null : String(row.confidence),
    chronology_status: row.chronology_status == null ? null : String(row.chronology_status),
    notes: row.notes == null ? null : String(row.notes)
  });
}

function attachActivitySources(activities, sourceRows) {
  const byActivity = new Map();
  for (const row of sourceRows || []) {
    const activityId = String(row.person_politics_id);
    const list = byActivity.get(activityId) || [];
    list.push(projectSource(row, row.source_locator_key));
    byActivity.set(activityId, list);
  }
  return Object.freeze(activities.map((activity) => Object.freeze({
    ...activity,
    sources: Object.freeze(byActivity.get(activity.id) || [])
  })));
}

function summarizeActivities(activities) {
  const starts = activities.map((row) => row.start.year).filter((value) => value != null);
  const ends = activities.map((row) => row.end.year).filter((value) => value != null);
  return Object.freeze({
    activity_count: activities.length,
    first_activity_year: starts.length ? Math.min(...starts) : null,
    last_activity_year: ends.length ? Math.max(...ends) : null
  });
}

async function readPersons({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const result = await client.query(PERSON_READ_SQL);
  const persons = (result.rows || []).map(projectPerson).sort(comparePersons);
  return Object.freeze({ persons: Object.freeze(persons), summary: buildSummary(persons) });
}

async function readPersonDetail({ client, personId } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const personResult = await client.query(PERSON_DETAIL_SQL, [personId]);
  if (personResult.rowCount === 0 || !(personResult.rows || []).length) return null;
  const activityResult = await client.query(ACTIVITY_DETAIL_SQL, [personId]);
  const personSourceResult = await client.query(PERSON_SOURCE_SQL, [personId]);
  const activitySourceResult = await client.query(ACTIVITY_SOURCE_SQL, [personId]);
  const baseActivities = Object.freeze((activityResult.rows || []).map(projectActivity));
  const activities = attachActivitySources(baseActivities, activitySourceResult.rows || []);
  const sources = Object.freeze((personSourceResult.rows || []).map((row) => projectSource(row)));
  return Object.freeze({
    ...projectPersonIdentity(personResult.rows[0]),
    ...summarizeActivities(activities),
    sources,
    activities
  });
}

module.exports = Object.freeze({
  PERSON_READ_SQL,
  PERSON_DETAIL_SQL,
  ACTIVITY_DETAIL_SQL,
  PERSON_SOURCE_SQL,
  ACTIVITY_SOURCE_SQL,
  normalizeNameRows,
  normalizeDescriptionRows,
  normalizeExternalReferences,
  normalizeBoundary,
  preferredName,
  projectPerson,
  projectSource,
  projectActivity,
  attachActivitySources,
  buildSummary,
  readPersons,
  readPersonDetail
});
