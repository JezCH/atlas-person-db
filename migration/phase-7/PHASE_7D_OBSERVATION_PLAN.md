# Phase 7D — Production Observation and Closure

Status: PREPARED / OBSERVATION NOT YET CLOSED

## Objective

Observe the activated `v2-shadow` production read path under real use, verify that the legacy write path remains intact, and close Phase 7 only after the production state remains consistent and rollback readiness is preserved.

## Immutable activation evidence

- Phase 7C activation merge SHA: `b80fbdf4371b813a686c84c8dc9696e7b8efcd63`
- Production-evidence workflow merge SHA: `2b5e57e87800fb89017dc97fcee38250dbbf8b96`
- Production-evidence run ID: `31114892854`
- Production-evidence job ID: `92661758891`
- Production-evidence artifact ID: `8973230282`
- Artifact name: `phase-7c-production-evidence-b80fbdf4371b813a686c84c8dc9696e7b8efcd63`
- Artifact digest: `sha256:52ba58bace8b7037f451f8fa97b54c9567d92af16cc351d823e2af6e5e133c17`
- Workflow result: `success`
- Static and live preflight: `PASS`
- Live row counts: legacy `319`, v2 `349`
- Compatibility SELECT: allowed for `anon` and `authenticated`
- Compatibility writes: denied for `anon` and `authenticated`
- Production read manifest: `v2-shadow`
- Safe fallback and rollback target: `legacy`
- Production write target: `public.person_politics`

## Observation invariants

- Requested source remains `v2-shadow`.
- Effective source remains `v2-shadow`.
- Normal production reads do not fall back to `legacy`.
- Reader row-contract validation failures remain zero.
- Production writes continue to target `public.person_politics` only.
- No application write targets the compatibility view or v2 physical tables.
- Compatibility-view privileges remain read-only for application roles.
- The source declaration remains an exact approved manifest.
- The exact one-variable rollback to `legacy` remains available.
- Phase 8 remains unauthorized until Gate 7D closes.

## Required functional observation

Verify the deployed application through normal use:

- initial page load
- manual refresh
- search by Korean and English name
- polity filtering
- ascending and descending sort
- person selection and detail rendering
- export, when exposed by the production UI
- insert through the administrator path
- update through the administrator path
- delete through the administrator path
- reload after each mutation
- general-page synchronization after administrator mutations
- summary counts remain internally consistent
- no deleted row reappears after refresh
- no fallback diagnostic appears during healthy traffic

All mutations must continue through `public.person_politics`. Observation must not perform destructive testing against compatibility or v2 objects.

## Stop and rollback conditions

Rollback immediately if any of the following is observed:

- requested source and effective source differ
- fallback occurs without a deliberately injected failure
- normal page load fails or becomes materially less reliable
- v2 row validation fails
- search, filter, sort, detail, refresh, export, or synchronization regresses
- administrator insert, update, or delete fails
- any write targets the compatibility view or a v2 physical table
- compatibility privileges drift
- production row counts change unexpectedly without an approved data change
- evidence is incomplete or contradictory

Rollback changes only `atlas-production-source.js` from `v2-shadow` to `legacy`, then repeats the production smoke and records the rollback evidence.

## Closure evidence

Gate 7D may close only with a report containing:

```yaml
marker: PHASE_7D_OBSERVATION_EVIDENCE
activation_sha: b80fbdf4371b813a686c84c8dc9696e7b8efcd63
production_evidence_run: 31114892854
production_evidence_artifact: 8973230282
requested_source: v2-shadow
effective_source: v2-shadow
fallback_observed: false
validation_failures: 0
write_target: public.person_politics
functional_observation: PASS
compatibility_privileges: PASS
rollback_package: READY
result: PASS|ROLLBACK|HOLD
```

## Closure decision

A PASS closes Phase 7 and authorizes preparation of Phase 8 cleanup planning only. It does not itself authorize deleting legacy data, compatibility objects, rollback controls, or the legacy write path.
