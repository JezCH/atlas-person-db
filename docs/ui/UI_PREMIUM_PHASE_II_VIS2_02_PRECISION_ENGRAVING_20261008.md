# ATLAS Premium Visual Phase II — VIS2-02 Precision Engraving

**Date:** 2026-10-08  
**Scope:** Phase II [#2158](https://github.com/JezCH/atlas-person-db/issues/2158), work unit VIS2-02 **only**.  
**Visual before baseline:** exact Production [VIS2-01 run 37787162667](https://github.com/JezCH/atlas-person-db/actions/runs/37787162667), source/deploy SHA `430d5d9e6f1ed30bbbc99b730b0249450753890f`, [44-PNG artifact](https://github.com/JezCH/atlas-person-db/actions/runs/37787162667/artifacts/11555395349).

## Ownership audit and actual intervention

Phase I **already** owns aged-metal hairlines, inset shadows and register-selection rails via `atlas-ui-visual-foundation.css`, `atlas-ui-motion-material-v9.css`, `atlas-person-monumental-register.css`, `atlas-person-spacetime-monumental-canvas.css`, `atlas-person-spacetime-instrument-tools.css`, `atlas-person-chronicle-detail.css`, `atlas-polity-review-workbench.css` and `atlas-dashboard-monumental-v11.css`.

**No duplicate ornaments** on Person rows, Activity rails, Spacetime axes/track labels, Chronicle portrait frames, Polity dossier or Dashboard. No new pseudo-elements, gold hue, 3D frame, drop shadow, canvas decoration, font or route markup.

This work adds one reversible stylesheet, `atlas-ui-precision-engraving-v2.css`, after static V9 in `index.html`. It uses only two aliases to existing global sheen/edge-dark material tokens. The rule groups own just:
- `.topbar, .mobile-appbar`: a quiet inset bottom light plus adjacent outer dark cut, emphasizing the existing actual 1px header divider.
- `.brand, .mobile-brand`: a recessed shadow directly inside the existing brand separator, without touching symbol/text.
- `.person-main-toolbar.card, .authority-shell-head.card`: restrained inset top glint and bottom cut on **passive header panels**, not dense Person rows or controls.

Every rule changes only `box-shadow`. No `border`, `box-sizing`, `width`, `height`, `padding`, `margin`, `grid`, `transform`, `position` or layout property. A single link deletion cleanly reverts VIS2-02.

## Acceptance and non-regression

1. The `tests/vis2-02-precision-engraving.test.mjs` contract asserts exact link order, shared neutral material tokens, only three scoped shadow declarations and no forbidden pseudo/geometry/domain/Spacetime selectors.
2. The existing full integrity tests must remain green (including structural border/hairline, Person, source identity, color semantics).
3. `scripts/verify-vis2-02-production-engraving.mjs` runs inside the exact-deploy-SHA Production Chrome workflow **after** existing Spacetime / Person / Polity verifiers and the VIS2-00/01 capture. It checks 390×844, 768×1000, 1440×1000, 1600×1000. For each viewport it toggles **only the VIS2-02 link** in the identical live DOM and proves that required header/brand/toolbar computed `box-shadow` values change while all their bounding rectangles (≤0.05px tolerance), border widths, Person register counts and page horizontal overflow **do not**.
4. Four A/B PNGs at 390/1440 are produced from the exact same Production render state with the stylesheet OFF/ON, in addition to the existing **29** Phase II and **15** acceptance screenshots. A matched-state photo review (fine header cut vs historical field) must precede signoff.
5. Phase I selectors own focus, selected states, reduced-motion, historical density and Spacetime geometry throughout; none is altered.

**Completion:** **VIS2-02 COMPLETE** — exact deployed source SHA `c31112ffb7ae7245a542d1120c95e805df3ad3b5`, [Production Chrome SUCCESS run 37795440953](https://github.com/JezCH/atlas-person-db/actions/runs/37795440953), [artifact 11557839727](https://github.com/JezCH/atlas-person-db/actions/runs/37795440953/artifacts/11557839727). VIS2-03 remains unstarted in this work turn.


## Production verification and actual visual signoff — 2026-10-08

**Final evidence:** [run 37795440953](https://github.com/JezCH/atlas-person-db/actions/runs/37795440953) **SUCCESS**, SHA `c31112ffb7ae7245a542d1120c95e805df3ad3b5`. Artifact [11557839727](https://github.com/JezCH/atlas-person-db/actions/runs/37795440953/artifacts/11557839727) contains **48 PNGs**: existing 15 acceptance, 29 new Phase II baseline screenshots and four same-DOM engraving ON/OFF pairs (`vis2-02-{with,without}-engraving-{390,1440}.png`). The `vis2-02-production-engraving.json` status is **PASS**.

- Viewports **390×844**, **768×1000**, **1440×1000**, **1600×1000** each emitted `ATLAS_VIS2_02_ENGRAVING_GEOMETRY_PASS`.
- For every compared header, brand and toolbar target: **exactly equal bounding rectangles and computed border widths** with the stylesheet enabled versus disabled. Person row counts, visible/hidden state and page-width limits remain unchanged. The visible header shadow changes exactly as intended.
- The browser confirmed the opt-in CSS was loaded and the root `--atlas-engraving-light` / `--atlas-engraving-cut` values were present, removed and restored across the controlled OFF/ON test.
- `ATLAS_VIS2_00_BASELINE_CAPTURE_PASS` (29 frames), `ATLAS_VIS2_01_PRODUCTION_MATERIAL_PASS`, Person UI V10, Polity and Spacetime Chrome acceptances also all passed at the same deployed source SHA.
- **Human A/B:** directly inspected the 390px and 1440px ON PNGs and compared both with their OFF PNG counterparts from the same browser session. At 390px, **794 pixels (0.2412%)** differed, bounded by **x=0..389, y=56..209**; at 1440px, **4,820 pixels (0.3347%)**, bounded by **x=14..1394, y=80..261**. Differences are limited to existing header / panel material surfaces. They do not imply new box dimensions or reflow and are intentionally subtle.

**Failure-history accounting (no silent waiver):** The first attempt failed because the dedicated A/B test incorrectly required an intentionally collapsed 390px toolbar to be visible. [PR #2182](https://github.com/JezCH/atlas-person-db/pull/2182) corrected responsive visibility verification. The next attempt correctly identified an unchanged mobile appbar computed shadow; [PR #2185](https://github.com/JezCH/atlas-person-db/pull/2185) strengthened existing header selector specificity and invalidated the CSS asset version. [PR #2186](https://github.com/JezCH/atlas-person-db/pull/2186) then waited for actual CSSOM disable/enable transition and logged root shadow-token resolution. That exact-SHA run was cancelled by the GitHub concurrency policy when an independent `main` change merged, not counted as PASS. The subsequent **latest-main** run #37795440953 passed all gates. These adjustments did not touch historic data, Person-row geometry, camera, label logic or the eight semantic palette colors.

**VIS2-02 signoff:** A reversible, measurable precision-engraving treatment was accepted without box geometry changes. This completes *only* VIS2-02; the next user-triggered unit is VIS2-03 mixed-script typography/tabular numbers with width invariants.
