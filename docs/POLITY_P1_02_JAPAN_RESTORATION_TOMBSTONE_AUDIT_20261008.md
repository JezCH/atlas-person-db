# POLITY-P1-02 — Japanese restored-Polity tombstone reconciliation (2026-10-08)

**Unit disposition: AUDIT_COMPLETE / CONFIRMED_CONTRACT_VIOLATION / MUTATION_HOLD_EXPLICIT_APPROVAL_REQUIRED.** This is a targeted integrity audit, not a mandate to repeat the completed Japan identity-lineage repair or delete any record. The user-approved Polity/Person deletion boundary is respected.

## Scope and historical authority

- GitHub PR #1721 (merged): `restore_retired_polity` Correction v2 restores previously retired polity identity from exact no-survivor tombstone. `server/atlas-correction-polity-restore-v2-service.js` requires tombstone removal after Polity, preferred names and source links are restored; `verifyRestored` fails when a retirement row reappears (`CORRECTION_POLITY_RESTORE_TOMBSTONE_REAPPEARED`).
- GitHub PR #1737 (merged): reviewed Japan-lineage repair restores Toyotomi Regime, Tokugawa Shogunate and Empire of Japan, with targeted Activity relinking.
- GitHub PR #1755 (merged): Japan lineage correction finished, ephemeral Pre-Meiji/Imperial Japan umbrellas retired; the three reviewed historic identities remain live.
- Canonical restoration run in `atlas_v2.correction_manifest_runs`: `polity-restore:japan-lineage-superseded-retirements:2026-09-30:v1`, applied `2026-09-30 14:12:18.009095+00`, 3 operations; restored-Polity case UUIDs match the three live entities.

## Fresh Production read-back

| Live canonical key | Live UUID | Authoring Activities | Runtime exact-match Activities | Preferred names | Live Polity source links | Retirement row? |
|---|---|---:|---:|---:|---:|---|
| Tokugawa Shogunate | `46534f7e-9247-5644-b5ad-9525c3d4f5d6` | 6 | 6 | 2 (EN/KO) | 2 | **YES** |
| Empire of Japan | `7f146e58-c3e9-5af7-8cb8-346f03cd7cf6` | 5 | 5 | 2 (EN/KO) | 2 | **YES** |
| Toyotomi Regime | `e1548cb1-f89d-538b-9fb2-bad02ad87f8e` | 1 | 1 | 2 (EN/KO) | 1 | **YES** |

**Total: 3 live Polities, 12 Authoring Activities, 12 exact matched Runtime Activities and 3 conflicting retirement rows.** There are zero other simultaneously live/retired Polities in this connected Production read. Retained Korean preferred names: `도쿠가와 막부`, `대일본제국`, `도요토미 정권`.

Conflicting retired rows are the original retirement identities, all `survivor_polity_id=NULL`, carrying historical retirement reasons and provenance:

- Tokugawa: `GOVERNANCE_CONTEXT_DUPLICATE_POLITY`, request `polity-retirement:governance-context-duplicates:2026-08-21:v1`, historical retired_at `2026-08-20 22:55:43+00`.
- Empire of Japan: `GOVERNANCE_CONTEXT_DUPLICATE_POLITY`, request `polity-retirement:confirmed-identity-duplicates:2026-09-19:v1`, historical retired_at `2026-09-19 12:56:13+00`.
- Toyotomi: `REVIEWED_UNREFERENCED_ORPHAN_CLEANUP`, request `polity-retirement:zero-activity-external-orphans:2026-09-25:batch1-v1`, historical retired_at `2026-09-24 16:02:45+00`.

## Root-cause boundary

- The restoration ledger row and restored live Polity rows report PostgreSQL `xmin=33409`.
- The three currently conflicting tombstone rows all report `xmin=33416`; the following Japan preferred-name correction ledger row reports `xmin=33418`.
- This indicates the currently visible tombstones were materialized in one later database transaction than the committed restore run. PostgreSQL MVCC transaction identifiers do **not** establish the caller or exact mechanism. An unexpected reinsert, reconciliation replay or import remains possible; no root cause is yet proven.
- No SQL triggers were found in `information_schema.triggers` on `atlas_v2.polities` or `atlas_v2.polity_identity_retirements`. This does not exhaust application-side writers or out-of-band data work.
- Restoration service would fail `verifyRestored` for the present state. Replaying the old `restore_retired_polity` request is **not safe**; the live Polities already exist and the correction ledger is committed.

## Corrective work / authority gate

**Outcome:** restoration state is substantively live and Authoring/Runtime verified; active retirement metadata violates the designed restore contract. The old 12 Activity links must not be reconnected, rolled back or deleted.

Any **actual removal of the three conflicting retirement rows requires explicit user permission**, per standing ATLAS deletion rule. Before any change:

1. Capture a fresh exact Production snapshot for all three Polity IDs, preferred names, source links, 12 Activities, Runtime projection and exact retirement rows, including `source_case_id`, `review_reason`, `retired_at`, and ledger provenance.
2. Verify no new concurrent revisions or legitimate later re-retirements; investigate write/reinsert source if historical logs exist. Fail closed on ambiguity.
3. Use a reviewed, auditable, narrowly scoped canonical Correction operation (new exact-before stale-tombstone reconciliation contract if needed), not ad-hoc SQL, with approved authorization. Preserve historical decision provenance in the correction ledger and existing archived requests, do not destroy history.
4. Exact post-write verify: 3 Polities live, original 12 Authoring/Runtime Activities and all named/source evidence preserved, conflicting tombstones **0**, correction replay safe. Validate CI and document disposition.

**Until authorized and verified:** maintain this as `CONFIRMED_CONTRACT_VIOLATION / REMEDIATION_HELD_FOR_APPROVAL`. Do **not** label the tombstone defect repaired. Do not park or delete the three valid Japanese Polities.

## Sequencing and next unit

- `POLITY-P1-02` investigation concluded with a confirmed and scoped metadata defect; deletion-dependent remediation remains explicitly held.
- **Next independently executable bounded unit:** `POLITY-P1-03` — Place authority/backfill environment discrepancy, read-only first; P14 Geometry stays user-parked.
- Then `POLITY-P1-04` — 22 zero-Activity Polity triage without blind deletion.
- Keep the 25 seeded `REVIEW_REQUIRED` cases unchanged; first historical-family seed after P1 is France. Final project acceptance still blocks on unresolved confirmed tombstone defect.
