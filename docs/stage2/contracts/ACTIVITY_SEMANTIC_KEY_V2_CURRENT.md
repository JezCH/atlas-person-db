# ATLAS Activity Semantic Key v2 — Current Contract

> Status: BASELINE-INDEPENDENT CUTOVER CONTRACT / NO PRODUCTION MUTATION

A Stage 2-ready Person–Polity Activity is uniquely identified by:

```text
Person UUID
+ Polity UUID
+ Relation Type UUID
+ Role UUID / NULL
+ Period Basis UUID
+ interpreted start boundary
+ interpreted end boundary
```

Each interpreted boundary includes year, applicable month/day, granularity, and calendar.

Not identity:

- certainty/confidence
- chronology status
- notes/descriptions
- source links/locators
- display/canonical names
- content hash.

Relation Type has no generic default. Historically unresolved Relation means the row is not v2-key-ready; uncertainty is preserved instead of guessed.

The legacy `person_politics_v2_null_role_semantic_uidx` predates Relation Type and sub-year boundaries. It must be replaced, not stacked underneath the v2 rule, during the same coherent P9 semantic cutover.

The P9 cutover must align all active identity consumers together:

- database uniqueness/indexes
- planner/request normalization
- authoritative PostgreSQL transaction
- admin/import matching
- GitHub authoring replay
- correction collision checks
- Activity duplicate comparison
- Phase 9 relationship reconciliation and Person merge.

A database-v2/application-v1 split brain is forbidden.

P5 may add nullable Stage 2 fields without changing active v1 identity. P7 performs reviewed corrections/backfill. P8 requires zero known semantic blockers. Only P9 promotes this contract to active identity authority.

Hashes remain evidence/idempotency aids, never identity authority.

This contract is baseline-independent. Actual Activity UUID bindings and uniqueness preflight are regenerated from Baseline A.