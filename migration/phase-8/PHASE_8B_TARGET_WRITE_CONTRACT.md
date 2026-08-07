# Phase 8B — Target Write Contract

Status: DESIGNED / NOT ACTIVE

## Objective

Define the exact boundary for a future write adapter without changing the current production write target or database behavior.

## Current state

- reads: `v2-shadow`
- writes: `public.person_politics`
- fallback: enabled
- rollback target: legacy
- active writer classes: user authoring, automatic reconciliation, administrator batch

## Required adapter boundary

All future mutations must pass through one application-level contract rather than calling Supabase tables directly.

Proposed interface:

```js
AtlasWriteAdapter.createActivity(input)
AtlasWriteAdapter.updateActivity(id, input)
AtlasWriteAdapter.deleteActivity(id)
AtlasWriteAdapter.importActivities(inputs)
AtlasWriteAdapter.reconcileCanonical(snapshot)
```

The adapter must initially default to legacy-only behavior so deployment cannot silently change writes.

## Mandatory operating modes

- `legacy-only`: current behavior; sole permitted default
- `shadow-validate`: execute legacy write, compile the proposed v2 mutation, but do not commit the v2 mutation
- `dual-write`: prohibited until a later protected gate explicitly authorizes it
- `v2-only`: prohibited until parity, rollback, and security gates pass

Unknown or invalid mode values must fail closed to `legacy-only` and emit an observable warning.

## Input contract

Required activity fields:

- `person_name`
- `politic_name`
- integer `activity_start`
- integer `activity_end`
- allowed `period_basis`

Optional fields:

- `role`
- `notes`

Validation requirements:

- trim names
- reject empty person or polity names
- reject non-integer periods
- reject `activity_end < activity_start`
- reject unsupported period basis
- preserve explicit nulls for optional values
- assign a deterministic request identifier for evidence and retry safety

## Identity and duplicate boundary

The adapter must not infer that two persons or activities are identical solely from normalized names.

Legacy lookup compatibility may use the current exact activity key during transition, but future v2 resolution must use reviewed canonical identifiers.

Duplicate outcomes remain outside automatic write execution:

- `MERGE`
- `KEEP_SEPARATE`
- `REVIEW`

No adapter mode may automatically merge or delete a candidate duplicate based only on heuristic similarity.

## Transaction and error contract

Each user mutation must return a structured result:

```json
{
  "request_id": "...",
  "mode": "legacy-only",
  "operation": "create|update|delete|import|reconcile",
  "legacy": { "attempted": true, "committed": true, "record_ids": [] },
  "v2": { "attempted": false, "committed": false, "validation": null },
  "rollback_required": false,
  "errors": []
}
```

Requirements:

- no silent partial success
- imports must report row-level outcomes
- retries must be idempotent where practical
- delete operations require an explicit record identifier and user confirmation when user initiated
- reconciliation must be separately authorized and observable

## Automatic reconciliation boundary

`ingest.js` currently mutates production data during ordinary page load. The target design must isolate this behavior from the reader shell.

Before any shadow or dual-write gate:

- reconciliation must be disabled by default
- activation must be explicit
- dry-run evidence must enumerate proposed inserts, updates, and deletes
- destructive proposals must not commit during dry-run
- canonical snapshot identity and digest must be recorded

## Security boundary

The adapter design does not authorize current anon/authenticated grants or RLS policies to remain indefinitely. Phase 8B records them as blockers; a later security gate must define least-privilege execution.

No grant, RLS, trigger, or function changes are authorized by this document.

## Rollback

Until a later gate closes:

- `legacy-only` remains the default and rollback mode
- direct v2 commits remain disabled
- the compatibility view remains available
- no legacy object or write privilege is retired

## Acceptance criteria for a later disabled-adapter implementation

- direct table calls are inventoried and wrapped without changing outcomes
- default behavior remains legacy-only
- automatic reconciliation is separately gated
- unit evidence covers create, update, delete, import, invalid input, retry, and failure paths
- protected smoke evidence demonstrates no v2 commit and no production regression
- rollback to the pre-adapter source is documented and tested

This design does not authorize implementation, dual-write, production cutover, privilege removal, or object retirement.