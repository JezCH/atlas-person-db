"use strict";

const PERSON_LIST_FACET_SQL = `
select distinct
  pp.person_id,
  pp.polity_id,
  pen.name as polity_name_en,
  pko.name as polity_name_ko,
  pp.relation_type_id,
  prt.code as relation_type_code,
  prt.category as relation_type_category,
  pp.role_id,
  r.code as role_code,
  r.category as role_category,
  r.source_label as role_source_label,
  ren.name as role_name_en,
  rko.name as role_name_ko,
  pp.period_basis_id,
  pb.code as period_basis_code,
  pben.name as period_basis_name_en,
  pbko.name as period_basis_name_ko
from atlas_v2.person_politics_v2 pp
join atlas_v2.person_polity_relation_types prt
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
order by
  pp.person_id,
  pp.polity_id,
  pp.relation_type_id,
  pp.role_id nulls first,
  pp.period_basis_id
`;

function optionalText(value) {
  return value == null ? null : String(value);
}

function displayValue(preferredKo, canonicalEn, fallback = null) {
  return preferredKo || canonicalEn || fallback;
}

function projectFacetRow(row) {
  const polityNameEn = optionalText(row?.polity_name_en);
  const polityNameKo = optionalText(row?.polity_name_ko);
  const roleId = row?.role_id == null ? null : String(row.role_id);
  const roleNameEn = optionalText(row?.role_name_en);
  const roleNameKo = optionalText(row?.role_name_ko);
  const periodBasisNameEn = optionalText(row?.period_basis_name_en);
  const periodBasisNameKo = optionalText(row?.period_basis_name_ko);
  return Object.freeze({
    person_id: String(row.person_id),
    polity: Object.freeze({
      id: String(row.polity_id),
      canonical_name_en: polityNameEn,
      preferred_name_ko: polityNameKo,
      display_name: displayValue(polityNameKo, polityNameEn, String(row.polity_id))
    }),
    relation: Object.freeze({
      id: String(row.relation_type_id),
      code: String(row.relation_type_code),
      category: String(row.relation_type_category)
    }),
    role: roleId == null ? null : Object.freeze({
      id: roleId,
      code: optionalText(row.role_code),
      category: optionalText(row.role_category),
      source_label: optionalText(row.role_source_label),
      canonical_name_en: roleNameEn,
      preferred_name_ko: roleNameKo,
      display_name: displayValue(roleNameKo, roleNameEn, optionalText(row.role_source_label) || roleId)
    }),
    period_basis: Object.freeze({
      id: String(row.period_basis_id),
      code: String(row.period_basis_code),
      canonical_name_en: periodBasisNameEn,
      preferred_name_ko: periodBasisNameKo,
      display_name: displayValue(periodBasisNameKo, periodBasisNameEn, String(row.period_basis_code))
    })
  });
}

function createBucket() {
  return {
    polities: [],
    relations: [],
    roles: [],
    period_bases: [],
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
  bucket[key].push(item);
}

function frozenFacets(bucket = createBucket()) {
  return Object.freeze({
    polities: Object.freeze(bucket.polities.slice()),
    relations: Object.freeze(bucket.relations.slice()),
    roles: Object.freeze(bucket.roles.slice()),
    period_bases: Object.freeze(bucket.period_bases.slice())
  });
}

function attachPersonListFacets(persons, rows) {
  const byPerson = new Map();
  for (const rawRow of rows || []) {
    const row = projectFacetRow(rawRow);
    const bucket = byPerson.get(row.person_id) || createBucket();
    pushUnique(bucket, "polities", row.polity);
    pushUnique(bucket, "relations", row.relation);
    pushUnique(bucket, "roles", row.role);
    pushUnique(bucket, "period_bases", row.period_basis);
    byPerson.set(row.person_id, bucket);
  }

  return Object.freeze((persons || []).map((person) => Object.freeze({
    ...person,
    facets: frozenFacets(byPerson.get(String(person.id)))
  })));
}

async function readPersonListFacets({ client, persons } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const list = Array.isArray(persons) ? persons : [];
  if (!list.length) return Object.freeze([]);
  const result = await client.query(PERSON_LIST_FACET_SQL);
  return attachPersonListFacets(list, result.rows || []);
}

module.exports = Object.freeze({
  PERSON_LIST_FACET_SQL,
  optionalText,
  displayValue,
  projectFacetRow,
  attachPersonListFacets,
  readPersonListFacets
});
