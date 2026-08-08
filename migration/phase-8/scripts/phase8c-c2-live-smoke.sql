\set ON_ERROR_STOP on
begin;

-- Fail closed unless the live table has the minimum normalized relationship contract.
do $$
declare
  required text[] := array[
    'id','person_id','polity_id','role_id','period_basis_id',
    'activity_start','activity_end','legacy_source_key','notes'
  ];
  missing text[];
begin
  select array_agg(x order by x)
  into missing
  from unnest(required) as x
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'atlas_v2'
      and c.table_name = 'person_politics_v2'
      and c.column_name = x
  );
  if missing is not null then
    raise exception 'live person_politics_v2 missing required columns: %', missing;
  end if;
end $$;

create temporary table atlas_phase8c_smoke_result as
select
  (select count(*) from atlas_v2.persons) as persons_before,
  (select count(*) from atlas_v2.polities) as polities_before,
  (select count(*) from atlas_v2.person_politics_v2) as relationships_before,
  (select count(*) from public.person_politics) as legacy_before;

-- Clone one valid live row through JSONB so every live column is preserved without
-- hard-coding stale column names. Only the smoke-specific fields are overridden.
with source_row as (
  select to_jsonb(r) as row_json
  from atlas_v2.person_politics_v2 r
  order by r.id
  limit 1
), candidate_years as (
  select y as activity_start, y + 1 as activity_end
  from generate_series(-9999, -9900) as y
), smoke_candidate as (
  select
    s.row_json,
    c.activity_start,
    c.activity_end
  from source_row s
  cross join candidate_years c
  where not exists (
    select 1
    from atlas_v2.person_politics_v2 existing
    where existing.person_id = (s.row_json->>'person_id')::uuid
      and existing.polity_id = (s.row_json->>'polity_id')::uuid
      and existing.role_id = (s.row_json->>'role_id')::uuid
      and existing.period_basis_id = (s.row_json->>'period_basis_id')::uuid
      and existing.activity_start = c.activity_start
      and existing.activity_end = c.activity_end
  )
  order by c.activity_start
  limit 1
), prepared as (
  select jsonb_populate_record(
    null::atlas_v2.person_politics_v2,
    row_json || jsonb_build_object(
      'id', gen_random_uuid(),
      'activity_start', activity_start,
      'activity_end', activity_end,
      'legacy_source_key', 'phase8c-c2-live-smoke-rollback-only',
      'notes', 'Phase 8C C2 rollback-only smoke; must never persist.'
    )
  ) as row_value
  from smoke_candidate
), inserted as (
  insert into atlas_v2.person_politics_v2
  select (row_value).*
  from prepared
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
