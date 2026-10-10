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

**Registry snapshot: 75 total / 58 terminal / 17 `REVIEW_REQUIRED`** (2026-10-10). This is the tracked seed ledger, **not** a guarantee that all live Polity identities have been audited.

Pending distribution, calculated from the canonical registry:

| Review group | Pending |
| --- | ---: |
| Historical-family continuity | 5 |
| Temporal designation | 2 |
| Korean naming collisions | 2 |
| Territorial / operational rupture | 8 |
| **Total** | **17** |

**Current temporal-designation result:** `russia-temporal-designation` remains **`REVIEW_REQUIRED` / `suggested_action=repair`** after source-backed Production and resolver audit. A single current Russian Empire Polity `dd07fc4c-b3ac-59ac-bdf2-9cc190893327` links **12** Activities (1547–1917), including Ivan IV Tsar `d6cdaf3b-2eab-4b98-8a17-b9c42342534f` (1547–1584), Peter I Tsar `57cdefa5-9a5d-533c-b229-47e398f1d07a` (1682–1721) and Peter Emperor `9ec53325-3a97-58a8-a7e7-81a496a47e57` (1721–1725). **All currently return null temporal designation labels** and so 1547–1721 is displayed as `러시아 제국`; public null does NOT prove absence of underlying designation rows. **Official Moscow Kremlin Museums and original 1721 printed title grant held by Russian Presidential Library** corroborate Tsardom from Ivan IV 1547 and Emperor transition 1721-10-22 **Julian** / 1721-11-02 **Gregorian**. Existing `server/atlas-polity-temporal-designation-read.js` uses full-Activity interval containment and unique designation match; Peter's two **year-granularity 1721** Activities cannot be precisely labeled by simply inserting date-accurate half-year designation rows. Correct exact-date/calendar boundary and actual designation/source-bundle authority first, then approved non-destructive writer + both authoring/runtime field display readback; **not terminal until Production display is repaired**. [Scoped report](POLITY_P2_05A_RUSSIA_TSARDOM_EMPIRE_TEMPORAL_DESIGNATION_20261010.md). Current counts remain **75 total / 58 terminal / 17 pending**, temporal designation pending **2**. **Next independent designation seed:** `sweden-temporal-designation`. All historical-family Indonesia/Chūzan/Oman/Liberia and France/Japan/Place repair/approval gates persist.

**Current historical-family result:** `indonesia-ris-family` **source-backed repair required; retained `REVIEW_REQUIRED`, NOT terminal**. Exact Production: Republic of Indonesia `2682c74a-3404-42be-93ae-9bcc5875a3b0` / United States of Indonesia (RIS) `a0e85099-3cb0-4b9d-94bb-234ae8fcb232` / Sukarno Person `7ef3851e-3927-4600-9953-bc03c15d08f7`, Activities `d27b3368-00ec-442a-9639-df45d4a2898c` 1945-08-18→1949-12-27, `9de8fc17-e187-46f7-8896-82e41cc8233e` 1949-12-27→1950-08-17, `b8a6196b-fecc-4689-85c7-193efb2b2dfc` 1950-08-17→1967-03-12 (all reviewed, day/exact). **ANRI 2017 first-party inventory proves 1949–50 RIS federal sovereign + a parallel RI constituent state at Yogyakarta (one of 16), led by acting RI president Mr. Assaat**, while the live 2,145-Person list has no Assaat match and the RIS-era constituent presidency has no Activity. The 1950 **Federal Law No. 7** preamble affirms **same Indonesian state's unitary→federal→unitary continuity** and confirms separate RIS–constituent RI governments negotiated reunification, with legal effect 1950-08-17. **Do not confuse ANRI's 1949-12-20 formal handover, 1949-12-27 federal constitutional transition, 1950-08-15 Assaat office handback and 1950-08-17 unitary law commencement**; no speculative day corrections. Keep RI/RIS distinct existing phase UUIDs, preserve current sources and all 3 original Activities until source-preserving authoring plan resolves **federal-member RI polity scope/identity** and **Assaat Person/Acting President activity**, routed through user-selected Person registration scope. No Production data mutation, automatic person creation, merger, retirement or deletion. [Detailed evidence/repair contract](POLITY_P2_04J_INDONESIA_RIS_FEDERAL_MEMBER_ASSAAT_AUDIT_20261010.md). Counts **unchanged: 75 / 58 terminal / 17 pending**; historical-family **5** pending, including Indonesia. **Next independent pending seed:** `sweden-temporal-designation` (designation group; other historical-family cases are approval/repair/source-analysis gated). Full Production end gate unchanged.

**Previously terminal:** `gorkha-nepal` `KEEP_SEPARATE` ([Gorkha→Nepal report](POLITY_P2_04D_GORKHA_NEPAL_UNIFICATION_20261010.md)); Oman and Liberia remain approval/repair-gated.

**Approval/repair-gated family:** `liberia-commonwealth-republic` remains `REVIEW_REQUIRED` after [source-backed 1847 sovereignty audit](POLITY_P2_04C_LIBERIA_COMMONWEALTH_REPUBLIC_SOVEREIGNTY_20261010.md): ACS Commonwealth distinct from independent Republic, but `Republic of Liberia` and `Liberia` UUIDs likely duplicate the same Republic; governor office crosses 1847 and is not to be blindly rewritten. Oman remains `REVIEW_REQUIRED` after [canonical Oman MERGE recommendation](POLITY_P2_04A_OMAN_IMPERIAL_SCOPE_AUDIT_20261010.md); no approved deletion of duplicate reign or Empire. **Previously terminal:** `saudi-third-state-nejd` `KEEP_SEPARATE`, [historical phase review](POLITY_P2_04B_SAUDI_STATE_PHASES_1902_1932_20261010.md). France/Japan/Place approval/authority blockers persist. Macedonia `KEEP_SEPARATE`; Brazil `FIXED`.

