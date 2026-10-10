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

**Registry snapshot: 75 total / 53 terminal / 22 `REVIEW_REQUIRED`** (2026-10-10). This is the tracked seed ledger, **not** a guarantee that all live Polity identities have been audited.

Pending distribution, calculated from the canonical registry:

| Review group | Pending |
| --- | ---: |
| Historical-family continuity | 10 |
| Temporal designation | 2 |
| Korean naming collisions | 2 |
| Territorial / operational rupture | 8 |
| **Total** | **22** |

**Current historical-family result:** `liberia-commonwealth-republic` source/Production audit reached **historical-identity judgment** but remains **`REVIEW_REQUIRED / reviewed repair pending`**. ACS-governed Commonwealth `5643400c-880b-45f2-8d32-7ad64bf91391` is distinguishable from the post-1847-07-26 sovereign Republic `2ca2fd4c-1d68-4771-beb7-706e4f53370b`; the distinct `Liberia` Polity `5037f747-2d30-4479-b321-6f01b5cba162` also holds modern president Tubman's 1944–1971 Activity, apparently duplicating the same sovereign Republic under a shorter name. Roberts's Governor Activity spans the 1847 independence boundary until his separate Presidential 1848-01-03 start and has an additional 1841 acting/1842 formally appointed role-precision question. **No identity merge, Activity move, retirement, or Production write is approved/executed; preserving existing day-level boundaries and sources is mandatory.** [Bounded audit and exact repair gate](POLITY_P2_04C_LIBERIA_COMMONWEALTH_REPUBLIC_SOVEREIGNTY_20261010.md). **Seed counts unchanged at 75 / 53 terminal / 22 pending;** next independent family review seed: `gorkha-nepal`.

**Previously terminal:** `saudi-third-state-nejd` was classified **`KEEP_SEPARATE`** after [five-Polity/seven-Activity live review](POLITY_P2_04B_SAUDI_STATE_PHASES_1902_1932_20261010.md): 1902 emirate, 1921 sultanate, simultaneous 1926 distinct Hejaz king and Nejd sultan offices, 1927 dual monarchy, 1932 unified kingdom; preserve separate jurisdiction and historical continuity. **Separate approval-gated hold:** `oman-empire-oman` stays `REVIEW_REQUIRED` after [canonical Oman MERGE recommendation](POLITY_P2_04A_OMAN_IMPERIAL_SCOPE_AUDIT_20261010.md); no duplicated reign or legacy Empire was removed. France is independently approval-gated; Macedonia `KEEP_SEPARATE`, Brazil `FIXED`.

**POLITY-P0-02 closed (2026-10-10):** the stale `western-eastern-jin` `NOT_PRESENT` decision is now `KEEP_SEPARATE`. Exact live Production IDs: Western Jin `77ee4f18-ba76-4e89-a925-431d00b1d214` (Sima Yan 266–290), Eastern Jin `2ab00854-f6fa-458b-8482-e9d1379036ba` (Wang Xizhi 353). Both Person→Polity Runtime detail reads succeeded; latest publication has Authoring 2,523 = Runtime 2,523 and `publication_current=true`. The 311/316 western collapse and 317 Jiankang reestablishment justify separate period/territorial identities while preserving Sima dynastic succession. **Its earlier closure left the then-current review counts unchanged; later source-backed Saudi classification yields today's 75 / 53 terminal / 22 pending. No Production write in P0-02 or P2-04B.** See canonical registry seed for source/evidence details.

**Active final-acceptance blockers outside the 23 seeds:**

- **Japan `POLITY-P1-02`:** three restored live Polities / 12 verified Activities still coexist with three stale retirement tombstones. The investigation is complete, the data repair is **not**. Remove no rows without explicit user approval and fresh before-state. [Audit](POLITY_P1_02_JAPAN_RESTORATION_TOMBSTONE_AUDIT_20261008.md).
- **Place `POLITY-P1-03R`:** previously connected Supabase showed 0 of 20 Place IDs, 0 of 27 specified Sources and 0 of 23 PolityPlaceFunction facts despite a historical backfill claim. Production deployment→DB identity was not independently proven. Securely verify authority first, then use only a reviewed current writer and read-back; do not resurrect retired one-shot jobs. [Audit](POLITY_P1_03_PLACE_AUTHORITY_AUDIT_20261008.md).
- **France `france-regime-family`:** P2-01A–J were completed and verified, but two zero-Activity old Kingdom/Third-Republic UUIDs remain live; any retirement/deletion is approval-gated. Keep family `REVIEW_REQUIRED`. [Latest checkpoint](POLITY_P2_01J_FRANCE_RESTORATION_JULY_STATE_FORM_20261009.md).
- **Brazil `brazil-regime-family`:** active Person–Polity identity is `FIXED` after Afonso Pena correction and successful Runtime compile. Old `United States of Brazil` zero-Activity row was **not** deleted or retired; do not restart concluded micro-research or claim complete physical cleanup. [Final report](POLITY_P2_03M_BRAZIL_FINAL_REPUBLIC_IDENTITY_CORRECTION_20261010.md).
- **Zero-direct-Activity population:** P1-04 classified 22 rows in the 2026-10-08 snapshot (11 country/state, 6 constitutional/subnational, 5 nonstate scope). They were preserved, **not** treated as automatic deletions; current counts can change as new registrations occur. [Audit](POLITY_P1_04_ZERO_ACTIVITY_CLASSIFICATION_20261008.md).

