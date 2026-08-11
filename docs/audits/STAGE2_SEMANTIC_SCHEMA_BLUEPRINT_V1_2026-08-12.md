# ATLAS Stage 2 Semantic Schema Blueprint v1

> Status: **NON-PRODUCTION BLUEPRINT / REHEARSAL ONLY**
>
> Production DB mutation: **none**
>
> This document translates the reviewed Stage 2 domain contracts into a normalized schema direction without authorizing a Production migration or any historical backfill.

## 1. Inputs already validated

This blueprint depends on the preceding audit contracts:

1. Person–Polity relation semantics: `rules / governs / serves / active_in / opposes / claims_rule`;
2. Governance Context as a shared Polity+time object rather than a mandatory Activity string;
3. temporal Polity-to-Polity hierarchy, separate from Territory control and identity succession;
4. stable Polity identity separated from temporal designation/state-form and diachronic transitions;
5. BCE-safe shared temporal boundary precision;
6. Territory semantics remain in the map/territory domain and are joined through stable Polity identity.

The current normalized v2 core remains authoritative. This is an extension, not a rewrite.

## 2. Current tables that remain

Keep the existing identity and provenance core:

```text
persons
person_names
polities
polity_names
roles
role_names
period_bases
person_politics_v2
sources
person_politics_sources
...
```

Do not replace UUID identities with names or natural-language labels.

## 3. Person–Polity relation vocabulary

Add an extensible vocabulary table rather than a hard SQL enum:

```text
person_polity_relation_types
- id UUID PK
- code UNIQUE
- category
- is_active
```

Initial reviewed codes:

```text
rules
governs
serves
active_in
opposes
claims_rule
```

Add to Activity:

```text
person_politics_v2.relation_type_id -> person_polity_relation_types.id
```

### Transition rule

The column is nullable during migration rehearsal/backfill only.

The end-state Authoring contract should require it for new reviewed Activities. Existing data must be source/review backfilled; no default `active_in`, `serves`, or `rules` is allowed.

## 4. Activity temporal extension

Do not drop the current signed year columns during the first migration.

Add optional boundary detail:

```text
activity_start_month
activity_start_day
activity_start_granularity
activity_start_certainty
activity_start_calendar

activity_end_month
activity_end_day
activity_end_granularity
activity_end_certainty
activity_end_calendar
```

Current `activity_start` / `activity_end` remain the historical year components during transition.

Existing rows backfill logically as:

```text
month/day = NULL
granularity = year
```

No Jan 1 / Dec 31 fabrication.

## 5. Future Activity semantic identity

Current semantic identity is:

```text
Person + Polity + Start year + End year + Role(nullable) + Period basis
```

End-state identity should be:

```text
Person
+ Polity
+ Relation Type
+ Role(nullable)
+ Period basis
+ normalized Start boundary
+ normalized End boundary
```

This prevents collisions between:

- two different Person–Polity relations with otherwise identical fields;
- distinct office terms inside the same calendar year.

Do **not** replace the current unique/index contract until every Activity has an audited Relation Type and temporal backfill has been proven.

## 6. Governance Context

Add normalized shared identities:

```text
governance_contexts
- id UUID PK
- canonical_key UNIQUE
- governance_type
- historicity

governance_context_names
- id UUID PK
- governance_context_id FK
- locale
- name
- name_type
- is_preferred
```

Initial `governance_type` values:

```text
government
constitutional_regime
governing_regime
```

Add temporal link:

```text
polity_governance_periods
- id UUID PK
- polity_id FK
- governance_context_id FK
- start boundary
- end boundary
- confidence
- notes
```

Do not add a mandatory Governance FK to every Activity.

An optional direct Activity-to-Governance link may be added later only if reviewed layered systems require disambiguating overlapping governance structures.

## 7. Polity-to-Polity structural relations

Vocabulary:

```text
polity_relation_types
- id UUID PK
- code UNIQUE
- category
- inverse_relation_type_id nullable self-FK
- is_active
```

Candidate codes are data-driven, not all mandatory seeds:

```text
constituent_of
dominion_of
colonial_dependency_of
vassal_of
tributary_to
protectorate_of
member_of_confederation
```

Temporal relation:

```text
polity_relations
- id UUID PK
- subject_polity_id FK
- object_polity_id FK
- relation_type_id FK
- start boundary
- end boundary
- confidence
- notes
```

