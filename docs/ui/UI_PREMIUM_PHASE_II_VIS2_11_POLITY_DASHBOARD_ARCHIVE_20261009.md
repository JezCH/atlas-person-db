# ATLAS Premium Phase II — VIS2-11 Polity / Dashboard archival finish

**Date:** 2026-10-09 · **Unit:** VIS2-11 only · **Tracker:** [#2158](https://github.com/JezCH/atlas-person-db/issues/2158)

## Duplication audit and scope lock

Existing **Polity V10 / POLITY-LUX1** already owns the canonical Polity browser, selected dossier, historic designations, governance records, directly linked people, six summary metrics, search/filter and expanded detail. Existing **Dashboard V11 / DASH-LUX1** already owns the graphite operation ledger, six KPI metrics, attention items, field progress, Polity concentration and source/review data. VIS2-11 must **not** recreate these modules, their facts, or interaction flows.

[Implementation #2264](https://github.com/JezCH/atlas-person-db/pull/2264) adds one independently removable `atlas-vis2-11-polity-dashboard-archive.css`, lazily loaded only in those two domains after their respective canonical styles. Its scoped paint-only changes refine existing Polity summary/cards/open-row/dossier material and existing Dashboard hero, neutral KPI plaque, panel-head line and progress-track edge. No identity/Activity/Polity content, source/provenance, actual dashboard statistics, 8 semantic Person colors, selection/search/filter/route, Person main table, historic portrait, Spacetime X/Y/camera/LOD, geometry, font or grid is altered.

## Production-gate corrections before acceptance

1. [Implementation #2264](https://github.com/JezCH/atlas-person-db/pull/2264) passed Integrity and merged as **`dd36220715d0ab0d6b83437653316ae8623034a1`**.
2. [Exact-SHA Production #37886521847 attempt 1](https://github.com/JezCH/atlas-person-db/actions/runs/37886521847) failed **before Chrome tests** because localhost CDP port 9222 did not start. Failed-job retry (attempt 2) got through all prior VIS2-00..10 regressions but the new Polity check timed out: the verifier clicked static nav HTML before its JavaScript listener had necessarily initialized.
3. [Verifier repair #2266](https://github.com/JezCH/atlas-person-db/pull/2266) waits for `ATLAS_MAIN_AUTHORITY_NAV.showDomain`, uses that existing public function and confirms `getDomain()`; merged **`9ee03bf546ea182d8205830bb33995f1e707a044`**. [Production #37887695692](https://github.com/JezCH/atlas-person-db/actions/runs/37887695692) passed real **390px Polity** but flagged 390px Dashboard: only one archive paint target changed. Existing Dashboard CSS was injected after the shared finishing CSS when navigating Polity → Dashboard.
4. [Cascade/load-order repair #2267](https://github.com/JezCH/atlas-person-db/pull/2267) re-appends the **same existing** finish `<link>` to `document.head` after either domain-specific base stylesheet loads, preserving asset de-duplication, semantics and no new UI DOM. The static regression test enforces both lazy-load calls. It also runs VIS2-11 Production A/B first, before the longer unchanged gates, so actual failures surface promptly. #2267 passed Integrity and merged as **`f59658f719214954defc753e5ec095279247240a`**.

## Final exact Production acceptance

- [Chrome workflow #37888798496](https://github.com/JezCH/atlas-person-db/actions/runs/37888798496) **SUCCESS**, source/deployed SHA **`f59658f719214954defc753e5ec095279247240a`**, attempt 1.
- Same-SHA **ATLAS Integrity, CORE Final Acceptance and Dashboard Production Acceptance also SUCCESS**.
- [Final artifact #11597482499](https://github.com/JezCH/atlas-person-db/actions/runs/37888798496/artifacts/11597482499) verified: **186 entries, 168 PNGs and 18 JSON reports**. `vis2-11-production-polity-dashboard.json` is **PASS** with **8/8 actual Production cases** (390/768/1440/1600 × Polity/Dashboard).
- Actual Polity case: **12 real initial browser cards** per width (canonical live source); Dashboard case: **six KPI elements** per width. All eight before/after comparisons preserved existing panel/root text, polity card/person counts, KPI/panel counts, domain colors and other swatches, font metrics, element bounding boxes and scroll dimensions, and zero new page horizontal overflow.
- Observed paint targets: all Polity cases changed **hero + card + open summary + dossier**; all Dashboard cases changed **hero + panel-head**. Existing Dashboard KPI/card paint can still be controlled by legacy actionable KPI selectors; VIS2-11 does not override metrics or action-state semantics to force unneeded changes.
- Screenshot evidence: **16 VIS2-11 images = eight matched OFF/ON A/B pairs**, comprising 390px and 1440px × Polity/Dashboard × heading/detail. All pairs were opened together and pixel-compared; the mobile and desktop screenshots visibly show unchanged labels/counts/layout and restrained material differences.

| Domain | Width | Heading changed pixels | Detail changed pixels |
|---|---:|---:|---:|
| Polity | 390 | 19.1922% | 8.1763% |
| Polity | 1440 | 16.8706% | 28.2887% |
| Dashboard | 390 | 3.4029% | 0.2139% |
| Dashboard | 1440 | 2.1414% | 0.1522% |

Percentage refers to RGB pixels that differed in full-viewport A/B screenshots, not changed facts or changed layout. The broader Polity changes reflect existing record plaque surface gradients; Dashboard edits are concentrated in restrained ledger hairlines and hero edges.

**Final verdict: ACCEPT VIS2-11.** Keep **VIS2-12 — global interaction / reduced-motion consistency** NOT STARTED until the next explicit user turn under the one-work-unit response barrier.
