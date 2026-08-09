# Phase 8C C4D — Optional Role Runtime Support

Status: IMPLEMENTED / DO NOT MERGE BEFORE PROTECTED DATABASE APPLY PASS

## Runtime contract

After the C4D database contract is live, `role` follows the Phase 8B application contract as a true optional value.

- non-null role: exact reviewed vocabulary resolution remains mandatory
- null or blank role: normalized to SQL NULL; no role vocabulary lookup is issued
- no synthetic `unspecified` role
- no fuzzy role inference
- explicit null survives legacy mirror, normalized write, compatibility projection, exact preimage resolution, and parity comparison

## Planner

The planner no longer emits `ROLE_REQUIRED_BY_CURRENT_V2_SCHEMA`.

`RESOLVE_ROLE_EXACT` is emitted only when normalized `role` is non-null. `role_id` is an optional dependency of the relationship upsert; person, polity and period basis remain mandatory exact dependencies.

## Transaction adapter

Normalized create/import/update accepts `role_id = NULL`.

Exact preimage resolution uses a LEFT JOIN to roles and branches explicitly:

- input role NULL -> `pp.role_id IS NULL`
- input role non-null -> exact match against reviewed role code/source label/role alias

Parity also uses LEFT JOIN so SQL NULL is compared as absence rather than being dropped from the result set.

Existing Phase 5 provenance (`legacy_source_key`, `source_locator`, `content_hash`) remains unchanged during updates, including role -> null and null -> role transitions.

## Test coverage

Focused tests cover:

- explicit null role planning
- blank role normalization to null
- mixed-role import planning
- null-role create with legacy/v2 parity
- null-role exact preimage update to reviewed role
- reviewed role explicit clearing to null
- mixed-role import row-state isolation
- existing transaction rollback/parity/provenance tests

## Merge gate

This runtime PR must remain draft until `Phase 8C C4D Optional Role Contract` protected live apply passes against the exact approved database-contract SHA. The database must be compatible first; runtime must not begin accepting null roles against a `NOT NULL` live schema.