Constraints:

- subject and object cannot be identical;
- store one canonical direction only;
- inverse display/query meaning is derived from relation vocabulary;
- cycle rules must be relation-type aware, not a blanket graph prohibition.

`successor_of`, territorial occupation, and personal-union inference do not belong here by default.

## 8. Temporal Polity designation/state-form

Add an object for historically useful temporal labels that do not necessarily create a new Polity identity:

```text
polity_designations
- id UUID PK
- polity_id FK
- designation_type
- start boundary
- end boundary
- confidence
- notes

polity_designation_names
- id UUID PK
- polity_designation_id FK
- locale
- name
- is_preferred
```

Candidate designation types:

```text
official_name
state_form
historiographic_period
conventional_temporal_label
```

This is the target mechanism for reviewed cases such as temporal state-form or historiographic labels when continuity research chooses one stable Polity UUID.

## 9. Diachronic Polity identity relations

Distinct Polities may still need explicit historical transitions:

```text
polity_identity_relation_types
- id UUID PK
- code UNIQUE
- is_active

polity_identity_relations
- id UUID PK
- predecessor_polity_id FK
- successor_polity_id FK
- relation_type_id FK
- transition boundary
- confidence
- notes
```

Candidate codes are added only when reviewed history needs them:

```text
succeeds
secedes_from
formed_by_union_of
splits_from
annexed_into
```

If research concludes one continuous Polity, prefer one UUID + designation history instead of creating two UUIDs just to connect them with `continues_as`.

## 10. Source/provenance requirement

The rehearsal schema focuses on identity, foreign keys, temporal shape, and constraints.

**Production migration is blocked** until each new assertion family has a normalized provenance path comparable to existing `person_politics_sources`.

Expected future joins include:

```text
polity_governance_period_sources
polity_relation_sources
polity_designation_sources
polity_identity_relation_sources
```

Do not ship these historical assertions with only free-text notes as provenance.

## 11. Territory is intentionally not added to this DB rehearsal

Territory belongs to the map/geometry authoring domain and has its own proposed contract:

```text
Polity UUID
+ temporal interval
+ control_type
+ boundary_certainty
+ evidence_confidence
+ geometry/source assertions
```

The repositories should converge on the same Polity UUID, but adding geometry/PostGIS to `atlas-person-db` now would exceed the current proven use case.

## 12. Migration sequence

Recommended future Production sequence:

### S0 — historical decisions / backfill ledger

- finish remaining Relation review cases;
- resolve priority Polity continuity cases;
- resolve Japan/layered-authority targets;
- prepare exact UUID-bound backfill manifests.

### S1 — additive schema

- relation vocabulary + nullable Activity FK;
- temporal detail columns;
- Governance tables;
- Polity structural relation tables;
- designation/identity-relation tables;
- provenance tables.

No existing semantic key is removed yet.

### S2 — reviewed backfill

- backfill existing year granularity;
- backfill Relation Type from reviewed ledger;
- insert approved governance/Polity relation/designation identities;
- no guessed values.

### S3 — semantic-key cutover

- update planner/authoring/read/hash/replay/merge semantics;
- create final uniqueness contract using Relation Type + full temporal boundary;
- prove duplicate/merge behavior;
- only then retire obsolete identity indexes/contracts.

### S4 — enforcement

- require Relation Type for new Activities;
- require normalized temporal granularity fields according to the final contract;
- update clean-schema baseline;
- Production smoke and exact-SHA verification.

## 13. Why one giant migration is rejected

A single schema+backfill+semantic-key rewrite would combine:

- structural DDL;
- historical interpretation;
- UUID relinking;
- duplicate identity changes;
- API contract changes.

That would make rollback and forensic verification unnecessarily difficult.

The migration must be additive first, source-reviewed second, semantic-key cutover last.

## 14. Rehearsal acceptance

The non-production SQL rehearsal must prove on fresh PostgreSQL that:

- all proposed tables and FKs coexist with current v2;
- historical year 0 remains invalid;
- optional month/day constraints are coherent;
- self Polity relations are rejected;
- governance/designation preferred-name uniqueness can be enforced;
- no legacy `public.person_politics` object is recreated;
- current core tests and baseline schema verification remain green.

Passing rehearsal is **not** authorization to migrate Production.
