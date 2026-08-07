\set ON_ERROR_STOP on
begin;

create temporary table atlas_phase8c_smoke_result as
select
  (select count(*) from atlas_v2.persons) as persons_before,
  (select count(*) from atlas_v2.polities) as polities_before,
  (select count(*) from atlas_v2.person_politics_v2) as relationships_before,
  (select count(*) from public.person_politics) as legacy_before;

with seed as (
  select person_id, polity_id, role_id, period_basis_id
  from atlas_v2.person_politics_v2
  order by id
  limit 1
), inserted as (
  insert into atlas_v2.person_politics_v2
    (id, person_id, polity_id, activity_start, activity_end, role_id, period_basis_id, legacy_source_key, notes)
  select
    gen_random_uuid(), person_id, polity_id, null, null, role_id, period_basis_id,
    'phase8c-c2-live-smoke-rollback-only',
    'Phase 8C C2 rollback-only smoke; must never persist.'
  from seed
  returning id
)
select jsonb_build_object(
  'marker','PHASE_8C_C2_LIVE_SMOKE',
  'inserted_rows',(select count(*) from inserted),
  'seed_rows',(select count(*) from seed),
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
