"use strict";

const DIRECT_READ_SQL = `
select
  pp.id,
  pn.name::text as person_name,
  ptn.name::text as politic_name,
  pp.activity_start,
  pp.activity_end,
  r.source_label::text as role,
  pb.code::text as period_basis,
  pp.notes
from atlas_v2.person_politics_v2 pp
join atlas_v2.person_names pn
  on pn.person_id = pp.person_id
 and pn.locale = 'en'
 and pn.is_preferred = true
join atlas_v2.polity_names ptn
  on ptn.polity_id = pp.polity_id
 and ptn.locale = 'en'
 and ptn.is_preferred = true
left join atlas_v2.roles r
  on r.id = pp.role_id
join atlas_v2.period_bases pb
  on pb.id = pp.period_basis_id
order by
  ptn.name,
  pp.activity_start,
  pp.activity_end,
  pn.name,
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
    politic_name: String(row.politic_name),
    activity_start: Number(row.activity_start),
    activity_end: Number(row.activity_end),
    role: row.role == null ? null : String(row.role),
    period_basis: String(row.period_basis),
    notes: row.notes == null ? null : String(row.notes)
  }));
}

module.exports = Object.freeze({ DIRECT_READ_SQL, readPersonPolitics });
