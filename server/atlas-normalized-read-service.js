"use strict";

const DIRECT_READ_SQL = `
select
  pp.id,
  pen.name::text as person_name,
  coalesce(pko.name, pen.name)::text as person_display_name,
  ten.name::text as politic_name,
  td_en.name::text as politic_designation_name_en,
  td_ko.name::text as politic_designation_name_ko,
  coalesce(td_ko.name, td_en.name, tko.name, ten.name)::text as politic_display_name,
  pp.activity_start,
  pp.activity_end,
  pp.chronology_status,
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
left join lateral (
  select pdn.name
    from atlas_v2.polity_designations pd
    join atlas_v2.polity_designation_names pdn
      on pdn.polity_designation_id = pd.id
     and pdn.locale = 'en'
     and pdn.is_preferred = true
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
) td_en on true
left join lateral (
  select pdn.name
    from atlas_v2.polity_designations pd
    join atlas_v2.polity_designation_names pdn
      on pdn.polity_designation_id = pd.id
     and pdn.locale = 'ko'
     and pdn.is_preferred = true
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
) td_ko on true
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
  pp.activity_start nulls last,
  pp.activity_end nulls last,
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
    politic_designation_name_en: row.politic_designation_name_en == null ? null : String(row.politic_designation_name_en),
    politic_designation_name_ko: row.politic_designation_name_ko == null ? null : String(row.politic_designation_name_ko),
    politic_display_name: String(row.politic_display_name ?? row.politic_name),
    activity_start: row.activity_start == null ? null : Number(row.activity_start),
    activity_end: row.activity_end == null ? null : Number(row.activity_end),
    ...(row.chronology_status === "ongoing" ? { chronology_status:"ongoing" } : {}),
    role: row.role == null ? null : String(row.role),
    role_display_name: row.role == null ? null : String(row.role_display_name ?? row.role),
    period_basis: String(row.period_basis),
    notes: row.notes == null ? null : String(row.notes)
  }));
}

module.exports = Object.freeze({ DIRECT_READ_SQL, readPersonPolitics });
