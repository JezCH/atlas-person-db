# Phase 8B — Reconciliation Isolation Plan

Status: PLANNED / NON-ACTIVE

## Problem statement

`ingest.js` is loaded by the production page and can delete, update, and insert rows in `public.person_politics` during ordinary page load. This behavior is materially different from explicit user or administrator actions and must be isolated before any write-path transition.

## Objective

Define a reversible separation between:

- ordinary reader and authoring page load
- user-initiated mutations
- administrator batch mutations
- canonical reconciliation

No production activation change is authorized by this plan.

## Required control states

- `disabled`: reconciliation code does not execute
- `dry-run`: calculate proposed actions and emit evidence, with zero database writes
- `legacy-commit`: current legacy behavior, allowed only while explicitly selected
- `shadow-validate`: legacy commit plus v2 proposal validation, with zero v2 writes

Unknown states must fail closed to `disabled` for reconciliation and emit an observable warning.

## Required proposal model

A dry-run must produce an immutable report containing:

- canonical snapshot identifier
- canonical snapshot digest
- existing legacy row count
- proposed inserts
- proposed updates with before/after fields
- proposed deletes with reason codes
- proposed duplicate removals with exact key evidence
- unchanged row count
- validation failures
- total destructive proposals
- commit flag, which must be `false`

## Required reason codes

At minimum:

- `MISSING_FROM_LEGACY`
- `FIELD_DIFFERENCE`
- `MANAGED_ROW_ABSENT_FROM_CANONICAL`
- `EXACT_ACTIVITY_DUPLICATE`
- `OBSOLETE_KEY`
- `INVALID_CANONICAL_RECORD`
- `UNRESOLVED_IDENTITY`

Heuristic similarity must never produce a delete or merge proposal.

## Integration constraints

- reconciliation must have its own module and entry point
- ordinary application initialization must not implicitly select a commit state
- the selected state must be visible in observability output
- user authoring operations must not call reconciliation
- administrator batch operations must not call reconciliation
- reconciliation failures must not silently fall back to destructive execution
- the compatibility view and legacy rollback target remain available

## Evidence sequence

1. Extract a pure reconciliation planner from `ingest.js` without changing production loading.
2. Unit-test planning against deterministic fixtures.
3. Prove dry-run emits the current expected insert/update/delete set with zero writes.
4. Add a disabled loader that is not referenced by `index.html`.
5. Produce protected evidence showing current production source remains unchanged.
6. Route existing reconciliation only after a later gate explicitly approves the source change.

## Acceptance criteria for later implementation

- planner is pure and deterministic
- dry-run performs zero Supabase mutations
- all proposed deletes contain explicit reason codes and source evidence
- duplicate decisions are limited to exact activity duplicates under the existing canonical key
- unresolved identity candidates are reported, not mutated
- unknown state resolves to disabled
- current production behavior remains unchanged until a separate activation gate
- rollback to merge SHA `a499da8bcdcaceae4487fc09832e3cac775bbcc4` is documented

## Gate boundary

This document authorizes planning and an unloaded dry-run planner in a later PR. It does not authorize removing `ingest.js` from `index.html`, changing its current activation, or executing any new write path.