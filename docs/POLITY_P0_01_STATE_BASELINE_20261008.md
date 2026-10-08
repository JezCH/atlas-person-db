# POLITY-P0-01 — verified state baseline (2026-10-08)

Authority: current atlas-polity-review-registry.js + docs/ATLAS_CURRENT_WORKSTREAMS.md + read-only connected Supabase atlas_v2 + merged GitHub PRs. This is a bounded P0 execution report, not a historical merge/split instruction.

## Verified registry
- Current registry v3: 75 rows = 50 terminal + 25 REVIEW_REQUIRED.
- resolved_history: 36 terminal.
- carry_forward_same_identity: 3 terminal.
- historical_family_reviews: 16 rows; 3 terminal, 13 pending.
- designation_residuals: 2 pending.
- naming_residuals: 2 pending.
- rupture_probes: 16 rows; 8 terminal, 8 pending.
- Previously closed legacy state-form 16/16 is distinct; do not restart it.
- Fresh all-Production discovery is scheduled only after the carried review seeds close.

## Connected Production baseline
- atlas_v2.polities: 1,155.
- atlas_v2.person_politics_v2: 2,495.
- atlas_v2.runtime_person_politics_v1: 2,495.
- atlas_v2.polity_designations: 54.
- atlas_v2.polity_identity_retirements: 89.
- Polities with zero direct person_politics_v2 Activities: 22. Zero Activities is not itself a defect.
- atlas_v2.places: 0.
- atlas_v2.polity_place_functions: 0. These counts conflict with the historical #1037/#1777 report of a 20-Place/23-function backfill; determine environment and authority before any repair.

## Verified inconsistency and next units
1. POLITY-P1-01 Hungary: #2117 closed with one-Kingdom/no-write reasoning, then #2118 and #2119 merged a distinct restored Kingdom of Hungary (1920-1946) and retired legacy Horthy Activity. Actual read-back: pre-1918 Kingdom UUID b07ef629-2fd6-59f9-bac8-ec685b371aac has 6 Activities; restored Kingdom UUID 83292f3d-caad-43bb-86e6-05259b90eac9 has 1. The registry still records #2117's now-contradicted FIXED rationale. Reconcile registry/evidence/runtime against current facts; do not merge the two identities automatically.
2. POLITY-P1-02 Japan: 3 currently live Polities are also present as retired_polity_id, collectively connected to 12 Activities. Determine whether historical tombstone semantics or stale retirement metadata explain this; do not delete rows automatically.
3. POLITY-P1-03 Place: verify the actual Place authority/deployment/backfill target. Do not resume user-parked P14 historical Geometry.
4. POLITY-P1-04 Unlinked polities: classify 22 zero-Activity Polity rows without presuming invalidity.

## Workstream gate
- Issue #1895 was closed as completed with 25 REVIEW_REQUIRED entries still present. The current registry remains authoritative for seeded closure.
- Exact next bounded unit: POLITY-P1-01 (Hungary registry/Production reconciliation). When P1 structural checks close, next ordinary seeded frontier is France regime family.
- Every unit: current Production read -> historical/evidence decision -> canonical change only if required -> Production and Runtime read-back -> registry/tracker note -> STOP.
- No broad orphan deletion, no old completed seed replay, no user-parked P14 restart.
