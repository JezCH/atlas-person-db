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
