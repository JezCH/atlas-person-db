alter table public.person_politics
  add column if not exists verified boolean not null default false;

create index if not exists person_politics_verified_idx
  on public.person_politics (verified);
