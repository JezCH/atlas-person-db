# Phase 8C C9 — Legacy DB Object Retirement

Status: PREPARATION / LIVE READ-ONLY INVENTORY REQUIRED

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

## C9A — live read-only dependency inventory

Before any DROP statement is prepared for execution, the protected inventory must run on the exact current `main` SHA and prove:

- legacy table exists as a table
- compatibility object exists as a view
- normalized relationship table exists
- every legacy semantic row is represented in the direct normalized projection
- compatibility projection is exactly identical to the direct normalized projection
- compatibility row count equals normalized relationship row count
- no other view/matview depends on either retirement target
- no registered function depends on either target
- no stored function/procedure body text still references either target
- no other view definition still references either target
- no inbound foreign key references the legacy table
- current triggers, publications, RLS policies and grants are recorded
- compatibility view definition no longer reads the legacy table

The inventory performs no mutation and reports `destructive_action_performed: false`.

## C9B — destructive retirement bundle

Only after C9A returns `retirement_ready: true` may a separate retirement bundle be finalized. That bundle must:

- be pinned to the exact tested main SHA and C9A artifact evidence
- require an explicit destructive confirmation token
- acquire a PostgreSQL advisory transaction lock
- re-check the critical C9A invariants inside the same transaction immediately before deletion
- use **no `CASCADE`**
- drop compatibility view first
- drop legacy table second
- verify both targets are absent and normalized objects/counts remain intact before commit
- emit an apply artifact with the pre/post state

If any dependency appears between C9A and execution, the transaction must fail closed.

## Rollback reality

A DROP cannot be treated like a normal application rollback after the transaction commits. Therefore C9 safety is based on:

- retained normalized authoritative data
- exact pre-retirement Git/migration evidence
- protected precondition checks
- transactional DDL before commit
- no CASCADE
- explicit destructive approval

The old legacy table is not to be recreated automatically after a successful C9 commit.

## Authorization boundary

This preparation authorizes only the read-only C9A inventory. It does not authorize C9B DROP execution. A successful inventory will be reviewed and its artifact digest pinned before the destructive workflow is created/finalized and run.