**POLITY-P0-02 closed (2026-10-10):** the stale `western-eastern-jin` `NOT_PRESENT` decision is now `KEEP_SEPARATE`. Exact live Production IDs: Western Jin `77ee4f18-ba76-4e89-a925-431d00b1d214` (Sima Yan 266–290), Eastern Jin `2ab00854-f6fa-458b-8482-e9d1379036ba` (Wang Xizhi 353). Both Person→Polity Runtime detail reads succeeded; latest publication has Authoring 2,523 = Runtime 2,523 and `publication_current=true`. The 311/316 western collapse and 317 Jiankang reestablishment justify separate period/territorial identities while preserving Sima dynastic succession. **Its earlier closure left the then-current review counts unchanged; later Saudi and Gorkha source-backed classifications yield today's 75 / 54 terminal / 21 pending. No Production write in P0-02, P2-04B or P2-04D.** See canonical registry seed for source/evidence details.

**Active final-acceptance blockers outside the review seed ledger:**

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

### D. Targeted existing-Person correction — #2291 (CLOSED)

[#2291](https://github.com/JezCH/atlas-person-db/issues/2291) is **CLOSED**. Actual Production Person `3f3cb937-b022-4b5c-9380-2a8625b33a2e` (Maimonides) reads `timeline_disposition=timeline` and retains **three** reviewed Activities. Do not reapply this correction, create another Person, or resume the completed cohort-26 batch. Future corrections must be grounded in a different current Production defect and scoped separately.

### E. UI Phase III visual acceptance — separate from #1896

Dashboard restrained mixed-D [#2357](https://github.com/JezCH/atlas-person-db/pull/2357) is **MERGED**, not an open prototype. VIS3-05T-D legibility [#2383](https://github.com/JezCH/atlas-person-db/pull/2383) was verified **Production READY** at `e6abb2e3cccc15d1bca64fb008f8dbff632493a3`; VIS3-05T-E was closed **NO-GO / no code change** in [#2387](https://github.com/JezCH/atlas-person-db/pull/2387). The separate final **user subjective mixed-D aesthetic approval is still pending**.

Spacetime VIS3-06 preparation has advanced to merged actual populated-Person A/B/C non-deploy validation [#2397](https://github.com/JezCH/atlas-person-db/pull/2397) and B2 half-dial non-deploy design comparison [#2402](https://github.com/JezCH/atlas-person-db/pull/2402). **Research or Chrome geometry PASS is not authorization to deploy B2 or start VIS3-07–17**. Follow the UI lane's [Phase III v2 plan](ui/UI_PHASE_III_ORNAMENT_EXECUTION_PLAN_20261009.md), its own signoff and separate [UI information completeness #1896](https://github.com/JezCH/atlas-person-db/issues/1896); do not edit CSS/Spacetime camera/geometry from this master pointer.

Person register [#2403](https://github.com/JezCH/atlas-person-db/pull/2403) is **MERGED** for refresh feedback and sticky-era jumping, but the latest separately attested Production alias at `6ac519b118089716d872c78da7f5bf61d771e9d2` still served **older index/Person JS**. Exact newer deployed SHA and real refresh/jump viewport acceptance remain independent release conditions; do not equate merge with Production availability.

### F. Release / stale-PR housekeeping (read-only routing)

[#2381](https://github.com/JezCH/atlas-person-db/pull/2381) remains **OPEN**, overlapping already-merged VIS3-05T-D [#2383](https://github.com/JezCH/atlas-person-db/pull/2383). UI owner should reconcile its exact diff with current main and consider closing as superseded; **do not re-merge it from this board**. At this checkpoint [#2338](https://github.com/JezCH/atlas-person-db/pull/2338) is a documentation-only Vercel burst-policy proposal and [#2022](https://github.com/JezCH/atlas-person-db/pull/2022) is an older assertion-only CONTROLS-M2 test correction. Neither should be blindly merged because it is OPEN. Compare only its touched files/contracts with current main and close as superseded when appropriate. Avoid extra Production deployments solely to refresh this board.

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

**Master read-only checkpoint (2026-10-10):** Polity tracked registry **75 / 58 terminal / 17 `REVIEW_REQUIRED`**, not full Production completeness; the **next independently reviewable seed is `sweden-temporal-designation`** per the current #1895 / registry frontier. Russia's 1721 title designation, Indonesia RIS constituent government/Assaat and Oman/Liberia remain evidence-and-repair or approval-gated. Japan, France and **Place P1-03R** remain separate authority/repair gates; the existing read-only Place attestation runner has **not** been executed against independently confirmed Production database identity. P14 Geometry stays `PARKED_BY_USER`.

**Other independent gates:** YouTube original-source durability [#2226](https://github.com/JezCH/atlas-person-db/issues/2226) remains open, with no verified long-lived restore, and Batch001–007 provenance unresolved; do not infer new-batch permission from candidate-review PRs. UI #2403 must complete exact Production release and real-browser refresh/jump acceptance; Phase III subjective visual signoff remains separate. User-driven Person review/registration stays user-selected, not a 452-item automatic drain. Continue parallel prepare using `WORK_EXECUTION.md`, with resource-scoped writes only under their own authority. Do not claim all tracked terminal Polities are physically repaired.

For detailed case history, use the linked immutable merged PRs and `docs/POLITY_*.md` reports rather than appending a new full transcript here.
