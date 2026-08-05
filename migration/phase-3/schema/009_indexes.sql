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
