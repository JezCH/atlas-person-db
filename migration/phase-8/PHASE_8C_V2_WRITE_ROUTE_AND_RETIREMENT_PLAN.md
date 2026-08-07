# Phase 8C — Final V2 Write Route and Legacy Retirement Sequence

Status: READY FOR IMPLEMENTATION / NO LIVE V2 COMMIT AUTHORIZED BY THIS DOCUMENT

## Final objective

Complete the migration from the transitional legacy activity table to the normalized `atlas_v2` model, then remove legacy-format runtime code and objects only after zero-dependency proof.

The end state is not dual-write. Dual-write is a temporary verification state only.

## Current state at entry

- production reads: `v2-shadow` compatibility projection
- general app writes: `shadow-validate` through `AtlasWriteAdapter`
- administrator writes: `shadow-validate` through `AtlasWriteAdapter`
- actual commits: `public.person_politics` only
- v2 commits: `0`
- reconciliation commits: legacy executor only
- compiler: pure, non-committing v2 mutation intent generator
- rollback target: legacy remains available

## Target end state

Production runtime must reach all of the following before cleanup:

1. application reads directly from the approved normalized v2 read contract without legacy fallback;
2. general app writes commit only through the approved v2 write route;
3. administrator writes commit only through the approved v2 write route;
4. canonical reconciliation commits only through the approved v2 reconciliation route;
5. no runtime source imports, queries, mutations, or mode switches reference `public.person_politics`;
6. no runtime dependency remains on `public.atlas_person_politics_compat_v1`;
7. rollback/forward-recovery evidence is archived;
8. only after a zero-dependency gate, transitional source files and database objects are eligible for deletion.

## Structural rule

Do not teach browser code to manipulate normalized tables directly.

The final v2 write route must be one controlled transactional boundary. Browser code may submit a validated mutation command, but person/polity/role/source/name/relationship resolution and atomic persistence belong inside the controlled v2 write route.

This prevents the normalized model from being re-coupled to UI implementation details.

## Required v2 mutation contract

The controlled route must accept the adapter operations already in production:

- `createActivity(input)`
- `updateActivity(id, input)`
- `deleteActivity(id)`
- `importActivities(inputs)`
- `reconcileCanonical(snapshot)`

For each command it must return at minimum:

- deterministic request id
- operation
- commit status
- normalized relationship identifier(s)
- legacy lineage key/id when applicable during migration
- retry/idempotency result
- validation failures
- transaction failure reason

## Identity resolution

The normalized route must resolve reviewed canonical identities rather than infer identity from fuzzy name similarity.

Allowed transitional lookup inputs:

- exact legacy activity lineage identifier/key
- exact reviewed canonical person name/alias
- exact reviewed canonical polity name/alias
- explicit canonical identifiers when already available

Prohibited:

- automatic person merge from normalized spelling similarity
- automatic Korean-name collision merge
- heuristic duplicate deletion

Unresolved identity must fail closed and produce a reviewable result.

## Transaction semantics

A single activity mutation may touch several normalized objects. The v2 write route must be atomic.

Create/import may require:

- person resolution or creation
- polity resolution or creation
- role/source resolution if modeled separately
- relationship row creation
- name/alias linkage where explicitly reviewed
- legacy lineage mapping during transition

If any mandatory step fails, the whole mutation must roll back.

Update/delete must resolve the intended normalized relationship deterministically before changing state.

## Implementation sequence

### Gate C1 — Executable v2 command planner

Upgrade the current shadow compiler from generic intent labels into an executable normalized command plan. It must still perform zero DB writes.

The plan must enumerate the actual normalized entities/relationships that would be resolved or mutated and identify any unresolved identity blocker.

### Gate C2 — Isolated transactional v2 writer

Implement the controlled v2 writer behind an explicitly disabled control. Test only in isolated/protected execution.

Required evidence:

- create
- update
- delete/retirement semantics
- import
- multi-polity relationships
- transaction rollback
- retry/idempotency
- legacy lineage resolution
- unresolved identity fail-closed

No production source switch at C2.

### Gate C3 — Protected dual-write

After C1/C2 pass, enable temporary `dual-write` under an exact-SHA protected gate.

For each mutation:

1. legacy commit succeeds;
2. v2 transactional commit succeeds;
3. resulting compatibility projection is compared against the legacy result;
4. any mismatch stops promotion and marks rollback required.

Dual-write is verification infrastructure, not the final architecture.

### Gate C4 — Reconciliation cutover

Move canonical reconciliation from the legacy executor to the same v2 transactional boundary. Reconciliation must retain deterministic planning and explicit destructive proposal reporting.

No heuristic duplicate merge/delete is introduced.

### Gate C5 — V2 authoritative write

When protected dual-write evidence has zero unresolved drift, switch application/admin/reconciliation writes to `v2-only`.

Keep the legacy table intact but read-only during quarantine. No routine runtime writes may reach it.

### Gate C6 — Direct normalized read

Replace compatibility-view production reads with the approved direct normalized read contract. Disable legacy fallback invocation while retaining rollback evidence until the gate closes.

### Gate C7 — Zero-dependency retirement inventory

Run one final dependency inventory specifically for transitional artifacts. Required unresolved count: `0` for runtime dependencies.

Classify every remaining legacy reference as one of:

- immutable historical evidence — retain
- migration/runbook evidence — archive
- transitional runtime code — delete
- compatibility runtime object — retire
- legacy data object — quarantine/drop under separate destructive approval

### Gate C8 — Legacy code cleanup

Only after C5/C6/C7 pass, delete obsolete runtime source code and tests that exist solely for legacy execution or fallback.

Expected cleanup candidates include, subject to zero-dependency proof:

- direct legacy reconciliation executor and bootstrap branches that are no longer reachable
- legacy-only mode branches in write routing
- legacy fallback logic in reader/source-control runtime
- compatibility-view-specific runtime checks
- obsolete legacy ingestion scripts/endpoints
- CI assertions that preserve legacy behavior rather than historical evidence

Historical migration evidence is not blindly deleted. Runtime leftovers are.

### Gate C9 — Database retirement

Database retirement is last and destructive. It requires separate explicit authorization.

Order:

1. revoke unnecessary runtime write privileges on legacy objects;
2. retain legacy table read-only for quarantine;
3. prove zero queries/dependencies;
4. retire compatibility view;
5. archive schema/data evidence;
6. drop or archive legacy table/object only after explicit destructive approval.

## Stop conditions

Promotion to the next gate stops if any of the following occurs:

- unresolved canonical identity
- partial transaction
- v2/legacy result drift
- missing lineage
- duplicate ambiguity requiring human decision
- rollback procedure failure
- runtime legacy dependency discovered during retirement inventory

## Cleanup principle

The final repository should not permanently carry transitional runtime branches once the normalized architecture is authoritative.

However, cleanup distinguishes two categories:

- **delete:** dead runtime compatibility/legacy implementation code;
- **retain/archive:** immutable migration evidence required to explain how the production dataset was transformed.

This prevents both legacy-code accumulation and loss of audit history.

## Next authorized implementation

The immediate next PR may implement **Gate C1 only**: a pure executable v2 command planner with zero DB calls and zero commits. It may not enable `dual-write`, `v2-only`, or mutate database schema/data/permissions.
