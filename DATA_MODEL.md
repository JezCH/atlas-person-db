# ATLAS Person Activity Model

## Current authoritative model

The production relationship model is normalized and lives under the `atlas_v2` schema.

Core entities used by the current runtime include:

- `atlas_v2.persons`
- `atlas_v2.person_names`
- `atlas_v2.polities`
- `atlas_v2.polity_names`
- `atlas_v2.roles`
- `atlas_v2.role_names`
- `atlas_v2.period_bases`
- `atlas_v2.person_politics_v2`

`atlas_v2.person_politics_v2` is the authoritative person–polity activity relationship table. Each row has its own normalized UUID and links normalized person/polity identities plus chronology, optional role, period basis, notes, confidence/chronology metadata and provenance.

## Identity

Person and polity identity is UUID-based. Human-readable names are resolved through normalized name tables; names are not primary identity keys.

The runtime uses exact resolution and fails closed when an identity is unresolved or ambiguous. Fuzzy similarity is not an automatic write/merge rule.

## Activity relationship semantics

A person may have multiple activity rows. Multiple rows are valid when they represent distinct reigns, terms, political entities, military periods, intellectual periods, or other historically separate activity intervals.

The relationship identity used for new semantic-duplicate prevention is based on the resolved normalized person, polity, chronology, nullable role and period basis. Existing historical duplicate cases are not silently merged by runtime code.

`role_id` is nullable. A missing role is stored as SQL `NULL`; no synthetic `unspecified` role is created.

## Read projection

Production reads are assembled directly from normalized tables by the server read service:

`person_politics_v2 + person_names + polity_names + roles + period_bases`

The browser receives the familiar projection fields (`id`, person name, polity name, start/end year, role, period basis, notes), but the returned `id` is the normalized relationship UUID.

## Write model

Production create/update/delete/import operations use the v2-authoritative PostgreSQL transaction path only.

- create/import records receive normalized UUIDs and runtime provenance
- update/delete address the normalized relationship UUID directly
- duplicate introduction fails closed
- exact request/provenance semantics are retained for replay/idempotency where supported

## Retired legacy model

`public.person_politics` was the original MVP activity table and is no longer an application model. `public.atlas_person_politics_compat_v1` was a temporary compatibility projection during migration.

Neither object is a valid runtime dependency. C9 is the final database-object retirement stage for those two transitional objects.

Historical Phase 6–8 migration documents and evidence may still mention the retired names; those files are audit/history material, not current architecture.