**Polity finish gate:** terminalize the remaining seeded registry entries; only then run fresh full-Production discovery (false merges, duplicates, ruptures, naming, stale refs, zero-Activity scope, temporal facts). Address any newly confirmed actionable errors. Final acceptance requires reviewed Production/Runtime parity, audit-ledger consistency and disposition of approval-gated defects. `HOLD_UNRESOLVED` requires a documented historical reason. P14 Geometry is excluded and user-parked.

### B. UI information coverage/completeness — #1896

Review **current main**, not archived visual plans. Classify requirements `DONE / PARTIAL / MISSING / STALE_REQUIREMENT / INTENTIONALLY_NOT_EXPOSED`. Only in-scope `PARTIAL` / `MISSING` findings create tasks. Preserve source and authoring visibility, lifecycle history, and measured Spacetime/mobile regression checks; no automatic P14 Geometry work.

### C. YouTube unregistered-historical-Person discovery — #2318

**Active, independent from user-driven Person registration.** [#2318](https://github.com/JezCH/atlas-person-db/issues/2318) is the operational acceptance owner for one **unregistered historical Person candidate** feed. Current evidence comes from the cumulative original channel/video IDs and the one canonical live discovery read; **do not** re-create the rejected registered-UUID leaderboard or infer that raw candidate-label rows are verified missing Persons.

- Original-ID review and bounded alias work have already advanced through merged [#2355](https://github.com/JezCH/atlas-person-db/pull/2355), [#2356](https://github.com/JezCH/atlas-person-db/pull/2356) and living-alias correction [#2359](https://github.com/JezCH/atlas-person-db/pull/2359). Do not start those exact units again. #2356 intentionally holds Diana/Princess Diana and other ambiguous labels rather than guessing.
- The previously recorded 10,127-channel / 2,230,031-video / 8,053-candidate-row checkpoint is a **historical snapshot**, not a newly verified current result or 8,053 unique historical Persons. Use the current live issue + publication snapshot for newer counts; the #2359 production read-back is not implied by PR merge alone.
- [#2216](https://github.com/JezCH/atlas-person-db/issues/2216) holds the earlier 5,657-name review cohorts and their source-bound evidence. **Do not add 5,657 to the newer 8,053 rows** or automatically repeat already reconciled aliases. Check snapshot lineage and identity-specific overlap before any residual review.
- **Independent preservation blocker:** [#2226](https://github.com/JezCH/atlas-person-db/issues/2226) tracks durable recovery of original video/channel archives. The action-artifact baseline and older batch001–007 source gaps must not be silently called restored. Respect its no-next-crawl-before-verified-migration condition.

**Completion owner:** #2318 for identity/eligibility and candidate feed; #2216 for its historic evidence cohort disposition; #2226 for durable source recoverability. These are separate acceptance conditions, **not three mutually exclusive worker locks**. Candidate selection for canonical Person creation still belongs to user-driven #1374/#1375.

### D. Targeted existing-Person correction — #2291

[#2291](https://github.com/JezCH/atlas-person-db/issues/2291) is an **open, bounded Maimonides timeline-disposition correction**. Three existing source-backed Activities are recorded; `chronology_unresolved → timeline` remains to be applied through the current Person Profile writer after **fresh exact-before** and verified Runtime publication. **Do not** create a duplicate Person, fabricate a lifetime rail, treat the issue as already applied, or reactivate the finished cohort-26 registration batch.

### E. UI Phase III visual prototype — PR #2357 (separate from #1896)

The visually scoped [#2357](https://github.com/JezCH/atlas-person-db/pull/2357) is an **OPEN implementation prototype** of the user-selected restrained Dashboard ornament mix. It is *not* final Production acceptance and is not the #1896 canonical **information-coverage** audit. Its own PR requires current-vs-preview responsive visual comparison and user approval, **not CI-only merge**. The UI lane owns the CSS and visual acceptance; a master-status change does not authorize style, layout, Spacetime geometry, or deployment edits.

### F. Release / stale-PR housekeeping (read-only routing)

At this checkpoint [#2338](https://github.com/JezCH/atlas-person-db/pull/2338) is a documentation-only Vercel burst-policy proposal and [#2022](https://github.com/JezCH/atlas-person-db/pull/2022) is an older assertion-only CONTROLS-M2 test correction. Neither should be blindly merged because it is OPEN. Compare only its touched files/contracts with current main and close as superseded when appropriate. Avoid extra Production deployments solely to refresh this board.

**Master coordination rule:** this board indexes workstream *pointers, scope and precise blockers*; the linked live issue, canonical registry, Person writer, source archive or individual PR remains its own fact authority. No master lane claims exclusive lock or independently updates another lane's progress numbers.

---

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
