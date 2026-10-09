# ATLAS Premium Phase II — VIS2-13 Final Production Screenshot / Regression / Acceptance Signoff

**Date:** 2026-10-09  
**Unit:** VIS2-13 final; this report closes VIS2-00..13 only  
**Tracker:** [#2158](https://github.com/JezCH/atlas-person-db/issues/2158)  
**Decision:** **ACCEPT Phase II VIS2-00..13**, including VIS2-05 **REJECT / DEFAULT OFF** (not adopted).  
**Historical-data / geometry scope:** no Phase II changes to canonical Person/Activity/Polity records, Person main-register density, domain semantics, Spacetime X/Y/time projection/camera/LOD or authoring.

## 1. Feature and verifier provenance

- [PR #2284](https://github.com/JezCH/atlas-person-db/pull/2284) adds **read-only** `scripts/verify-vis2-13-production-keyboard-density.mjs` and `scripts/verify-vis2-13-production-final-acceptance.mjs`, static scope test and workflow integration; Integrity **SUCCESS**. It does not modify product CSS/HTML rendering, business JS, database or historical sources.
- Initial [Production Chrome #37898772565](https://github.com/JezCH/atlas-person-db/actions/runs/37898772565) correctly demonstrated keyboard focus-visible at 390px for Person/Polity/Dashboard, but its new Spacetime case rejected a genuine focused **zoom button** because delayed track-label count was still zero at initial frame readiness. The failure was a verifier cardinality error, **not a failing Spacetime keyboard focus**.
- [Verifier-only correction PR #2286](https://github.com/JezCH/atlas-person-db/pull/2286) requires the real Spacetime frame and focusable zoom control to exist; the existing dedicated Spacetime regression and full historical capture matrix remain authoritative for actual track/label data. PR Integrity **SUCCESS**. No product source changed.
- **Final exact merged source/deployed SHA:** `6b16b894e427fab6b15e3a3d0b6c000f6cb9e365`. [Production visual workflow #37899108152](https://github.com/JezCH/atlas-person-db/actions/runs/37899108152) **SUCCESS**, attempt 1.
- [Final Production artifact #11602595861](https://github.com/JezCH/atlas-person-db/actions/runs/37899108152/artifacts/11602595861) downloaded and integrity-tested: **221 entries, 200 real PNG screenshots, 21 JSON reports**, valid ZIP (no CRC errors).
- `vis2-13-production-final-acceptance.json`: **AUTO_GATES_PASS_PENDING_MANUAL_REVIEW** at the stated SHA. That status is intentional: CI cannot itself grant aesthetic approval; human/visual inspection in this signoff supplies the additional decision.

## 2. Complete automatic regression matrix

| Acceptance group | Final outcome |
| --- | --- |
| Exact Production GitHub asset SHA / 26-asset parity | **PASS** |
| Existing Spacetime visual, domain color, Person V10/P6, Polity production gates | **PASS** |
| VIS2-00 real Production baseline four widths | **29 captures, reviewed** |
| VIS2-01 material scale | **PASS** |
| VIS2-02 engraving | **4/4 PASS** |
| VIS2-03 typography | **4/4 PASS** |
| VIS2-04 time-axis tick geometry | **6/6 PASS**, 500/1000/1500% |
| VIS2-05 rejected watermark | **REJECT**: production candidate shipped **false**, default **OFF** |
| VIS2-06 instrument marginalia | **8/8 PASS** |
| VIS2-07 Person main register inscription | **8/8 PASS** |
| VIS2-08 Person selection/keyboard focus | **16/16 PASS** |
| VIS2-09 genuine portrait/detail hero | **7/7 PASS** |
| VIS2-10 Activity chronology / expanded sources | **6/6 PASS** |
| VIS2-11 Polity / Dashboard archival finish | **8/8 PASS** |
| VIS2-12 reduced-motion / normal-motion preservation | **8/8 PASS** |
| **VIS2-13 additional genuine keyboard / density tests** | **16/16 PASS**, 16 new PNGs |
| Final automatic report + PNG file/hash validation | **PASS pending independent visual inspection**, completed below |

Automatic manifest verifies **18 required prior acceptance reports** at the exact SHA, the special reviewed states for the baseline/rejected watermark, all expected referenced files, at least **29 core baseline states**, all domain × 390/768/1440/1600 screenshots, and two macroregion states at **Spacetime 500%, 1000% and 1500%**. It records **200 PNG files / 205 screenshot references / 199 distinct referenced PNGs** (one additional diagnostic image exists and is not falsely counted as an accepted reference).

## 3. VIS2-13 real-browser keyboard and responsive density

- Actual Chrome `Input.dispatchKeyEvent(Tab)`, followed by focus on the native/focusable real control, verifies `:focus-visible`, a visible **1px** ring, nonempty control, screen placement, zero extra page horizontal overflow and true live records, not a synthetic-only pseudo-class.
- **390 and 1440 CSS px** × Person, Polity, Dashboard, Spacetime = **8/8 baseline keyboard cases PASS**.
- Physical 1440px with **125% browser-zoom-equivalent effective width 1152 CSS px / DPR 1.25** and **150% effective width 960 CSS px / DPR 1.5** × all four domains = **8/8 further cases PASS**. These are browser emulations of effective CSS viewport + raster density, not a claim of having manipulated the user's Chrome browser zoom setting.
- Real data/control observed in these cases: Person initial table **2,120 rows**, Polity initial page **12 cards**, Dashboard **6 KPIs**, actual Spacetime frame and native zoom button. All have genuine shared focus ring. Zoom does not alter the Spacetime historic time projection or the UI's actual camera setting.

## 4. Independent visual inspection (after automatic run)

Inspected in a combined **16-screen keyboard/density contact sheet** and an additional **20-screen cross-Phase baseline sheet**, then opened full-size representative captures: 390px focused dense Person row, 150% Polity data/filters/cards, 150% Spacetime canvas and actual zoom-button focus, 1500% Europe Spacetime track labels and years, and multi-Activity Person Evidence expanded with real source links.

- The desktop and mobile Person register **remain densely tabular**, with original domain ink/rail and existing rows/columns, not cardified. Names, BC/AD year labels and active focus outline remain legible.
- Polity canonical dataset and filters are rendered at all scales; 150% records/metrics/cards are legible and do not overflow the page. No Polity identity, Activity or relation numbers were rewritten by VIS2.
- Dashboard operational KPI, neutral graphite ledger, active controls and semantic color indicators retain hierarchy with 390 and 1440, and at 125/150% effective zoom.
- Spacetime 500/1000/1500% baseline captures show unchanged century/time-axis chronology and visible historical tracks; the 1500% Europe capture includes year labels and numerous real Activity markers. No camera/X/Y/time alignment adjustments in VIS2.
- Person Detail actual historical sources are present **within expanded per-Activity Evidence**. Empty person-level Sources in the same genuine sample must not be falsely classified as missing Activity sources. Portraits use real existing records only; no fabricated substitute.
- The VIS2-05 decorative watermark remains **unshipped**, per prior user-facing rejection.
- No visible clipping, unexpected shifted panels or semantic recoloring was found **in inspected screenshots**. This is a scoped real-Production visual signoff; it does not assert exhaustive every-person/per-pixel universal correctness or claim active workflow coverage not in the evidence.

## 5. Concurrency / full-suite provenance and remaining limitations

The exact-sha visual workflow #37899108152 **SUCCESS** is the authoritative Phase II production gate. Feature PR #2284 and verifier repair #2286 each passed their own ATLAS Integrity checks. Independent **main-push** CORE and Integrity runs for this visual SHA were **cancelled** under concurrent CI activity; they are **not** claimed green.

Concurrently, later `main` advanced by three separate YouTube workstream workflow/test edits and a Brazil Polity review-registry/audit update. The changed paths do **not** include Phase II design CSS, Person main register source, Spacetime renderer/camera/axis or visual acceptance scripts. This decision certifies the **exact pinned and inspected deployed visual SHA** above; it does not mislabel later unrelated commits as the SHA inspected. The user’s concurrent data/Polity work is a separate acceptance surface.

## 6. Final decision and work-unit boundary

**ACCEPT VIS2-13. All Phase II VIS2-00..13 work units have a documented disposition and supporting real Production evidence; VIS2-05 remains the explicitly REJECTED non-shipping experiment.** The focused, responsive, reduced-motion and historical data/screenshot regression gates passed at the exact Production SHA, followed by full-size targeted manual screenshot review.

**Phase II visual track: CLOSED.** Do not autonomously begin Phase III, P14, Polity cleanup, new Person data work or external image generation in this response.
