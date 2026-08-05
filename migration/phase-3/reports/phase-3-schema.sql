-- ATLAS Phase 3 target schema
-- Definition only; do not deploy in Phase 3.

-- BEGIN 001_types.sql
create type person_type_code as enum ('historical','legendary','mythological');
create type historicity_code as enum ('historical','disputed','legendary','mythological');
create type name_type_code as enum ('canonical','preferred','original','historical','alias','regnal','translated');
create type role_category_code as enum ('ruler','government','military','religious','intellectual','artistic','exploration','revolutionary','other');
create type confidence_code as enum ('high','medium','low','disputed');
create type chronology_status_code as enum ('exact','approximate','disputed','legendary','unknown');
create type chronology_precision_code as enum ('year','decade','century','range','unknown');
create type chronology_claim_type_code as enum ('birth','death','activity_start','activity_end','reign','term','event','other');
create type description_type_code as enum ('summary','notes','historical_context','display');
create type source_type_code as enum ('primary','secondary','tertiary','dataset','web','other');
-- END 001_types.sql

-- BEGIN 002_core_entities.sql
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
-- END 002_core_entities.sql

-- BEGIN 003_names.sql
create table person_names (
  id uuid primary key,
  person_id uuid not null references persons(id) on delete cascade,
  locale text not null check (char_length(trim(locale)) > 0),
  name text not null check (char_length(trim(name)) > 0),
  normalized_name text not null check (char_length(trim(normalized_name)) > 0),
  name_type name_type_code not null,
  script_code text,
  is_preferred boolean not null default false,
  valid_from integer,
  valid_to integer,
  check (valid_from is null or (valid_from between -10000 and 9999 and valid_from <> 0)),
  check (valid_to is null or (valid_to between -10000 and 9999 and valid_to <> 0)),
  check (valid_from is null or valid_to is null or valid_to >= valid_from),
  unique (person_id, locale, normalized_name, name_type)
);

create table polity_names (
  id uuid primary key,
  polity_id uuid not null references polities(id) on delete cascade,
  locale text not null check (char_length(trim(locale)) > 0),
  name text not null check (char_length(trim(name)) > 0),
  normalized_name text not null check (char_length(trim(normalized_name)) > 0),
  name_type name_type_code not null,
  is_preferred boolean not null default false,
  valid_from integer,
  valid_to integer,
  check (valid_from is null or (valid_from between -10000 and 9999 and valid_from <> 0)),
  check (valid_to is null or (valid_to between -10000 and 9999 and valid_to <> 0)),
  check (valid_from is null or valid_to is null or valid_to >= valid_from),
  unique (polity_id, locale, normalized_name, name_type)
);
-- END 003_names.sql

