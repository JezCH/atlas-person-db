# Phase 8C C3 — Architecture Gate for Production Dual-Write

Status: READY FOR IMPLEMENTATION / PRODUCTION DUAL-WRITE NOT YET ACTIVATED

## Purpose

Define the only acceptable production activation shape for temporary dual-write before any live mutation path is changed.

## Architectural finding

The browser application currently owns a Supabase client and the legacy `public.person_politics` adapter. The normalized v2 writer, however, is intentionally implemented around a PostgreSQL transaction boundary and exact canonical resolution. These are different trust and transaction domains.

Therefore production dual-write MUST NOT be implemented by loading the PostgreSQL transaction adapter, database credentials, or normalized table mutation logic into `index.html`, `admin.html`, or browser JavaScript.

The temporary dual-write route must be a server-side controlled transaction boundary. Browser code may submit a validated mutation request, but it must not receive privileged database credentials or manipulate normalized tables directly.

## Required production shape

```text
Browser app/admin
  -> public mutation API / server-side handler
      -> validate request and deterministic request_id
      -> resolve exact reviewed canonical identities
      -> transaction boundary
          -> legacy mutation (temporary C3 only)
          -> normalized v2 mutation
          -> parity verification payload
      -> commit both or rollback transaction when possible
      -> return one structured outcome
```

Reconciliation must converge on the same server-side v2 mutation boundary rather than grow a second independent normalized writer.

## Non-negotiable invariants

1. No PostgreSQL connection string or service-role secret in browser assets.
2. No direct browser mutation of `atlas_v2.*`.
3. One normalized mutation implementation is shared by app, admin, import, and reconciliation.
4. Production dual-write must not use the existing browser coordinator as a two-transaction best-effort mechanism. The current `atlas-dual-write-coordinator.js` is orchestration evidence and must not become the final transactional boundary.
5. A legacy-success / v2-failure outcome must never be silently reported as success.
6. Exact canonical identity resolution remains fail-closed; fuzzy identity inference is not added to the write path.
7. Dual-write remains temporary. The target architecture is v2-only write and direct normalized read.

## Why the current coordinator is not sufficient for production activation

The current coordinator executes the existing legacy adapter first and the v2 writer second. Those writes do not share one database transaction. It can correctly expose `rollback_required`, but it cannot itself atomically undo an already committed legacy browser write if the v2 transaction fails.

That behavior is acceptable as a bounded integration seam and test oracle, but not as the final production dual-write boundary.

## Next implementation unit

Implement one server-side mutation service contract and transport boundary that can host the existing normalized planner/executor semantics without exposing database credentials to the browser.

The first implementation must remain non-activated in production and must prove:

- create/update/delete/import request validation;
- deterministic idempotency key propagation;
- exact canonical resolution;
- one transaction-controlled normalized mutation boundary;
- explicit legacy/v2 parity result structure;
- no browser secret or direct `atlas_v2` mutation.

Do not add another independent v2 writer and do not fork reconciliation logic.