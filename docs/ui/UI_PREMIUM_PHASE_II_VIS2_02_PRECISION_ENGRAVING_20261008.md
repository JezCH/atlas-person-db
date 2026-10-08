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

**Completion:** Not yet accepted. Insert run/artifact/result only after actual Production checks and image inspection. VIS2-03 remains unstarted in this work turn.
