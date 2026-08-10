# Phase 8C C5B — Production V2-Only Activation

Status: PREPARED / BLOCKED ON C5A PROTECTED PROOF

## Objective

Switch production mutation routing from the C3/C4 dual-write implementation to the C5A-proven v2-authoritative implementation.

This phase changes the authoritative write store only. Compatibility reads and legacy fallback remain temporarily available until C6 direct normalized read cutover.

## Production server boundary

`server/atlas-vercel-mutation-handler.js` now constructs:

`authenticated request -> planner -> v2-authoritative mutation service -> one PostgreSQL transaction -> atlas_v2.person_politics_v2`

The production handler no longer imports or constructs the dual-write transaction factory.

The old dual-write implementation remains in the repository only for retained migration evidence/rollback analysis until the later zero-dependency cleanup phase; it is no longer production-reachable after C5B.

## Browser contract

`atlas-server-write-adapter.js` reports:

- mode: `server-v2-only`
- write_mode: `v2-only`
- legacy attempted=false / committed=false
- normalized relationship IDs from the server

The adapter rejects a stale dual-write server response instead of silently accepting a mixed deployment.

`app.js`:

- success = overall committed + v2 committed
- create selects the returned normalized relationship UUID
- update/delete IDs are normalized relationship UUIDs already supplied by the v2 compatibility reader
- no success decision or ID selection depends on a legacy mutation result

## Admin contract

Admin exact activity lookup moves from `public.person_politics` to `public.atlas_person_politics_compat_v1`, so the returned id is the normalized relationship UUID.

The lookup fetches up to two IDs and fails closed when the activity identity is ambiguous instead of arbitrarily selecting one historical duplicate.

Supabase remains read-only from browser/admin code; all mutations still traverse the authenticated server boundary.

## Reconciliation

Mutating reconciliation remains blocked by the v2-authoritative service with `RECONCILIATION_NORMALIZED_INPUT_REQUIRED` because the current reconciliation dry-run still derives input from the legacy projection. Production page-load reconciliation is dry-run only, so this does not remove an active production write feature. C6 will normalize the read/reconciliation input path before legacy read dependency removal.

## Activation gate

Do not merge this production activation until the protected C5A committed proof passes on the exact C5A main SHA and demonstrates:

- actual committed v2-only create/update/import/delete
- normalized IDs used authoritatively
- full legacy rowset digest unchanged throughout
- compatibility projection reflects direct v2 writes
- direct provenance metadata valid
- baseline restored exactly
- zero residue
- no fallback cleanup

After C5A PASS and C5B CI PASS, merge C5B and verify the automatic Vercel production deployment succeeds. No second database mutation gate is required because C5B only routes production traffic to the exact persistence implementation already committed and proven by C5A.
