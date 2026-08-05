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
