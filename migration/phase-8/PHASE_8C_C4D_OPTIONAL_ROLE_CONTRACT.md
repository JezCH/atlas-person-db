# Phase 8C C4D — Optional Role Database Contract

Status: PREPARED / PROTECTED LIVE APPLY REQUIRED

## Why this exists

The Phase 8B application write contract explicitly defines `role` and `notes` as optional fields and requires explicit nulls to be preserved. The live normalized schema currently contradicts that contract because `atlas_v2.person_politics_v2.role_id` is `NOT NULL`.

The contradiction must be resolved before C5 v2-only promotion. It must not be hidden with a synthetic `unspecified` role because the reviewed role vocabulary contains historical role labels only and no such semantic role exists.

## Database change

The protected apply performs one bounded contract change:

1. `role_id` becomes nullable.
2. A `NULLS NOT DISTINCT` semantic unique index preserves duplicate protection when role is null.
3. `public.atlas_person_politics_compat_v1` changes the roles join from INNER JOIN to LEFT JOIN so a normalized null-role row remains visible with `role = NULL`.
4. Existing compatibility SELECT grants are preserved.

No existing relationship row is modified or deleted. The apply requires zero pre-existing null-role normalized rows and requires compatibility row count to equal normalized relationship row count before and after the change.

## Protected live probe

The same protected workflow performs a real database probe after the schema change:

- one temporary legacy activity with `role = NULL`
- one corresponding normalized activity with `role_id = NULL`
- compatibility projection must contain the normalized row
- compatibility `role` must remain SQL NULL
- the probe transaction is rolled back
- post-probe residue must be zero on both legacy and normalized tables

This avoids a separate redundant smoke gate while still proving the actual live null-role storage/read semantics.

## Rollback

A separate rollback SQL is retained but never runs automatically. It refuses to restore `role_id NOT NULL` if any real normalized null-role row exists. This prevents a later rollback from silently discarding or coercing legitimate optional-role data.

## Runtime sequencing

This database-contract package must be merged and applied before runtime planner/executor support is activated. Until the protected apply passes, the current server planner continues to fail closed on null role.

After live apply PASS:

- remove `ROLE_REQUIRED_BY_CURRENT_V2_SCHEMA`
- omit role vocabulary resolution when role is null
- allow normalized insert/update with `role_id = NULL`
- make exact preimage resolution and parity null-role aware
- retain exact role resolution for non-null roles
- retain no-fuzzy and no-synthetic-vocabulary rules

C4C production server-write activation PR #67 remains separately gated on the Vercel Production `ATLAS_ADMIN_PASSWORD` prerequisite.
