# Target Model

## Core entities

- `persons`: language-neutral person identity.
- `person_names`: localized, original, historical, and alias names.
- `polities`: language-neutral polity identity.
- `polity_names`: localized, historical, and alternate polity names.
- `person_politics_v2`: person–polity activity relationships.

## Controlled vocabularies

- `roles` and `role_names`
- `period_bases` and `period_basis_names`

The original eight `period_basis` codes remain valid and seedable:

`reign`, `term`, `de_facto_rule`, `military_activity`, `religious_activity`, `intellectual_activity`, `artistic_activity`, `general_activity`.

## Chronology

`chronology_claims` stores sourced, approximate, conflicting, legendary, or alternative date claims without overwriting the preferred relationship interval.

## Descriptions

Descriptions are separated by entity type so PostgreSQL foreign keys can enforce integrity:

- `person_descriptions`
- `polity_descriptions`
- `relationship_descriptions`

## Provenance

- `sources`
- `person_sources`
- `polity_sources`
- `person_politics_sources`
- `chronology_claim_sources`

## Referential actions

- names and descriptions cascade when their owning entity is intentionally removed;
- relationships restrict deletion of referenced people, polities, roles, and period bases;
- provenance links cascade from the relationship or entity but restrict deletion of a referenced source;
- vocabulary records referenced by relationships cannot be deleted.

## Locale policy

Locale tags use normalized BCP 47-style text values. Runtime fallback is defined for later phases as exact locale → base language → English → canonical key. Phase 3 only stores the necessary data and constraints.

## Legacy preservation

Every accepted legacy relationship must retain a unique `legacy_source_key`. Original timestamps and source location are preserved through provenance metadata in Phase 4.
