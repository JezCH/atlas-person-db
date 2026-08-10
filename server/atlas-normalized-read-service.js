"use strict";

const DIRECT_READ_SQL = `
select
  pp.id,
  pen.name::text as person_name,
  coalesce(pko.name, pen.name)::text as person_display_name,
  ten.name::text as politic_name,
  coalesce(tko.name, ten.name)::text as politic_display_name,
  pp.activity_start,
  pp.activity_end,
  r.source_label::text as role,
  coalesce(rko.name, r.source_label)::text as role_display_name,
  pb.code::text as period_basis,
  pp.notes
from atlas_v2.person_politics_v2 pp
join atlas_v2.person_names pen
  on pen.person_id = pp.person_id
 and pen.locale = 'en'
 and pen.is_preferred = true
left join atlas_v2.person_names pko
  on pko.person_id = pp.person_id
 and pko.locale = 'ko'
 and pko.is_preferred = true
join atlas_v2.polity_names ten
  on ten.polity_id = pp.polity_id
 and ten.locale = 'en'
 and ten.is_preferred = true
left join atlas_v2.polity_names tko
  on tko.polity_id = pp.polity_id
 and tko.locale = 'ko'
 and tko.is_preferred = true
left join atlas_v2.roles r
  on r.id = pp.role_id
left join lateral (
  select rn.name
    from atlas_v2.role_names rn
   where rn.role_id = r.id
     and rn.locale = 'ko'
     and rn.is_preferred = true
   order by rn.id
   limit 1
) rko on true
join atlas_v2.period_bases pb
  on pb.id = pp.period_basis_id
order by
  pp.activity_start,
  pp.activity_end,
  coalesce(pko.name, pen.name),
  coalesce(tko.name, ten.name),
  pp.id
`;

async function readPersonPolitics({ client } = {}) {
  if (!client || typeof client.query !== "function") {
    throw new Error("PostgreSQL client is required");
  }
  const result = await client.query(DIRECT_READ_SQL);
  return (result.rows || []).map((row) => ({
    id: String(row.id),
    person_name: String(row.person_name),
    person_display_name: String(row.person_display_name ?? row.person_name),
    politic_name: String(row.politic_name),
    politic_display_name: String(row.politic_display_name ?? row.politic_name),
    activity_start: Number(row.activity_start),
    activity_end: Number(row.activity_end),
    role: row.role == null ? null : String(row.role),
    role_display_name: row.role == null ? null : String(row.role_display_name ?? row.role),
    period_basis: String(row.period_basis),
    notes: row.notes == null ? null : String(row.notes)
  }));
}

module.exports = Object.freeze({ DIRECT_READ_SQL, readPersonPolitics });
