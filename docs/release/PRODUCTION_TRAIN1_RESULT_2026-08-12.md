# Production Train 1 Result — 2026-08-12

Status: **COMPLETED / PRODUCTION DATA MUTATION VERIFIED / BASELINE A V2 CAPTURED**

## Authoritative successful run

- GitHub Actions workflow: `ATLAS Correction Apply`
- run id: `31581018285`
- run number: `1`
- exact Production/GitHub SHA: `ff0e0cd0402d77dabf0a518384ab4c01fe5094d4`
- evidence artifact id: `9135171793`
- artifact digest: `sha256:e705932d199c4f87afdabcd6e4cfeca779c98e2a2a4a5a3b064f9dfc29ea750d`

The workflow proved the exact Vercel Production SHA before mutation, then executed the reviewed release plan in order.

## R0

`stage2-r0:true-activity-duplicates:2026-08-11:v1`

- real SERIALIZABLE rollback dry-run: PASS
- apply: PASS
- committed: true
- relationships: `346 → 340`
- relationships removed: 6
- six reviewed keep Activity UUIDs survived;
- six reviewed drop Activity UUIDs are absent in Baseline A;
- provenance links were preserved/coalesced by the correction transaction.

## R1 — Franklin / Bismarck

`stage2-r1:current-schema-ready:franklin-bismarck:2026-08-12:v1`

- dry-run: PASS
- apply: PASS
- Benjamin Franklin invalid United States Activity `2a749964-c057-5671-bdaa-8388099b871d`: retired
- Otto von Bismarck Prussia Activity `6bac2b6f-ebf0-5131-bbf2-7fa524bcfae8`: `1862–1871 → 1862–1890`
- relationships: `340 → 339`

## R1 — Muhammad

`stage2-r1:muhammad-pre622-medina-retire:2026-08-12:v1`

The workflow first captured the exact target on the same Production SHA under the read-only snapshot contract, then synthesized the exact v1.1 manifest with no name inference.

- exact target snapshot: PASS
- dry-run: PASS
- apply: PASS
- Medina back-projection Activity `e4b374f5-ee25-5c12-80bf-5b7b1d2d149c`: retired
- Medinan Polity Activity `fc68a326-f59f-5780-a6f0-c5206d9ceba3`: retained at `622–632`, `de_facto_rule`
- relationships: `339 → 338`

The exact generated manifest from the successful artifact is materialized in the repository after this run so future ledger replay does not depend on re-snapshotting an already-retired row.

## Baseline A v2

Marker: `ATLAS_CORRECTION_BASELINE_A_V2`

- read_only: true
- committed: false
- deployment SHA: `ff0e0cd0402d77dabf0a518384ab4c01fe5094d4`
- baseline digest: `sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27`

Counts:

```text
persons                   302
person_names              609
polities                  212
polity_names              424
roles                     149
role_names                298
period_bases                8
period_basis_names          8
sources                     20
activities                 338
activity_source_links      345
chronology_claims            0
relationship_descriptions   0
```

The old exact-346 Activity baseline is superseded. **338 Activities is the measured Baseline A value; it was not predicted.**

## Accidental second trigger and safety result

A follow-up trigger merge was created after the successful run was initially missed in a truncated Actions listing. That second run (`31581603940`) did not mutate Production.

It reached the newer exact Production SHA and stopped on the first R0 dry-run with:

`CORRECTION_REQUEST_ID_COLLISION`

Cause: operational trigger metadata had changed the raw R0 manifest hash while retaining the already-applied request id. This demonstrated that the correction ledger correctly rejected request-id reuse with a different payload.

Recovery policy:

- do not invent a new request id;
- restore R0/R1 repository payloads to the exact applied manifests;
- materialize the exact Muhammad generated manifest from the successful artifact;
- remove the consumed one-shot Muhammad intent;
- verify all three as ledger replays, not new mutations.

## Next authoritative dependency

Baseline A now authorizes P3 branch-only integration work:

```text
Baseline A v2
→ fresh surviving UUID/name-kind rebind
→ Stage 2 Integration on current main
→ Train 2 only after the rebinding and CI are complete
```

No Person physical merge is authorized before P9/P10 semantic-key-v2 reconciliation.
