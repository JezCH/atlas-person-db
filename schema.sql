create extension if not exists pgcrypto;

create table if not exists public.person_politics (
  id uuid primary key default gen_random_uuid(),
  person_name text not null check (char_length(trim(person_name)) > 0),
  politic_name text not null check (char_length(trim(politic_name)) > 0),
  activity_start integer not null check (activity_start between -10000 and 9999),
  activity_end integer not null check (activity_end between -10000 and 9999),
  role text,
  period_basis text not null default 'general_activity' check (
    period_basis in ('reign','term','de_facto_rule','military_activity','religious_activity','intellectual_activity','artistic_activity','general_activity')
  ),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_activity_period check (activity_end >= activity_start)
);

create index if not exists person_politics_sort_idx
  on public.person_politics (politic_name, activity_start, activity_end, person_name);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_person_politics_updated_at on public.person_politics;
create trigger trg_person_politics_updated_at
before update on public.person_politics
for each row execute function public.set_updated_at();

alter table public.person_politics enable row level security;

-- Browser clients are read-only. All production mutations go through the
-- authenticated ATLAS server mutation boundary.
drop policy if exists "public read person politics" on public.person_politics;
create policy "public read person politics" on public.person_politics for select using (true);

drop policy if exists "public insert person politics" on public.person_politics;
drop policy if exists "public update person politics" on public.person_politics;
drop policy if exists "public delete person politics" on public.person_politics;

revoke insert, update, delete on table public.person_politics from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke insert, update, delete on table public.person_politics from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke insert, update, delete on table public.person_politics from authenticated';
  end if;
end
$$;

insert into public.person_politics
(person_name, politic_name, activity_start, activity_end, role, period_basis, notes)
select * from (values
  ('콘스탄티누스 1세', 'Roman Empire', 306, 337, '황제', 'reign', '샘플 데이터'),
  ('유스티니아누스 1세', 'Byzantine Empire', 527, 565, '황제', 'reign', '샘플 데이터'),
  ('벨리사리우스', 'Byzantine Empire', 527, 565, '장군', 'military_activity', '샘플 데이터')
) as sample(person_name, politic_name, activity_start, activity_end, role, period_basis, notes)
where not exists (select 1 from public.person_politics);
