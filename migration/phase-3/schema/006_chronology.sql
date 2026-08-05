create table sources (
  id uuid primary key,
  source_key text not null unique check (char_length(trim(source_key)) > 0),
  title text not null check (char_length(trim(title)) > 0),
  author text,
  publisher text,
  publication_year integer,
  url text,
  accessed_at date,
  source_type source_type_code not null,
  citation_text text,
  check (publication_year is null or (publication_year between -10000 and 9999 and publication_year <> 0))
);

create table chronology_claims (
  id uuid primary key,
  person_politics_id uuid references person_politics_v2(id) on delete cascade,
  person_id uuid references persons(id) on delete cascade,
  polity_id uuid references polities(id) on delete cascade,
  claim_type chronology_claim_type_code not null,
  start_year integer,
  end_year integer,
  precision chronology_precision_code not null,
  confidence confidence_code not null,
  is_preferred boolean not null default false,
  rationale text,
  check (num_nonnulls(person_politics_id, person_id, polity_id) = 1),
  check (start_year is null or (start_year between -10000 and 9999 and start_year <> 0)),
  check (end_year is null or (end_year between -10000 and 9999 and end_year <> 0)),
  check (start_year is null or end_year is null or end_year >= start_year)
);
