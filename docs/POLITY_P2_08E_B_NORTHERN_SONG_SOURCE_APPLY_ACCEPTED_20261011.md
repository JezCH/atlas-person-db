# POLITY-P2-08E-B — Northern Song direct Cambridge Source Production apply, accepted with scope

**2026-10-11 KST.** This report is the **actual Production Correction evidence**, superseding the code-only/pre-apply status in `POLITY_P2_08E_B_CANONICAL_POLITY_SOURCE_WRITER_20261011.md`. This is one non-destructive source-provenance repair, **not** completion of the generic Song dynasty identity/continuity review and **not** Polity-wide closure.

## Evidence chain and precise identity

- [PR #2456](https://github.com/JezCH/atlas-person-db/pull/2456) built the existing canonical Stage2 v2 `assert_polity_source_link` writer: full Integrity CI [run #38069323028](https://github.com/JezCH/atlas-person-db/actions/runs/38069323028) **SUCCESS**, merged SHA `b26cffeb238101e218c7888f651c7f3121c6be53`.
- Actual Vercel Production handler [deployment `dpl_8DWuQjpWvsHH952tPAPwmp2GcmiE`](https://vercel.com/jez-ch/atlas-person-db/8DWuQjpWvsHH952tPAPwmp2GcmiE) **READY** at that exact handler SHA.
- [PR #2458](https://github.com/JezCH/atlas-person-db/pull/2458) introduced only one reviewed source-only execution plan and tests; full Integrity CI [run #38069582547](https://github.com/JezCH/atlas-person-db/actions/runs/38069582547) **SUCCESS**, squash-merged main workflow SHA `92b21b72a8e7bc78f70d71912c1f957220a17514`.
- The **protected Production Correction Apply** [run #38069670948](https://github.com/JezCH/atlas-person-db/actions/runs/38069670948) **SUCCESS** with [immutable execution artifact #11676387444](https://github.com/JezCH/atlas-person-db/actions/runs/38069670948/artifacts/11676387444), ZIP SHA256 **`13cc01e4f878cf6894a9807140e00d4be055f12637576aa541b2edccdb1ee15a`**. Its `atlas-correction-results.json` and individual `-dry_run.json`, `-apply.json` are independently decoded and compared.
- **SHA provenance is not falsely equated:** protected GitHub `workflow_sha=92b21b...`; deployed Production code at canonical commit `deployment_sha=b26cff...`, rebased only via vetted `ATLAS_CORRECTION_TRANSPORT_WORKFLOW_SHA_V2` mismatch-and-retry transport with authenticated GitHub OIDC ref/environment/SHA.

## Exact observed canonical operation

- Target existing Northern Song Polity **`407d91cf-7a97-45e3-81ea-d42a3cbfba35`**.
- Reuse **existing** normalized Cambridge Source **`a8766516-351a-4162-b477-0396f468eafe`**; Ari Levine, *The Reigns of Hui-tsung (1100–1126) and Ch'in-tsung (1126–1127) and the Fall of the Northern Sung*, in *The Cambridge History of China*.
- Source URL: `https://www.cambridge.org/core/books/abs/cambridge-history-of-china/reigns-of-huitsung-11001126-and-chintsung-11261127-and-the-fall-of-the-northern-sung/C1186B649A07ED96C45F2EB2D7318D54`.
- **Exactly one** `assert_polity_source_link` operation. Exact-before pair absent and exact existing normalized Source URL verified inside the same SERIALIZABLE Correction transaction. No new Source, generated locator or join UUID.
- `dry_run` returned **`ok=true,dry_run=true,committed=false,replay=false`**. `apply` returned **`ok=true,dry_run=false,committed=true,replay=false`**; in-transaction exact postcondition/source URL readback passed and signed ledger was committed.

| Count | Before | After | Delta |
| --- | ---: | ---: | ---: |
| **All Production `polity_sources`** | **254** | **255** | **+1** |
| `person_politics_v2` Activities | 2,523 | 2,523 | 0 |
| `person_politics_sources` | 3,889 | 3,889 | 0 |
| Normalized `sources` | 3,354 | 3,354 | 0 |
| Polity identity relations | 0 | 0 | 0 |
| Structural polity relations | 9 | 9 | 0 |
| Governance periods | 11 | 11 | 0 |
| Temporal designations | 59 | 59 | 0 |

Read-only full Baseline A captured **after** the commit: Persons 2,145, Polities 1,158, Activities 2,523, activity sources 3,889, Sources 3,354. **Zero Person, Polity, Activity or existing Source deletion/relink**. The exact global count deltas and normalized assertion after-state are proven; the prior three-Song scope was generic 2 / Northern 7 / Southern 5 and 21 Activity Source joins. A fresh **independent public three-Polity Runtime GET and/or protected Song read-only census is a separate follow-up verification**, not implied by these baseline counts.

Execution request ID: `polity_p2_08e_northern_song_academic_polity_source_20261011_v1`.
Live Activity snapshot digest: `sha256:39dfe08e563ec100abc7fdcc0b46d7609b239d592eeac0664a79f708ff234bcf`.
Executable manifest SHA256: `sha256:11c16c52f72a3f04a0fcde3b89b74cd47b526fa5d1cf5816d67bb86f97e6014b`.

## Independent post-commit canonical replay — SUCCESS, no new insertion

[Checkpoint PR #2461](https://github.com/JezCH/atlas-person-db/pull/2461) passed Integrity [#38070181311](https://github.com/JezCH/atlas-person-db/actions/runs/38070181311) and merged SHA `3649362e00039583c66770cf998546244919286b`. Only non-executable metadata was added to the **same existing** reviewed Source plan; all executed operations, request ID and manifest hash remained unchanged. This deliberately triggered the same allowlisted GitHub OIDC Correction Apply workflow for **independent live existence / exact URL verification only**.

- Protected [Production replay run #38070277196](https://github.com/JezCH/atlas-person-db/actions/runs/38070277196) — **SUCCESS**, [artifact #11676800618](https://github.com/JezCH/atlas-person-db/actions/runs/38070277196/artifacts/11676800618), ZIP digest `sha256:c268719caf29d4f618309da7ba9f5f0862689f9a6b7c4457ead444e87e7f424e`.
- `dry_run`: `ok=true,replay=true,committed=false`; `apply`: `ok=true,replay=true,committed=true` — **existing ledger replay, no second link insert**, verified live existing composite `(polity_id,source_id)` and stored Cambridge Source URL.
- The immutable original manifest SHA256 **still exactly** `sha256:11c16c52f72a3f04a0fcde3b89b74cd47b526fa5d1cf5816d67bb86f97e6014b`, validated in the PR's test and real replay payload. Vercel Production handler stayed `b26cffeb...`, authenticated GitHub workflow SHA was `3649362e...` under existing explicitly gated transport rebase.

## Independent public three-Polity live readback — SUCCESS, exact Activity owners unchanged

[PR #2462](https://github.com/JezCH/atlas-person-db/pull/2462) passed Integrity [#38070527105](https://github.com/JezCH/atlas-person-db/actions/runs/38070527105), merged SHA `21223dc8688b48ec5bbba373376d11dbfd813b70`, and triggered a **GET-only** public-production verification. [Readback run #38070612532](https://github.com/JezCH/atlas-person-db/actions/runs/38070612532) **SUCCESS**; [artifact #11677035900](https://github.com/JezCH/atlas-person-db/actions/runs/38070612532/artifacts/11677035900) ZIP digest `sha256:a0ebb0dcc20871d0d08eabfe86f50b9f859443659a32514e3641b3c519fa5f40` includes the real before/after deployment identities and three public Polity JSON bodies.

- GET Production `atlas-polity-read/v1` activity-counts: **generic Song 2, Northern Song 7, Southern Song 5** — **14 distinct Activity UUIDs; duplicates zero**.
- Generic Song retains original **Taizu `4638676d-58de-5873-b2e8-a917a0f5cccf` and Shenzong `d94907ae-eac0-518d-a26d-03adfb9534fb`**.
- Southern Song retains **both Gaozong Activities `4517af83-d656-47b0-a558-3a3df717f726` and `d5eaf14b-417d-4ed9-a594-d819314a1ff5`**.
- Both initial and final public Runtime identity responses report **Vercel Production `main` SHA `b26cffeb238101e218c7888f651c7f3121c6be53`**, no alias swap during the three GETs. Public test's workflow SHA `21223dc...` is not silently equated with deployed handler SHA.
- **Scope:** the public Polity detail response **does not expose `polity_sources`**. This GET confirms preserved public Activity ownership, **not public UI Source visibility**. Actual Cambridge Source join storage is independently proven by original protected apply **and** the separate protected no-write replay. Do not infer a public source card exists.

**Scoped P2-08E-B outcome: ACCEPTED as canonical Source insertion + transactional live Source replay + independent public three-Polity Activity readback.** The separate Song dy­nastic continuity/umbrella policy remains open and must not be conflated with this source-only closure.

## Historical interpretation still OPEN

- Northern Song and Southern Song remain **distinct operated court Polities** (1127 rupture), while the **Zhao Song dynasty itself continued**. `northern-southern-song` is already `KEEP_SEPARATE` — do not reopen a completed boundary without contradictory evidence.
- Protected original Song preflight found **zero live `polity_identity_relation_types` vocabulary rows** and zero Song-family identity relations. Thus no existing supported continuity relation can be asserted, and the structural dependency relation table must **not** be misused.
- The two generic Song Activities (Taizu 960–976 and Shenzong 1067–1085) retain their original generic Song UUID and source enrichment. **No retirement, deletion or relink without explicit user authorization.**
- `song-generic-polity-activity-ownership` remains **PARTIAL_REPAIR**. The 75 tracked registry seeds are **63 terminal / 12 `REVIEW_REQUIRED`**; there is **no increment** from this subrepair.
- The overall #1895 goal requires remaining 12, Japan restored-Polity retirement tombstone adjudication, Place authoritative DB mismatch, France old Polity approval gates, Sweden historical designation, fresh *full Production* unseeded identity/source/temporal/KO naming census and verified Authoring→Runtime parity. P14 geometry remains user-parked.

**Next task:** verify independent replay-only readback, then assess the Song dynasty continuity vocabulary/authority in a separately reviewed, non-destructive modeling unit; proceed with independent remaining Polity seeds when a continuity writer is blocked.
