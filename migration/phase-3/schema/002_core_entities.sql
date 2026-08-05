create table persons (
  id uuid primary key,
  canonical_key text not null unique check (char_length(trim(canonical_key)) > 0),
  person_type person_type_code not null,
  historicity historicity_code not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table polities (
  id uuid primary key,
  canonical_key text not null unique check (char_length(trim(canonical_key)) > 0),
  polity_type text not null check (char_length(trim(polity_type)) > 0),
  historicity historicity_code not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
