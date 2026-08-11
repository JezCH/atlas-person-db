# ATLAS Stage 2 Semantic Schema Blueprint — Hardening v2

> Status: **NON-PRODUCTION REHEARSAL HARDENING**
>
> Production DB mutation: **none**
>
> Supersedes the temporal-shape details of `STAGE2_SEMANTIC_SCHEMA_BLUEPRINT_V1_2026-08-12.md`. The overall additive migration sequence remains unchanged.

## Problem found during cross-contract review

The v1 schema rehearsal correctly defined a shared BCE-safe temporal contract at the domain level, but the SQL implementation was not fully symmetric:

- `polity_governance_periods` carried year/month/day + granularity/certainty/calendar;
- Activity had optional sub-year detail;
- `polity_identity_relations` carried a precise transition boundary;
- **`polity_relations` and `polity_designations` still stored only years.**

That would create a second temporal exception immediately after defining a project-wide temporal contract.

The v1 Activity check also allowed a partially-populated detail tuple when `granularity` was NULL because the shape check treated NULL granularity as an unconditional pass.

These were blueprint/rehearsal defects only. No Production schema or data was affected.

## v2 decision

### 1. One shared immutable boundary-detail validator

The rehearsal now defines:

```text
atlas_v2.temporal_boundary_detail_valid(
  month,
  day,
  granularity,
  certainty,
  calendar
)
```

It validates one shared shape:

```text
year  -> month NULL, day NULL
month -> month present, day NULL
day   -> month present, day present
```

and the reviewed vocabularies:

```text
granularity: year | month | day
certainty: exact | approximate | uncertain
calendar: gregorian | julian | unspecified_historical | source_calendar
```

The function does not convert calendars or determine full chronological ordering. Those remain domain/application concerns because historical boundaries with different source calendars or uncertainty cannot be safely reduced to one naive SQL date comparison.

### 2. Activity transition detail is all-null or fully coherent

During additive migration, an old Activity may have no new detail fields at all.

Valid transition state:

```text
month/day/granularity/certainty/calendar = all NULL
```

or one fully-valid boundary-detail tuple.

Invalid transition state:

```text
granularity = NULL
month = 5
```

This prevents partial metadata from accumulating during backfill.

### 3. Governance periods use the same validator

No separate governance-only temporal rules remain.

### 4. Polity structural relations now support full precision

`polity_relations` now has full start/end detail:

```text
valid_from_year/month/day/granularity/certainty/calendar
valid_to_year/month/day/granularity/certainty/calendar
```

This is required for real dependency/constituency transitions that may occur within a year.

### 5. Polity designations now support full precision

`polity_designations` uses the same full interval shape, so a state form or official designation can begin/end at month/day precision without inventing a new Polity UUID.

### 6. Polity identity transitions use the same validator

The predecessor/successor transition boundary no longer has its own independent month/day check set.

### 7. Relation type cannot name itself as its inverse

The rehearsal now rejects:

```text
relation_type.inverse_relation_type_id = relation_type.id
```

This is a basic vocabulary integrity guard. More complex inverse-pair/cycle semantics remain a later data-contract concern.

## Rehearsal probes added

The fresh-PostgreSQL verifier now proves:

1. the shared boundary validator exists exactly once;
2. valid year-, month-, and day-precision shapes are accepted;
3. invalid shape combinations are rejected;
4. `polity_governance_periods`, `polity_relations`, and `polity_designations` all expose the same ten interval-detail columns;
5. a day-precise Polity structural relation can be inserted;
6. a month-precise Polity designation can be inserted;
7. self Polity relations remain rejected;
8. historical year 0 remains rejected;
9. no legacy `public.person_politics` object reappears.

## Production gate remains unchanged

This hardening does **not** make the blueprint Production-ready by itself.

Still blocked before Production migration:

- normalized source/provenance tables for each new assertion family;
- reviewed historical backfill;
- final Activity relation coverage on surviving rows;
- semantic-key/hash/replay/merge cutover;
- chronology comparison helpers for full compatible boundaries;
- migration rollback and exact Production deployment proof.

The key improvement is narrower: **the proposed schema now has one temporal language rather than four slightly different versions of time.**
