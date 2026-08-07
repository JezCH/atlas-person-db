# Phase 8B — Disabled Write Adapter Implementation Plan

Status: PLANNED / NON-ACTIVE

## Objective

Define a source-level implementation sequence for introducing `AtlasWriteAdapter` without changing current production outcomes, database targets, permissions, or automatic reconciliation behavior during this gate.

## Authorized scope

- add a standalone adapter module with `legacy-only` as the hard default
- wrap existing legacy operations behind adapter methods
- preserve all current Supabase calls and result semantics in legacy-only mode
- add deterministic validation and structured operation results
- add non-production tests and static checks
- add a disabled `shadow-validate` compiler path that cannot commit v2 mutations
- add observable warnings for unknown modes
- document exact rollback to pre-adapter source

## Prohibited scope

- no production write target change
- no v2 database commit
- no dual-write or v2-only mode
- no grant, RLS, trigger, function, schema, or data mutation
- no removal of legacy calls until parity evidence exists
- no automatic reconciliation activation change in this plan PR
- no automatic duplicate merge or destructive cleanup

## Proposed source layout

- `atlas-write-adapter.js` — adapter implementation and validation
- `atlas-write-mode.js` — immutable mode resolver, defaulting to `legacy-only`
- `tests/atlas-write-adapter.test.mjs` — unit tests using an injected fake database client
- `migration/phase-8/scripts/verify-phase8b-disabled-adapter.mjs` — static and behavioral evidence generator
- `.github/workflows/phase-8b-disabled-adapter-evidence.yml` — protected, non-production evidence workflow

## Required interface

```js
AtlasWriteAdapter.createActivity(input)
AtlasWriteAdapter.updateActivity(id, input)
AtlasWriteAdapter.deleteActivity(id)
AtlasWriteAdapter.importActivities(inputs)
AtlasWriteAdapter.reconcileCanonical(snapshot)
```

Every method must return a structured result with:

- `request_id`
- `mode`
- `operation`
- legacy attempt/commit information
- v2 attempt/commit information
- row-level import outcomes when applicable
- rollback requirement
- errors

## Operating-mode constraints

### `legacy-only`

- only mode allowed to mutate
- must preserve current table target `public.person_politics`
- must preserve current create, update, delete, import, and reconciliation semantics
- must remain the default when configuration is missing, invalid, or unknown

### `shadow-validate`

- may compile and validate a proposed v2 mutation
- must not call any v2 insert, update, delete, RPC, or SQL function
- must emit evidence only
- must not change legacy commit behavior

### `dual-write`

- code path must be absent or hard-disabled
- any attempt to select it must fail closed to `legacy-only` with a warning

### `v2-only`

- code path must be absent or hard-disabled
- any attempt to select it must fail closed to `legacy-only` with a warning

## Integration order

1. Implement adapter and tests without loading it in production pages.
2. Run static and unit evidence.
3. Load adapter module while keeping all existing writers unchanged.
4. Wrap `admin.js` first because it has the smallest active write surface.
5. Wrap user-driven operations in `app.js` while preserving results and UI behavior.
6. Isolate `ingest.js` reconciliation behind a separate explicit adapter entry point.
7. Produce protected smoke evidence proving no v2 commit and no behavior regression.
8. Authorize any subsequent source switch only in a later gate.

## Reconciliation isolation

`ingest.js` must not be treated as an ordinary user mutation path. The implementation must:

- expose reconciliation as a separate method
- record canonical snapshot identity and digest
- support dry-run enumeration of inserts, updates, deletes, and duplicate removals
- prevent dry-run commits
- make activation explicit and independently observable
- preserve the current production behavior until a later gate explicitly authorizes changing it

## Test matrix

Mandatory tests:

- create success and failure
- update success, missing identifier, and database failure
- delete success, missing identifier, and database failure
- import mixed row outcomes
- invalid names, periods, and basis values
- request identifier determinism or uniqueness contract
- unknown mode fallback
- `shadow-validate` performs zero v2 commits
- `dual-write` and `v2-only` cannot activate
- legacy-only operation target remains `person_politics`
- reconciliation dry-run produces proposals without writes

## Evidence requirements

The implementation gate may pass only when artifacts show:

- all adapter tests pass
- direct v2 mutation calls equal `0`
- production source still resolves to `legacy-only`
- legacy target remains `person_politics`
- no database secret is required for unit tests
- protected smoke evidence performs no v2 commit
- rollback to the pre-adapter merge SHA is documented
- no prohibited mutation occurred

## Rollback

The rollback source is merge SHA `a499da8bcdcaceae4487fc09832e3cac775bbcc4` until a later implementation merge is approved. Reverting the adapter implementation must restore the exact direct legacy writer sources and leave the database unchanged.

## Gate boundary

This plan authorizes a later PR to add an unloaded, disabled adapter and tests. It does not authorize routing production writers through it, changing reconciliation activation, or committing to atlas_v2.