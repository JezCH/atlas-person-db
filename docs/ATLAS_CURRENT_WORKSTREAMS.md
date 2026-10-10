# ATLAS CURRENT WORKSTREAMS

**Current-state board — 2026-10-10 (KST).** Historical progress narratives, merged PRs, audit snapshots and long issue comments are **evidence**, not a task queue. This file contains only active scope, blockers, authoritative pointers and the next independent resume point. Verify fresh Production state before any mutation.

## 1. Authority and execution

- **Canonical data:** `atlas_v2` Production, normalized UUIDs; Authoring → Compile → Runtime are distinct.
- **Polity review closure ledger:** [`atlas-polity-review-registry.js`](../atlas-polity-review-registry.js) — source of truth for the 75 tracked seeds and statuses. Do not independently maintain a second list of dispositions.
- **Active Polity issue:** [#1895](https://github.com/JezCH/atlas-person-db/issues/1895). Historic candidate snapshot `docs/audits/POLITY_REVIEW_CANDIDATES_20260927_ARCHIVE.txt` is archive-only.
- **Execution contract:** [`WORK_EXECUTION.md`](../WORK_EXECUTION.md). Parallel prepare, resource-scoped before-state preflight, atomic canonical write, one focused postcondition verification. No global single-writer queue or task-level lock.
- **Safety:** source-backed identity, exact UUIDs, no speculative temporal boundaries; destructive deletion/retirement needs explicit user approval. Historical material and previously completed PRs must not be silently replayed.

## 2. Active workstreams

### A. Polity identity / continuity cleanup — #1895

**Registry snapshot: 75 total / 52 terminal / 23 `REVIEW_REQUIRED`** (2026-10-10). This is the tracked seed ledger, **not** a guarantee that all live Polity identities have been audited.

Pending distribution, calculated from the canonical registry:

| Review group | Pending |
| --- | ---: |
| Historical-family continuity | 11 |
| Temporal designation | 2 |
| Korean naming collisions | 2 |
| Territorial / operational rupture | 8 |
| **Total** | **23** |

**Current historical-family result:** `oman-empire-oman` historical-scope audit completed as **MERGE / canonical Oman recommended, execution REVIEW_REQUIRED** because one duplicated 1806–1856 Said reign and legacy Empire retirement require reviewed source-preserving correction plus explicit user approval. Oman `ac7279b2-da5c-42df-a217-ac60f16106ff`, Omani Empire `68c83ef6-0023-5af9-a6e8-26ccf5b8e116`. No Production writes; 75 total / 52 terminal / 23 pending unchanged. [Bounded audit](POLITY_P2_04A_OMAN_IMPERIAL_SCOPE_AUDIT_20261010.md). Next independent family seed for separate user instruction: `saudi-third-state-nejd`. France remains independently approval-gated; Macedonia `KEEP_SEPARATE`, Brazil `FIXED`.

**POLITY-P0-02 closed (2026-10-10):** the stale `western-eastern-jin` `NOT_PRESENT` decision is now `KEEP_SEPARATE`. Exact live Production IDs: Western Jin `77ee4f18-ba76-4e89-a925-431d00b1d214` (Sima Yan 266–290), Eastern Jin `2ab00854-f6fa-458b-8482-e9d1379036ba` (Wang Xizhi 353). Both Person→Polity Runtime detail reads succeeded; latest publication has Authoring 2,523 = Runtime 2,523 and `publication_current=true`. The 311/316 western collapse and 317 Jiankang reestablishment justify separate period/territorial identities while preserving Sima dynastic succession. **Existing 75 / 52 terminal / 23 pending totals unchanged; no Production write.** See canonical registry seed for source/evidence details.

**Active final-acceptance blockers outside the 23 seeds:**

- **Japan `POLITY-P1-02`:** three restored live Polities / 12 verified Activities still coexist with three stale retirement tombstones. The investigation is complete, the data repair is **not**. Remove no rows without explicit user approval and fresh before-state. [Audit](POLITY_P1_02_JAPAN_RESTORATION_TOMBSTONE_AUDIT_20261008.md).
- **Place `POLITY-P1-03R`:** previously connected Supabase showed 0 of 20 Place IDs, 0 of 27 specified Sources and 0 of 23 PolityPlaceFunction facts despite a historical backfill claim. Production deployment→DB identity was not independently proven. Securely verify authority first, then use only a reviewed current writer and read-back; do not resurrect retired one-shot jobs. [Audit](POLITY_P1_03_PLACE_AUTHORITY_AUDIT_20261008.md).
- **France `france-regime-family`:** P2-01A–J were completed and verified, but two zero-Activity old Kingdom/Third-Republic UUIDs remain live; any retirement/deletion is approval-gated. Keep family `REVIEW_REQUIRED`. [Latest checkpoint](POLITY_P2_01J_FRANCE_RESTORATION_JULY_STATE_FORM_20261009.md).
- **Brazil `brazil-regime-family`:** active Person–Polity identity is `FIXED` after Afonso Pena correction and successful Runtime compile. Old `United States of Brazil` zero-Activity row was **not** deleted or retired; do not restart concluded micro-research or claim complete physical cleanup. [Final report](POLITY_P2_03M_BRAZIL_FINAL_REPUBLIC_IDENTITY_CORRECTION_20261010.md).
- **Zero-direct-Activity population:** P1-04 classified 22 rows in the 2026-10-08 snapshot (11 country/state, 6 constitutional/subnational, 5 nonstate scope). They were preserved, **not** treated as automatic deletions; current counts can change as new registrations occur. [Audit](POLITY_P1_04_ZERO_ACTIVITY_CLASSIFICATION_20261008.md).

**Polity finish gate:** terminalize the remaining seeded registry entries; only then run fresh full-Production discovery (false merges, duplicates, ruptures, naming, stale refs, zero-Activity scope, temporal facts). Address any newly confirmed actionable errors. Final acceptance requires reviewed Production/Runtime parity, audit-ledger consistency and disposition of approval-gated defects. `HOLD_UNRESOLVED` requires a documented historical reason. P14 Geometry is excluded and user-parked.

### B. UI information coverage/completeness — #1896

Review **current main**, not archived visual plans. Classify requirements `DONE / PARTIAL / MISSING / STALE_REQUIREMENT / INTENTIONALLY_NOT_EXPOSED`. Only in-scope `PARTIAL` / `MISSING` findings create tasks. Preserve source and authoring visibility, lifecycle history, and measured Spacetime/mobile regression checks; no automatic P14 Geometry work.

## 3. User-selected Person operations (not standing backlog)

- [Candidate review #1374](https://github.com/JezCH/atlas-person-db/issues/1374): user-selected targets only.
- [Registration #1375](https://github.com/JezCH/atlas-person-db/issues/1375): the actual current backlog authority is `atlas_v2.person_registration_candidates` through `/api/atlas-read?__atlas_read_surface=registration-queue`, with `person_id IS NULL` defining pending. Old issue comments/JSON/queue ordering are evidence, not a mandatory drain. Follow reviewed identity, deceased-status, NamuWiki, source and spatial-completeness gates for new Persons.

## 4. Parked / closed — no automatic re-entry

- P14 historical Territory/Geometry: **`PARKED_BY_USER / NOT_ACTIVE / DO_NOT_AUTO_RESUME`**.
- Mass portrait-content production: **`PARKED_BY_USER / NOT_ACTIVE`**.
- Broad legacy registration census (#1793): closed, not an active mass-repair lane.
- CORE v2 / P13, historic #917/#977 global queue or claim model: closed/superseded by current execution contract.
- Historic NamuWiki legacy-drain batches (#820), Person Domain cleanup and old one-shot Place backfill transport: archived. Do not relaunch.
- Completed identity corrections stay terminal unless fresh contradictory **current** evidence is documented. The redundant, unmerged South Africa PR [#1942](https://github.com/JezCH/atlas-person-db/pull/1942) was explicitly closed as superseded by #1943/#1944.

## 5. Resume boundary

**Completed:** `POLITY-P0-02` Western/Eastern Jin registry correction. **Oman P2-04A:** source-backed imperial-scope judgment with exact duplicate-Activity inventory, no write; parent `REVIEW_REQUIRED` pending explicit approval for duplicate Activity/Polity retirement and reviewed Correction. **Next independently reviewable seed:** `saudi-third-state-nejd` only when selected. Japan/Place/France remain separate gates; P14 stays parked. No task-level locks and no Production write authorized by this board alone.

For detailed case history, use the linked immutable merged PRs and `docs/POLITY_*.md` reports rather than appending a new full transcript here.
