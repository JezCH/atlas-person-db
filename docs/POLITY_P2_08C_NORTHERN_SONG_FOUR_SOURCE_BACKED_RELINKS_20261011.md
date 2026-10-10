# POLITY-P2-08C — Northern Song 4 independently sourced emperor / regent relinks

**2026-10-11 | One source-backed, non-destructive Production Correction batch; no retirement of generic Song Dynasty and no deletion.**

## Decision and why this batch contains exactly four

The canonical Production contains distinct generic Song dynasty `1a1983fd-1850-5756-877c-3d2c17b85e1f` and operative Northern Song `407d91cf-7a97-45e3-81ea-d42a3cbfba35` Polities. Reviewed [P2-07D case](POLITY_P2_07D_NORTHERN_SOUTHERN_SONG_CONTINUITY_AND_OWNERSHIP_20261010.md) established that Northern (960–1127) / Southern (1127–1279) are distinct operating regional court-period representations within a historically continuous Song dynasty. [The Metropolitan Museum of Art, *Northern Song Dynasty (960–1127)*](https://www.metmuseum.org/essays/northern-song-dynasty-960-1127) explicitly names Northern Song's 960–1127 period and Emperor Huizong. [The University of Hong Kong 2017 thesis on Dowager Liu](https://hub.hku.hk/handle/10722/250719) independently confirms her 1022–1033 regency during Renzong; this is **not** an imperial sovereign reign for Liu E. Additional already-canonical direct Cambridge/Met/University of Virginia bibliography supports all four dated political Activities.

Authoritative source-preserving OIDC audit [#38062024027](https://github.com/JezCH/atlas-person-db/actions/runs/38062024027) exposed the exact existing Activity UUIDs and original Source IDs/locators, while Production [#38062968150](https://github.com/JezCH/atlas-person-db/actions/runs/38062968150) and [Runtime Compile #38063018927](https://github.com/JezCH/atlas-person-db/actions/runs/38063018927) already fixed the separate Gaozong Southern Song two-reign owners. Fresh current public Production confirms only six generic pre-1127 Song Activities remain.

Four have **direct reviewed original external bibliographic Activity sources**. Exactly these four owner-attribution rows are safe to target in the operative court scope; **none** is a synthetic new Person/Activity or invented date. The remaining Song Taizu `4638676d-58de-5873-b2e8-a917a0f5cccf` (960–976) and Shenzong `d94907ae-eac0-518d-a26d-03adfb9534fb` (1067–1085) currently retain `legacy_asserted / exact_as_recorded` with only repository dataset sources. **Exclude** from this write until scholarly source enrichment, explicit umbrella-versus-operating-entity policy and validated original state make source-quality improvements possible. Do not thereby claim their Northern Song historical placement is doubtful.

## Four exact before/after target Activities

| Existing Person | Stable Activity UUID | Existing year-only Activity | Original normalized Source links | Owner change |
|---|---|---|---:|---|
| Zhenzong / 송 진종 | `591435fa-a6bf-4254-8bec-e35f060a8323` | 997–1022 | Cambridge Journal + Cambridge History (2) | generic Song → Northern Song |
| Liu E / 황태후 유아 | `283d97e4-ea1f-4f13-aa40-0bb5f465cbb8` | 1022–1033 | University of Virginia research (1) | generic Song → Northern Song |
| Renzong / 송 인종 | `4fb84f85-8dad-45d3-9eee-29a29ec8bb7e` | 1022–1063 | Cambridge History (1) | generic Song → Northern Song |
| Huizong / 송 휘종 | `045bd588-9848-4b4a-a87f-17fc6313c7d1` | 1100–1126 | Met + Cambridge History (2) | generic Song → Northern Song |

The **six normalized Source UUID + original locator pairs** are indexed in machine-readable `evidence.target_sources` in the reviewed plan and **must compare equal in the before and after Correction transaction**. No Source deletion, added unauthorized source, person identity merge, time/basis/relation replacement, or auto-invented calendar precision. Liu E's relation `governs` and Empress Dowager Regent role ID `18d682df-2be3-52f2-a879-35090759f6f5`, period basis `e78bcf72-81e3-5db8-a76a-8c2ca9c6d745` are preserved; Renzong remains the coexisting reigning emperor from 1022 to 1063. This is historically concurrent government, not duplicate emperor Activities.

## Canonical exact-before release and acceptance

The `atlas-stage2-correction-v2-execution-plan/v1` plan `corrections/plans/polity-song-northern-four-source-backed-relinks-20261011.v1.json` preserves `production_executable:false` / `production_mutation_authorized:false` and relies on the protected same-SHA OIDC Production correction pipeline to independently fetch **fresh exact before** and fail closed if any record/source/Polity diverges. It makes **only** four existing `polity_id` changes. On apply success, require successful Runtime compile and real public Person+3 Polity readbacks, four exact original Activity IDs, 6 original source pair links, Liu E role non-imperial, unchanged year granularity and count preservation: generic 6→2; Northern 3→7; Southern 5 unchanged; **14 total**.

This unit can be marked fixed only after source-level canonical before/after and Runtime acceptance evidence. The overall `song-generic-polity-activity-ownership` gate remains **PARTIAL_REPAIR** due the two legacy-only generic ruler cases, Northern Song's previously 0 direct Polity Source links, no authored 3-way dynasty/period identity continuity relation and source authority for generic umbrella; do **not** physically retire the generic Polity without explicit authorization. All 75 seed ledger / 63 terminal /12 pending and whole Production/Authoring–Runtime discovery are untouched.
