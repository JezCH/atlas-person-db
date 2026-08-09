# Phase 8C C4 — Reconciliation Convergence

Status: IMPLEMENTED / PENDING PR VERIFICATION

## Objective

Remove canonical reconciliation from the browser-owned legacy commit path and converge reconciliation onto the same authenticated server mutation service and shared PostgreSQL transaction boundary established in C3.

## Runtime change

Production browser bootstrap now runs reconciliation in `dry-run` only. It may read the current legacy projection to produce a deterministic proposal report, but it performs zero insert/update/delete mutations during ordinary page load.

The old browser legacy reconciliation executor remains as transitional code for later cleanup, but it is no longer selected by production bootstrap.

## Server convergence

`atlas-v2-command-planner` now accepts the existing immutable Phase 8B reconciliation dry-run report and compiles it into deterministic child mutations in this order:

1. explicit deletes
2. exact duplicate removals
3. updates
4. inserts

Every child is compiled by the same C3 planner used for normal CRUD. Validation failures or any child blocker stop the reconciliation before transaction work.

`atlas-mutation-service` executes all reconciliation child mutations through the existing C3 `executeLegacy -> executeV2 -> parity` path inside one invocation of the shared transaction factory. Any child failure or parity mismatch aborts the whole reconciliation transaction.

No reconciliation-specific v2 SQL writer is introduced.

## Preserved boundaries

- no browser write to `atlas_v2`
- no browser PostgreSQL/service-role secret
- no fuzzy merge/delete logic
- no schema change
- no read-source promotion
- no v2-only promotion
- no legacy object deletion
- optional role remains blocked by the current normalized `role_id NOT NULL` contract and must be resolved before C5

## Verification

Focused tests cover deterministic reconciliation step compilation, validation fail-closed behavior, one shared transaction for all children, whole-operation failure on a child error, and browser dry-run-only activation.

After this PR passes, the next unit is bounded production dual-write activation/observation through the server boundary. Destructive retirement remains out of scope.
