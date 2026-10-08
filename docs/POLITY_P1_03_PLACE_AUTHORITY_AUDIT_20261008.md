# POLITY-P1-03 — Place / PolityPlaceFunction Production authority audit

**Checked:** 2026-10-08
**Unit verdict:** INVESTIGATION_COMPLETE / CONFIRMED_CONNECTED_DB_DATA_GAP / REMEDIATION_OPEN.
**Explicit scope:** determine whether previously claimed 13-Polity/20-Place/27-Source/23-function CORE-REENTRY-08 backfill is present in the currently connected live DB, how the executing contract changed, and the exact requirements of any follow-up. **No data mutation in this unit. P14 Territory Geometry remains PARKED_BY_USER.**

## 1. Sources of authority

- #1037 was closed on the claim that PR #1777 finished the Place/Polity–PlaceFunction consolidation including Production backfill and read-back. This historic issue status does **not** override fresh DB evidence.
- PR #1777 implemented `atlas_v2.polity_place_functions`, first-class UUID-backed Place writer and source joins, plus a one-shot `ATLAS Place Authority Backfill` workflow. Its manifest is retained as `data/core/polity-place-function-authority-backfill.v1.json`, `backfill_id=core-reentry-08-place-authority-20261001`.
- PR #1899 intentionally removed the one-shot workflow, `server/atlas-polity-place-function-authority-backfill.js`, and the `backfill_polity_place_function_authority` Authoring operation, based on a closed-workstream assumption. PR #1902 added governance checks against resurrecting these retired transports. **Do not simply restore/replay the retired execution surface.**
- Current canonical service `server/atlas-polity-place-function-service.js#createPolityPlaceFunction` and schema migration `db/migrations/20261001_polity_place_function_authority.sql` are retained. The repository projection `spatial/projections/polity-place-functions.v1.json` has 13 Polity records containing 23 Place-function entries but is a derived static display artifact, not evidence of live database facts.

## 2. Direct connected Supabase read-back

Connected Supabase project: `wfrbxltvpmlprgwfysxq`; provider lists **one** accessible active project. All 13 exact Polity UUIDs in the manifest exist in `atlas_v2.polities`.

| Authority item | Manifest expected | Connected DB present |
|---|---:|---:|
| Exact target Polities | 13 | 13 |
| Place UUIDs in `atlas_v2.places` | 20 | 0 |
| Source UUIDs from manifest in `atlas_v2.sources` | 27 | 0 |
| Canonical `atlas_v2.polity_place_functions` rows | 23 | 0 |
| `atlas_v2.place_names` | populated | 0 |
| `atlas_v2.place_sources` | populated | 0 |
| `atlas_v2.polity_place_function_sources` | populated | 0 |

Also `atlas_v2.person_place_facts` is empty; `atlas_v2.spatial_registration_dispositions` contains 6 records but is not a substitute for Place authority.

Only `atlas_v2` owns the `places` and `polity_place_functions` tables among query-visible schemas. Both tables physically exist (the schema contract is deployed) but lack canonical content.

Neither `atlas_v2.correction_manifest_runs` nor `atlas_v2.authoring_manifest_runs` contains a directly named Place/core-reentry backfill run. **However, the old one-shot backfill code performed a direct serializable transaction and did not insert a row into either generic manifest ledger**, so absence of a ledger row alone does not prove nonexecution. The stronger current evidence is the zero rows/zero exact IDs in every related table.

## 3. Deployment/env distinction

- Vercel connection identifies the `atlas-person-db` project and a READY Production deployment at the review time.
- A production-targeted `SUPABASE_DB_URL` environment variable exists, but its value is withheld as sensitive by the connector. The actual DB hostname/reference **cannot** be proven to match `wfrbxltvpmlprgwfysxq` from permitted metadata.
- Therefore **the connected Supabase database has a definite current Place data gap**, but we cannot categorically assert that every possible deployed environment has identical data or that the old workflow never executed. A formerly successful run followed by later loss remains unexcluded without workflow/run or application-log evidence.

## 4. Resolution design — separate bounded follow-up `POLITY-P1-03R`

This is confirmed actionable canonical-data debt, **not** a request to restart historical Territory Geometry or recompute speculative capitals.

- **P1-03R-A — authority gate:** securely establish which PostgreSQL target is used by the exact Production deployment, without exposing connection strings. Capture fresh UUID-level exact-before snapshot, verify current 13 target Polities still exist, and inspect source/name collisions.
- **P1-03R-B — reviewed correction:** treat the retained historical manifest as a *seed requiring current review*, not executable authority; validate all 20 Place identities, 27 Source records, and 23 fact intervals/UUID/provenance against current polity naming and source contracts. Prepare a narrow, idempotent current-canonical authoring plan. Any changed source or Polity identity must fail closed and be reviewed. Do not resurrect #1899-deleted one-shot transports.
- **P1-03R-C — apply/verify:** use the current authenticated canonical Place/PolityPlaceFunction writer path, serialized against conflicting writes. Ensure committed exact live read-back 13 target Polities / 20 Places / 27 Sources / 23 facts and all expected normalized source links. Verify Runtime or display projection consistency and add a persistent drift check. Document Production deployment/DB identity.
- Do not perform `P1-03R-C` before the authority/source gates succeed; do not substitute direct unreviewed INSERT or delete any historical identity.

**Open blocker until verified:** the currently connected DB does not satisfy the canonical Place authority promises of #1037/#1777. Existing UI projection may still render 23 static entries, but this does not make the DB authority complete. The former completion assertion should be treated as superseded for this scope.

## 5. Unit closeout / exact restart

- `POLITY-P1-03` investigation DONE; **Production data remediation NOT DONE** and remains a tracked acceptance blocker with `POLITY-P1-03R` as a distinct, gated implementation family.
- **Next independent small work unit: `POLITY-P1-04` — classify 22 live Polities without direct Activity; preserve valid historical rows; no automatic deletion.**
- Then the user's plan resumes the 25 seeded `REVIEW_REQUIRED` entries at France (13 historical families, 2 designations, 2 naming collisions, 8 rupture probes), followed by fresh Production census and acceptance. Both Japan P1-02's confirmed tombstone defect and this Place authority gap must remain open through final acceptance.
