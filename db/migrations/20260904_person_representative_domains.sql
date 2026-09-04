create table if not exists atlas_v2.person_representative_domains (
  person_id uuid primary key references atlas_v2.persons(id) on delete cascade,
  representative_domain text not null,
  updated_at timestamptz not null default now(),
  constraint person_representative_domains_value_check check (
    representative_domain in (
      'ruler',
      'military',
      'science',
      'technology',
      'commerce',
      'culture',
      'religion',
      'exploration'
    )
  )
);

create index if not exists person_representative_domains_domain_idx
  on atlas_v2.person_representative_domains(representative_domain, person_id);

create table if not exists atlas_v2.person_representative_domain_audits (
  id bigserial primary key,
  request_id text not null,
  person_id uuid not null references atlas_v2.persons(id) on delete cascade,
  before_domain text,
  after_domain text,
  changed_at timestamptz not null default now(),
  constraint person_representative_domain_audits_before_check check (
    before_domain is null or before_domain in (
      'ruler', 'military', 'science', 'technology',
      'commerce', 'culture', 'religion', 'exploration'
    )
  ),
  constraint person_representative_domain_audits_after_check check (
    after_domain is null or after_domain in (
      'ruler', 'military', 'science', 'technology',
      'commerce', 'culture', 'religion', 'exploration'
    )
  )
);

create index if not exists person_representative_domain_audits_person_idx
  on atlas_v2.person_representative_domain_audits(person_id, changed_at desc, id desc);

comment on table atlas_v2.person_representative_domains is
  'Single editorial representative field for Person visualization. Exactly zero or one domain per person; colors are UI tokens, never stored here.';

comment on column atlas_v2.person_representative_domains.representative_domain is
  'Controlled values: ruler, military, science, technology, commerce, culture, religion, exploration.';
