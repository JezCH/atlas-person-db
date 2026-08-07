\set ON_ERROR_STOP on
begin;

create temporary table atlas_phase8c_smoke_result as
select
  (select count(*) from atlas_v2.persons) as persons_before,
  (select count(*) from atlas_v2.polities) as polities_before,
  (select count(*) from atlas_v2.person_politics_v2) as relationships_before,
  (select count(*) from public.person_politics) as legacy_before;

with person_match as (
  select pn.person_id
  from atlas_v2.person_names pn
  where pn.name = 'Ada Lovelace'
  order by pn.is_preferred desc, pn.id
  limit 2
), polity_match as (
  select pn.polity_id
  from atlas_v2.polity_names pn
  where pn.name = 'United Kingdom'
  order by pn.is_preferred desc, pn.id
  limit 2
), role_match as (
  select r.id
  from atlas_v2.roles r
  left join atlas_v2.role_names rn on rn.role_id = r.id
  where r.code = 'Mathematician' or rn.name = 'Mathematician'
  group by r.id
  order by r.id
  limit 2
), fallback_role as (
  select id from atlas_v2.roles order by sort_order, id limit 1
), basis_match as (
  select id from atlas_v2.period_bases where code = 'intellectual_activity' limit 2
), resolved as (
  select
    (select person_id from person_match limit 1) as person_id,
    (select polity_id from polity_match limit 1) as polity_id,
    coalesce((select id from role_match limit 1),(select id from fallback_role limit 1)) as role_id,
    (select id from basis_match limit 1) as period_basis_id,
    (select count(*) from person_match) as person_matches,
    (select count(*) from polity_match) as polity_matches,
    (select count(*) from basis_match) as basis_matches
), inserted as (
  insert into atlas_v2.person_politics_v2
    (id, person_id, polity_id, activity_start, activity_end, role_id, period_basis_id, legacy_source_key, notes)
  select
    gen_random_uuid(), person_id, polity_id, 1842, 1852, role_id, period_basis_id,
    'phase8c-c2-live-smoke-rollback-only',
    'Phase 8C C2 rollback-only smoke; must never persist.'
  from resolved
  where person_matches = 1 and polity_matches = 1 and basis_matches = 1 and role_id is not null
  returning id
)
select jsonb_build_object(
  'marker','PHASE_8C_C2_LIVE_SMOKE',
  'inserted_rows',(select count(*) from inserted),
  'person_exact_matches',(select person_matches from resolved),
  'polity_exact_matches',(select polity_matches from resolved),
  'period_basis_exact_matches',(select basis_matches from resolved),
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
