# ATLAS CORE v2 Final Acceptance

**Status:** PASS  
**Accepted as of:** 2026-10-01  
**Scope:** CORE v2 Units 0–17 architecture plus 2026-10-01 targeted re-entry repairs  
**Re-entry acceptance:** `CORE-REENTRY-04 — FINAL-PRODUCTION-LIFECYCLE-ACCEPTANCE`  
**P14 content implementation:** out of scope; the Territory/Geometry boundary is sealed, while historical-map content remains a later product phase.

## Acceptance result

CORE v2 is accepted only when every Unit 17 invariant below is simultaneously satisfied. The 2026-10-01 post-closure audit reopened this acceptance after finding gaps in current-schema reconstruction and the reviewed-candidate Production lifecycle; this revision re-accepts CORE only after those executable boundaries were repaired and added to the acceptance surface. The machine-readable companion is `data/core/core-v2-final-acceptance.v1.json`, and `tests/core-final-acceptance.test.mjs` prevents the current requirements/contract state from drifting back to a pre-closure state.

| Invariant | Result |
|---|---:|
| requirements contradictions = 0 | **PASS** |
| multi-writer canonical resources = 0 | **PASS** |
| duplicate truth registries = 0 | **PASS** |
| reachable legacy writer/runtime = 0 | **PASS** |
| retired identity resurrection path = 0 | **PASS** |
| fake date/sentinel dependency = 0 | **PASS** |
| unresolved data silently Runtime-published = 0 | **PASS** |
| manual semantic Runtime refresh dependency = 0 | **PASS** |
| normal registration follow-up completeness debt = 0 | **PASS** |
| Runtime reproducibility = PASS | **PASS** |
| compiler determinism = PASS | **PASS** |
| writer idempotency = PASS | **PASS** |
| destructive lifecycle = PASS | **PASS** |
| provenance preservation = PASS | **PASS** |
| AI authoritative bypass = 0 | **PASS** |
| obsolete CORE execution code = 0 | **PASS** |
| project/CORE/NONCORE task-level single-writer dependency = 0 | **PASS** |
| stale authoritative overwrite paths without resource-level precondition/fail-closed protection = 0 | **PASS** |
| active task keys with multiple unclassified authoritative artifacts = 0 | **PASS** |
| current schema reconstruction has one executable authority | **PASS** |
| reviewed candidate → canonical Human Authoring Production lifecycle | **PASS** |

## Evidence model

This document is a closure checkpoint, not a replacement source of truth. Each PASS points to the canonical contract and durable regression test that owns the invariant. In particular:

- canonical resource ownership is governed by `docs/core/CORE_AUTHORITY_OWNERSHIP.v1.json`;
- Runtime publication is governed by `contracts/runtime-projection-contract.v1.json`;
- registration completeness is governed by `data/core/registration-obligations.v1.json` and `server/atlas-registration-coordinator.js`;
- AI-reviewed candidate approval is governed by `server/atlas-reviewed-candidate-service.js`;
- optimistic resource-scoped mutation and the one-work-unit response barrier are governed by `WORK_EXECUTION.md`;
- Unit 16 residue removal remains guarded by `tests/core-residue-cleanup.test.mjs`;
- current-schema reconstruction is governed by `server/atlas-current-schema-reconstruction.js` and exercised by the fresh-schema Integrity path;
- reviewed-candidate Production application is governed by `server/atlas-reviewed-candidate-registration-service.js`, the consolidated `reviewed-candidate` Authoring surface, the focused re-entry test, and Human Authoring operational parity.

The full ATLAS Integrity workflow remains the executable aggregate gate: full current tests, requirements verification, release governance, Runtime verification, and fresh-schema reconstruction.

## Product-phase reconciliation

The following P13 requirements are closed by the completed CORE v2 architecture and this re-run final acceptance:

- `ATLAS-RQ-0223` — full Production product lifecycle acceptance
- `ATLAS-RQ-0226` — first-class Person authoring without fabricated optional facts
- `ATLAS-RQ-0227` — first-class Place and bibliographic Source authoring
- `ATLAS-RQ-0228` — explicit Compile → Runtime projection/readiness
- `ATLAS-RQ-0229` — unresolved Activity boundaries without fake endpoints
- `ATLAS-RQ-0230` — source-backed candidate → human review → authoritative authoring

`ATLAS-RQ-0224` and `ATLAS-RQ-0225` remain **PENDING** because P14 historical-map content/research integration is intentionally outside CORE v2 closure.

## Operational closure

After this re-entry acceptance merges and the exact merged revision passes the required current-architecture verification, #917 must contain no active CORE unit and no “next unit” pointer. Re-entry is allowed only for a concrete regression against a closed invariant or for a deliberately versioned future CORE program. Historical comments, superseded PRs, parked issues, and old queue keys do not reactivate CORE v2.
