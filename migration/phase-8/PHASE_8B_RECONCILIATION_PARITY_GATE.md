# Phase 8B — Reconciliation Parity Gate

Status: PLANNED / NON-ACTIVE

## Objective

Perform one bounded parity gate between the current legacy reconciliation semantics in `ingest.js` and the unloaded pure planner in `atlas-reconciliation-planner.js`.

This gate exists to prevent a later source switch from changing reconciliation outcomes. It is intentionally narrow and is not a general re-audit of Phase 8A/8B.

## Scope limit

Only the following are in scope:

1. current `ingest.js` reconciliation decisions
2. pure planner decisions for the same deterministic fixtures
3. exact comparison of insert/update/delete/duplicate-removal outcomes
4. proof that the planner remains non-mutating and unloaded

Out of scope:

- another repository-wide dependency inventory
- another database privilege/RLS inventory
- another reader parity audit
- production source changes
- DB writes or schema changes
- duplicate heuristics
- v2 write activation

## Legacy semantic model to preserve

For each existing legacy row, current `ingest.js` effectively applies this order:

1. normalize record and calculate exact activity key
2. if the person is managed and the exact key is absent from canonical, delete
3. or if the key is explicitly obsolete, delete
4. if no canonical target exists, leave unchanged
5. if an exact canonical key was already retained, delete as duplicate
6. otherwise retain the key and update fields if they differ
7. after scanning existing rows, insert every canonical record whose key was not retained

The parity test must compare decisions, not implementation text.

## Minimal required fixtures

One deterministic suite is sufficient if it covers all semantic branches:

- exact unchanged row
- field-difference update
- missing canonical row insert
- managed row absent from canonical delete
- obsolete-key delete
- exact duplicate removal
- unmanaged non-canonical row unchanged
- invalid/unresolved row is reported by the planner and not silently mutated

## Acceptance criteria

The gate passes only when:

- legacy-model and planner decision sets are identical for every valid legacy semantic branch
- any intentional safety divergence is explicit and limited to invalid/unresolved records
- planner reports `commit: false`
- planner reports `database_writes: 0`
- `index.html` and `admin.html` still do not load the planner
- no production or database mutation occurs

## Stop rule

If the deterministic parity suite passes, Phase 8B does not need repeated parity runs for the same source SHA. Move to the next implementation step.

Repeat this gate only if `ingest.js` or `atlas-reconciliation-planner.js` changes materially.

## Gate boundary

Passing this gate authorizes planning for a disabled reconciliation controller. It does not authorize removing or replacing `ingest.js`, changing page-load behavior, or committing any v2 write.
