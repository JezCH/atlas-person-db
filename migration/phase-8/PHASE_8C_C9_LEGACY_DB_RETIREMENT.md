# Phase 8C C9 — Legacy DB Object Retirement

Status: COMPLETE

## Final outcome

ATLAS completed the Phase 8 migration from the legacy `public.person_politics` runtime/data path to the normalized `atlas_v2` system.

Final production state:

- writes: v2-authoritative / v2-only
- reads: direct normalized v2 projection
- reachable legacy runtime: zero
- active legacy bootstrap/recreation paths: zero
- compatibility view: retired
- legacy table: retired
- normalized relationship table: retained with 349 rows

## C9A evidence

Protected live read-only inventory:

- SHA: `17f6af54fcb01a884e44b55c4e1ac2cad9d23faa`
- workflow run: `31362547973`
- artifact id: `9052889263`
- artifact digest: `sha256:3c31babe79115cf7f96b62eab1ea2ab5238ba5287beeb07386c65bb237c481a4`

Verified before retirement:

- legacy rows: 319
- compatibility rows: 349
- normalized rows: 349
- direct normalized projection rows: 349
- legacy semantic rows missing from v2: 0
- compatibility/direct projection differences: 0 in both directions
- external relation/function/FK/publication blockers: 0
- `retirement_ready: true`

## Final repository cleanup

Before destructive DB retirement, the final review removed active paths that could recreate or directly mutate the old MVP table:

- `schema.sql`
- `supabase-integrity.sql`
- `migrations/002_add_verified.sql`
- `config.js`
- `config.example.js`

Historical blob SHAs are retained in `migration/phase-8/reports/phase8c-c9-final-repository-cleanup.json`.

`README.md` and `DATA_MODEL.md` were updated to the normalized-v2 architecture. C7/C8 verification then passed again on the final repository state before C9B execution.

## C9B committed destructive retirement

Final approved production SHA:

- `fcbf87019d71ccc6da47abe30ba6cff2824566d0`

Protected workflow:

- workflow: `Phase 8C C9B Retire Legacy DB Objects`
- workflow id: `330902640`
- run: `31369351550`
- event: `workflow_dispatch`
- branch: `main`
- conclusion: SUCCESS

Artifact:

- id: `9055411446`
- name: `phase8c-c9b-legacy-db-retirement-fcbf87019d71ccc6da47abe30ba6cff2824566d0`
- digest: `sha256:6fd78e9157e19460bc7eb63c47c73db3c6d9f23a96da61856c1806ce43f852e5`

The transaction revalidated repository/runtime and live DB retirement invariants, saved a full legacy JSON snapshot, and then retired in this order with no `CASCADE`:

1. `public.atlas_person_politics_compat_v1`
2. `public.person_politics`

Committed post-state:

- compatibility object: absent
- legacy table: absent
- `atlas_v2.person_politics_v2`: present
- normalized rows: 349
- `destructive_action_committed: true`
- `rollback_performed: false`

The full pre-drop legacy snapshot is retained in the protected artifact.

## Operational closeout

After successful retirement, the one-time C9A/C9B workflows, execution scripts, and dedicated execution-contract tests are removed from the active repository surface so the completed destructive stage cannot be accidentally re-run from current code. Historical implementation and evidence remain available through Git history, the artifacts above, and Issue #63.

C7 runtime-dependency inventory and C8 active-v2 runtime verification remain as the standing regression guardrails.
