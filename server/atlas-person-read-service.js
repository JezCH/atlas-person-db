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
  (select count(*)::int from atlas_v2.person_politics_v2 pp where pp.person_id = p.id) as activity_count,
  (select min(pp.activity_start) from atlas_v2.person_politics_v2 pp where pp.person_id = p.id) as first_activity_year,
  (select max(pp.activity_end) from atlas_v2.person_politics_v2 pp where pp.person_id = p.id) as last_activity_year
from atlas_v2.persons p
order by p.id
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

function projectPerson(row) {
  const names = normalizeNameRows(row.names);
  const descriptions = normalizeDescriptionRows(row.descriptions);
  const canonicalNameEn = preferredName(names, "en");
  const preferredNameKo = preferredName(names, "ko");
  const displayName = preferredNameKo || canonicalNameEn || firstUsableName(names) || String(row.id);
  return Object.freeze({
    id: String(row.id),
    person_type: row.person_type == null ? null : String(row.person_type),
    historicity: row.historicity == null ? null : String(row.historicity),
    canonical_name_en: canonicalNameEn,
    preferred_name_ko: preferredNameKo,
    display_name: displayName,
    names: Object.freeze(names),
    descriptions: Object.freeze(descriptions),
    activity_count: Number(row.activity_count || 0),
    first_activity_year: row.first_activity_year == null ? null : Number(row.first_activity_year),
    last_activity_year: row.last_activity_year == null ? null : Number(row.last_activity_year)
  });
}

async function readPersons({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const result = await client.query(PERSON_READ_SQL);
  const persons = (result.rows || []).map(projectPerson).sort(comparePersons);
  return Object.freeze({ persons: Object.freeze(persons), summary: buildSummary(persons) });
}

module.exports = Object.freeze({
  PERSON_READ_SQL,
  normalizeNameRows,
  normalizeDescriptionRows,
  preferredName,
  projectPerson,
  buildSummary,
  readPersons
});
