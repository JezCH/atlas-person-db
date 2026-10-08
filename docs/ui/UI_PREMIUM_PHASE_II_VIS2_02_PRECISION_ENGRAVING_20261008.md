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

**Completion: VIS2-02 COMPLETE** at exact-Production [run #37795440953](https://github.com/JezCH/atlas-person-db/actions/runs/37795440953), [PNG + JSON artifact #11557839727](https://github.com/JezCH/atlas-person-db/actions/runs/37795440953/artifacts/11557839727), source/deployed SHA `c31112ffb7ae7245a542d1120c95e805df3ad3b5`. VIS2-03 remains **NOT STARTED** under the single-work-unit response barrier.


## Final exact-Production verification — 2026-10-08

The Production Chrome run **completed successfully**. This is actual deployed Chrome evidence, not a claim inferred from PR merge.

- `ATLAS_SPACETIME_PRODUCTION_VISUAL_ACCEPTANCE_PASS` (500/1000/1500% and existing Spacetime invariants), `ATLAS_UI_V10_PRODUCTION_VISUAL_ACCEPTANCE_PASS` (dense Person register), and `ATLAS_PREMIUM_POLITY_PRODUCTION_VISUAL_PASS` were emitted by the unchanged acceptance tools.
- `ATLAS_VIS2_00_BASELINE_CAPTURE_PASS captures=29` and `ATLAS_VIS2_01_PRODUCTION_MATERIAL_PASS` confirmed continuous visual/role coverage on the same commit.
- `ATLAS_VIS2_02_CSS_LOADED` confirmed the engraving stylesheet parsed and resolved the existing tokens to `rgba(239,235,226,.018)` (inset sheen) and `rgba(0,0,0,.16)` (recessed cut). In mobile at width 390, the computed appbar shadow was `rgba(239, 235, 226, 0.02) 0px -1px 0px 0px inset, rgba(0, 0, 0, 0.16) 0px 1px 0px 0px`.
- `ATLAS_VIS2_02_ENGRAVING_GEOMETRY_PASS` reported for **390×844, 768×1000, 1440×1000, 1600×1000**. The same live Production DOM, fonts and data were compared with the dedicated stylesheet disabled/enabled. Bounding rectangles, actual CSS border widths, responsive visibility, populated Person row counts and document-level overflow passed without geometry drift. Its `vis2-02-production-engraving.json` has `status: PASS`, 4 successful viewport cases and 4 before/after images.
- Artifact `#11557839727` was downloaded and both 390px and 1440px OFF/ON PNGs analyzed and viewed. At 390×844, **794 of 329,160** image pixels differed (0.24122%), bounded by `x=0..389, y=56..209` and at most **4** 8-bit channel levels; at 1440×1000, **4,820 of 1,440,000** pixels differed (0.33472%), bounded by `x=14..1394, y=80..261` and at most **6** channel levels. These are a restrained shadow-only/edge treatment at the architectural header and passive panel boundary, not row/card layout changes. These figures document exact A/B comparison and **do not establish** subjective overall product aesthetic superiority.

### Failure and retry provenance

Early Chrome runs #37791668702 and #37792677883 passed existing UI/visual tests but failed an overly strict or asynchronously toggled visual probe; run #37793926119 exposed a mobile CSS cascade interaction. Corrections #2182, #2185 and #2186 were scoped to the verification rule, actual shell selector specificity and CSSOM ready-state respectively, without altering box geometry or historical data. Run #37795164293 was **cancelled** automatically when an unrelated `main` merge superseded it. The subsequent source `c31112ffb7...` differs from the last CSS/verification change only by an unrelated registration-service workstream and its linked `index.html` edits; the engraved stylesheet link remained the same.

**Closure decision:** The merged precision engraving is visible under actual Production Chrome, has independently matched ON/OFF pixel evidence, passes four responsive geometry invariants and leaves Phase I Person/Spacetime/Polity contracts intact. This completes **VIS2-02 only**; VIS2-03 must be executed in a subsequent user turn.