-- BEGIN 004_vocabularies.sql
create table roles (
  id uuid primary key,
  code text not null unique check (char_length(trim(code)) > 0),
  category role_category_code not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table role_names (
  id uuid primary key,
  role_id uuid not null references roles(id) on delete cascade,
  locale text not null check (char_length(trim(locale)) > 0),
  name text not null check (char_length(trim(name)) > 0),
  is_preferred boolean not null default true,
  unique (role_id, locale, name)
);

create table period_bases (
  id uuid primary key,
  code text not null unique check (char_length(trim(code)) > 0),
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table period_basis_names (
  id uuid primary key,
  period_basis_id uuid not null references period_bases(id) on delete cascade,
  locale text not null check (char_length(trim(locale)) > 0),
  name text not null check (char_length(trim(name)) > 0),
  is_preferred boolean not null default true,
  unique (period_basis_id, locale, name)
);
-- END 004_vocabularies.sql

-- BEGIN 005_relationships.sql
create table person_politics_v2 (
  id uuid primary key,
  person_id uuid not null references persons(id) on delete restrict,
  polity_id uuid not null references polities(id) on delete restrict,
  activity_start integer,
  activity_end integer,
  role_id uuid not null references roles(id) on delete restrict,
  period_basis_id uuid not null references period_bases(id) on delete restrict,
  confidence confidence_code not null default 'medium',
  chronology_status chronology_status_code not null default 'exact',
  legacy_source_key text not null unique check (char_length(trim(legacy_source_key)) > 0),
  notes text,
  legacy_created_at timestamptz,
  legacy_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (activity_start is null or (activity_start between -10000 and 9999 and activity_start <> 0)),
  check (activity_end is null or (activity_end between -10000 and 9999 and activity_end <> 0)),
  check (activity_start is null or activity_end is null or activity_end >= activity_start),
  unique (person_id, polity_id, activity_start, activity_end, role_id, period_basis_id)
);
-- END 005_relationships.sql

-- BEGIN 006_chronology.sql
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
-- END 006_chronology.sql

-- BEGIN 007_descriptions.sql
create table person_descriptions (
  id uuid primary key,
  person_id uuid not null references persons(id) on delete cascade,
  locale text not null check (char_length(trim(locale)) > 0),
  description_type description_type_code not null,
  content text not null check (char_length(trim(content)) > 0),
  unique (person_id, locale, description_type)
);

create table polity_descriptions (
  id uuid primary key,
  polity_id uuid not null references polities(id) on delete cascade,
  locale text not null check (char_length(trim(locale)) > 0),
  description_type description_type_code not null,
  content text not null check (char_length(trim(content)) > 0),
  unique (polity_id, locale, description_type)
);

create table relationship_descriptions (
  id uuid primary key,
  person_politics_id uuid not null references person_politics_v2(id) on delete cascade,
  locale text not null check (char_length(trim(locale)) > 0),
  description_type description_type_code not null,
  content text not null check (char_length(trim(content)) > 0),
  unique (person_politics_id, locale, description_type)
);
-- END 007_descriptions.sql

-- BEGIN 008_sources.sql
create table person_sources (
  person_id uuid not null references persons(id) on delete cascade,
  source_id uuid not null references sources(id) on delete restrict,
  relation_type text not null default 'evidence',
  primary key (person_id, source_id, relation_type)
);

create table polity_sources (
  polity_id uuid not null references polities(id) on delete cascade,
  source_id uuid not null references sources(id) on delete restrict,
  relation_type text not null default 'evidence',
  primary key (polity_id, source_id, relation_type)
);

create table person_politics_sources (
  person_politics_id uuid not null references person_politics_v2(id) on delete cascade,
  source_id uuid not null references sources(id) on delete restrict,
  relation_type text not null default 'evidence',
  primary key (person_politics_id, source_id, relation_type)
);

create table chronology_claim_sources (
  chronology_claim_id uuid not null references chronology_claims(id) on delete cascade,
  source_id uuid not null references sources(id) on delete restrict,
  relation_type text not null default 'evidence',
  primary key (chronology_claim_id, source_id, relation_type)
);
-- END 008_sources.sql

-- BEGIN 009_indexes.sql
create unique index person_names_one_preferred_per_locale
  on person_names (person_id, locale)
  where is_preferred;

create unique index polity_names_one_preferred_per_locale
  on polity_names (polity_id, locale)
  where is_preferred;

create unique index role_names_one_preferred_per_locale
  on role_names (role_id, locale)
  where is_preferred;

create unique index period_basis_names_one_preferred_per_locale
  on period_basis_names (period_basis_id, locale)
  where is_preferred;

create index person_politics_v2_sort_idx
  on person_politics_v2 (polity_id, activity_start, activity_end, person_id);

create index chronology_claims_relationship_idx
  on chronology_claims (person_politics_id, claim_type, is_preferred);

create index chronology_claims_person_idx
  on chronology_claims (person_id, claim_type, is_preferred);

create index chronology_claims_polity_idx
  on chronology_claims (polity_id, claim_type, is_preferred);
-- END 009_indexes.sql

-- BEGIN 010_rls_stub.sql
-- Phase 3 definition only RLS stub.
-- No policies are created or altered in this phase.
-- Operational RLS design and deployment are deferred to the shadow-schema phase.
-- END 010_rls_stub.sql

-- BEGIN 099_schema_contract.sql
-- Phase 3 schema contract sentinel.
-- Validators assert the assembled bundle contains every required type, table, constraint, index, and referential action.
select 'phase-3-schema-contract' as contract_name;
-- END 099_schema_contract.sql
