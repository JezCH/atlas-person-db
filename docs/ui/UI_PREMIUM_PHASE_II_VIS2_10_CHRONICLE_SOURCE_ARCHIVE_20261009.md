# ATLAS Premium Phase II — VIS2-10 Chronicle / Source archival finish

**Date:** 2026-10-09 · **Work unit:** VIS2-10 only · **Tracker:** [#2158](https://github.com/JezCH/atlas-person-db/issues/2158).

## Scope and preservation

The existing `atlas-person-chronicle-detail.css` already supplies the Person Detail chronology rail, activity sequence, expandable evidence inspector, chronology boundaries, and Source register. VIS2-10 adds a small removable, paint-only `atlas-person-chronicle-source-archive-v2.css`, linked after the previously accepted VIS2-09 hero frame. The stylesheet refines the existing timeline rail/dots, evidence disclosure material, and source separators/links/focus outlines. It does not create new source data, reorder Activities, change Person/Polity associations, alter status or domain semantics, resize type or geometry, add Person main cards/portraits, edit Spacetime, or modify authoring.

**Feature:** [PR #2238](https://github.com/JezCH/atlas-person-db/pull/2238), merged `05f2b8b5b90c5cd886be4a43cdc69337b0e05dea`; includes narrow style-allowlist static regression test and an opt-in exact-SHA Chrome A/B verifier.

## Evidence corrections before acceptance

1. **Gate marker:** initial production verifier accidentally retained an inherited VIS2-09 property name. [PR #2246](https://github.com/JezCH/atlas-person-db/pull/2246), merged `38b6ca39c094b472d2b41356e625643cad3f1e61`, corrects the activation check. The subsequent exact [Production run #37864013991](https://github.com/JezCH/atlas-person-db/actions/runs/37864013991) was SUCCESS, with 6/6 production cases, but screenshot review found its first-viewport captures did not show the relevant Chronicle/Source content.
2. **Scroll to target:** [PR #2250](https://github.com/JezCH/atlas-person-db/pull/2250), merged `0b14351ab7bfe1650926546042db64ba48c04ace`, captures distinct existing Chronicle / Evidence / Sources regions on both A and B. [Production run #37865276497](https://github.com/JezCH/atlas-person-db/actions/runs/37865276497) was SUCCESS, 6/6 and 24 VIS2-10 PNGs, but manual inspection found Person-level Sources correctly empty, while the three real source items actually lived inside collapsed Activity Evidence details. A green test with hidden source links was not accepted as final visual proof.
3. **Actual expanded citations:** [PR #2251](https://github.com/JezCH/atlas-person-db/pull/2251), merged `0b68ea36d572facef78f0a2b55faf3b46279867a`, opens the existing first Activity Evidence disclosure for each production case, snapshots the open state, requires existing source rows, and scrolls to an actual expanded `.person-source-item`. This changes verifier only, not application/UI data or user defaults.
4. Initial [run #37873047294 attempt 1](https://github.com/JezCH/atlas-person-db/actions/runs/37873047294) FAILED before Chrome verification: localhost CDP port 9222 did not start. Its exact SHA parity nevertheless matched all **26/26** production assets, and only parity JSON was uploaded. GitHub's failed jobs were retried, without a product change, as **attempt 2**.

## Final exact-SHA Production acceptance

- [GitHub Actions Chrome run #37873047294, attempt 2](https://github.com/JezCH/atlas-person-db/actions/runs/37873047294): **SUCCESS**, source/deployed SHA `0b68ea36d572facef78f0a2b55faf3b46279867a`.
- [Final evidence artifact #11591581130](https://github.com/JezCH/atlas-person-db/actions/runs/37873047294/artifacts/11591581130): downloaded and examined, **169 entries**, **152 PNGs** (including **24 VIS2-10 A/B screenshots**).
- `vis2-10-production-chronicle-source.json`: **PASS 6/6** against actual Production data:
  - 390px: Narmer (1 Activity, 3 source rows), Fu Hao (2 Activities, 3 source rows)
  - 768px: Narmer (1 Activity, 3 source rows)
  - 1440px: Narmer (1 Activity, 3 source rows), Fu Hao (2 Activities, 3 source rows)
  - 1600px: Narmer (1 Activity, 3 source rows)
- Captures: **390px and 1440px × Narmer/Fu Hao × Chronicle/Evidence/actual expanded Sources × before/after**, 12 complete matched pairs. Same-live-DOM checks preserve Person title, primary domain semantic ink, portrait state, Activity/source counts, expanded evidence state, text, fonts, all sampled bounding boxes and scroll dimensions, register row count, no register portraits, and no page horizontal overflow.

### Manual screenshot and pixel examination

All twelve captured A/B pairs were pixel-compared and reviewed together in a contact sheet. Full-resolution **1440px Narmer Sources** and **390px Fu Hao Sources** B screenshots were then opened individually. The production references, linked citations and source annotations are legible *inside the expanded Activity Evidence* on mobile and desktop; A/B reveal restrained archival paint changes without content or geometry drift. Person-level `04 SOURCES` legitimately remains empty for these samples and was not populated with fabricated records.

| View | 390px Narmer | 390px Fu Hao | 1440px Narmer | 1440px Fu Hao |
|---|---:|---:|---:|---:|
| Chronicle changed pixels | 3.747% | 3.749% | 7.211% | 4.265% |
| Evidence changed pixels | 23.886% | 14.868% | 7.196% | 5.320% |
| Expanded Sources changed pixels | 20.276% | 13.829% | 7.196% | 4.545% |

These percentages compare complete viewport images, not just the source-row rectangles. They are descriptive visual evidence; no historical data values or geometry changes are inferred from pixel percentages.

**Final verdict: ACCEPT VIS2-10 — Production verified and signed off.** Resume at **VIS2-11 Polity / Dashboard finish on the next user turn only**; do not begin VIS2-11 here.
