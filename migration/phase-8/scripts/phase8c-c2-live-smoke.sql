\set ON_ERROR_STOP on
begin;

create temporary table atlas_phase8c_smoke_result as
select
  (select count(*) from atlas_v2.persons) as persons_before,
  (select count(*) from atlas_v2.polities) as polities_before,
  (select count(*) from atlas_v2.person_politics_v2) as relationships_before,
  (select count(*) from public.person_politics) as legacy_before;

with source_relationship as (
  select r.*
  from atlas_v2.person_politics_v2 r
  order by r.id
  limit 1
), candidate_years as (
  select y as activity_start, y + 1 as activity_end
  from generate_series(-9999, -9900) as y
), smoke_candidate as (
  select
    s.*,
    c.activity_start as smoke_activity_start,
    c.activity_end as smoke_activity_end
  from source_relationship s
  cross join candidate_years c
  where not exists (
    select 1
    from atlas_v2.person_politics_v2 existing
    where existing.person_id = s.person_id
      and existing.polity_id = s.polity_id
      and existing.role_id = s.role_id
      and existing.period_basis_id = s.period_basis_id
      and existing.activity_start = c.activity_start
      and existing.activity_end = c.activity_end
  )
  order by c.activity_start
  limit 1
), inserted as (
  insert into atlas_v2.person_politics_v2
  select
    gen_random_uuid() as id,
    person_id,
    polity_id,
    role_id,
    period_basis_id,
    smoke_activity_start as activity_start,
    smoke_activity_end as activity_end,
    confidence,
    source_url,
    'phase8c-c2-live-smoke-rollback-only' as legacy_source_key,
    'Phase 8C C2 rollback-only smoke; must never persist.' as notes,
    created_at,
    updated_at
  from smoke_candidate
  returning id
)
select jsonb_build_object(
  'marker','PHASE_8C_C2_LIVE_SMOKE',
  'inserted_rows',(select count(*) from inserted),
  'candidate_rows',(select count(*) from smoke_candidate),
  'rollback_only',true,
  'legacy_mutations',0
);

rollback;

select jsonb_build_object(
  'marker','PHASE_8C_C2_POST_ROLLBACK',
  'smoke_rows_remaining',(select count(*) from atlas_v2.person_politics_v2 where legacy_source_key='phase8c-c2-live-smoke-rollback-only'),
  'persons_after',(select count(*) from atlas_v2.persons),
  'polities_after',(select count(*) from atlas_v2.polities),
  'relationships_after',(select count(*) from atlas_v2.person_politics_v2),
  'legacy_after',(select count(*) from public.person_politics)
);
