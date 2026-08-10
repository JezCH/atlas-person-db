# Phase 8C C4E — Bounded Production Dual-Write Observation

Status: PREPARED / REQUIRES PROTECTED EXACT-SHA EXECUTION

## Purpose

Prove the post-lockdown production commit path with real committed mutations before C5 v2-authoritative/v2-only promotion.

This is not another rollback smoke. Each mutation commits in its own PostgreSQL transaction and is then queried from a separate live connection to prove persistence. Only synthetic records are used; no historical source row is modified.

## Preconditions

- C4C production server-write activation is deployed.
- Public legacy INSERT/UPDATE/DELETE policies are already removed.
- Public legacy SELECT remains available.
- C4D optional-role database and runtime contracts are live.

## Bounded sequence

The protected observation dynamically selects one existing exact reviewed person/polity/role/period-basis combination and collision-free synthetic year pairs. It then performs:

1. create with `role = null`
2. verify committed legacy row and compatibility projection from a separate connection
3. update the synthetic row from null role to an exact reviewed role
4. verify persistence and parity
5. update the same synthetic row back to null role
6. verify persistence and parity
7. import two synthetic rows in one request: one null-role and one reviewed-role row
8. verify both rows in legacy and compatibility projection
9. delete all synthetic rows through the same mutation service
10. prove legacy, normalized and compatibility counts returned exactly to their pre-observation baseline
11. prove zero synthetic residue and that public write policies remain zero

Every mutation must report `committed=true`, `rollback=false` and `parity.match=true`.

## Failure cleanup

The normal success path deletes every synthetic row through the production mutation service. A narrowly scoped direct-SQL cleanup exists only as an emergency failure cleanup for rows carrying the unique observation marker. If that fallback is needed, the workflow still fails; fallback cleanup can never convert a failed observation into PASS.

## Scope boundary

C4E does not:

- modify historical records
- change schema or RLS
- promote v2-only writes
- change read source
- retire compatibility or legacy objects
- clean historical duplicate groups

A clean protected C4E run is the final committed dual-write gate before designing and activating C5 v2-authoritative writes.
