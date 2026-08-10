# Phase 8C C9 — Legacy DB Object Retirement

Status: C9A LIVE INVENTORY PASS / C9B BUNDLE PREPARED / DESTRUCTIVE EXECUTION NOT YET AUTHORIZED

## Objective

Retire the final transitional database objects only after the application has already reached:

- v2-authoritative / v2-only writes
- direct normalized reads
- zero reachable legacy runtime

C9 is the first destructive stage. Code/runtime retirement in C7/C8 does **not** authorize database object deletion.

## Objects in scope

Retirement targets, in mandatory order:

1. `public.atlas_person_politics_compat_v1`
2. `public.person_politics`

Normalized `atlas_v2` objects are not retirement targets.

## C9A — completed live read-only dependency inventory

Protected live inventory passed on exact main SHA:

- SHA: `17f6af54fcb01a884e44b55c4e1ac2cad9d23faa`
- workflow run: `31362547973`
- artifact id: `9052889263`
- artifact digest: `sha256:3c31babe79115cf7f96b62eab1ea2ab5238ba5287beeb07386c65bb237c481a4`

Verified live state:

- legacy rows: 319
- compatibility rows: 349
- normalized rows: 349
- direct normalized projection rows: 349
- legacy semantic rows missing from v2: 0
- compatibility rows missing from direct projection: 0
- direct projection rows missing from compatibility: 0
- legacy relation dependents: 0
- compatibility relation dependents: 0
- legacy/compatibility function dependents: 0
- textual stored function/procedure references: 0
- textual view references: 0
- foreign keys / inbound legacy foreign keys: 0
- publication membership: 0
- blockers: none
- `retirement_ready: true`
- `destructive_action_performed: false`

The legacy table retains its own `trg_person_politics_updated_at` trigger. This is an internal table trigger, not an external dependency, and disappears with the table.

## C9B — destructive retirement bundle

The C9B bundle is pinned to the C9A evidence above. It is designed to fail closed unless the execution-time live state still satisfies all retirement invariants.

Before any DROP, the protected workflow must:

- run only by `workflow_dispatch` on `main`
- require exact current main SHA
- require explicit token `PHASE8C_C9_RETIRE_LEGACY_DB_OBJECTS`
- prove the deployed repository still has `ZERO_REACHABLE_LEGACY_RUNTIME`
- verify the exact C9A SHA/run/artifact/digest pin
- open a PostgreSQL SERIALIZABLE transaction
- acquire an advisory transaction lock
- acquire an ACCESS EXCLUSIVE lock on `public.person_politics`
- acquire a SHARE lock on `atlas_v2.person_politics_v2`
- re-check legacy count remains 319
- re-check every legacy semantic row remains covered by v2
- re-check compatibility/direct normalized projections remain identical
- re-check no relation/function/textual/FK/publication blocker appeared
- save a full `public.person_politics` JSON snapshot to the protected evidence artifact before DROP

Only after all checks pass may it execute, with **no `CASCADE`**:

1. `DROP VIEW public.atlas_person_politics_compat_v1`
2. `DROP TABLE public.person_politics`

Before COMMIT it must verify:

- compatibility object absent
- legacy table absent
- normalized relationship table still present
- normalized row count unchanged inside the retirement transaction

Any error after BEGIN triggers ROLLBACK. The old legacy table is not automatically recreated after a successful committed retirement.

## Evidence after C9B

A successful protected C9B run must retain:

- pre-drop dependency/coverage report
- legacy row snapshot
- post-drop object/count report
- final committed report
- exact main SHA
- pinned C9A evidence identifiers
- artifact digest

## Authorization boundary

C9A completion and this prepared C9B code **do not themselves authorize the DROP**.

Actual C9B execution requires a separate explicit destructive authorization from the user, followed by a manual protected workflow dispatch on the exact then-current main SHA.
