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
