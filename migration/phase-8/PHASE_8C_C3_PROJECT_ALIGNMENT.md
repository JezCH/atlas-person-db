# Phase 8C C3 — Project Alignment and Activation Boundary

Status: IMPLEMENTATION ALIGNED / PRODUCTION DUAL-WRITE NOT YET ACTIVATED

## Project objective

ATLAS is not a permanent Person-table CRUD application. The target is a long-lived historical authoring system where Person, Polity, Place, Event, Source, Timeline, Geometry and later domain objects are managed as normalized objects and relationships.

The current Phase 8 migration is successful only if it removes the transitional `public.person_politics` architecture without replacing it with another Person-specific dead end.

## Alignment findings

The current server mutation path is directionally correct because it establishes a server-side trust boundary and one transaction domain instead of teaching browser code to mutate normalized tables directly.

However, the implementation is still transitional in three important ways:

1. the public mutation contract is currently Person/Polity activity-oriented (`create`, `update`, `delete`, `import`);
2. temporary dual-write still contains legacy `public.person_politics` SQL by design;
3. canonical reconciliation has not yet converged on the same server transaction service.

These are acceptable only as Phase 8 migration constraints. They must not become the permanent ATLAS domain architecture.

## Required durable boundary

The durable layering is:

```text
Authoring clients
  -> authenticated mutation transport
      -> domain mutation service
          -> deterministic command planning
          -> exact reviewed identity resolution
          -> transactional persistence adapter
              -> normalized atlas_v2 objects/relationships
```

During C3 only, the transactional persistence adapter may additionally mirror the equivalent legacy activity mutation and verify parity inside the same transaction.

## Rules for the remaining Phase 8 work

1. Browser/app/admin code must not learn normalized table SQL or database credentials.
2. All production mutations must converge on the same server-side transaction service.
3. Reconciliation must be converted to this same service before legacy retirement.
4. Temporary legacy dual-write SQL belongs only in the transitional persistence adapter and must be deleted after v2-only promotion.
5. Person-specific request shapes may remain during migration, but the service boundary must remain extensible to future domain commands rather than exposing table CRUD as the public architecture.
6. Data-quality systems such as duplicate candidate review belong above the normalized identity model; they must not be embedded into migration SQL or automatic fuzzy merges.
7. Source/provenance and confidence must remain compatible with the eventual Authoring research pipeline. Historical accuracy is more important than forcing completeness.
8. Runtime-facing projections must be derived from normalized authoring data. Runtime convenience must not reshape the canonical authoring model.

## C3 completion criteria

C3 is complete when all of the following are true:

- deployable server mutation API exists;
- authentication/token boundary exists;
- PostgreSQL connection secret remains server-only;
- legacy + v2 mutation executes under one shared transaction;
- parity mismatch rolls back both sides;
- create/update/delete/import are verified against the live schema under protected execution;
- the browser is not yet switched until the protected live test succeeds;
- reconciliation convergence has a defined implementation path and is not forked into a separate v2 writer.

## Next implementation unit

Do not add more architectural layers before proving the current server path against the live database.

The next unit is one protected exact-SHA live smoke against the deployed/server mutation path using a synthetic or safely reversible mutation. It must verify:

- request authentication;
- one transaction boundary;
- one legacy mutation and one normalized mutation;
- parity match;
- forced rollback or deterministic cleanup leaving zero test residue;
- no production browser activation.

If this passes, C3 may proceed directly to bounded production dual-write activation rather than adding more duplicate preflight gates.

## Final Phase 8 direction

After C3:

1. converge reconciliation on the same mutation service;
2. run a bounded dual-write observation period;
3. promote writes to v2-only;
4. promote reads to direct normalized contracts;
5. prove runtime legacy dependency count = 0;
6. delete transitional legacy runtime code and workflows;
7. retire compatibility/legacy database objects under explicit destructive approval.

The end state is a clean normalized Authoring foundation suitable for the wider ATLAS system, not a permanently dual-written Person DB.
