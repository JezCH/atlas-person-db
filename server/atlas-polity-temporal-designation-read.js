"use strict";

/**
 * Public Activity reads may use a temporal polity designation only when:
 * - the Activity has both temporal boundaries;
 * - the designation interval fully contains the Activity interval; and
 * - exactly one designation satisfies that contract.
 *
 * Boundary precision is honored when month/day data exists. A year-only start
 * is treated as the start of that year, while a year-only end is treated as
 * the end of that year. This preserves the previous coarse-year behavior while
 * allowing disjoint same-year designation intervals to remain distinguishable.
 *
 * Multiple containing designations are ambiguous. Fail closed to the stable
 * preferred polity name instead of ranking or guessing among them.
 */
const TEMPORAL_POLITY_DESIGNATION_JOIN_SQL = `
left join lateral (
  select
    case
      when count(*) = 1 then min(pd.id::text)::uuid
      else null::uuid
    end as id
  from atlas_v2.polity_designations pd
  where pd.polity_id = pp.polity_id
    and pp.activity_start is not null
    and pp.activity_end is not null
    and (
      pd.valid_from_year is null
      or (
        pd.valid_from_year,
        coalesce(pd.valid_from_month, 1),
        coalesce(pd.valid_from_day, 1)
      ) <= (
        pp.activity_start,
        coalesce(pp.activity_start_month, 1),
        coalesce(pp.activity_start_day, 1)
      )
    )
    and (
      pd.valid_to_year is null
      or (
        pd.valid_to_year,
        coalesce(pd.valid_to_month, 12),
        coalesce(pd.valid_to_day, 31)
      ) >= (
        pp.activity_end,
        coalesce(pp.activity_end_month, 12),
        coalesce(pp.activity_end_day, 31)
      )
    )
) td on true
left join atlas_v2.polity_designation_names td_en
  on td_en.polity_designation_id = td.id
 and td_en.locale = 'en'
 and td_en.is_preferred = true
left join atlas_v2.polity_designation_names td_ko
  on td_ko.polity_designation_id = td.id
 and td_ko.locale = 'ko'
 and td_ko.is_preferred = true
`;

module.exports = Object.freeze({
  TEMPORAL_POLITY_DESIGNATION_JOIN_SQL
});
