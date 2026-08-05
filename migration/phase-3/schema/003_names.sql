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
