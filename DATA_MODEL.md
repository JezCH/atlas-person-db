# ATLAS Person Activity Model

## Current authoritative model

The production relationship model is normalized and lives under the `atlas_v2` schema.

Core runtime entities include:

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

`person_politics_v2 + person_names + polity_names + roles/role_names + period_bases`

Canonical English identity values and Korean display values are separate. The browser receives normalized relationship UUIDs and Korean display fields while canonical values remain available for stable internal identity/search/export behavior.

## Write model

Production create/update/delete/import operations use the v2-authoritative PostgreSQL transaction path only.

- create/import records receive normalized UUIDs and runtime provenance
- update/delete address the normalized relationship UUID directly
- duplicate introduction fails closed
- exact request/provenance semantics are retained for replay/idempotency where supported

## Phase 9 duplicate-review and merge domain

The administrator duplicate domain contains:

- `atlas_v2.person_duplicate_candidates`
- `atlas_v2.person_duplicate_reviews`
- `atlas_v2.person_merge_audits`

Candidates are deterministic evidence-bearing suggestions between two normalized person UUIDs. They are never identity keys or automatic merge instructions. Administrator decisions are `MERGE`, `KEEP_SEPARATE`, or `REVIEW`; each decision is appended to the review audit table.

The candidate evidence fingerprint covers the complete canonical evidence set, including name evidence and chronology/polity context. If the live person state changes after approval, the merge executor recomputes the detector evidence inside the merge transaction and rejects stale approval.

A `MERGE` decision is approval only. Actual person merge requires a second explicit action that selects the survivor UUID. Execution uses a single PostgreSQL `SERIALIZABLE` transaction with candidate/person locks, request idempotency, live evidence verification and runtime FK-drift checks.

### Relationship reconciliation during person merge

When the two persons contain activity rows with the same polity, period basis, start year and end year, those rows form an explicit relationship-reconciliation group. No default resolution is chosen.

The administrator must choose one of:

- `KEEP_DISTINCT_ROLES`: retain the distinct role rows. If the group contains multiple rows with the same role, the administrator must explicitly select exactly one representative for each duplicated role.
- `KEEP_ONE_RELATIONSHIP`: explicitly select one relationship UUID to retain and coalesce the other rows in that context into it.

Before a redundant relationship UUID is removed, its dependent provenance and descriptive records are preserved:

- `person_politics_sources` links are transferred; identical source+locator links collapse deterministically, while the same source with different locator keys fails closed.
- `chronology_claims` are repointed to the retained relationship.
- `relationship_descriptions` are repointed to the retained relationship.

The full pre-merge state of both persons and the requested/applied relationship-resolution plan are stored in `person_merge_audits`. Remaining relationship UUIDs are preserved and only their `person_id` is remapped. The source person is deleted last.

## Retired legacy model

`public.person_politics` and `public.atlas_person_politics_compat_v1` were retired after the completed Phase 8C migration. Neither object is a valid runtime or bootstrap dependency. Historical migration evidence may still mention them as audit history only.
